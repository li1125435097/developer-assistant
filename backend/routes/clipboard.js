const {
  getClipboardRecordsPaginated,
  getClipboardRecordById,
  deleteClipboardRecord,
  clearClipboardRecords,
} = require('../db');
const { getConfig, setConfig } = require('../config-cache');
const { syncClipboardWatcher } = require('../clipboard-watcher');

async function clipboardRoutes(fastify) {
  fastify.get('/api/clipboard/config', async () => {
    const config = getConfig();
    return {
      data: {
        clipboard_monitoring: Boolean(config.clipboard_monitoring),
        clipboard_max_length: config.clipboard_max_length,
      },
    };
  });

  fastify.put('/api/clipboard/config', async (request, reply) => {
    const { clipboard_monitoring, clipboard_max_length } = request.body || {};
    const updates = {};

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

    let config;
    try {
      config = await setConfig(updates);
    } catch (err) {
      if (err.statusCode === 400) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }

    if (updates.clipboard_monitoring !== undefined) {
      await syncClipboardWatcher();
    }

    return {
      data: {
        clipboard_monitoring: Boolean(config.clipboard_monitoring),
        clipboard_max_length: config.clipboard_max_length,
      },
    };
  });

  fastify.get('/api/clipboard', async (request) => {
    const page = Number(request.query.page) || 1;
    const pageSize = Number(request.query.pageSize) || 10;
    const result = await getClipboardRecordsPaginated(page, pageSize);

    return { data: result };
  });

  fastify.get('/api/clipboard/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const record = await getClipboardRecordById(id);

    if (!record) {
      return reply.code(404).send({ error: '记录不存在' });
    }

    return { data: record };
  });

  fastify.delete('/api/clipboard/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const deleted = await deleteClipboardRecord(id);

    if (!deleted) {
      return reply.code(404).send({ error: '记录不存在' });
    }

    return { success: true };
  });

  fastify.delete('/api/clipboard', async () => {
    await clearClipboardRecords();
    return { success: true };
  });
}

module.exports = clipboardRoutes;
