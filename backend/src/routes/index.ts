import type { FastifyInstance } from 'fastify';
import * as scriptController from '../controllers/script.controller.js';
import * as historyController from '../controllers/history.controller.js';
import * as clipboardController from '../controllers/clipboard.controller.js';
import * as settingsController from '../controllers/settings.controller.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/scripts', scriptController.list);
  fastify.post('/api/scripts', scriptController.create);
  fastify.get('/api/scripts/:id', scriptController.getById);
  fastify.put('/api/scripts/:id', scriptController.update);
  fastify.delete('/api/scripts/:id', scriptController.remove);
  fastify.get('/api/scripts/:id/actions/:actionIndex/variables', scriptController.getActionVariables);
  fastify.post('/api/scripts/:id/execute', scriptController.execute);

  fastify.get('/api/history', historyController.list);
  fastify.get('/api/history/:id', historyController.getById);
  fastify.delete('/api/history/:id', historyController.remove);
  fastify.delete('/api/history', historyController.clearAll);

  fastify.get('/api/clipboard/config', clipboardController.getConfig);
  fastify.put('/api/clipboard/config', clipboardController.updateConfig);
  fastify.get('/api/clipboard', clipboardController.list);
  fastify.get('/api/clipboard/:id', clipboardController.getById);
  fastify.delete('/api/clipboard/:id', clipboardController.remove);
  fastify.delete('/api/clipboard', clipboardController.clearAll);

  fastify.get('/api/settings/config', settingsController.getConfig);
  fastify.put('/api/settings/config', settingsController.updateConfig);
}
