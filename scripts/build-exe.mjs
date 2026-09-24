import { execSync } from 'node:child_process';
execSync('node scripts/download-ytdlp.mjs', {stdio:'inherit'});
execSync('npx vite build', {stdio:'inherit'});
execSync('npx electron-builder --win portable nsis --x64', {stdio:'inherit'});
execSync('node scripts/generate-latest-yml.mjs', {stdio:'inherit'});
