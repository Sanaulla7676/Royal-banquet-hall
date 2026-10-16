/**
 * Royal Banquet Hall — Admin Studio Node.js API Server
 * Express.js backend | Full REST API for CMS Studio
 * Run: node server.js  or  npm run dev
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const fsp        = require('fs/promises');

// ── Config ────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3001;
const BASE_DIR   = __dirname;
const DATA_DIR   = path.join(BASE_DIR, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = path.join(BASE_DIR, 'assets', 'uploads');
const CMS_FILE   = path.join(DATA_DIR, 'cms-settings.json');

// ── Ensure directories ────────────────────────────────────────────────────
[DATA_DIR, BACKUP_DIR, path.join(UPLOAD_DIR, 'images'), path.join(UPLOAD_DIR, 'videos'), path.join(UPLOAD_DIR, 'thumbs')]
  .forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// ── App ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(BASE_DIR));        // Serve static website files

// ── Multer (file uploads) ─────────────────────────────────────────────────
const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'images')),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const ts   = Date.now();
    cb(null, `${ts}_${safe}`);
  }
});
const vidStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'videos')),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()}`)
});
const uploadImg = multer({
  storage: imgStorage,
  limits:  { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  }
});
const uploadVid = multer({
  storage: vidStorage,
  limits:  { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4','video/webm','video/ogg'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── Default CMS ───────────────────────────────────────────────────────────
const DEFAULT_CMS = {
  logo:           { src: 'assets/images/royal-hall-crest.webp', width: 145, height: 98, position: 'left' },
  navbar:         { design: 0, buttonStyle: 0, animation: 0, hoverAnimation: 0, height: 72, bgColor: '#0a0b0d', transparent: true },
  hero:           { src: 'assets/images/hero-venue.jpg', scale: 100, posX: 50, posY: 50, height: 70, animation: 0, displayMode: 'cover', overlayColor: '#000000', overlayOpacity: 40, brightness: 100, contrast: 100 },
  heroHeading:    { text: 'A Royal Celebration Awaits', animation: 0, font: 0, colorCombo: 0, size: 56, weight: 800, lineHeight: 1.15, letterSpacing: -1 },
  heroSub:        { text: 'The Perfect Venue for Weddings, Receptions, Birthdays, Corporate Events & More.', preset: 0, size: 18, weight: 400, lineHeight: 1.6 },
  background:     { src: '', animation: 0, posX: 50, posY: 50, overlayOpacity: 30 },
  video:          { src: '', autoplay: true, loop: true, muted: true, posX: 50, posY: 50 },
  theme:          { active: 0 },
  animations:     { activeItems: [] },
  effects:        { activeItems: [] },
  components:     { activeItems: [] },
  fontAnimations: { active: 0, targets: {} },
};

// ── Helpers ───────────────────────────────────────────────────────────────
async function readCMS() {
  try {
    if (!fs.existsSync(CMS_FILE)) return { ...DEFAULT_CMS };
    const raw = await fsp.readFile(CMS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_CMS };
  }
}

async function writeCMS(data) {
  // Auto-backup
  if (fs.existsSync(CMS_FILE)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
    await fsp.copyFile(CMS_FILE, path.join(BACKUP_DIR, `backup_${ts}.json`));
    await pruneBackups(20);
  }
  data._meta = { saved_at: new Date().toISOString(), version: '1.0', server: 'node' };
  await fsp.writeFile(CMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function pruneBackups(keep = 20) {
  const files = (await fsp.readdir(BACKUP_DIR))
    .filter(f => f.startsWith('backup_'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime);
  const toDelete = files.slice(0, Math.max(0, files.length - keep));
  for (const f of toDelete) await fsp.unlink(path.join(BACKUP_DIR, f.name));
}

function scanImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const ext = new Set(['.jpg','.jpeg','.png','.webp','.gif','.svg']);
  return fs.readdirSync(dir)
    .filter(f => ext.has(path.extname(f).toLowerCase()))
    .map(f => {
      const full = path.join(dir, f);
      const st   = fs.statSync(full);
      const rel  = path.relative(BASE_DIR, full).replace(/\\/g, '/');
      return { name: f, path: rel, size: st.size, modified: st.mtimeMs, url: `/${rel}` };
    });
}

// ── API Routes ────────────────────────────────────────────────────────────

// GET /api/status
app.get('/api/status', async (req, res) => {
  const backups = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).length : 0;
  const uploads = fs.existsSync(path.join(UPLOAD_DIR, 'images')) ? scanImages(path.join(UPLOAD_DIR, 'images')).length : 0;
  let publishedAt = null;
  try { publishedAt = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'published.json'), 'utf-8')).published_at; } catch {}
  res.json({
    success:     true,
    server:      `Node.js ${process.version}`,
    cms_exists:  fs.existsSync(CMS_FILE),
    cms_modified:fs.existsSync(CMS_FILE) ? fs.statSync(CMS_FILE).mtime : null,
    backups,
    uploads,
    published_at:publishedAt,
    timestamp:   new Date().toISOString(),
  });
});

// GET /api/load-cms
app.get('/api/load-cms', async (req, res) => {
  const data = await readCMS();
  res.json({ success: true, data, source: fs.existsSync(CMS_FILE) ? 'file' : 'defaults' });
});

// POST /api/save-cms
app.post('/api/save-cms', async (req, res) => {
  try {
    await writeCMS(req.body);
    res.json({ success: true, message: 'CMS saved', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/publish
app.post('/api/publish', async (req, res) => {
  try {
    await writeCMS(req.body);
    const report = [
      `Logo: width=${req.body.logo?.width}px src=${req.body.logo?.src}`,
      `Theme #${req.body.theme?.active ?? 0} applied`,
      `Hero: ${req.body.hero?.src} | height=${req.body.hero?.height}vh`,
      `Font Animation #${req.body.fontAnimations?.active ?? 0}`,
    ];
    const snapshot = { published_at: new Date().toISOString(), cms: req.body, report };
    await fsp.writeFile(path.join(DATA_DIR, 'published.json'), JSON.stringify(snapshot, null, 2));
    res.json({ success: true, message: 'Published!', published_at: new Date().toISOString(), report });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/upload-image
app.post('/api/upload-image', uploadImg.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
  const rel = path.relative(BASE_DIR, req.file.path).replace(/\\/g, '/');
  res.json({ success: true, message: 'Image uploaded', file: req.file.filename, path: rel, size: req.file.size, url: `/${rel}` });
});

// POST /api/upload-video
app.post('/api/upload-video', uploadVid.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No video uploaded' });
  const rel = path.relative(BASE_DIR, req.file.path).replace(/\\/g, '/');
  res.json({ success: true, message: 'Video uploaded', file: req.file.filename, path: rel, size: req.file.size, url: `/${rel}` });
});

// GET /api/list-images
app.get('/api/list-images', (req, res) => {
  const imgs = [
    ...scanImages(path.join(BASE_DIR, 'assets', 'images')),
    ...scanImages(path.join(UPLOAD_DIR, 'images')),
  ].sort((a, b) => b.modified - a.modified);
  res.json({ success: true, count: imgs.length, images: imgs });
});

// DELETE /api/delete-image
app.delete('/api/delete-image', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ success: false, error: 'No path provided' });
  const abs = path.resolve(BASE_DIR, filePath);
  // Security check
  if (!abs.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  try {
    await fsp.unlink(abs);
    res.json({ success: true, message: 'Deleted', path: filePath });
  } catch (e) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// POST /api/rename-image
app.post('/api/rename-image', async (req, res) => {
  const { filePath, newName } = req.body;
  if (!filePath || !newName) return res.status(400).json({ success: false, error: 'Missing params' });
  const abs    = path.resolve(BASE_DIR, filePath);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR))) return res.status(403).json({ success: false, error: 'Access denied' });
  const dir    = path.dirname(abs);
  const ext    = path.extname(abs);
  const safe   = newName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const newAbs = path.join(dir, safe.includes('.') ? safe : safe + ext);
  try {
    await fsp.rename(abs, newAbs);
    res.json({ success: true, message: 'Renamed', new_path: path.relative(BASE_DIR, newAbs).replace(/\\/g, '/') });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/backups
app.get('/api/backups', async (req, res) => {
  const files = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => { const st = fs.statSync(path.join(BACKUP_DIR, f)); return { file: f, date: st.mtime, size: st.size }; })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];
  res.json({ success: true, count: files.length, backups: files });
});

// POST /api/restore
app.post('/api/restore', async (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ success: false, error: 'No file specified' });
  const src = path.join(BACKUP_DIR, path.basename(file));
  if (!fs.existsSync(src)) return res.status(404).json({ success: false, error: 'Backup not found' });
  try {
    JSON.parse(fs.readFileSync(src, 'utf-8'));
    await fsp.copyFile(src, CMS_FILE);
    res.json({ success: true, message: `Restored from ${file}`, restored_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reset
app.post('/api/reset', async (req, res) => {
  if (fs.existsSync(CMS_FILE)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
    await fsp.copyFile(CMS_FILE, path.join(BACKUP_DIR, `pre_reset_${ts}.json`));
    await fsp.unlink(CMS_FILE);
  }
  res.json({ success: true, message: 'CMS reset to defaults. Backup created.' });
});

// GET /api/image-stats
app.get('/api/image-stats', (req, res) => {
  const allImgs = [
    ...scanImages(path.join(BASE_DIR, 'assets', 'images')),
    ...scanImages(path.join(UPLOAD_DIR, 'images')),
  ];
  const byExt = {};
  let totalSize = 0;
  for (const img of allImgs) {
    const ext = path.extname(img.name).toLowerCase();
    byExt[ext] = (byExt[ext] || 0) + 1;
    totalSize  += img.size;
  }
  res.json({ success: true, stats: { total: allImgs.length, total_size: totalSize, by_type: byExt } });
});

// ── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  Royal Banquet Hall — Node.js Admin Studio Server');
  console.log(`  Port    : ${PORT}`);
  console.log(`  Website : http://localhost:${PORT}`);
  console.log(`  Studio  : http://localhost:${PORT}/admin-studio.html`);
  console.log(`  API     : http://localhost:${PORT}/api/status`);
  console.log('='.repeat(60));
});

module.exports = app;
