const { exec } = require('child_process');

const VAR_PATTERN = /\{\{(.+?)\}\}/g;

function extractVariables(script) {
  const vars = new Set();
  let match;
  const regex = new RegExp(VAR_PATTERN.source, 'g');
  while ((match = regex.exec(script)) !== null) {
    vars.add(match[1]);
  }
  return [...vars];
}

function substituteVariables(script, variables) {
  return script.replace(VAR_PATTERN, (_, key) => variables[key] ?? '');
}

function runScript(script, platform) {
  const options = { timeout: 300000 };
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

module.exports = {
  extractVariables,
  substituteVariables,
  runScript,
};
