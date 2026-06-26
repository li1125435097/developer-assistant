import type { FastifyReply, FastifyRequest } from 'fastify';
import * as clipboardService from '../services/clipboard.service.js';
import * as configService from '../services/config.service.js';
import { syncClipboardWatcher } from '../hooks/clipboard-watcher.js';
import { HttpError } from '../types/index.js';

export async function getConfig(_request: FastifyRequest, reply: FastifyReply) {
  const config = await configService.getClipboardConfig();
  return reply.send({ data: config });
}

export async function updateConfig(
  request: FastifyRequest<{
    Body: { clipboard_monitoring?: boolean; clipboard_max_length?: number };
  }>,
  reply: FastifyReply,
) {
  const { clipboard_monitoring, clipboard_max_length } = request.body ?? {};
  const updates: {
    clipboard_monitoring?: boolean;
    clipboard_max_length?: number;
  } = {};

  if (clipboard_monitoring !== undefined) {
    if (typeof clipboard_monitoring !== 'boolean') {
      return reply.code(400).send({ error: 'clipboard_monitoring 必须为布尔值' });
    }
    updates.clipboard_monitoring = clipboard_monitoring;
  }

  if (clipboard_max_length !== undefined) {
    if (
      typeof clipboard_max_length !== 'number' ||
      !Number.isInteger(clipboard_max_length) ||
      clipboard_max_length < 1
    ) {
      return reply.code(400).send({ error: 'clipboard_max_length 必须为大于 0 的整数' });
    }
    updates.clipboard_max_length = clipboard_max_length;
  }

  if (!Object.keys(updates).length) {
    return reply.code(400).send({ error: '请提供要更新的配置项' });
  }

  try {
    const config = await configService.updateClipboardConfig(updates);
    if (updates.clipboard_monitoring !== undefined) {
      await syncClipboardWatcher();
    }
    return reply.send({ data: config });
  } catch (err) {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}

export async function list(
  request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>,
  reply: FastifyReply,
) {
  const page = Number(request.query.page) || 1;
  const pageSize = Number(request.query.pageSize) || 10;
  const result = await clipboardService.listClipboardRecords(page, pageSize);
  return reply.send({ data: result });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const record = await clipboardService.getClipboardRecordById(id);
  if (!record) {
    return reply.code(404).send({ error: '记录不存在' });
  }
  return reply.send({ data: record });
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const deleted = await clipboardService.deleteClipboardRecord(id);
  if (!deleted) {
    return reply.code(404).send({ error: '记录不存在' });
  }
  return reply.send({ success: true });
}

export async function clearAll(_request: FastifyRequest, reply: FastifyReply) {
  await clipboardService.clearClipboardRecords();
  return reply.send({ success: true });
}
