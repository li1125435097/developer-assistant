require('dotenv').config();

const path = require('path');
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');
const { initDb } = require('./db');
const { initConfigCache } = require('./config-cache');
const scriptsRoutes = require('./routes/scripts');
const historyRoutes = require('./routes/history');
const clipboardRoutes = require('./routes/clipboard');
const settingsRoutes = require('./routes/settings');
const { syncClipboardWatcher } = require('./clipboard-watcher');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  await initDb();
  await initConfigCache();

  const frontendRoot = path.join(__dirname, '..', 'frontend');

  await fastify.register(fastifyStatic, {
    root: frontendRoot,
    prefix: '/',
  });

  await fastify.register(scriptsRoutes);
  await fastify.register(historyRoutes);
  await fastify.register(clipboardRoutes);
  await fastify.register(settingsRoutes);

  await syncClipboardWatcher();

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html', frontendRoot);
    }
    reply.code(404).send({ error: 'Not Found' });
  });

  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info(`服务已启动: http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
