import 'dotenv/config';
import './config/init-logging.js';
import { env } from './config/env.js';
import { getServerLogPath } from './config/logger.js';
import { buildApp } from './app.js';
import { closeDatabase } from './orm/client.js';
import { stopBackupScheduler } from './services/backup.service.js';

async function start(): Promise<void> {
  const fastify = await buildApp();

  const shutdown = async (signal: string) => {
    fastify.log.info(`收到 ${signal}，正在关闭服务...`);
    stopBackupScheduler();
    await fastify.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await fastify.listen({ port: env.port, host: '0.0.0.0' });
  fastify.log.info(`服务已启动: http://localhost:${env.port}`);
  fastify.log.info(`运行日志: ${getServerLogPath()}`);
}

start().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
