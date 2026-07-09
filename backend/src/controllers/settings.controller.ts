import type { FastifyReply, FastifyRequest } from 'fastify';
import * as configService from '../services/config.service.js';
import * as backupService from '../services/backup.service.js';
import { syncClipboardWatcher } from '../hooks/clipboard-watcher.js';
import type { AppConfig } from '../types/index.js';
import { HttpError } from '../types/index.js';

export async function getConfig(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ data: configService.getConfig() });
}

export async function listTables(_request: FastifyRequest, reply: FastifyReply) {
  const tables = await backupService.listDatabaseTables();
  return reply.send({ data: tables });
}

export async function updateConfig(
  request: FastifyRequest<{ Body: Partial<AppConfig> }>,
  reply: FastifyReply,
) {
  const body = request.body ?? {};
  if (!Object.keys(body).length) {
    return reply.code(400).send({ error: '请提供要更新的配置项' });
  }

  try {
    const config = await configService.setConfig(body);
    if (body.clipboard_monitoring !== undefined) {
      await syncClipboardWatcher();
    }
    if (body.backup_tables !== undefined) {
      void backupService.runScheduledBackup().catch((error) => {
        request.log.error(error, '保存备份配置后执行备份失败');
      });
    }
    return reply.send({ data: config });
  } catch (err) {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
