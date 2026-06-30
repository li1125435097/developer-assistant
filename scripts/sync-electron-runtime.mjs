import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = path.join(root, 'electron');
const srcDir = path.join(electronDir, 'src');
const distDir = path.join(electronDir, 'dist');

const runtimeDirs = ['server', 'webapp'];

for (const dir of runtimeDirs) {
  const from = path.join(srcDir, dir);
  const to = path.join(distDir, dir);

  if (!fs.existsSync(from)) {
    console.warn(`Skip sync: ${path.relative(root, from)} not found (run npm run move first)`);
    continue;
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`Synced ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

const serverPackageJson = path.join(distDir, 'server', 'package.json');
if (fs.existsSync(path.join(distDir, 'server'))) {
  fs.writeFileSync(serverPackageJson, `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
}
