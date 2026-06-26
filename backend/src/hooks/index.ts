import type { FastifyInstance } from 'fastify';
import { HttpError } from '../types/index.js';

export function registerHooks(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    fastify.log.error(error);
    return reply.code(500).send({ error: '服务器内部错误' });
  });
}
