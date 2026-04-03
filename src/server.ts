import './config/env'; // env validation
import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import redis from './config/redis';

const server = app.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`[Docs] http://localhost:${env.PORT}/docs`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

    server.close(async () => {
        try {
            await prisma.$disconnect();
            console.log('[Prisma] Disconnected');

            redis.disconnect();
            console.log('[Redis]  Disconnected');

            console.log('[Server] Shutdown complete');
            process.exit(0);
        } catch (err) {
            console.error('[Server] Error during shutdown:', err);
            process.exit(1);
        }
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhadled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    process.exit(1);
});

export default server;

