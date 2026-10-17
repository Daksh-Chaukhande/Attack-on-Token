import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link,
      },
    });

    // Development email fallback logging
    if (config.emailProvider === 'memory_log') {
      console.log(`[EMAIL-DEV-PREVIEW] (Fallback) -> To: User ${payload.userId} | Subject: ${payload.title}`);
      console.log(`[EMAIL-DEV-PREVIEW] Body: ${payload.message}`);
    }

    return notification;
  } catch (error) {
    console.error('[NOTIFICATION-ERROR] Failed to create notification:', error);
    return null;
  }
}

export async function notifyListingDonors(listingId: string, title: string, message: string, type: NotificationType) {
  const listing = await prisma.foodListing.findUnique({
    where: { id: listingId },
    select: { donorId: true },
  });
  if (listing) {
    await createNotification({
      userId: listing.donorId,
      title,
      message,
      type,
      link: `/listings/${listingId}`,
    });
  }
}
