import { exec } from 'node:child_process';

const VAR_PATTERN = /\{\{(.+?)\}\}/g;

export function extractVariables(script: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(VAR_PATTERN.source, 'g');
  while ((match = regex.exec(script)) !== null) {
    vars.add(match[1]);
  }
  return [...vars];
}

export function substituteVariables(
  script: string,
  variables: Record<string, string>,
): string {
  return script.replace(VAR_PATTERN, (_, key: string) => variables[key] ?? '');
}

export function runScript(
  script: string,
  platform: string,
): Promise<{ stdout: string; stderr: string }> {
  const options: { timeout: number; shell?: string } = { timeout: 300_000 };
  const normalizedPlatform = platform === 'window' ? 'window-cmd' : platform;
  if (normalizedPlatform === 'window-powershell') {
    options.shell = 'powershell.exe';
  }

  return new Promise((resolve, reject) => {
    exec(script, options, (error, stdout, stderr) => {
      if (error) {
        const log = [stderr, stdout, error.message].filter(Boolean).join('\n');
        reject(new Error(log || '脚本执行失败'));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
