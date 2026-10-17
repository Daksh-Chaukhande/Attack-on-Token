import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import { startExpirationWorker, stopExpirationWorker } from './services/expirationService.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 SharePlate Backend Server running on port ${config.port}`);
  console.log(`📡 REST API Root: http://localhost:${config.port}${config.apiPrefix}`);
  console.log(`📖 Swagger Docs:  http://localhost:${config.port}/api/docs`);
  console.log(`🩺 Health Probe: http://localhost:${config.port}/api/v1/health`);
  console.log(`🩺 Ready Probe:  http://localhost:${config.port}/api/v1/ready`);
  console.log(`====================================================`);

  // Start background expiration worker
  startExpirationWorker(config.expiryWorkerIntervalMs);
});

// Graceful Shutdown Handling
async function handleShutdown(signal: string) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);

  // Stop background worker
  stopExpirationWorker();

  // Close HTTP server
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');

    // Disconnect Prisma client
    try {
      await prisma.$disconnect();
      console.log('[SHUTDOWN] Prisma database connection closed.');
    } catch (err) {
      console.error('[SHUTDOWN-ERROR] Error closing database connection:', err);
    }

    process.exit(0);
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    console.error('[SHUTDOWN] Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
