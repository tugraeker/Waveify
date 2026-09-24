// Task 7 year guard: fails if songs.year / select-year queries remain in src/features.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'features');
const offenders = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/\.year\b/.test(line)) offenders.push(p + ':' + (i + 1) + ': ' + line.trim());
      else if (/select\([^)]*year/i.test(line)) offenders.push(p + ':' + (i + 1) + ': ' + line.trim());
    });
  }
}
walk(root);
if (offenders.length > 0) { console.error('year query found:\n' + offenders.join('\n')); process.exit(1); }
console.log('year guard ok');
