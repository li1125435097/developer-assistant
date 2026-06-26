import type { FastifyReply, FastifyRequest } from 'fastify';
import * as historyService from '../services/history.service.js';
import { HttpError } from '../types/index.js';

export async function list(_request: FastifyRequest, reply: FastifyReply) {
  const executions = await historyService.listExecutions();
  return reply.send({ data: executions });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const execution = await historyService.getExecutionById(id);
  if (!execution) {
    return reply.code(404).send({ error: '记录不存在' });
  }
  return reply.send({ data: execution });
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const deleted = await historyService.deleteExecution(id);
  if (!deleted) {
    return reply.code(404).send({ error: '记录不存在' });
  }
  return reply.send({ success: true });
}

export async function clearAll(_request: FastifyRequest, reply: FastifyReply) {
  await historyService.clearExecutions();
  return reply.send({ success: true });
}

export function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  throw error;
}
