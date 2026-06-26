import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { env, assertDatabaseConfig } from './config/env.js';
import { registerHooks } from './hooks/index.js';
import { syncClipboardWatcher } from './hooks/clipboard-watcher.js';
import { runMigrations } from './orm/migrate.js';
import { initConfigCache } from './services/config.service.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  assertDatabaseConfig();

  const fastify = Fastify({ logger: true });
  registerHooks(fastify);

  await runMigrations();
  await initConfigCache();

  await fastify.register(fastifyStatic, {
    root: env.frontendDist,
    prefix: '/',
  });

  await registerRoutes(fastify);
  await syncClipboardWatcher();

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html', path.join(env.frontendDist));
    }
    reply.code(404).send({ error: 'Not Found' });
  });

  return fastify;
}
