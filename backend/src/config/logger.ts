import fs from 'node:fs';
import path from 'node:path';
import type { FastifyLoggerOptions } from 'fastify';
import pino from 'pino';
import { env } from './env.js';

const LOG_FILE_PREFIX = 'server';
const LOG_FILE_PATTERN = /^server-(\d{4}-\d{2}-\d{2})\.log$/;

let rotatingStream: DailyRotatingStream | undefined;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLogFilePath(date = new Date()): string {
  return path.join(env.logsDir, `${LOG_FILE_PREFIX}-${formatLocalDate(date)}.log`);
}

function parseLogFileDate(filename: string): Date | undefined {
  const match = LOG_FILE_PATTERN.exec(filename);
  if (!match) {
    return undefined;
  }

  const [year, month, day] = match[1].split('-').map(Number);
  return new Date(year, month - 1, day);
}

function cleanupOldLogs(): void {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (env.logsRetentionDays - 1));

  for (const filename of fs.readdirSync(env.logsDir)) {
    const fileDate = parseLogFileDate(filename);
    if (!fileDate || fileDate >= cutoff) {
      continue;
    }

    fs.unlinkSync(path.join(env.logsDir, filename));
  }
}

class DailyRotatingStream {
  private stream: fs.WriteStream | undefined;
  private currentDate = '';

  write(msg: string): void {
    this.ensureStream();
    this.stream!.write(msg);
  }

  private ensureStream(): void {
    const today = formatLocalDate(new Date());
    if (this.stream && this.currentDate === today) {
      return;
    }

    if (this.stream) {
      this.stream.end();
    }

    this.currentDate = today;
    fs.mkdirSync(env.logsDir, { recursive: true });
    this.stream = fs.createWriteStream(getLogFilePath(), { flags: 'a' });
  }
}

function formatLogArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

function writeLogLine(level: string, args: unknown[]): void {
  if (!rotatingStream) {
    return;
  }
  const line = `${new Date().toISOString()} [${level}] ${formatLogArgs(args)}\n`;
  rotatingStream.write(line);
}

function setupConsoleLogging(): void {
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args: unknown[]) => {
    original.log(...args);
    writeLogLine('info', args);
  };
  console.info = (...args: unknown[]) => {
    original.info(...args);
    writeLogLine('info', args);
  };
  console.warn = (...args: unknown[]) => {
    original.warn(...args);
    writeLogLine('warn', args);
  };
  console.error = (...args: unknown[]) => {
    original.error(...args);
    writeLogLine('error', args);
  };
}

export function initFileLogging(): void {
  fs.mkdirSync(env.logsDir, { recursive: true });
  cleanupOldLogs();
  rotatingStream = new DailyRotatingStream();
  setupConsoleLogging();
}

export function createFastifyLoggerConfig(): FastifyLoggerOptions {
  if (!rotatingStream) {
    initFileLogging();
  }

  return {
    level: process.env.LOG_LEVEL ?? 'info',
    stream: pino.multistream([
      { level: 'trace', stream: process.stdout },
      { stream: rotatingStream! },
    ]),
  };
}

export function getServerLogPath(): string {
  return getLogFilePath();
}
