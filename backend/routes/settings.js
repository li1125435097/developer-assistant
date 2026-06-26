const { getConfig, setConfig } = require('../config-cache');
const { syncClipboardWatcher } = require('../clipboard-watcher');

async function settingsRoutes(fastify) {
  fastify.get('/api/settings/config', async () => {
    return { data: getConfig() };
  });

  fastify.put('/api/settings/config', async (request, reply) => {
    const body = request.body || {};

    if (!Object.keys(body).length) {
      return reply.code(400).send({ error: '请提供要更新的配置项' });
    }

    try {
      const config = await setConfig(body);

      if (body.clipboard_monitoring !== undefined) {
        await syncClipboardWatcher();
      }

      return { data: config };
    } catch (err) {
      if (err.statusCode === 400) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });
}

module.exports = settingsRoutes;
