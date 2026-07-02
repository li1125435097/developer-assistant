import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { ScriptAction, ExecutionOutput } from '../../types/index.js';

export const scripts = pgTable('scripts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  platform: text('platform').notNull().default('window-cmd'),
  actions: jsonb('actions').$type<ScriptAction[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const executions = pgTable('executions', {
  id: serial('id').primaryKey(),
  scriptId: integer('script_id').notNull(),
  scriptName: text('script_name').notNull(),
  action: text('action').notNull(),
  actionIndex: integer('action_index').notNull(),
  command: text('command').notNull(),
  variables: jsonb('variables').$type<Record<string, string>>().notNull().default({}),
  success: boolean('success').notNull(),
  output: jsonb('output').$type<ExecutionOutput | string>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const appConfig = pgTable('app_config', {
  id: integer('id').primaryKey().default(1),
  clipboardMonitoring: boolean('clipboard_monitoring').notNull().default(false),
  clipboardMaxLength: integer('clipboard_max_length').notNull().default(1000),
  closeToTrayOnClose: boolean('close_to_tray_on_close').notNull().default(true),
});

export const clipboardRecords = pgTable('clipboard_records', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const schema = {
  scripts,
  executions,
  appConfig,
  clipboardRecords,
};

export type Schema = typeof schema;
