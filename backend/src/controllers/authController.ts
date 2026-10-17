import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { OrganizationType } from '@prisma/client';

function generateToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('shareplate_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      email,
      password,
      name,
      phone,
      role,
      organizationName,
      organizationType,
      organizationAddress,
      organizationCity,
      bio,
      city,
      address,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and profile in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          role,
          status: 'ACTIVE',
          profile: {
            create: {
              bio: bio || null,
              city: city || null,
              address: address || null,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // If user registered with an organization profile (NGO, Community Group, Restaurant)
      if (organizationName) {
        let orgType = OrganizationType.OTHER;
        if (organizationType && Object.values(OrganizationType).includes(organizationType as OrganizationType)) {
          orgType = organizationType as OrganizationType;
        } else if (role === 'NGO') {
          orgType = OrganizationType.NGO_SHELTER;
        } else if (role === 'COMMUNITY_GROUP') {
          orgType = OrganizationType.COMMUNITY_GROUP;
        } else if (role === 'DONOR') {
          orgType = OrganizationType.RESTAURANT;
        }

        await tx.organization.create({
          data: {
            ownerId: user.id,
            name: organizationName.trim(),
            type: orgType,
            address: organizationAddress || address || 'Main Facility',
            city: organizationCity || city || 'Metropolis',
            phone: phone || 'N/A',
            verified: false,
          },
        });
      }

      return user;
    });

    const token = generateToken(newUser.id, newUser.role);
    setAuthCookie(res, token);

    await createAuditLog({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser.id,
      metadata: { role: newUser.role, email: newUser.email },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          profile: newUser.profile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        organizations: true,
      },
    });

    // Use timing-safe / generic error to prevent user enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Your account has been suspended. Please contact platform support.');
    }

    const token = generateToken(user.id, user.role);
    setAuthCookie(res, token);

    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: user.role },
      req,
    });

    return res.json({
      success: true,
      message: 'Signed in successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          status: user.status,
          profile: user.profile,
          organizations: user.organizations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthRequest, res: Response) {
  res.clearCookie('shareplate_token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    path: '/',
  });

  if (req.user) {
    await createAuditLog({
      userId: req.user.id,
      action: 'USER_LOGGED_OUT',
      entityType: 'User',
      entityId: req.user.id,
      req,
    });
  }

  return res.json({
    success: true,
    message: 'Signed out successfully',
  });
}

export async function getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        organizations: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          status: user.status,
          profile: user.profile,
          organizations: user.organizations,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { name, phone, bio, address, city, state, postalCode, latitude, longitude, notificationsEnabled } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ? name.trim() : undefined,
        phone: phone !== undefined ? phone : undefined,
        profile: {
          upsert: {
            create: {
              bio,
              address,
              city,
              state,
              postalCode,
              latitude,
              longitude,
              notificationsEnabled: notificationsEnabled ?? true,
            },
            update: {
              bio,
              address,
              city,
              state,
              postalCode,
              latitude,
              longitude,
              notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : undefined,
            },
          },
        },
      },
      include: {
        profile: true,
        organizations: true,
      },
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) throw new UnauthorizedError('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      req,
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}
