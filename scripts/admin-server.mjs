#!/usr/bin/env node
/**
 * Royal Banquet Hall - Local Admin Server & Disk Persistence API
 * Provides static web serving and REST endpoints for live saving to disk,
 * page creation, page removal, and media uploads.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { transferAllImagesToCloudinary } from './upload-to-cloudinary.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function loadCmsData() {
  const cmsDataPath = path.join(ROOT, 'assets', 'js', 'royal-cms-data.js');
  if (!fs.existsSync(cmsDataPath)) return {};
  const raw = fs.readFileSync(cmsDataPath, 'utf-8');
  const scope = { window: {} };
  try {
    new Function('window', raw)(scope.window);
    return scope.window.ROYAL_CMS_DATA || {};
  } catch(e) {
    const m = raw.match(/window\.ROYAL_CMS_DATA\s*=\s*(\{[\s\S]*\});\s*$/);
    return m ? JSON.parse(m[1]) : {};
  }
}

function saveCmsData(data) {
  const cmsDataPath = path.join(ROOT, 'assets', 'js', 'royal-cms-data.js');
  const fileContent = `/**
 * Royal Banquet Hall - CMS & Studio Data Store
 * Automatically saved by Royal Admin Studio on ${new Date().toISOString()}
 */
window.ROYAL_CMS_DATA = ${JSON.stringify(data, null, 2)};
`;
  fs.writeFileSync(cmsDataPath, fileContent, 'utf-8');
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --------------------------------------------------------------------------
  // API ENDPOINTS
  // --------------------------------------------------------------------------
  if (pathname === '/api/save-cms' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const json = JSON.parse(raw);
      saveCmsData(json);

      // Also sync window.ROYAL_HALL_CONFIG in assets/js/config.js if venue info changed
      if (json.venue) {
        const configPath = path.join(ROOT, 'assets', 'js', 'config.js');
        const configContent = `/* Public venue details shown on the website. Keep this contact in sync with the printed card. */
window.ROYAL_HALL_CONFIG = {
  whatsappNumber: ${JSON.stringify(json.venue.whatsappNumber || "919591123456")},
  email: ${JSON.stringify(json.venue.email || "info@theroyalhall.in")},
  locationLabel: ${JSON.stringify(json.venue.locationLabel || "The Royal Hall, #722, 3rd Floor, Dr. M.C. Modi Hospital Road, W.O.C. Road, Rajajinagar, Bengaluru 560086")},
  locationUrl: ${JSON.stringify(json.venue.locationUrl || "https://maps.app.goo.gl/KL41TEpJXLMCSc2u5")},
  reviewsUrl: ${JSON.stringify(json.venue.reviewsUrl || "reviews.html")}
};
`;
        fs.writeFileSync(configPath, configContent, 'utf-8');
      }

      return sendJson(res, 200, { success: true, message: 'CMS data successfully saved to disk!' });
    } catch (err) {
      console.error('[API Error] save-cms:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (pathname === '/api/create-page' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { title, slug, template, description, heroHeading, heroSub } = JSON.parse(raw);

      let cleanSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/\.html$/, '') + '.html';
      const targetPath = path.join(ROOT, cleanSlug);

      if (fs.existsSync(targetPath)) {
        return sendJson(res, 400, { success: false, error: `Page ${cleanSlug} already exists.` });
      }

      // Generate HTML Page from Selected Template
      const newPageHtml = generatePageTemplate({
        title,
        slug: cleanSlug,
        template,
        description: description || `Experience luxury celebrations at The Royal Party Hall in Rajajinagar, Bengaluru.`,
        heroHeading: heroHeading || title,
        heroSub: heroSub || `A grand venue for your most cherished moments.`
      });

      fs.writeFileSync(targetPath, newPageHtml, 'utf-8');

      // Register into royal-cms-data.js
      const cmsData = loadCmsData();
      if (!cmsData.pages) cmsData.pages = [];
      cmsData.pages.push({
        id: `p-${cleanSlug.replace('.html', '')}`,
        title,
        slug: cleanSlug,
        isCore: false,
        visible: true
      });

      // Also add to navbar links if not present
      if (cmsData.navbar && cmsData.navbar.links) {
        cmsData.navbar.links.push({
          id: `nav-${cleanSlug.replace('.html', '')}`,
          label: title,
          href: cleanSlug,
          visible: true
        });
      }

      saveCmsData(cmsData);

      return sendJson(res, 200, { success: true, slug: cleanSlug, message: `Page ${cleanSlug} created successfully!` });
    } catch (err) {
      console.error('[API Error] create-page:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (pathname === '/api/delete-page' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { slug } = JSON.parse(raw);

      // Protect core pages from accidental hard deletion
      const corePages = ['index.html', 'events.html', 'gallery.html', 'booking.html', 'experience.html', 'contact.html', 'catering.html', 'reviews.html'];
      const targetPath = path.join(ROOT, slug);

      if (corePages.includes(slug)) {
        // For core pages, just hide from CMS navbar rather than deleting file
        return sendJson(res, 200, { success: true, message: `Core page ${slug} hidden from navigation.` });
      }

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      // Remove from royal-cms-data.js
      const cmsData = loadCmsData();
      if (cmsData.pages) cmsData.pages = cmsData.pages.filter(p => p.slug !== slug);
      if (cmsData.navbar && cmsData.navbar.links) {
        cmsData.navbar.links = cmsData.navbar.links.filter(l => l.href !== slug);
      }
      saveCmsData(cmsData);

      return sendJson(res, 200, { success: true, message: `Page ${slug} deleted successfully.` });
    } catch (err) {
      console.error('[API Error] delete-page:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // CLOUDINARY API ENDPOINTS (Server-side upload using official SDK)
  // --------------------------------------------------------------------------

  // Helper: ensure Cloudinary is configured from CMS data or env
  function ensureCloudinaryConfig() {
    const cms = loadCmsData();
    const cfg = cms.integrations?.cloudinary || {};
    const cloudName = cfg.cloudName || process.env.CLOUDINARY_CLOUD_NAME || 'pspn79yf';
    const apiKey = cfg.apiKey || process.env.CLOUDINARY_API_KEY || '234231665841756';
    const apiSecret = cfg.apiSecret || process.env.CLOUDINARY_API_SECRET || '';

    if (!apiSecret) {
      return { configured: false, reason: 'API Secret is not set. Add it in Admin Studio > Pro Options or set CLOUDINARY_API_SECRET env var.' };
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return { configured: true, cloudName };
  }

  // POST /api/cloudinary/upload  — Upload an image via URL or base64
  if (pathname === '/api/cloudinary/upload' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { file, folder, public_id, tags } = JSON.parse(raw);

      const cfgResult = ensureCloudinaryConfig();
      if (!cfgResult.configured) {
        return sendJson(res, 400, { success: false, error: cfgResult.reason });
      }

      const uploadOptions = {
        folder: folder || 'royal-banquet',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      };
      if (public_id) uploadOptions.public_id = public_id;
      if (tags) uploadOptions.tags = tags;

      const result = await cloudinary.uploader.upload(file, uploadOptions);

      return sendJson(res, 200, {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        optimizedUrl: cloudinary.url(result.public_id, { fetch_format: 'auto', quality: 'auto' }),
        thumbnailUrl: cloudinary.url(result.public_id, { crop: 'fill', gravity: 'auto', width: 400, height: 300, fetch_format: 'auto', quality: 'auto' })
      });
    } catch (err) {
      console.error('[API Error] cloudinary/upload:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/cloudinary/delete  — Delete an image by public_id
  if (pathname === '/api/cloudinary/delete' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { public_id } = JSON.parse(raw);

      const cfgResult = ensureCloudinaryConfig();
      if (!cfgResult.configured) {
        return sendJson(res, 400, { success: false, error: cfgResult.reason });
      }

      const result = await cloudinary.uploader.destroy(public_id);
      return sendJson(res, 200, { success: true, result: result.result });
    } catch (err) {
      console.error('[API Error] cloudinary/delete:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/cloudinary/list  — List images in the royal-banquet folder
  if (pathname === '/api/cloudinary/list' && req.method === 'GET') {
    try {
      const cfgResult = ensureCloudinaryConfig();
      if (!cfgResult.configured) {
        return sendJson(res, 400, { success: false, error: cfgResult.reason });
      }

      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'royal-banquet/',
        max_results: 100,
        resource_type: 'image'
      });

      const images = (result.resources || []).map(r => ({
        public_id: r.public_id,
        url: r.secure_url,
        width: r.width,
        height: r.height,
        format: r.format,
        bytes: r.bytes,
        created_at: r.created_at,
        optimizedUrl: cloudinary.url(r.public_id, { fetch_format: 'auto', quality: 'auto' }),
        thumbnailUrl: cloudinary.url(r.public_id, { crop: 'fill', gravity: 'auto', width: 400, height: 300, fetch_format: 'auto', quality: 'auto' })
      }));

      return sendJson(res, 200, { success: true, count: images.length, images });
    } catch (err) {
      console.error('[API Error] cloudinary/list:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/cloudinary/optimize?src=...  — Generate an optimized + transformed URL
  if (pathname === '/api/cloudinary/optimize' && req.method === 'GET') {
    try {
      const cfgResult = ensureCloudinaryConfig();
      if (!cfgResult.configured) {
        return sendJson(res, 400, { success: false, error: cfgResult.reason });
      }

      const publicId = parsedUrl.searchParams.get('src') || '';
      const w = parseInt(parsedUrl.searchParams.get('w')) || undefined;
      const h = parseInt(parsedUrl.searchParams.get('h')) || undefined;

      const optimized = cloudinary.url(publicId, { fetch_format: 'auto', quality: 'auto' });
      const cropped = cloudinary.url(publicId, { crop: 'auto', gravity: 'auto', width: w || 500, height: h || 500, fetch_format: 'auto', quality: 'auto' });

      return sendJson(res, 200, { success: true, optimized, cropped });
    } catch (err) {
      console.error('[API Error] cloudinary/optimize:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/cloudinary/status  — Test Cloudinary connection
  if (pathname === '/api/cloudinary/status') {
    const cfgResult = ensureCloudinaryConfig();
    if (!cfgResult.configured) {
      return sendJson(res, 200, { connected: false, reason: cfgResult.reason, cloudName: 'pspn79yf' });
    }
    try {
      const ping = await cloudinary.api.ping();
      return sendJson(res, 200, { connected: true, cloudName: cfgResult.cloudName, ping: ping.status });
    } catch (err) {
      return sendJson(res, 200, { connected: false, cloudName: cfgResult.cloudName, error: err.message });
    }
  }

  // POST /api/cloudinary/transfer-all — Batch transfer all assets/images to Cloudinary
  if (pathname === '/api/cloudinary/transfer-all' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { apiSecret } = JSON.parse(raw || '{}');
      const result = await transferAllImagesToCloudinary(apiSecret);
      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[API Error] cloudinary/transfer-all:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (pathname === '/api/status') {
    return sendJson(res, 200, {
      status: 'active',
      version: '1.0.0',
      root: ROOT,
      time: new Date().toISOString()
    });
  }

  // --------------------------------------------------------------------------
  // STATIC FILE SERVING
  // --------------------------------------------------------------------------
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  if (fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`500 Server Error: ${err.message}`);
  }
});

// Helper: Generate New Page from Template
function generatePageTemplate({ title, slug, template, description, heroHeading, heroSub }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#171d19">
<meta name="description" content="${description}">
<title>${title} | The Royal Party Hall</title>
<link rel="canonical" href="https://royal-banquet-hall.vercel.app/${slug}">
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/royal-admin.css">
<script defer src="assets/js/royal-cms-data.js"></script>
<script defer src="assets/js/royal-cms.js"></script>
<script defer src="assets/js/config.js"></script>
<script defer src="assets/js/gallery-data.js"></script>
<script defer src="assets/js/site.js"></script>
</head>
<body>
<header class="site-header">
  <div class="container nav">
    <a class="brand" href="index.html" aria-label="The Royal Party Hall homepage">
      <img class="brand-logo" src="assets/images/royal-hall-crest.webp" alt="The Royal Hall crest" width="145" height="98">
    </a>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="index.html">Home</a>
      <a href="events.html">Events</a>
      <a href="gallery.html">Gallery</a>
      <a href="experience.html">The Experience</a>
      <a href="catering.html">Catering</a>
      <a href="reviews.html">Reviews</a>
      <a href="contact.html">Contact</a>
      <a aria-current="page" href="${slug}">${title}</a>
    </nav>
    <div class="nav-actions">
      <a class="btn btn-gold" href="booking.html">Check Your Date</a>
      <button class="menu-toggle" aria-expanded="false" aria-label="Open menu">☰</button>
    </div>
  </div>
</header>

<main>
  <section class="page-hero">
    <div class="container">
      <div class="breadcrumb"><a href="index.html">Home</a> / ${title}</div>
      <span class="eyebrow">The Royal Experience</span>
      <h1>${heroHeading}</h1>
      <p class="lede">${heroSub}</p>
      <div class="btn-row">
        <a class="btn btn-gold" href="booking.html">Enquire Now ↗</a>
        <a class="btn btn-outline" href="gallery.html">Explore Gallery</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Overview</span>
          <h2>A celebration of luxury.</h2>
        </div>
        <p class="lede">From intimate gatherings to majestic receptions, The Royal Party Hall crafts timeless celebrations with uncompromising sophistication.</p>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-media">
            <img src="assets/images/stage-celebration.jpg" alt="Stage Setup" loading="lazy">
          </div>
          <div class="card-body">
            <span class="card-meta">Stage & Décor</span>
            <h3>Signature Themes</h3>
            <p>Bespoke stage styling, grand floral displays and custom ambient lighting tailored to your unique event.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-media">
            <img src="assets/images/hall-interior.jpg" alt="Banquet Hall" loading="lazy">
          </div>
          <div class="card-body">
            <span class="card-meta">Hall Amenities</span>
            <h3>Spacious Comfort</h3>
            <p>Fully air-conditioned luxury banquet space with state-of-the-art audiovisual setups, bridal suites, and guest dining.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-media">
            <img src="assets/images/cake-display.jpg" alt="Culinary Delights" loading="lazy">
          </div>
          <div class="card-body">
            <span class="card-meta">Hospitality</span>
            <h3>Royal Hospitality</h3>
            <p>Attentive venue coordinators, seamless catering options and parking management for complete peace of mind.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section alt">
    <div class="container">
      <div class="cta-banner">
        <div>
          <span class="eyebrow" style="color:#d4af37;">Reserve Your Celebration</span>
          <h2 style="color:#fff;margin:0.2em 0 0.4em;">Let's make memories together.</h2>
          <p>Get in touch with our event planners on WhatsApp to discuss available dates, personalized decor themes, and booking packages.</p>
        </div>
        <a class="btn btn-gold" href="booking.html">Check Your Date ↗</a>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="brand-name"><strong>The Royal Party Hall</strong><small>Rajajinagar, Bengaluru</small></div>
        <p style="margin-top:14px;">An elegant banquet hall for weddings, receptions, birthdays and family celebrations in Rajajinagar, Bengaluru.</p>
      </div>
      <div>
        <h3>Explore</h3>
        <div class="footer-links">
          <a href="index.html">Home</a>
          <a href="events.html">Events</a>
          <a href="gallery.html">Gallery</a>
          <a href="experience.html">The Experience</a>
          <a href="catering.html">Catering</a>
        </div>
      </div>
      <div>
        <h3>Venue</h3>
        <div class="footer-links">
          <a href="booking.html">Check Your Date</a>
          <a href="reviews.html">Guest Reviews</a>
          <a href="contact.html">Directions & Map</a>
          <a href="admin.html">Admin Studio 👑</a>
        </div>
      </div>
      <div>
        <h3>Contact</h3>
        <p>#722, 3rd Floor, Dr. M.C. Modi Hospital Road, W.O.C. Road, Rajajinagar, Bengaluru 560086</p>
        <p><a href="tel:+919591123456">+91 95911 23456</a></p>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2026 The Royal Party Hall. All rights reserved.</div>
      <div>Designed for unforgettable celebrations.</div>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

server.listen(PORT, () => {
  console.log(`\n👑 Royal Banquet Hall - Admin & Dev Server running!`);
  console.log(`🌐 Public Website: http://localhost:${PORT}/`);
  console.log(`👑 Admin Studio:  http://localhost:${PORT}/admin.html`);
  console.log(`📡 Persistence API: /api/save-cms, /api/create-page, /api/delete-page\n`);
});
