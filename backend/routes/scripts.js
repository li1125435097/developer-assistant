const {
  getAllScripts,
  createScript,
  getScriptById,
  updateScript,
  deleteScript,
  createExecution,
} = require('../db');
const {
  extractVariables,
  substituteVariables,
  runScript,
} = require('../script-runner');

async function scriptsRoutes(fastify) {
  fastify.get('/api/scripts', async () => {
    const scripts = await getAllScripts();
    return { data: scripts };
  });

  fastify.post('/api/scripts', async (request, reply) => {
    const { name, description, platform, actions } = request.body || {};

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: '名称不能为空' });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return reply.code(400).send({ error: '至少添加一个动作' });
    }

    for (const item of actions) {
      if (!item.action?.trim() || !item.script?.trim()) {
        return reply.code(400).send({ error: '动作名称和脚本内容不能为空' });
      }
    }

    const script = await createScript({
      name: name.trim(),
      description: (description || '').trim(),
      platform: platform || 'window-cmd',
      actions: actions.map((a) => ({
        action: a.action.trim(),
        script: a.script.trim(),
      })),
    });

    return { data: script };
  });

  fastify.get('/api/scripts/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const script = await getScriptById(id);

    if (!script) {
      return reply.code(404).send({ error: '脚本不存在' });
    }

    return { data: script };
  });

  fastify.put('/api/scripts/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { name, description, platform, actions } = request.body || {};

    const existing = await getScriptById(id);
    if (!existing) {
      return reply.code(404).send({ error: '脚本不存在' });
    }

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: '名称不能为空' });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return reply.code(400).send({ error: '至少添加一个动作' });
    }

    for (const item of actions) {
      if (!item.action?.trim() || !item.script?.trim()) {
        return reply.code(400).send({ error: '动作名称和脚本内容不能为空' });
      }
    }

    const script = await updateScript(id, {
      name: name.trim(),
      description: (description || '').trim(),
      platform: platform || 'window-cmd',
      actions: actions.map((a) => ({
        action: a.action.trim(),
        script: a.script.trim(),
      })),
    });

    return { data: script };
  });

  fastify.delete('/api/scripts/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const deleted = await deleteScript(id);

    if (!deleted) {
      return reply.code(404).send({ error: '脚本不存在' });
    }

    return { success: true };
  });

  fastify.get('/api/scripts/:id/actions/:actionIndex/variables', async (request, reply) => {
    const id = Number(request.params.id);
    const actionIndex = Number(request.params.actionIndex);

    const script = await getScriptById(id);
    if (!script) {
      return reply.code(404).send({ error: '脚本不存在' });
    }

    const actions = script.actions;
    if (!actions[actionIndex]) {
      return reply.code(404).send({ error: '动作不存在' });
    }

    const variables = extractVariables(actions[actionIndex].script);
    return { data: variables };
  });

  fastify.post('/api/scripts/:id/execute', async (request, reply) => {
    const id = Number(request.params.id);
    const { actionIndex, variables = {} } = request.body || {};

    const script = await getScriptById(id);
    if (!script) {
      return reply.code(404).send({ error: '脚本不存在' });
    }

    const actions = script.actions;
    if (!actions[actionIndex]) {
      return reply.code(404).send({ error: '动作不存在' });
    }

    const rawScript = actions[actionIndex].script;
    const requiredVars = extractVariables(rawScript);

    for (const key of requiredVars) {
      if (!variables[key]?.trim()) {
        return reply.code(400).send({ error: `变量 {{${key}}} 不能为空` });
      }
    }

    const finalScript = substituteVariables(rawScript, variables);
    const actionName = actions[actionIndex].action;
    const historyBase = {
      script_id: id,
      script_name: script.name,
      action: actionName,
      action_index: actionIndex,
      command: finalScript,
      variables,
    };

    try {
      const result = await runScript(finalScript, script.platform);
      await createExecution({
        ...historyBase,
        success: true,
        output: result,
      });
      return { success: true, data: result };
    } catch (err) {
      await createExecution({
        ...historyBase,
        success: false,
        output: err.message,
      });
      return reply.code(500).send({
        success: false,
        error: err.message,
      });
    }
  });
}

module.exports = scriptsRoutes;
