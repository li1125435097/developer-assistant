const {
  getAllExecutions,
  getExecutionById,
  deleteExecution,
  clearExecutions,
} = require('../db');

async function historyRoutes(fastify) {
  fastify.get('/api/history', async () => {
    const executions = await getAllExecutions();
    return { data: executions };
  });

  fastify.get('/api/history/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const execution = await getExecutionById(id);

    if (!execution) {
      return reply.code(404).send({ error: '记录不存在' });
    }

    return { data: execution };
  });

  fastify.delete('/api/history/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const deleted = await deleteExecution(id);

    if (!deleted) {
      return reply.code(404).send({ error: '记录不存在' });
    }

    return { success: true };
  });

  fastify.delete('/api/history', async () => {
    await clearExecutions();
    return { success: true };
  });
}

module.exports = historyRoutes;
