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
const crypto     = require('node:crypto');
const { neon }   = require('@neondatabase/serverless');
const { v2: cloudinary } = require('cloudinary');
const {
  authConfig,
  credentialsMatch,
  normalizeUsername,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  isSameOrigin
} = require('./lib/admin-auth.js');

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

// Allowlisted website hosting fallback. Never expose the repository root, data,
// environment files, server source, or tests through a blanket static middleware.
const PUBLIC_HTML_FILES = new Set([
  'index.html','events.html','gallery.html','experience.html','catering.html',
  'reviews.html','contact.html','booking.html','packages.html',
  'admin.html','admin-studio.html','visual-editor.html'
]);
const PUBLIC_ASSET_CATEGORIES = new Set(['css','js','images','videos']);

function sendPublicFile(filePath, res, next, cacheControl = 'no-cache') {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',cacheControl);
  res.sendFile(filePath, error => {
    if (error && !res.headersSent) next(error);
  });
}

app.get('/', (req,res,next) => {
  sendPublicFile(path.join(BASE_DIR,'index.html'),res,next,'no-cache');
});
app.get('*', (req,res,next) => {
  const requestPath = req.path;
  if (requestPath === '/') {
    return sendPublicFile(path.join(BASE_DIR,'index.html'),res,next,'no-cache');
  }

  if (requestPath === '/robots.txt' || requestPath === '/sitemap.xml') {
    const fileName = requestPath.slice(1);
    return sendPublicFile(path.join(BASE_DIR,fileName),res,next,'public, max-age=3600');
  }

  if (requestPath.startsWith('/assets/')) {
    let decoded;
    try { decoded = decodeURIComponent(requestPath); }
    catch { return res.sendStatus(400); }
    if (decoded.includes(String.fromCharCode(92)) || decoded.includes(String.fromCharCode(0))) return res.sendStatus(400);
    const segments = decoded.slice('/assets/'.length).split('/');
    const category = String(segments.shift() || '').toLowerCase();
    const relative = segments.join('/');
    if (!PUBLIC_ASSET_CATEGORIES.has(category) || !relative || segments.includes('..')) return next();
    const assetRoot = path.resolve(BASE_DIR,'assets',category);
    const filePath = path.resolve(assetRoot,relative);
    const fromRoot = path.relative(assetRoot,filePath);
    if (!fromRoot || fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) return res.sendStatus(404);
    return sendPublicFile(filePath,res,next,'public, max-age=3600');
  }

  if (requestPath.startsWith('/') && requestPath.indexOf('/',1) === -1) {
    const page = requestPath.slice(1);
    if (PUBLIC_HTML_FILES.has(page) && page.toLowerCase().endsWith('.html')) {
      return sendPublicFile(path.join(BASE_DIR,page),res,next,'no-cache');
    }
  }
  return next();
});
// Any unlisted HTML document, repository file, or directory intentionally falls through to 404.

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

const cloudUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','video/mp4','video/webm','video/ogg','video/quicktime'];
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

let databaseClient = null;
let schemaPromise = null;
let backupSchemaPromise = null;
let adminAuthSchemaPromise = null;
function serviceError(message, statusCode = 503) { const error = new Error(message); error.statusCode = statusCode; return error; }
function hasDatabase() { return Boolean(process.env.DATABASE_URL); }
function getDatabase() {
  if (!hasDatabase()) throw serviceError('Persistent CMS storage is not configured. Set DATABASE_URL in Render.');
  if (!databaseClient) databaseClient = neon(process.env.DATABASE_URL);
  return databaseClient;
}
async function ensureSchema() {
  const db = getDatabase();
  if (!schemaPromise) schemaPromise = db.query('CREATE TABLE IF NOT EXISTS public.cms_state (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())').catch(error => { schemaPromise = null; throw error; });
  await schemaPromise;
  return db;
}
async function ensureBackupSchema() {
  const db = getDatabase();
  if (!backupSchemaPromise) {
    backupSchemaPromise = db.query('CREATE TABLE IF NOT EXISTS public.cms_backups (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
      .catch(error => { backupSchemaPromise = null; throw error; });
  }
  await backupSchemaPromise;
  return db;
}
async function queryRows(sql, params = []) {
  const result = await (await ensureSchema()).query(sql, params);
  if (Array.isArray(result)) return result;
  return Array.isArray(result && result.rows) ? result.rows : [];
}

async function ensureAdminAuthSchema() {
  const db = getDatabase();
  if (!adminAuthSchemaPromise) {
    adminAuthSchemaPromise = db.query('CREATE TABLE IF NOT EXISTS public.admin_auth_config (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
      .catch(error => { adminAuthSchemaPromise = null; throw error; });
  }
  await adminAuthSchemaPromise;
  return db;
}

async function getStoredAdminCredentials() {
  const db = await ensureAdminAuthSchema();
  const result = await db.query('SELECT data FROM public.admin_auth_config WHERE key=$1 LIMIT 1', ['primary']);
  const rows = Array.isArray(result) ? result : (Array.isArray(result && result.rows) ? result.rows : []);
  if (!rows.length) return null;
  let data = rows[0].data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { throw serviceError('Stored admin credentials could not be read.', 503); }
  }
  if (!data || !data.username || !data.salt || !data.passwordHash || !data.version) {
    throw serviceError('Stored admin credentials are invalid. Contact the site administrator.', 503);
  }
  return {
    username: String(data.username),
    salt: String(data.salt),
    passwordHash: String(data.passwordHash),
    version: String(data.version),
    source: 'database'
  };
}

async function getActiveAdminCredentials() {
  if (hasDatabase()) {
    const stored = await getStoredAdminCredentials();
    if (stored) return stored;
  }
  const config = authConfig();
  if (!config.configured) return null;
  return { username: config.username, version: 'environment', source: 'environment' };
}

function adminSessionReady(credentials) {
  return Boolean(credentials && credentials.username && String(process.env.ADMIN_SESSION_SECRET || '').length >= 32);
}

function deriveAdminPasswordHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password || ''), salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(key.toString('hex'));
    });
  });
}

async function verifyActiveAdminCredentials(username, password, credentials) {
  if (!credentials || normalizeUsername(username) !== normalizeUsername(credentials.username)) return false;
  if (credentials.source !== 'database') return credentialsMatch(username, password);
  try {
    const supplied = Buffer.from(await deriveAdminPasswordHash(password, credentials.salt), 'hex');
    const expected = Buffer.from(credentials.passwordHash, 'hex');
    return supplied.length === expected.length && expected.length === 64 && crypto.timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

async function saveAdminCredentials(username, password) {
  const db = await ensureAdminAuthSchema();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await deriveAdminPasswordHash(password, salt);
  const data = { username, salt, passwordHash, version: crypto.randomUUID() };
  await db.query(
    'INSERT INTO public.admin_auth_config (key,data,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()',
    ['primary', JSON.stringify(data)]
  );
  return { username: data.username, version: data.version, source: 'database' };
}
async function queryBackupRows(sql, params = []) {
  const result = await (await ensureBackupSchema()).query(sql, params);
  if (Array.isArray(result)) return result;
  return Array.isArray(result && result.rows) ? result.rows : [];
}
async function getRecord(key) {
  const rows = await queryRows('SELECT key,data,updated_at FROM public.cms_state WHERE key=$1 LIMIT 1',[key]);
  if (!rows.length) return null;
  const row=rows[0];
  if (typeof row.data==='string') { try { row.data=JSON.parse(row.data); } catch {} }
  return row;
}
async function getBackupRecord(key) {
  const rows = await queryBackupRows('SELECT key,data,updated_at FROM public.cms_backups WHERE key=$1 LIMIT 1',[key]);
  if (!rows.length) return null;
  const row=rows[0];
  if (typeof row.data==='string') { try { row.data=JSON.parse(row.data); } catch {} }
  return row;
}
async function putRecord(key,data) {
  await queryRows('INSERT INTO public.cms_state (key,data,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()',[key,JSON.stringify(data)]);
}
async function backupDraft() {
  const current=await getRecord('draft');
  if (!current) return;
  const key='backup:'+Date.now()+':'+crypto.randomUUID();
  await queryBackupRows('INSERT INTO public.cms_backups (key,data,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()',[key,JSON.stringify(current.data)]);
  await queryBackupRows('DELETE FROM public.cms_backups WHERE key NOT IN (SELECT key FROM public.cms_backups ORDER BY updated_at DESC LIMIT 20)');
}
function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
async function readCMS() {
  if (hasDatabase()) { const row=await getRecord('draft'); return row?row.data:cloneJson(DEFAULT_CMS); }
  if (process.env.NODE_ENV==='production') throw serviceError('Persistent CMS storage is not configured. Set DATABASE_URL in Render.');
  try { if (!fs.existsSync(CMS_FILE)) return cloneJson(DEFAULT_CMS); return JSON.parse(await fsp.readFile(CMS_FILE,'utf-8')); } catch { return cloneJson(DEFAULT_CMS); }
}
async function writeCMS(data,options={}) {
  if (!data||typeof data!=='object'||Array.isArray(data)) throw serviceError('CMS payload must be a JSON object.',400);
  const saved=cloneJson(data);
  saved._meta={saved_at:new Date().toISOString(),version:'2.0',server:hasDatabase()?'neon-postgres':'local-development'};
  if (hasDatabase()) { if(options.backup!==false) await backupDraft(); await putRecord('draft',saved); return saved; }
  if (process.env.NODE_ENV==='production') throw serviceError('Persistent CMS storage is not configured. Nothing was saved.');
  if (fs.existsSync(CMS_FILE)) { const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19); await fsp.copyFile(CMS_FILE,path.join(BACKUP_DIR,'backup_'+ts+'.json')); await pruneBackups(20); }
  await fsp.writeFile(CMS_FILE,JSON.stringify(saved,null,2),'utf-8');
  return saved;
}
async function readPublished() {
  if (hasDatabase()) { const row=await getRecord('published'); return row?row.data:null; }
  if (process.env.NODE_ENV==='production') return null;
  try { return JSON.parse(await fsp.readFile(path.join(DATA_DIR,'published.json'),'utf-8')); } catch { return null; }
}
function cloudinaryConfig() {
  return {cloudName:process.env.CLOUDINARY_CLOUD_NAME||'',apiKey:process.env.CLOUDINARY_API_KEY||'',apiSecret:process.env.CLOUDINARY_API_SECRET||''};
}
function configureCloudinary() {
  const cfg=cloudinaryConfig();
  if(!(cfg.cloudName&&cfg.apiKey&&cfg.apiSecret)) throw serviceError('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Render.');
  cloudinary.config({cloud_name:cfg.cloudName,api_key:cfg.apiKey,api_secret:cfg.apiSecret,secure:true});
  return cfg;
}
function cloudUploadBuffer(file,type) {
  configureCloudinary();
  return new Promise((resolve,reject)=>{
    const stream=cloudinary.uploader.upload_stream({folder:'royal-banquet',resource_type:type,use_filename:true,unique_filename:true,overwrite:false,tags:'royal-banquet,cms-upload'},(err,result)=>err?reject(err):resolve(result));
    stream.end(file.buffer);
  });
}
function optimizedCloudUrl(id) { configureCloudinary(); return cloudinary.url(id,{secure:true,fetch_format:'auto',quality:'auto'}); }
function isAllowedCloudPublicId(id) { return String(id||'').startsWith('royal-banquet/')||String(id||'').startsWith('royal-banquet-hall/'); }
function isWithinDirectory(root,target) { const r=path.resolve(root),t=path.resolve(target); return t.startsWith(r+path.sep); }


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


function cloudinaryUploadSignature(req,res) {
  try {
    const cfg=configureCloudinary(), resourceType=String(req.query.resource_type||'image').toLowerCase();
    if(!['image','video'].includes(resourceType)) return res.status(400).json({success:false,message:'Resource type must be image or video.'});
    const timestamp=Math.floor(Date.now()/1000), params={folder:'royal-banquet',tags:'royal-banquet,cms-upload',timestamp};
    const signature=cloudinary.utils.api_sign_request(params,cfg.apiSecret);
    res.setHeader('Cache-Control','no-store, max-age=0');
    return res.json({success:true,cloudName:cfg.cloudName,apiKey:cfg.apiKey,timestamp,folder:params.folder,tags:params.tags,signature,resourceType});
  } catch(error) { return res.status(error.statusCode||503).json({success:false,message:error.message}); }
}

// ── API Routes ────────────────────────────────────────────────────────────

// Authentication is server-validated. Credential changes are stored as password hashes in Neon.
async function requireAdminApi(req, res, next) {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin request rejected.' });
  }
  try {
    const credentials = await getActiveAdminCredentials();
    if (!adminSessionReady(credentials)) {
      return res.status(503).json({
        success: false,
        message: 'Admin authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a 32+ character ADMIN_SESSION_SECRET in Render.'
      });
    }
    if (!isAuthenticated(req, credentials)) {
      return res.status(401).json({ success: false, message: 'Your admin session expired. Sign in again.' });
    }
    req.adminCredentials = credentials;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, message: error.statusCode ? error.message : 'Could not verify admin credentials with persistent storage.' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin sign-in rejected.' });
  }
  try {
    const credentials = await getActiveAdminCredentials();
    if (!adminSessionReady(credentials)) {
      return res.status(503).json({
        success: false,
        message: 'Admin sign-in is not configured. Check the admin credentials and session secret in Render.'
      });
    }
    const body = req.body || {};
    if (!(await verifyActiveAdminCredentials(body.username, body.password, credentials))) {
      return res.status(401).json({ success: false, message: 'Invalid Login ID or password.' });
    }
    if (!setSessionCookie(req, res, body.remember === true, credentials)) {
      return res.status(503).json({ success: false, message: 'Admin session signing is not configured.' });
    }
    return res.json({
      success: true,
      message: 'Authentication successful.',
      user: { id: credentials.username, role: 'Administrator' }
    });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, message: error.statusCode ? error.message : 'Admin sign-in is temporarily unavailable.' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const credentials = await getActiveAdminCredentials();
    if (!adminSessionReady(credentials)) {
      return res.status(503).json({
        success: false,
        message: 'Admin authentication is not configured. Check the Render environment and database settings.'
      });
    }
    if (!isAuthenticated(req, credentials)) return res.status(401).json({ success: false, message: 'Not signed in.' });
    return res.json({ success: true, user: { id: credentials.username, role: 'Administrator' } });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, message: error.statusCode ? error.message : 'Could not verify the admin session.' });
  }
});

app.get('/api/auth/credentials', requireAdminApi, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.json({ success: true, username: req.adminCredentials.username });
});

app.post('/api/auth/change-credentials', requireAdminApi, async (req, res) => {
  if (!isSameOrigin(req)) return res.status(403).json({ success: false, message: 'Cross-origin request rejected.' });
  if (!hasDatabase()) return res.status(503).json({ success: false, message: 'Credential changes require the configured Neon database.' });

  const body = req.body || {};
  const currentCredentials = req.adminCredentials;
  if (!(await verifyActiveAdminCredentials(currentCredentials.username, body.currentPassword, currentCredentials))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  const username = String(body.newUsername || '').replace(/[\u00A0\u200B\u200E\s]+/g, ' ').trim();
  const password = String(body.newPassword || '');
  const confirmPassword = String(body.confirmPassword || '');
  if (username.length < 3 || username.length > 80) {
    return res.status(400).json({ success: false, message: 'New Login ID must be between 3 and 80 characters.' });
  }
  if (password.length < 12 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Use a new password between 12 and 128 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'The new password and confirmation do not match.' });
  }

  try {
    const saved = await saveAdminCredentials(username, password);
    clearSessionCookie(req, res);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({
      success: true,
      message: 'Admin credentials changed. Sign in again with the new Login ID and password.',
      username: saved.username
    });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, message: error.statusCode ? error.message : 'Credentials could not be saved. No changes were applied.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin sign-out rejected.' });
  }
  clearSessionCookie(req, res);
  return res.json({ success: true, message: 'Signed out.' });
});

// Signed Cloudinary uploads; the API secret never leaves Render.
app.get('/api/cloudinary/signature',requireAdminApi,cloudinaryUploadSignature);
app.get('/api/cloudinary/status',requireAdminApi,async(req,res)=>{
  const cfg=cloudinaryConfig();
  if(!(cfg.cloudName&&cfg.apiKey&&cfg.apiSecret)) return res.json({success:true,connected:false,configured:false,message:'Set Cloudinary environment variables in Render.'});
  try { configureCloudinary(); const ping=await cloudinary.api.ping(); return res.json({success:true,connected:true,configured:true,cloudName:cfg.cloudName,status:ping.status}); }
  catch { return res.status(502).json({success:false,connected:false,configured:true,message:'Cloudinary connection failed. Check Render environment variables.'}); }
});
app.get('/api/cloudinary/list',requireAdminApi,async(req,res)=>{
  try {
    configureCloudinary();
    const results=await Promise.all(['royal-banquet/','royal-banquet-hall/'].map(prefix=>cloudinary.api.resources({type:'upload',prefix,max_results:100,resource_type:'image'})));
    const assets=new Map();
    for(const result of results) for(const item of result.resources||[]) assets.set(item.public_id,{public_id:item.public_id,url:item.secure_url,optimizedUrl:optimizedCloudUrl(item.public_id),format:item.format,bytes:item.bytes,width:item.width,height:item.height,created_at:item.created_at,source:'cloudinary'});
    const images=Array.from(assets.values()).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    return res.json({success:true,count:images.length,images});
  } catch(error) { return res.status(error.statusCode||502).json({success:false,message:error.message}); }
});
app.post('/api/cloudinary/delete',requireAdminApi,async(req,res)=>{
  try {
    configureCloudinary();
    const id=String((req.body||{}).public_id||''),type=String((req.body||{}).resource_type||'image');
    if(!isAllowedCloudPublicId(id)) return res.status(400).json({success:false,message:'Only Royal Banquet Hall assets can be deleted.'});
    if(!['image','video'].includes(type)) return res.status(400).json({success:false,message:'Resource type must be image or video.'});
    const result=await cloudinary.uploader.destroy(id,{resource_type:type,invalidate:true});
    if(!['ok','not found'].includes(result.result)) return res.status(502).json({success:false,message:'Cloudinary did not confirm deletion.'});
    return res.json({success:result.result==='ok',result:result.result,public_id:id});
  } catch(error) { return res.status(error.statusCode||502).json({success:false,message:error.message}); }
});
app.post('/api/cloudinary/upload',requireAdminApi,async(req,res)=>{
  try {
    configureCloudinary();
    const dataUrl=String((req.body||{}).file||'');
    if(!/^data:(image|video)\/[a-zA-Z0-9.+-]+;base64,/.test(dataUrl)) return res.status(400).json({success:false,message:'Upload must be a base64 image or video data URL.'});
    const type=dataUrl.startsWith('data:video/')?'video':'image';
    const result=await cloudinary.uploader.upload(dataUrl,{folder:'royal-banquet',resource_type:type,tags:'royal-banquet,cms-upload'});
    const url=type==='image'?optimizedCloudUrl(result.public_id):result.secure_url;
    return res.json({success:true,url,secure_url:result.secure_url,optimizedUrl:url,public_id:result.public_id,resource_type:type,format:result.format,bytes:result.bytes,width:result.width,height:result.height});
  } catch(error) { return res.status(error.statusCode||502).json({success:false,message:error.message}); }
});

// GET /api/status
app.get('/api/status',(req,res)=>{
  const cfg=cloudinaryConfig();
  res.setHeader('Cache-Control','no-store, max-age=0');
  return res.json({success:true,server:'Render Node.js '+process.version,storageConfigured:hasDatabase(),storage:hasDatabase()?'Neon PostgreSQL':'not configured',authConfigured:authConfig().configured,cloudinaryConfigured:Boolean(cfg.cloudName&&cfg.apiKey&&cfg.apiSecret),timestamp:new Date().toISOString()});
});



// GET /api/load-cms
app.get('/api/admin/load-cms',requireAdminApi,async(req,res)=>{
  try { return res.json({success:true,data:await readCMS(),source:hasDatabase()?'neon-draft':'local-development'}); }
  catch(error) { return res.status(error.statusCode||503).json({success:false,message:error.message}); }
});



app.get('/api/load-cms',async(req,res)=>{
  try {
    let authenticated = false;
    try {
      const credentials = await getActiveAdminCredentials();
      authenticated = adminSessionReady(credentials) && isAuthenticated(req, credentials);
    } catch {}
    if (authenticated) return res.json({success:true,data:await readCMS(),source:hasDatabase()?'neon-draft':'local-development'});
    const snapshot=await readPublished();
    if(snapshot&&snapshot.cms&&typeof snapshot.cms==='object') return res.json({success:true,data:snapshot.cms,source:hasDatabase()?'neon-published':'published-file',updatedAt:snapshot.published_at||null});
    return res.json({success:true,data:{},source:'no-published-cms'});
  } catch(error) { return res.status(error.statusCode||503).json({success:false,message:error.message}); }
});



// POST /api/save-cms
app.post('/api/save-cms',requireAdminApi,async(req,res)=>{
  try { const saved=await writeCMS(req.body); return res.json({success:true,message:'CMS draft saved.',source:hasDatabase()?'neon-postgres':'local-development',timestamp:saved._meta.saved_at}); }
  catch(error) { return res.status(error.statusCode||500).json({success:false,message:error.message}); }
});



// POST /api/publish
app.post('/api/publish',requireAdminApi,async(req,res)=>{
  try {
    const saved=await writeCMS(req.body), publishedAt=new Date().toISOString();
    const snapshot={published_at:publishedAt,cms:saved,report:['Logo '+(saved.logo&&saved.logo.src),'Theme '+((saved.theme&&saved.theme.active)??0),'Hero '+(saved.hero&&saved.hero.src)]};
    if(hasDatabase()) await putRecord('published',snapshot);
    else { if(process.env.NODE_ENV==='production') throw serviceError('Persistent CMS storage is not configured. Nothing was published.'); await fsp.writeFile(path.join(DATA_DIR,'published.json'),JSON.stringify(snapshot,null,2)); }
    return res.json({success:true,message:'Published to shared CMS storage.',published_at:publishedAt,report:snapshot.report});
  } catch(error) { return res.status(error.statusCode||500).json({success:false,message:error.message}); }
});



// API media uploads go to Cloudinary, not Render's temporary filesystem.
app.post('/api/upload-image',requireAdminApi,cloudUpload.single('image'),async(req,res)=>{
  try {
    if(!req.file||!req.file.mimetype.startsWith('image/')) return res.status(400).json({success:false,message:'Choose an image file.'});
    const result=await cloudUploadBuffer(req.file,'image'),url=optimizedCloudUrl(result.public_id);
    return res.json({success:true,message:'Image uploaded to Cloudinary.',file:req.file.originalname,path:result.public_id,size:result.bytes,url,public_id:result.public_id,secure_url:result.secure_url});
  } catch(error) { return res.status(error.statusCode||502).json({success:false,message:error.message}); }
});
app.post('/api/upload-video',requireAdminApi,cloudUpload.single('video'),async(req,res)=>{
  try {
    if(!req.file||!req.file.mimetype.startsWith('video/')) return res.status(400).json({success:false,message:'Choose a video file.'});
    const result=await cloudUploadBuffer(req.file,'video');
    return res.json({success:true,message:'Video uploaded to Cloudinary.',file:req.file.originalname,path:result.public_id,size:result.bytes,url:result.secure_url,public_id:result.public_id,secure_url:result.secure_url});
  } catch(error) { return res.status(error.statusCode||502).json({success:false,message:error.message}); }
});



// GET /api/list-images
app.get('/api/list-images', requireAdminApi, (req, res) => {
  const imgs = [
    ...scanImages(path.join(BASE_DIR, 'assets', 'images')),
    ...scanImages(path.join(UPLOAD_DIR, 'images')),
  ].sort((a, b) => b.modified - a.modified);
  res.json({ success: true, count: imgs.length, images: imgs });
});

// DELETE /api/delete-image
app.delete('/api/delete-image', requireAdminApi, async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ success: false, error: 'No path provided' });
  const abs = path.resolve(BASE_DIR, filePath);
  // Security check
  if (!isWithinDirectory(UPLOAD_DIR, abs)) {
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
app.post('/api/rename-image', requireAdminApi, async (req, res) => {
  const { filePath, newName } = req.body;
  if (!filePath || !newName) return res.status(400).json({ success: false, error: 'Missing params' });
  const abs    = path.resolve(BASE_DIR, filePath);
  if (!isWithinDirectory(UPLOAD_DIR, abs)) return res.status(403).json({ success: false, error: 'Access denied' });
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
app.get('/api/backups',requireAdminApi,async(req,res)=>{
  try {
    if(hasDatabase()) {
      const rows=await queryBackupRows("SELECT key,data,updated_at FROM public.cms_backups ORDER BY updated_at DESC LIMIT 20");
      const backups=rows.map(row=>({file:row.key,date:row.updated_at,size:Buffer.byteLength(JSON.stringify(row.data||{}))}));
      return res.json({success:true,count:backups.length,backups,source:'neon-postgres'});
    }
    if(process.env.NODE_ENV==='production') throw serviceError('Persistent CMS storage is not configured.');
    const backups=fs.existsSync(BACKUP_DIR)?fs.readdirSync(BACKUP_DIR).filter(file=>file.endsWith('.json')).map(file=>{const st=fs.statSync(path.join(BACKUP_DIR,file));return {file,date:st.mtime,size:st.size};}).sort((a,b)=>new Date(b.date)-new Date(a.date)):[];
    return res.json({success:true,count:backups.length,backups,source:'local-development'});
  } catch(error) { return res.status(error.statusCode||500).json({success:false,message:error.message}); }
});



// POST /api/restore
app.post('/api/restore',requireAdminApi,async(req,res)=>{
  const file=String((req.body||{}).file||'');
  if(!file) return res.status(400).json({success:false,message:'Select a backup first.'});
  try {
    if(hasDatabase()) {
      if(!file.startsWith('backup:')) return res.status(400).json({success:false,message:'Invalid database backup key.'});
      const backup=await getBackupRecord(file);
      if(!backup) return res.status(404).json({success:false,message:'Backup not found.'});
      await backupDraft(); await putRecord('draft',backup.data);
      return res.json({success:true,message:'Draft restored from Neon backup.',restored_at:new Date().toISOString()});
    }
    if(process.env.NODE_ENV==='production') throw serviceError('Persistent CMS storage is not configured.');
    const src=path.join(BACKUP_DIR,path.basename(file));
    if(!fs.existsSync(src)) return res.status(404).json({success:false,message:'Backup not found.'});
    JSON.parse(fs.readFileSync(src,'utf-8')); await fsp.copyFile(src,CMS_FILE);
    return res.json({success:true,message:'Draft restored from local backup.',restored_at:new Date().toISOString()});
  } catch(error) { return res.status(error.statusCode||500).json({success:false,message:error.message}); }
});



// POST /api/reset
app.post('/api/reset',requireAdminApi,async(req,res)=>{
  try { await writeCMS(DEFAULT_CMS); return res.json({success:true,message:'Draft reset to defaults. Previous draft backup retained.'}); }
  catch(error) { return res.status(error.statusCode||500).json({success:false,message:error.message}); }
});



// GET /api/image-stats
app.get('/api/image-stats', requireAdminApi, (req, res) => {
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
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('  Royal Banquet Hall — Node.js Admin Studio Server');
  console.log(`  Port    : ${PORT}`);
  console.log(`  Website : http://localhost:${PORT}`);
  console.log(`  Studio  : http://localhost:${PORT}/admin-studio.html`);
  console.log(`  API     : http://localhost:${PORT}/api/status`);
  console.log('='.repeat(60));
});

module.exports = app;
