import type { FastifyReply, FastifyRequest } from 'fastify';
import * as notebookService from '../services/notebook.service.js';

export async function list(
  request: FastifyRequest<{
    Querystring: { page?: string; pageSize?: string; q?: string; tag?: string };
  }>,
  reply: FastifyReply,
) {
  const page = Number(request.query.page) || 1;
  const pageSize = Number(request.query.pageSize) || 10;
  const search = request.query.q ?? '';
  const tagSearch = request.query.tag ?? '';
  const result = await notebookService.listNotebookNotes(page, pageSize, search, tagSearch);
  return reply.send({ data: result });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const note = await notebookService.getNotebookNoteById(id);
  if (!note) {
    return reply.code(404).send({ error: '记事本不存在' });
  }
  return reply.send({ data: note });
}

export async function create(
  request: FastifyRequest<{ Body: { content?: string; tags?: string[] } }>,
  reply: FastifyReply,
) {
  const { content = '', tags } = request.body ?? {};
  if (typeof content !== 'string') {
    return reply.code(400).send({ error: 'content 必须为字符串' });
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    return reply.code(400).send({ error: 'tags 必须为字符串数组' });
  }

  const note = await notebookService.createNotebookNote({ content, tags });
  return reply.code(201).send({ data: note });
}

export async function update(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { content?: string; tags?: string[] };
  }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const { content, tags } = request.body ?? {};

  if (content !== undefined && typeof content !== 'string') {
    return reply.code(400).send({ error: 'content 必须为字符串' });
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    return reply.code(400).send({ error: 'tags 必须为字符串数组' });
  }
  if (content === undefined && tags === undefined) {
    return reply.code(400).send({ error: '请提供要更新的字段' });
  }

  const note = await notebookService.updateNotebookNote(id, {
    content,
    tags,
  });
  if (!note) {
    return reply.code(404).send({ error: '记事本不存在' });
  }
  return reply.send({ data: note });
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const deleted = await notebookService.deleteNotebookNote(id);
  if (!deleted) {
    return reply.code(404).send({ error: '记事本不存在' });
  }
  return reply.send({ success: true });
}

export async function togglePin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = Number(request.params.id);
  const note = await notebookService.toggleNotebookPin(id);
  if (!note) {
    return reply.code(404).send({ error: '记事本不存在' });
  }
  return reply.send({ data: note });
}

export async function listTags(
  request: FastifyRequest<{ Querystring: { q?: string } }>,
  reply: FastifyReply,
) {
  const search = request.query.q ?? '';
  const tags = await notebookService.listNotebookTags(search);
  return reply.send({ data: tags });
}
