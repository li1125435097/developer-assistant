import type { FastifyReply, FastifyRequest } from 'fastify';
import * as historyService from '../services/history.service.js';
import * as scriptService from '../services/script.service.js';
import type { ScriptAction } from '../types/index.js';
import { substituteVariables, runScript } from '../utils/script-runner.js';

function validateScriptBody(body: {
  name?: string;
  description?: string;
  platform?: string;
  actions?: ScriptAction[];
}): string | null {
  if (!body.name?.trim()) {
    return '名称不能为空';
  }
  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    return '至少添加一个动作';
  }
  for (const item of body.actions) {
    if (!item.action?.trim() || !item.script?.trim()) {
      return '动作名称和脚本内容不能为空';
    }
  }
  return null;
}

export async function list(_request: FastifyRequest, reply: FastifyReply) {
  const scripts = await scriptService.listScripts();
  return reply.send({ data: scripts });
}

export async function create(
  request: FastifyRequest<{
    Body: { name?: string; description?: string; platform?: string; actions?: ScriptAction[] };
  }>,
  reply: FastifyReply,
) {
  const body = request.body ?? {};
  const error = validateScriptBody(body);
  if (error) {
    return reply.code(400).send({ error });
  }

  const script = await scriptService.createScript({
    name: body.name!.trim(),
    description: (body.description ?? '').trim(),
    platform: body.platform ?? 'window-cmd',
    actions: body.actions!,
  });
  return reply.send({ data: script });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const script = await scriptService.getScriptById(id);
  if (!script) {
    return reply.code(404).send({ error: '脚本不存在' });
  }
  return reply.send({ data: script });
}

export async function update(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { name?: string; description?: string; platform?: string; actions?: ScriptAction[] };
  }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const existing = await scriptService.getScriptById(id);
  if (!existing) {
    return reply.code(404).send({ error: '脚本不存在' });
  }

  const body = request.body ?? {};
  const error = validateScriptBody(body);
  if (error) {
    return reply.code(400).send({ error });
  }

  const script = await scriptService.updateScript(id, {
    name: body.name!.trim(),
    description: (body.description ?? '').trim(),
    platform: body.platform ?? 'window-cmd',
    actions: body.actions!,
  });
  return reply.send({ data: script });
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const deleted = await scriptService.deleteScript(id);
  if (!deleted) {
    return reply.code(404).send({ error: '脚本不存在' });
  }
  return reply.send({ success: true });
}

export async function getActionVariables(
  request: FastifyRequest<{ Params: { id: string; actionIndex: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const actionIndex = Number(request.params.actionIndex);
  const variables = await scriptService.getActionVariables(id, actionIndex);

  if (variables === null) {
    const script = await scriptService.getScriptById(id);
    if (!script) {
      return reply.code(404).send({ error: '脚本不存在' });
    }
    return reply.code(404).send({ error: '动作不存在' });
  }

  return reply.send({ data: variables });
}

export async function execute(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { actionIndex?: number; variables?: Record<string, string> };
  }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const { actionIndex, variables = {} } = request.body ?? {};

  const script = await scriptService.getScriptById(id);
  if (!script) {
    return reply.code(404).send({ error: '脚本不存在' });
  }

  const action = script.actions[actionIndex ?? -1];
  if (!action) {
    return reply.code(404).send({ error: '动作不存在' });
  }

  const { extractVariables } = await import('../utils/script-runner.js');
  const requiredVars = extractVariables(action.script);
  for (const key of requiredVars) {
    if (!variables[key]?.trim()) {
      return reply.code(400).send({ error: `变量 {{${key}}} 不能为空` });
    }
  }

  const finalScript = substituteVariables(action.script, variables);
  const historyBase = {
    script_id: id,
    script_name: script.name,
    action: action.action,
    action_index: actionIndex!,
    command: finalScript,
    variables,
  };

  try {
    const result = await runScript(finalScript, script.platform);
    await historyService.createExecution({
      ...historyBase,
      success: true,
      output: result,
    });
    return reply.send({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '脚本执行失败';
    await historyService.createExecution({
      ...historyBase,
      success: false,
      output: message,
    });
    return reply.code(500).send({ success: false, error: message });
  }
}
