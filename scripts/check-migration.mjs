// scripts/check-migration.mjs (temporary validator, kept)
import fs from 'node:fs';
const sql = fs.readFileSync('supabase/migrations/001_init.sql','utf8');
const must = ['create table users','create table songs','create table playlists','create table playlist_songs','create table friends','songs','covers'];
for (const m of must) { if (!sql.toLowerCase().includes(m)) throw new Error('missing '+m); }
if (sql.includes('last_seen') || /songs\s*\(\s*[^)]*year/.test(sql)) throw new Error('forbidden column present');
console.log('migration ok');
