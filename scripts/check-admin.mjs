import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of [
  'admin-studio.html', 'visual-editor.html', 'assets/js/admin-studio.js', 'assets/js/visual-editor.js', 'assets/js/royal-cms.js', 'assets/css/visual-editor.css',
  'server.js', 'lib/admin-auth.js', 'vercel.json'
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error('Missing required admin file: ' + file);
}

const html = read('admin-studio.html');
const visualEditorHtml = read('visual-editor.html');
if (!html.includes('href="visual-editor.html"')) throw new Error('Admin Studio does not link to the Visual Builder.');
for (const control of [
  'id="vb-page-select"','id="vb-page-frame"','id="vb-layer-tree"','id="vb-save-draft"','id="vb-publish"',
  'data-pane="motion"','id="vb-open-font-picker"','id="vb-font-picker"','id="vb-move-mode"',
  'id="vb-expand-layers"','id="vb-font-size-number"','data-motion-preset="shimmer"',
  'id="vb-photo-upload"','id="vb-photo-upload-button"','id="vb-upload-row"','THE ROYAL HALL'
]) {
  if (!visualEditorHtml.includes(control)) throw new Error('Missing Visual Builder feature: ' + control);
}
const visualJs = read('assets/js/visual-editor.js');
for (const marker of [
  'function renderFontChoices()', 'function bindSliderStyle(', 'function startCanvasDrag(',
  'function setLayersExpanded(', 'function setMoveMode(', 'prefers-reduced-motion:reduce',
  'async function handlePhotoUpload(', '/api/cloudinary/signature?resource_type=image',
  'Save Draft, then Publish'
]) {
  if (!visualJs.includes(marker)) throw new Error('Visual Builder guided interaction is missing: ' + marker);
}

const pages = ['logo','navbar','hero-image','hero-heading','hero-sub','background','video','image-library','themes','animations','effects','components','font-animations'];
for (const page of pages) {
  if (!html.includes('id="page-' + page + '"')) throw new Error('Missing numbered Studio section: ' + page);
}

const siteCss = read('assets/css/site.css');
for (const marker of ['transform:scale(3)!important','height:264px!important','height:216px!important']) {
  if (!siteCss.includes(marker)) throw new Error('The Royal Hall oversized logo styling is missing: ' + marker);
}
const server = read('server.js');
for (const marker of [
  'const PUBLIC_HTML_FILES = new Set(',
  "app.get('/', (req,res,next) =>",
  'const PUBLIC_ASSET_CATEGORIES = new Set(',
  'path.relative(assetRoot,filePath)',
  "res.setHeader('X-Content-Type-Options','nosniff')"
]) {
  if (!server.includes(marker)) throw new Error('Safe Render website hosting is missing: ' + marker);
}
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

const studioJs = read('assets/js/admin-studio.js');
const runtimeJs = read('assets/js/royal-cms.js');
for (const control of [
  'id="bg-upload"', 'id="bg-url-input"', 'id="bg-anim-grid"',
  'id="btn-bg-image-remove"', 'id="btn-hero-image-reset"',
  'id="btn-imglib-apply-size"', 'id="btn-imglib-crop"'
]) {
  if (!html.includes(control)) throw new Error('Missing functional media control: ' + control);
}
if (/onclick=["']toast\(/i.test(html)) throw new Error('A button is wired to a toast-only placeholder.');
for (const marker of [
  "cms.animation = i;", "syncPreviewStyles();", "btn-imglib-apply-size",
  "btn-imglib-crop", "btn-hero-image-reset", "btn-bg-image-remove",
  "buildStudioSelectionAnimationCss(c)"
]) {
  if (!studioJs.includes(marker)) throw new Error('Studio interaction wiring is missing: ' + marker);
}
for (const marker of ['function applyVisualElementOverrides(pub)', 'rbhVisualBuilderApplyMotion', 'rbhVisualBuilderRestoreResponsive']) {
  if (!runtimeJs.includes(marker)) throw new Error('Visual Builder public rendering behavior is missing: ' + marker);
}
if (!runtimeJs.includes('buildStudioSelectionAnimationCss(pub)')) throw new Error('Published hero/heading/background animation styles are not applied.');
if (!runtimeJs.includes('const sizing = pub.imageSizing')) throw new Error('Published image display-size settings are not applied.');
for (const control of [
  'id="page-selector"', 'id="page-specific-hero-card"', 'id="page-specific-button-card"',
  'id="page-specific-logo-card"', 'id="page-hero-src"', 'id="page-button-target"',
  'id="page-logo-placement"', 'id="btn-page-hero-reset"', 'id="btn-page-button-reset"', 'id="btn-page-logo-reset"'
]) if (!html.includes(control)) throw new Error('Missing page-specific edit control: ' + control);
for (const marker of ['function initPageSpecificControls()', 'pageOverrides', 'currentEditPageKey()', 'btn-page-hero-upload']) {
  if (!studioJs.includes(marker)) throw new Error('Missing page-specific Studio behavior: ' + marker);
}
for (const marker of ['applyPageSpecificOverrides(pub)', 'applyPageLogoPlacement(pub,page)', "page.hero", "page.buttons"]) {
  if (!runtimeJs.includes(marker)) throw new Error('Missing public per-page override application: ' + marker);
}
if (!read('assets/css/site.css').includes('rbh-page-logo-positioned[data-rbh-logo-placement="custom"]')) {
  throw new Error('Custom free-coordinate logo placement styles are missing.');
}
if (server.includes('express.static(BASE_DIR)')) throw new Error('Render exposes repository files through express.static.');

const config = JSON.parse(read('vercel.json'));
if (!config.rewrites?.some(route =>
  route.source === '/api/:path*' &&
  route.destination === 'https://royal-banquet-backend.onrender.com/api/:path*'
)) throw new Error('Vercel API proxy to Render is missing.');

const forbiddenCredentialMarker = /Royal@07|Royal@O7|Royal@o7|royal2026|234231665841756/;
for (const file of [
  'server.js', 'lib/admin-auth.js', 'assets/js/admin-studio.js', 'assets/js/visual-editor.js',
  'assets/js/royal-cms.js', 'scripts/upload-to-cloudinary.mjs', 'scripts/admin-server.mjs'
]) {
  if (forbiddenCredentialMarker.test(read(file))) throw new Error('Hardcoded credential marker found in ' + file);
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}

console.log('PASS: 13 Studio sections, protected API endpoints, Neon persistence, signed Cloudinary uploads, Vercel proxy and JavaScript syntax.');
