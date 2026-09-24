// scripts/check-vocal.mjs
import fs from 'node:fs';
const src = fs.readFileSync('src/features/player/lib/vocalGains.ts','utf8');
if (!src.includes("karaoke") || !src.includes("isolate")) throw new Error('vocalGains missing modes');
if (!src.includes("[0, 1]") || !src.includes("[1, 0]") || !src.includes("[1, 1]")) throw new Error('vocal gains table wrong');
console.log('vocal ok');
