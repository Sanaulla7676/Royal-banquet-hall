import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of [
  'admin-studio.html', 'assets/js/admin-studio.js', 'assets/js/royal-cms.js',
  'server.js', 'lib/admin-auth.js', 'vercel.json'
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error('Missing required admin file: ' + file);
}

const html = read('admin-studio.html');
const pages = ['logo','navbar','hero-image','hero-heading','hero-sub','background','video','image-library','themes','animations','effects','components','font-animations'];
for (const page of pages) {
  if (!html.includes('id="page-' + page + '"')) throw new Error('Missing numbered Studio section: ' + page);
}

const server = read('server.js');
for (const route of [
  "app.post('/api/auth/login'", "app.get('/api/auth/session'", "app.post('/api/auth/logout'",
  "app.get('/api/cloudinary/signature'", "app.get('/api/cloudinary/status'",
  "app.post('/api/save-cms',requireAdminApi", "app.post('/api/publish',requireAdminApi",
  "app.post('/api/restore',requireAdminApi", "app.post('/api/reset',requireAdminApi"
]) {
  if (!server.includes(route)) throw new Error('Missing/protection gap on route: ' + route);
}
if (!server.includes('process.env.DATABASE_URL') || !server.includes('cloudinary.utils.api_sign_request')) {
  throw new Error('Neon persistence or signed Cloudinary upload support is missing.');
}
if (server.includes('express.static(BASE_DIR)')) throw new Error('Render exposes repository files through express.static.');

const config = JSON.parse(read('vercel.json'));
if (!config.rewrites?.some(route =>
  route.source === '/api/:path*' &&
  route.destination === 'https://royal-banquet-backend.onrender.com/api/:path*'
)) throw new Error('Vercel API proxy to Render is missing.');

const forbiddenCredentialMarker = /Royal@07|Royal@O7|Royal@o7|royal2026|234231665841756/;
for (const file of [
  'server.js', 'lib/admin-auth.js', 'assets/js/admin-studio.js',
  'assets/js/royal-cms.js', 'scripts/upload-to-cloudinary.mjs', 'scripts/admin-server.mjs'
]) {
  if (forbiddenCredentialMarker.test(read(file))) throw new Error('Hardcoded credential marker found in ' + file);
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}

console.log('PASS: 13 Studio sections, protected API endpoints, Neon persistence, signed Cloudinary uploads, Vercel proxy and JavaScript syntax.');
