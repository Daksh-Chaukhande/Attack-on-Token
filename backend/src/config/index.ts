import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'shareplate_dev_super_secret_jwt_key_2026_secure_random',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'shareplate_dev_super_secret_refresh_key_2026_rotation',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  expiryWorkerIntervalMs: parseInt(process.env.EXPIRY_WORKER_INTERVAL_MS || '60000', 10),
  emailProvider: process.env.EMAIL_PROVIDER || 'memory_log',
  emailFrom: process.env.EMAIL_FROM || 'notifications@shareplate.local',
};
