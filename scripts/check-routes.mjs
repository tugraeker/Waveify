import fs from 'node:fs';
const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const n = (app.match(/<Route /g) || []).length;
if (n < 30) throw new Error('expected >=30 routes, got ' + n);
console.log('routes ok ' + n);
