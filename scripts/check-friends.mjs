import fs from 'node:fs';
const q = fs.readFileSync('src/features/social/hooks/useFriends.ts', 'utf8');
if (q.includes('last_seen')) throw new Error('last_seen forbidden');
console.log('friends ok');
