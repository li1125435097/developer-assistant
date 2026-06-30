import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  { from: path.join(root, 'backend/dist'), to: path.join(root, 'electron/src/server') },
  { from: path.join(root, 'frontend/dist'), to: path.join(root, 'electron/src/webapp') },
];

for (const { from, to } of copies) {
  if (!fs.existsSync(from)) {
    console.error(`Source not found: ${from}`);
    console.error('Build backend and frontend first: npm run build:backend && npm run build:frontend');
    process.exit(1);
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`Copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

const envPath = path.join(root, 'electron/src/server/config/env.js');
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace(
  /frontendDist:\s*path\.join\(projectRoot,\s*'frontend',\s*'dist'\),/,
  "frontendDist: path.join(__dirname, '..', '..', 'webapp'),",
);
fs.writeFileSync(envPath, envContent);
console.log('Updated frontendDist in electron/src/server/config/env.js');

await import('./sync-electron-runtime.mjs');
