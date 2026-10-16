/* ==========================================================================
   Royal Banquet Hall – Admin Customization Studio
   admin-studio.js | 13-Page Functional Editor Logic
   Backend: Node.js (server.js) | PHP (api.php) | Python (server.py)
   ========================================================================== */

'use strict';

/* ── API BACKEND CONFIG ──
   Priority: Node.js (3001) → PHP (api.php) → localStorage fallback
   Auto-detected at startup via /api/status probe
*/
const API = {
  base: '',           // Set by detectBackend()
  available: false,
  backends: [
    { name: 'Current deployment', url: '' },
    { name: 'Node.js local', url: 'http://localhost:3001' },
  ],

  async call(method, endpoint, body = null) {
    if (!this.available) return null;
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      opts.credentials = 'same-origin';
      const res = await fetch(this.base + endpoint, opts);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ...payload,
          success: false,
          httpStatus: res.status,
          message: payload.message || payload.error || ('Request failed (' + res.status + ').')
        };
      }
      return payload;
    } catch (error) {
      return { success: false, message: 'Network request failed.', detail: error?.message || '' };
    }
  },

  get: (ep)     => API.call('GET',    ep),
  post:(ep,body)=> API.call('POST',   ep, body),
  del: (ep,body)=> API.call('DELETE', ep, body),

  async upload(endpoint, formData) {
    if (!this.available) return null;
    try {
      const res = await fetch(this.base + endpoint, { method: 'POST', body: formData });
      return await res.json();
    } catch { return null; }
  },
};

async function detectBackend() {
  for (const b of API.backends) {
    try {
      const url = b.url ? `${b.url}/api/status` : '/api/status';
      const res = await fetch(url, { signal: AbortSignal.timeout(1500), credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        API.base      = b.url;
        API.available = true;
        const data    = await res.json();
        console.log('Connected to ' + b.name + ' backend at ' + (b.url || 'same origin'));
        updateServerBadge(b.name, data);
        if (data.storageConfigured === false) {
          toast('Backend detected, but shared CMS storage is not configured.', 'gold');
        } else {
          toast('Backend: ' + b.name + ' server connected', 'success');
        }
        return;
      }
    } catch { /* try next */ }
  }
  console.warn('No backend detected — using localStorage only');
  toast('Offline mode: saving to browser only', 'gold');
}

function updateServerBadge(serverName, data) {
  const badge = document.getElementById('server-badge');
  if (badge) {
    badge.textContent = `⚡ ${serverName}`;
    badge.title = `Server: ${serverName}\nBackups: ${data.backups ?? '?'}\nUploads: ${data.uploads ?? '?'}`;
  }
}

/* ── STATE ── */
let studioAuthenticated = false;

const STUDIO = {
  currentPage: 'dashboard',
  viewport: 'desktop',
  undoStack: [],
  redoStack: [],
  dirty: false,
  cms: JSON.parse(localStorage.getItem('rbh_studio_cms') || 'null') || {
    logo: { src: 'assets/images/royal-hall-crest.webp', width: 145, height: 98, position: 'left' },
    navbar: { design: 0, buttonStyle: 0, animation: 0, hoverAnimation: 0, height: 72, bgColor: '#0a0b0d', transparent: true },
    hero: { src: 'assets/images/hero-venue.jpg', scale: 100, posX: 50, posY: 50, height: 70, animation: 0, displayMode: 'cover', overlayColor: '#000000', overlayOpacity: 40, brightness: 100, contrast: 100 },
    heroHeading: { text: 'A Royal Celebration Awaits', animation: 0, font: 0, colorCombo: 0, size: 56, weight: 800, lineHeight: 1.15, letterSpacing: -1 },
    heroSub: { text: 'The Perfect Venue for Weddings, Receptions, Birthdays, Corporate Events & More.', preset: 0, size: 18, weight: 400, lineHeight: 1.6 },
    background: { src: '', animation: 0, posX: 50, posY: 50, overlayOpacity: 30 },
    video: { src: '', autoplay: true, loop: true, muted: true, posX: 50, posY: 50 },
    theme: { active: 0 },
    animations: { activeItems: [] },
    effects: { activeItems: [] },
    components: { activeItems: [] },
    fontAnimations: { active: 0, targets: {} }
  }
};

// Backfill fields introduced after the first local/browser drafts were created.
STUDIO.cms.animations = {
  activeItems: [],
  speed: 10,
  delay: 0,
  duration: 500,
  targets: ['Headings'],
  direction: 'Normal',
  scrollTrigger: true,
  repeatEveryView: false,
  ...(STUDIO.cms.animations || {})
};
STUDIO.cms.effects = { activeItems: [], intensity: 100, ...(STUDIO.cms.effects || {}) };
STUDIO.cms.components = { activeItems: [], ...(STUDIO.cms.components || {}) };
STUDIO.cms.fontAnimations = {
  active: 0,
  targets: ['Hero Heading'],
  speed: 10,
  delay: 0,
  duration: 500,
  repeat: 'Once',
  ...(STUDIO.cms.fontAnimations || {})
};
STUDIO.cms.video = {
  src: '',
  autoplay: true,
  loop: true,
  muted: true,
  controls: false,
  playsInline: true,
  objectFit: 'cover',
  poster: 'assets/images/hero-venue.jpg',
  posX: 50,
  posY: 50,
  ...(STUDIO.cms.video || {})
};
STUDIO.cms.hero = {
  animationSpeed: 10,
  animationDelay: 3,
  blur: 0,
  kenBurns: false,
  parallax: false,
  gradient: false,
  decorative: false,
  ...(STUDIO.cms.hero || {})
};
if (!Array.isArray(STUDIO.cms.animations.targets)) STUDIO.cms.animations.targets = ['Headings'];
if (!Array.isArray(STUDIO.cms.fontAnimations.targets)) STUDIO.cms.fontAnimations.targets = ['Hero Heading'];

/* ── DOM HELPERS ── */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v); });
  children.forEach(c => c && e.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
};

/* ── LIVE PREVIEW ENGINE (Synchronizes all 13 pages) ── */
function getAllIframes() {
  return [...document.querySelectorAll('iframe')];
}

function getAllIframeDocs() {
  const docs = [];
  getAllIframes().forEach(iframe => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        docs.push({ doc, win: iframe.contentWindow, iframe });
      }
    } catch (e) {
      // Cross-origin fallback
    }
  });
  return docs;
}

function getIframe() {
  const activePage = document.querySelector('.s-page.active');
  if (activePage) {
    const frame = activePage.querySelector('iframe');
    if (frame) return frame;
  }
  return document.querySelector('#studio-preview-frame') || document.querySelector('iframe');
}

function getIframeDoc() {
  const frame = getIframe();
  try { return frame?.contentDocument || frame?.contentWindow?.document; } catch { return null; }
}

function reloadPreview() {
  getAllIframes().forEach(iframe => {
    try {
      const src = iframe.src;
      iframe.src = '';
      iframe.src = src;
    } catch {}
  });
}

function applyToPreview(fn) {
  getAllIframeDocs().forEach(({ doc, win, iframe }) => {
    try {
      if (typeof fn === 'function') fn(doc, win, iframe);
    } catch (e) {
      console.warn('[Studio Preview Error]:', e);
    }
  });
  syncPreviewStyles();
}

function syncPreviewStyles() {
  const c = STUDIO.cms;
  if (!c) return;

  const logoW = c.logo?.width || 145;
  const logoH = c.logo?.height || 98;
  const logoPos = c.logo?.position || 'left';
  const logoSrc = c.logo?.src;

  const navH = c.navbar?.height || 72;
  const navBg = c.navbar?.bgColor || '#0a0b0d';
  const isTransparent = !!c.navbar?.transparent;

  const heroH = c.hero?.height || 70;
  const heroScale = c.hero?.scale || 100;
  const heroPosX = c.hero?.posX ?? 50;
  const heroPosY = c.hero?.posY ?? 50;
  const heroBrightness = c.hero?.brightness ?? 100;
  const heroContrast = c.hero?.contrast ?? 100;
  const heroBlur = c.hero?.blur ?? 0;
  const heroDisplayMode = c.hero?.displayMode || 'cover';
  const overlayColor = /^#[0-9a-f]{6}$/i.test(c.hero?.overlayColor || '') ? c.hero.overlayColor : '#000000';
  const overlayOpacity = Math.max(0, Math.min(100, Number(c.hero?.overlayOpacity ?? 40)));

  const headingSize = c.heroHeading?.size || 56;
  const headingWeight = c.heroHeading?.weight || 800;
  const headingLH = c.heroHeading?.lineHeight || 1.15;
  const headingLS = c.heroHeading?.letterSpacing || -1;
  const headingText = c.heroHeading?.text;
  const headingFontIndex = Number(c.heroHeading?.font ?? 0);
  const headingFonts = [
    "'Playfair Display', Georgia, serif", "'Plus Jakarta Sans', Arial, sans-serif",
    "Georgia, serif", "'Courier New', monospace", "Impact, sans-serif",
    "Georgia, serif", "Arial, sans-serif", "Arial Black, Arial, sans-serif",
    "'Times New Roman', serif", "'Playfair Display', Georgia, serif"
  ];
  const headingColors = [
    ['#c6a15b','#e8c87a'],['#ffffff','#f0f0f0'],['#ff6b6b','#ee5a24'],['#a29bfe','#6c5ce7'],
    ['#00cec9','#0984e3'],['#55efc4','#00b894'],['#fd79a8','#e84393'],['#fdcb6e','#e17055'],
    ['#636e72','#2d3436'],['#e67e22','#d35400'],['#1abc9c','#16a085'],['#9b59b6','#8e44ad'],
    ['#2c3e50','#34495e'],['#c0392b','#e74c3c'],['#f39c12','#f1c40f'],['#ecf0f1','#bdc3c7'],
    ['#3498db','#2980b9'],['#27ae60','#229954'],['#ff4757','#ff6b81'],['#ffeaa7','#fdcb6e'],
    ['#5f27cd','#341f97'],['#ee5a24','#c0392b'],['#00d2d3','#0abde3'],['#8395a7','#576574'],
    ['#f368e0','#e056d7'],['#01a3a4','#048a81'],['#d63031','#6c0303'],['#6ab04c','#badc58'],
    ['#e55039','#f0b27a'],['#1e3799','#0c2461']
  ];
  const headingColorPair = headingColors[Math.max(0,Math.min(29,Number(c.heroHeading?.colorCombo)||0))];

  const subSize = c.heroSub?.size || 18;
  const subWeight = c.heroSub?.weight || 400;
  const subLH = c.heroSub?.lineHeight || 1.6;
  const subText = c.heroSub?.text;

  // Injected CSS with maximum specificity
  const css = `
    /* ── STUDIO LIVE PREVIEW STYLES ── */
    .site-header .brand-logo,
    .brand img,
    .site-logo,
    header img.brand-logo {
      width: ${logoW}px !important;
      height: ${logoH}px !important;
      max-width: ${logoW}px !important;
      max-height: ${logoH}px !important;
      object-fit: contain !important;
      transition: width 0.15s ease, height 0.15s ease !important;
    }
    .brand {
      justify-content: ${logoPos === 'center' ? 'center' : logoPos === 'right' ? 'flex-end' : 'flex-start'} !important;
    }
    .site-header {
      background: ${isTransparent ? 'transparent' : navBg} !important;
      ${isTransparent ? 'border-bottom: 1px solid rgba(255,255,255,0.12) !important;' : 'border-bottom: 1px solid rgba(198,161,91,0.25) !important;'}
      min-height: ${navH}px !important;
      transition: background 0.15s ease, min-height 0.15s ease !important;
    }
    .site-header .nav {
      min-height: ${navH}px !important;
    }
    .hero {
      min-height: ${heroH}vh !important;
    }
    .hero-media img, .hero-slide, .hero-slideshow [data-hero-slide] {
      object-position: ${heroPosX}% ${heroPosY}% !important;
      object-fit: ${heroDisplayMode} !important;
      scale: ${heroScale / 100} !important;
      filter: brightness(${heroBrightness / 100}) contrast(${heroContrast / 100}) blur(${heroBlur}px) !important;
      ${c.hero?.kenBurns ? 'animation: rbhStudioKenBurns ' + Math.max(1000,Number(c.hero.animationSpeed||10)*1000) + 'ms ease-in-out ' + Math.max(0,Number(c.hero.animationDelay||0)*100) + 'ms infinite alternate !important;' : ''}
      ${c.hero?.parallax ? 'transform: translateY(-1.5%) !important;' : ''}
    }
    ${c.hero?.gradient ? '.hero-media::after,.hero-slideshow::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(0,0,0,.28),transparent 70%);}' : ''}
    ${c.hero?.decorative ? '.hero-content{outline:1px solid rgba(198,161,91,.58);outline-offset:12px;}' : ''}
    .hero-content h1,
    .hero-title-primary,
    .hero-title-accent {
      font-family: ${headingFonts[headingFontIndex] || headingFonts[0]} !important;
      font-size: ${headingSize}px !important;
      font-weight: ${headingWeight} !important;
      line-height: ${headingLH} !important;
      letter-spacing: ${headingLS}px !important;
      text-align: ${c.heroHeading?.align || 'center'} !important;
      background-image: linear-gradient(110deg,${headingColorPair[0]},${headingColorPair[1]}) !important;
      background-clip: text !important;
      -webkit-background-clip: text !important;
      color: transparent !important;
    }
    .hero-content .lede, .hero-content p {
      font-size: ${subSize}px !important;
      font-weight: ${subWeight} !important;
      line-height: ${subLH} !important;
      text-align: ${c.heroSub?.align || 'center'} !important;
      ${c.heroSub?.color ? 'color:' + c.heroSub.color + ' !important;' : ''}
    }
    @keyframes rbhStudioKenBurns { from { transform:scale(1.02) } to { transform:scale(1.12) } }
    #site-intro, .site-intro {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    body.intro-pending > :not(#site-intro) {
      visibility: visible !important;
    }
    body.intro-pending {
      visibility: visible !important;
    }
  `;

  getAllIframeDocs().forEach(({ doc, win }) => {
    try {
      // Remove any lingering site-intro elements in iframe preview
      const intro = doc.getElementById('site-intro');
      if (intro) intro.remove();
      if (doc.body) doc.body.classList.remove('intro-pending');

      let tag = doc.getElementById('studio-live-styles');
      if (!tag) {
        tag = doc.createElement('style');
        tag.id = 'studio-live-styles';
        (doc.head || doc.body).appendChild(tag);
      }
      tag.textContent = css;

      // Render persistent hero overlay, including drafts loaded after page initialization.
      doc.querySelectorAll('.hero, .hero-section').forEach(hero => {
        const mediaLayer = hero.querySelector('.hero-media, .hero-slideshow') || hero;
        let overlay = mediaLayer.querySelector(':scope > .rbh-studio-preview-overlay');
        if (overlayOpacity > 0 || c.hero?.gradient) {
          if (!overlay) {
            overlay = doc.createElement('div');
            overlay.className = 'rbh-studio-preview-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            Object.assign(overlay.style, {position:'absolute', inset:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'2', transition:'background .15s ease'});
            if (!mediaLayer.style.position && mediaLayer === hero) hero.style.position = 'relative';
            mediaLayer.appendChild(overlay);
          }
          const hex = overlayColor.slice(1);
          const rgba = 'rgba(' + parseInt(hex.slice(0,2),16) + ',' + parseInt(hex.slice(2,4),16) + ',' + parseInt(hex.slice(4,6),16) + ',' + (overlayOpacity/100) + ')';
          overlay.style.background = c.hero?.gradient ? 'linear-gradient(135deg,' + rgba + ',transparent 78%)' : rgba;
        } else if (overlay) {
          overlay.remove();
        }
        const content = hero.querySelector('.hero-content');
        if (content) { content.style.position = 'relative'; content.style.zIndex = '3'; }
      });

      // Update Header elements directly
      const headers = doc.querySelectorAll('.site-header');
      headers.forEach(h => {
        h.style.setProperty('background', isTransparent ? 'transparent' : navBg, 'important');
        h.style.setProperty('min-height', navH + 'px', 'important');
        if (isTransparent) {
          h.style.setProperty('border-bottom', '1px solid rgba(255,255,255,0.12)', 'important');
        } else {
          h.style.setProperty('border-bottom', '1px solid rgba(198,161,91,0.25)', 'important');
        }
      });

      // Update Logo elements directly
      const logos = doc.querySelectorAll('.site-header .brand-logo, .brand img, .site-logo');
      logos.forEach(logo => {
        if (logoSrc && logo.src !== logoSrc) logo.src = logoSrc;
        logo.style.setProperty('width', logoW + 'px', 'important');
        logo.style.setProperty('height', logoH + 'px', 'important');
        logo.style.setProperty('max-width', logoW + 'px', 'important');
        logo.style.setProperty('max-height', logoH + 'px', 'important');
        logo.width = logoW;
        logo.height = logoH;
      });

      if (c.hero?.src) {
        const slides = doc.querySelectorAll('.hero-slide, .hero-media img');
        if (slides.length && slides[0].src !== c.hero.src) slides[0].src = c.hero.src;
      }
      if (headingText) {
        const h1 = doc.querySelector('.hero-content h1') || doc.querySelector('.hero-title-primary');
        if (h1) {
          const primary = h1.querySelector('.hero-title-primary');
          const accent = h1.querySelector('.hero-title-accent');
          const words = String(headingText).trim().split(/\s+/);
          if (primary && accent && words.length) {
            accent.textContent = words.pop() || '';
            primary.textContent = words.join(' ') + (words.length ? ' ' : '');
          } else if (h1.textContent !== headingText) {
            h1.textContent = headingText;
          }
        }
      }
      if (subText) {
        const lede = doc.querySelector('.hero-content .lede') || doc.querySelector('.hero-content p');
        if (lede && lede.textContent !== subText) lede.textContent = subText;
        if (lede && c.heroSub?.color) lede.style.color = c.heroSub.color;
      }
    } catch (e) {
      // Ignored
    }
  });

  // Also postMessage to all iframes
  getAllIframes().forEach(iframe => {
    try {
      iframe.contentWindow?.postMessage({ type: 'STUDIO_PREVIEW_SYNC', cms: c }, '*');
    } catch (e) {}
  });
}
window.STUDIO = STUDIO;
window.syncPreviewStyles = syncPreviewStyles;
window.saveDraft = saveDraft;
window.saveSection = async function(sectionName) {
  const ok = await saveDraft({ silent: true });
  if (ok) toast(sectionName + ' saved to shared CMS storage.', 'success');
  else toast(sectionName + ' was not saved. Check sign-in and the backend status.', 'error');
  return ok;
};
window.publishLive = publishLive;
window.pushUndo = pushUndo;
window.toast = toast;

/* ── UNDO / REDO ── */
function pushUndo(label) {
  STUDIO.undoStack.push({ label, state: JSON.stringify(STUDIO.cms) });
  STUDIO.redoStack = [];
  if (STUDIO.undoStack.length > 50) STUDIO.undoStack.shift();
  updateHistoryBtns();
  markDirty();
}

function mergeIntoCMS(source) {
  if (!source) return;
  for (const k of Object.keys(source)) {
    if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
      STUDIO.cms[k] = STUDIO.cms[k] || {};
      Object.assign(STUDIO.cms[k], source[k]);
    } else {
      STUDIO.cms[k] = source[k];
    }
  }
}

function undo() {
  if (!STUDIO.undoStack.length) return;
  STUDIO.redoStack.push({ state: JSON.stringify(STUDIO.cms) });
  const prev = STUDIO.undoStack.pop();
  mergeIntoCMS(JSON.parse(prev.state));
  syncAllControls();
  updateHistoryBtns();
  toast('Undo: ' + (prev.label || 'change'), 'gold');
}
function redo() {
  if (!STUDIO.redoStack.length) return;
  STUDIO.undoStack.push({ state: JSON.stringify(STUDIO.cms) });
  const next = STUDIO.redoStack.pop();
  mergeIntoCMS(JSON.parse(next.state));
  syncAllControls();
  updateHistoryBtns();
  toast('Redo applied', 'gold');
}
function updateHistoryBtns() {
  const undoBtn = $('#btn-studio-undo');
  const redoBtn = $('#btn-studio-redo');
  if (undoBtn) undoBtn.disabled = !STUDIO.undoStack.length;
  if (redoBtn) redoBtn.disabled = !STUDIO.redoStack.length;
}
function markDirty() {
  STUDIO.dirty = true;
  const dot = $('.s-save-dot');
  const txt = $('#save-status-text');
  if (dot) dot.classList.add('saving');
  if (txt) txt.textContent = 'Unsaved changes';
}
function markSaved() {
  STUDIO.dirty = false;
  const dot = $('.s-save-dot');
  const txt = $('#save-status-text');
  if (dot) dot.classList.remove('saving');
  if (txt) txt.textContent = 'All saved';
}

/* ── SAVE ── */
async function saveDraft(options = {}) {
  const silent = options.silent === true;
  // Keep a local recovery copy, but never call it a server save.
  localStorage.setItem('rbh_studio_cms', JSON.stringify(STUDIO.cms));

  if (!studioAuthenticated) {
    markSaved();
    const signedOutText = $('#save-status-text');
    if (signedOutText) signedOutText.textContent = 'Sign in to save';
    if (!silent) toast('Sign in before saving a shared draft.', 'error');
    return false;
  }

  if (!API.available) {
    markSaved();
    const txt = $('#save-status-text');
    if (txt) txt.textContent = 'Local draft only';
    if (!silent) toast('Draft kept in this browser only. The shared backend is unavailable.', 'gold');
    return false;
  }

  const res = await API.post('/api/save-cms', STUDIO.cms);
  if (res?.success) {
    markSaved();
    if (!silent) toast('Draft saved to shared CMS storage.', 'success');
    return true;
  }

  const txt = $('#save-status-text');
  if (txt) txt.textContent = 'Server save failed';
  STUDIO.dirty = true;
  const message = res?.message || res?.error || 'The server rejected the save.';
  if (!silent) toast('Local recovery copy kept. Server save failed: ' + message, 'error');
  return false;
}

async function publishLive() {
  // Save a browser recovery copy, but do not label it published yet.
  localStorage.setItem('rbh_studio_cms', JSON.stringify(STUDIO.cms));

  if (!studioAuthenticated) {
    toast('Sign in before publishing live changes.', 'error');
    return false;
  }

  if (!API.available) {
    markDirty();
    toast('Nothing was published. The shared backend is unavailable.', 'error');
    return false;
  }

  const res = await API.post('/api/publish', STUDIO.cms);
  if (!res?.success) {
    markDirty();
    const message = res?.message || res?.error || 'The server rejected publishing.';
    toast('Publishing failed. No live changes were confirmed: ' + message, 'error');
    return false;
  }

  // Only record local published state after the server confirms the publish.
  localStorage.setItem('royal_cms_published', JSON.stringify(STUDIO.cms));
  try {
    const existing = JSON.parse(localStorage.getItem('royal_cms_data_store') || '{}');
    existing.navbar = existing.navbar || {};
    existing.navbar.bgColor = STUDIO.cms.navbar?.bgColor;
    existing.navbar.height = STUDIO.cms.navbar?.height;
    existing.navbar.transparent = STUDIO.cms.navbar?.transparent;
    existing.navbar.logoWidth = STUDIO.cms.logo?.width;
    existing.navbar.logoHeight = STUDIO.cms.logo?.height;
    existing.navbar.logoSrc = STUDIO.cms.logo?.src;
    localStorage.setItem('royal_cms_data_store', JSON.stringify(existing));
  } catch {}

  markSaved();
  toast('Published to shared CMS storage. Public pages will load the published settings.', 'success');
  if (res.report?.length) console.log('Publish report:', res.report);
  return true;
}

async function loadFromBackend() {
  if (!API.available) return false;
  const res = await API.get('/api/admin/load-cms');
  if (res?.success && res.data && Object.keys(res.data).length) {
    mergeIntoCMS(res.data);
    localStorage.setItem('rbh_studio_cms', JSON.stringify(STUDIO.cms));
    syncAllControls();
    console.log('CMS draft loaded from shared storage');
    return true;
  }
  return false;
}

/* ── TOAST ── */
function toast(msg, type = 'gold') {
  $$('.s-toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `s-toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(8px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ── NAVIGATION ── */
function navigateTo(pageId) {
  STUDIO.currentPage = pageId;
  // Update sidebar
  $$('.s-nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === pageId));
  // Show page
  $$('.s-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + pageId));
  // Synchronize preview styles to newly active iframe
  setTimeout(syncPreviewStyles, 60);
}

/* ── VIEWPORT ── */
function setViewport(vp) {
  STUDIO.viewport = vp;
  $$('.s-vp-btn').forEach(b => b.classList.toggle('active', b.dataset.vp === vp));
  $$('.s-iframe-wrap').forEach(wrap => {
    wrap.className = wrap.className.replace(/vp-\w+/, '');
    wrap.classList.add('vp-' + vp);
  });
}

/* ── SLIDER PAIR INIT ── */
function initSlider(sliderId, numId, valLabelId, onchange, unit = '') {
  const slider = document.getElementById(sliderId);
  const num = document.getElementById(numId);
  const lbl = valLabelId ? document.getElementById(valLabelId) : null;
  if (!slider || !num) return;
  function sync(v) {
    v = Math.min(+slider.max, Math.max(+slider.min, +v));
    slider.value = v;
    num.value = v;
    if (lbl) lbl.textContent = v + unit;
    onchange(v);
  }
  slider.addEventListener('input', () => sync(slider.value));
  slider.addEventListener('change', () => sync(slider.value));
  num.addEventListener('input', () => sync(num.value));
  num.addEventListener('change', () => sync(num.value));
}

/* ── TOGGLE SWITCH ── */
function initToggle(id, onchange) {
  const t = document.getElementById(id);
  if (!t) return;
  t.classList.toggle('on', !!onchange._init);
  t.addEventListener('click', () => {
    t.classList.toggle('on');
    onchange(t.classList.contains('on'));
  });
}

/* ── SELECT PRESET CARDS ── */
function initPresetCards(containerSel, onSelect) {
  const container = document.querySelector(containerSel);
  if (!container) return;
  container.addEventListener('click', e => {
    const card = e.target.closest('[data-index]');
    if (!card) return;
    container.querySelectorAll('[data-index]').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    onSelect(+card.dataset.index, card);
  });
}

/* ── COLOR PAIR ── */
function initColorPair(swatchId, hexId, onchange) {
  const swatch = document.getElementById(swatchId);
  const hex = document.getElementById(hexId);
  if (!swatch || !hex) return;
  const handleSwatch = () => { hex.value = swatch.value; onchange(swatch.value); };
  const handleHex = () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { swatch.value = hex.value; onchange(hex.value); } };
  swatch.addEventListener('input', handleSwatch);
  swatch.addEventListener('change', handleSwatch);
  hex.addEventListener('input', handleHex);
  hex.addEventListener('change', handleHex);
}

/* ══════════════════════════════════════════════════
   PAGE 1: LOGO MANAGEMENT
══════════════════════════════════════════════════ */
function initLogoPage() {
  initSlider('logo-slider-w', 'logo-num-w', 'logo-val-w', v => {
    STUDIO.cms.logo.width = v;
    syncPreviewStyles();
    markDirty();
  }, 'px');

  initSlider('logo-slider-h', 'logo-num-h', 'logo-val-h', v => {
    STUDIO.cms.logo.height = v;
    syncPreviewStyles();
    markDirty();
  }, 'px');

  // Upload
  const uploadInput = document.getElementById('logo-upload');
  if (uploadInput) {
    uploadInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        STUDIO.cms.logo.src = ev.target.result;
        const preview = document.getElementById('logo-preview-img');
        if (preview) preview.src = ev.target.result;
        syncPreviewStyles();
        pushUndo('Logo upload');
        toast('Logo updated', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // Position chips
  document.querySelectorAll('#logo-position-chips .s-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#logo-position-chips .s-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STUDIO.cms.logo.position = chip.dataset.val;
      syncPreviewStyles();
      markDirty();
    });
  });
}

/* ══════════════════════════════════════════════════
   PAGE 2: NAVBAR CUSTOMIZATION
══════════════════════════════════════════════════ */
function initNavbarPage() {
  // Design selection
  initPresetCards('#navbar-designs-container', (i) => {
    STUDIO.cms.navbar.design = i;
    const designColors = ['#0a0b0d', 'rgba(18,22,28,0.75)', '#ffffff', 'transparent', '#12151c', '#060708'];
    if (i === 3) {
      STUDIO.cms.navbar.transparent = true;
      const transpToggle = document.getElementById('navbar-transparent-toggle');
      if (transpToggle) transpToggle.classList.add('on');
    } else {
      STUDIO.cms.navbar.transparent = false;
      STUDIO.cms.navbar.bgColor = designColors[i] || '#0a0b0d';
      const transpToggle = document.getElementById('navbar-transparent-toggle');
      if (transpToggle) transpToggle.classList.remove('on');
      const swatch = document.getElementById('navbar-color-swatch');
      const hex = document.getElementById('navbar-color-hex');
      if (swatch && hex && designColors[i].startsWith('#')) {
        swatch.value = designColors[i];
        hex.value = designColors[i];
      }
    }
    syncPreviewStyles();
    pushUndo('Navbar design');
    toast(`Navbar Design ${i+1} applied`, 'gold');
  });

  // Button styles
  initPresetCards('#navbar-btn-styles', (i) => {
    STUDIO.cms.navbar.buttonStyle = i;
    syncPreviewStyles();
    pushUndo('Navbar button style');
    markDirty();
  });

  // Animations
  initPresetCards('#navbar-anim-grid', (i) => {
    STUDIO.cms.navbar.animation = i;
    syncPreviewStyles();
    pushUndo('Navbar animation');
    markDirty();
  });

  // Hover animations
  initPresetCards('#navbar-hover-grid', (i) => {
    STUDIO.cms.navbar.hoverAnimation = i;
    syncPreviewStyles();
    markDirty();
  });

  // Height
  initSlider('navbar-slider-h', 'navbar-num-h', 'navbar-val-h', v => {
    STUDIO.cms.navbar.height = v;
    syncPreviewStyles();
    markDirty();
  }, 'px');

  // Bg color
  initColorPair('navbar-color-swatch', 'navbar-color-hex', v => {
    STUDIO.cms.navbar.bgColor = v;
    STUDIO.cms.navbar.transparent = false; // User picked a custom color; disable transparent so it displays immediately
    const transpToggle = document.getElementById('navbar-transparent-toggle');
    if (transpToggle) transpToggle.classList.remove('on');
    syncPreviewStyles();
    markDirty();
  });

  // Transparent toggle
  const transpToggle = document.getElementById('navbar-transparent-toggle');
  if (transpToggle) {
    transpToggle.addEventListener('click', () => {
      transpToggle.classList.toggle('on');
      STUDIO.cms.navbar.transparent = transpToggle.classList.contains('on');
      syncPreviewStyles();
      markDirty();
    });
  }
}

/* ══════════════════════════════════════════════════
   PAGE 3: HERO IMAGE EDITOR
══════════════════════════════════════════════════ */
function initHeroImagePage() {
  const cms = STUDIO.cms.hero;

  // Upload
  const upload = document.getElementById('hero-img-upload');
  if (upload) {
    upload.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        cms.src = ev.target.result;
        const prev = document.getElementById('hero-img-preview');
        if (prev) prev.src = ev.target.result;
        applyToPreview(doc => {
          const hero = doc.querySelector('.hero, .hero-section, [class*=hero]');
          if (hero) hero.style.backgroundImage = `url(${ev.target.result})`;
        });
        pushUndo('Hero image upload');
        toast('Hero image updated', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // Scale
  initSlider('hero-slider-scale', 'hero-num-scale', 'hero-val-scale', v => {
    cms.scale = v;
    applyToPreview(doc => {
      const hero = doc.querySelector('.hero, .hero-section');
      if (hero) hero.style.backgroundSize = v + '%';
    });
  }, '%');

  // Position X
  initSlider('hero-slider-posx', 'hero-num-posx', 'hero-val-posx', v => {
    cms.posX = v;
    applyToPreview(doc => {
      const hero = doc.querySelector('.hero, .hero-section');
      if (hero) hero.style.backgroundPositionX = v + '%';
    });
  }, '%');

  // Position Y
  initSlider('hero-slider-posy', 'hero-num-posy', 'hero-val-posy', v => {
    cms.posY = v;
    applyToPreview(doc => {
      const hero = doc.querySelector('.hero, .hero-section');
      if (hero) hero.style.backgroundPositionY = v + '%';
    });
  }, '%');

  // Hero height
  initSlider('hero-slider-height', 'hero-num-height', 'hero-val-height', v => {
    cms.height = v;
    applyToPreview(doc => {
      const hero = doc.querySelector('.hero, .hero-section');
      if (hero) hero.style.minHeight = v + 'vh';
    });
  }, 'vh');

  // Display mode
  document.querySelectorAll('#hero-display-modes .s-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#hero-display-modes .s-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cms.displayMode = btn.dataset.mode;
      applyToPreview(doc => {
        const hero = doc.querySelector('.hero, .hero-section');
        if (hero) hero.style.backgroundSize = cms.displayMode;
      });
      markDirty();
    });
  });

  // Animations
  initPresetCards('#hero-anim-grid', (i) => {
    cms.animation = i;
    pushUndo('Hero animation');
    markDirty();
  });

  // Overlay
  initColorPair('hero-overlay-swatch', 'hero-overlay-hex', v => {
    cms.overlayColor = v;
    applyOverlay();
  });

  initSlider('hero-slider-opacity', 'hero-num-opacity', 'hero-val-opacity', v => {
    cms.overlayOpacity = v;
    applyOverlay();
  }, '%');

  initSlider('hero-slider-brightness', 'hero-num-brightness', 'hero-val-brightness', v => {
    cms.brightness = v;
    applyOverlay();
  }, '%');

  initSlider('hero-slider-contrast', 'hero-num-contrast', 'hero-val-contrast', v => {
    cms.contrast = v;
    applyOverlay();
  }, '%');

  function applyOverlay() {
    applyToPreview(doc => {
      const hero = doc.querySelector('.hero, .hero-section');
      if (!hero) return;
      let media = hero.querySelector('.hero-media, .hero-slideshow');
      if (!media) media = hero;
      let overlay = media.querySelector(':scope > .rbh-studio-preview-overlay');
      if (!overlay) {
        overlay = doc.createElement('div');
        overlay.className = 'rbh-studio-preview-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        Object.assign(overlay.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: '2',
          transition: 'background .15s ease'
        });
        if (window.getComputedStyle && media !== hero) media.style.position = 'absolute';
        else if (media === hero && !hero.style.position) hero.style.position = 'relative';
        media.appendChild(overlay);
      }
      const color = /^#[0-9a-f]{6}$/i.test(cms.overlayColor || '') ? cms.overlayColor : '#000000';
      const alpha = Math.max(0, Math.min(100, Number(cms.overlayOpacity) || 0)) / 100;
      overlay.style.background = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      hero.querySelectorAll('.hero-media img, .hero-slideshow [data-hero-slide], .hero-media video').forEach(mediaImage => {
        mediaImage.style.filter =
          'brightness(' + Math.max(0, Number(cms.brightness) || 100) / 100 + ') ' +
          'contrast(' + Math.max(0, Number(cms.contrast) || 100) / 100 + ') ' +
          'blur(' + Math.max(0, Number(cms.blur) || 0) + 'px)';
      });
      const content = hero.querySelector('.hero-content');
      if (content) {
        content.style.position = 'relative';
        content.style.zIndex = '3';
      }
    });
    syncPreviewStyles();
    markDirty();
  }

  // Advanced hero toggles are stateful and are applied to the same live preview as the basic controls.
  const heroToggleState = {
    'hero-ken-burns': 'kenBurns',
    'hero-parallax': 'parallax',
    'hero-gradient': 'gradient',
    'hero-decorative': 'decorative'
  };
  Object.entries(heroToggleState).forEach(([id, property]) => {
    const toggle = document.getElementById(id + '-toggle');
    if (!toggle) return;
    toggle.classList.toggle('on', !!cms[property]);
    toggle.addEventListener('click', () => {
      pushUndo('Hero ' + property);
      cms[property] = toggle.classList.toggle('on');
      syncPreviewStyles();
      markDirty();
    });
  });

  // Persist the timings and blur; these values must survive save/reload.
  initSlider('hero-slider-animspeed', 'hero-num-animspeed', 'hero-val-animspeed', v => {
    cms.animationSpeed = v;
    syncPreviewStyles();
    markDirty();
  }, 's');
  initSlider('hero-slider-animdelay', 'hero-num-animdelay', 'hero-val-animdelay', v => {
    cms.animationDelay = v;
    syncPreviewStyles();
    markDirty();
  }, 's');
  initSlider('hero-slider-blur', 'hero-num-blur', 'hero-val-blur', v => {
    cms.blur = v;
    applyOverlay();
    syncPreviewStyles();
    markDirty();
  }, 'px');
}

/* ══════════════════════════════════════════════════
   PAGE 4: HERO HEADING
══════════════════════════════════════════════════ */
function initHeroHeadingPage() {
  const cms = STUDIO.cms.heroHeading;

  const textInput = document.getElementById('hero-heading-text');
  if (textInput) {
    textInput.value = cms.text;
    textInput.oninput = () => {
      cms.text = textInput.value;
      applyToPreview(doc => {
        const h = doc.querySelector('.hero-content h1') || doc.querySelector('.hero h1, .hero-title, [class*=hero-heading], [class*=hero-title]');
        if (h) {
          const primary = h.querySelector('.hero-title-primary');
          const accent = h.querySelector('.hero-title-accent');
          const words = String(cms.text).trim().split(/\s+/);
          if (primary && accent && words.length) {
            accent.textContent = words.pop() || '';
            primary.textContent = words.join(' ') + (words.length ? ' ' : '');
          } else {
            h.textContent = cms.text;
          }
        }
      });
      syncPreviewStyles();
      markDirty();
    };
  }

  initPresetCards('#heading-anim-grid', (i) => { cms.animation = i; pushUndo('Heading animation'); syncPreviewStyles(); toast(`Animation ${i+1} applied`, 'gold'); });
  initPresetCards('#heading-font-grid', (i) => { cms.font = i; pushUndo('Heading font'); syncPreviewStyles(); markDirty(); });
  initPresetCards('#heading-color-grid', (i) => { cms.colorCombo = i; pushUndo('Heading color'); syncPreviewStyles(); markDirty(); });

  initSlider('heading-slider-size', 'heading-num-size', 'heading-val-size', v => {
    cms.size = v;
    applyToPreview(doc => {
      const h = doc.querySelector('.hero h1, .hero-title');
      if (h) h.style.fontSize = v + 'px';
    });
  }, 'px');

  initSlider('heading-slider-lh', 'heading-num-lh', 'heading-val-lh', v => {
    cms.lineHeight = v / 100;
    applyToPreview(doc => {
      const h = doc.querySelector('.hero h1, .hero-title');
      if (h) h.style.lineHeight = v / 100;
    });
  });

  initSlider('heading-slider-ls', 'heading-num-ls', 'heading-val-ls', v => {
    cms.letterSpacing = v;
    applyToPreview(doc => {
      const h = doc.querySelector('.hero h1, .hero-title');
      if (h) h.style.letterSpacing = v + 'px';
    });
  }, 'px');

  // Alignment chips
  document.querySelectorAll('#heading-align-chips .s-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#heading-align-chips .s-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      cms.align = chip.dataset.val;
      applyToPreview(doc => {
        const h = doc.querySelector('.hero-content h1') || doc.querySelector('.hero h1, .hero-title');
        if (h) h.style.textAlign = cms.align;
      });
      syncPreviewStyles();
      markDirty();
    });
  });
}

/* ══════════════════════════════════════════════════
   PAGE 5: HERO SUBHEADING
══════════════════════════════════════════════════ */
function initHeroSubPage() {
  const cms = STUDIO.cms.heroSub;

  const textInput = document.getElementById('hero-sub-text');
  if (textInput) {
    textInput.value = cms.text;
    textInput.oninput = () => {
      cms.text = textInput.value;
      applyToPreview(doc => {
        const h = doc.querySelector('.hero p, .hero-subtitle, .hero-description');
        if (h) h.textContent = cms.text;
      });
      markDirty();
    };
  }

  initPresetCards('#sub-preset-grid', (i) => { cms.preset = i; pushUndo('Sub preset'); syncPreviewStyles(); markDirty(); });

  initSlider('sub-slider-size', 'sub-num-size', 'sub-val-size', v => {
    cms.size = v;
    applyToPreview(doc => {
      const h = doc.querySelector('.hero p, .hero-subtitle');
      if (h) h.style.fontSize = v + 'px';
    });
  }, 'px');

  initSlider('sub-slider-lh', 'sub-num-lh', 'sub-val-lh', v => {
    cms.lineHeight = v / 100;
    syncPreviewStyles();
    markDirty();
  });

  document.querySelectorAll('#sub-align-chips .s-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#sub-align-chips .s-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      cms.align = chip.dataset.val;
      applyToPreview(doc => {
        const h = doc.querySelector('.hero-content .lede') || doc.querySelector('.hero p, .hero-subtitle');
        if (h) h.style.textAlign = cms.align;
      });
      syncPreviewStyles();
      markDirty();
    });
  });

  initColorPair('sub-color-swatch', 'sub-color-hex', v => {
    cms.color = v;
    applyToPreview(doc => {
      const h = doc.querySelector('.hero-content .lede') || doc.querySelector('.hero p, .hero-subtitle');
      if (h) h.style.color = v;
    });
    syncPreviewStyles();
    markDirty();
  });
}

/* ══════════════════════════════════════════════════
   PAGE 6: BACKGROUND & ANIMATION
══════════════════════════════════════════════════ */
function initBgPage() {
  const cms = STUDIO.cms.background;

  const upload = document.getElementById('bg-upload');
  if (upload) {
    upload.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        cms.src = ev.target.result;
        const prev = document.getElementById('bg-preview-img');
        if (prev) { prev.src = ev.target.result; prev.style.display = 'block'; }
        markDirty();
        syncPreviewStyles();
        toast('Background uploaded to the current draft. Save Draft to persist it.', 'gold');
      };
      reader.readAsDataURL(file);
    });
  }

  initPresetCards('#bg-anim-grid', (i) => { cms.animation = i; pushUndo('Background animation'); toast(`BG Animation ${i+1} applied`, 'gold'); });

  initSlider('bg-slider-posx', 'bg-num-posx', 'bg-val-posx', v => { cms.posX = v; syncPreviewStyles(); markDirty(); }, '%');
  initSlider('bg-slider-posy', 'bg-num-posy', 'bg-val-posy', v => { cms.posY = v; syncPreviewStyles(); markDirty(); }, '%');
  initSlider('bg-slider-opacity', 'bg-num-opacity', 'bg-val-opacity', v => { cms.overlayOpacity = v; syncPreviewStyles(); markDirty(); }, '%');

  initColorPair('bg-overlay-swatch', 'bg-overlay-hex', v => { cms.overlayColor = v; syncPreviewStyles(); markDirty(); });
}

/* ══════════════════════════════════════════════════
   PAGE 7: VIDEO MANAGEMENT
══════════════════════════════════════════════════ */
function initVideoPage() {
  const cms = STUDIO.cms.video;

  const upload = document.getElementById('video-upload');
  const videoEl = document.getElementById('video-preview-el');
  const noVideo = document.getElementById('video-no-video');
  const sourceUrl = document.getElementById('video-source-url');
  const posterInput = document.getElementById('video-poster-url');
  const applyVideoPreview = () => {
    if (!videoEl) return;
    videoEl.autoplay = cms.autoplay !== false;
    videoEl.loop = cms.loop !== false;
    videoEl.muted = cms.muted !== false;
    videoEl.controls = cms.controls === true;
    videoEl.playsInline = cms.playsInline !== false;
    videoEl.objectFit = cms.objectFit || 'cover';
    videoEl.style.objectFit = cms.objectFit || 'cover';
    videoEl.style.objectPosition = (Number(cms.posX ?? 50)) + '% ' + (Number(cms.posY ?? 50)) + '%';
    if (cms.poster) videoEl.poster = cms.poster;
  };

  if (sourceUrl) {
    sourceUrl.value = /^https?:\/\//i.test(cms.src || '') || String(cms.src || '').startsWith('/') || String(cms.src || '').startsWith('assets/')
      ? cms.src : '';
    sourceUrl.addEventListener('change', () => {
      const value = sourceUrl.value.trim();
      if (value && !/^https?:\/\//i.test(value) && !value.startsWith('/') && !value.startsWith('assets/')) {
        toast('Use an HTTPS video URL or a path inside assets/.', 'error');
        return;
      }
      if (value.startsWith('blob:') || value.startsWith('data:')) {
        toast('Temporary/local URLs cannot be published. Use a persistent HTTPS/CDN URL.', 'error');
        return;
      }
      cms.src = value;
      if (videoEl) {
        if (value) {
          videoEl.src = value;
          videoEl.style.display = 'block';
          videoEl.load();
          if (noVideo) noVideo.style.display = 'none';
        } else {
          videoEl.removeAttribute('src');
          videoEl.style.display = 'none';
          if (noVideo) noVideo.style.display = '';
        }
      }
      markDirty();
      syncPreviewStyles();
    });
  }

  if (posterInput) {
    posterInput.value = cms.poster || 'assets/images/hero-venue.jpg';
    posterInput.addEventListener('change', () => {
      cms.poster = posterInput.value.trim();
      applyVideoPreview();
      markDirty();
    });
  }

  if (upload) {
    upload.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!/^video\//i.test(file.type) || file.size > 50 * 1024 * 1024) {
        toast('Choose a video under 50MB in a browser-supported format.', 'error');
        upload.value = '';
        return;
      }
      // Object URLs are intentionally preview-only; saving a blob: URL breaks after refresh.
      const temporaryUrl = URL.createObjectURL(file);
      if (videoEl) {
        videoEl.src = temporaryUrl;
        videoEl.style.display = 'block';
        applyVideoPreview();
        videoEl.load();
      }
      if (noVideo) noVideo.style.display = 'none';
      toast('Local preview ready. Paste a permanent HTTPS/CDN video URL before saving.', 'gold');
    });
  }

  // Every playback control writes a field in the saved CMS and updates the local preview.
  const videoToggleMap = {
    'video-autoplay': 'autoplay',
    'video-loop': 'loop',
    'video-muted': 'muted',
    'video-controls': 'controls',
    'video-inline': 'playsInline'
  };
  Object.entries(videoToggleMap).forEach(([id, property]) => {
    const t = document.getElementById(id + '-toggle');
    if (!t) return;
    t.classList.toggle('on', cms[property] !== false && (property !== 'controls' || cms.controls === true));
    t.addEventListener('click', () => {
      pushUndo('Video ' + property);
      cms[property] = !t.classList.contains('on');
      t.classList.toggle('on', cms[property]);
      applyVideoPreview();
      markDirty();
      syncPreviewStyles();
    });
  });

  document.querySelectorAll('#page-video .s-display-modes .s-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === (cms.objectFit || 'cover'));
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-video .s-display-modes .s-mode-btn').forEach(other => other.classList.toggle('active', other === btn));
      cms.objectFit = btn.dataset.mode;
      applyVideoPreview();
      markDirty();
      syncPreviewStyles();
    });
  });

  initSlider('video-slider-posx', 'video-num-posx', 'video-val-posx', v => { cms.posX = v; applyVideoPreview(); markDirty(); syncPreviewStyles(); }, '%');
  initSlider('video-slider-posy', 'video-num-posy', 'video-val-posy', v => { cms.posY = v; applyVideoPreview(); markDirty(); syncPreviewStyles(); }, '%');
  applyVideoPreview();
}

/* ══════════════════════════════════════════════════
   PAGE 8: IMAGE LIBRARY
══════════════════════════════════════════════════ */
function initImageLibraryPage() {
  let selectedImg = null;
  const images = [
    'assets/images/hero-venue.jpg','assets/images/hall-interior.jpg',
    'assets/images/stage-celebration.jpg','assets/images/venue-entrance.jpg',
    'assets/images/photo-01.jpeg','assets/images/photo-02.jpeg',
    'assets/images/photo-03.jpeg','assets/images/photo-04.jpeg',
    'assets/images/photo-05.jpeg','assets/images/photo-06.jpeg',
    'assets/images/photo-07.jpeg','assets/images/photo-08.jpeg',
    'assets/images/photo-09.jpeg','assets/images/photo-10.jpeg',
    'assets/images/photo-11.jpeg','assets/images/photo-12.jpeg',
    'assets/images/photo-13.jpeg','assets/images/photo-14.jpeg',
    'assets/images/photo-15.jpeg','assets/images/photo-16.jpeg',
    'assets/images/photo-17.jpeg','assets/images/photo-18.jpeg',
  ];

  const grid = document.getElementById('img-library-grid');
  if (!grid) return;
  grid.innerHTML = '';
  images.forEach((src, i) => {
    const name = src.split('/').pop();
    const item = document.createElement('div');
    item.className = 's-img-item';
    item.innerHTML = `
      <img src="${src}" alt="${name}" loading="lazy">
      <div class="s-img-overlay">
        <button class="s-img-ob" data-action="set" title="Set as hero"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
        <button class="s-img-ob" data-action="rename" title="Rename"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="s-img-ob" data-action="delete" title="Delete"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
      </div>
      <div class="s-img-name">${name}</div>
    `;
    item.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'set') {
        STUDIO.cms.hero.src = src;
        applyToPreview(doc => {
          const hero = doc.querySelector('.hero, .hero-section');
          if (hero) hero.style.backgroundImage = `url(${src})`;
        });
        toast(`Hero set to ${name}`, 'success');
      } else if (action === 'rename') {
        const newName = prompt('New name for ' + name + ':', name);
        if (newName) { item.querySelector('.s-img-name').textContent = newName; toast('Renamed', 'gold'); }
      } else if (action === 'delete') {
        if (confirm(`Delete ${name}? This cannot be undone.`)) { item.remove(); toast('Asset removed', 'error'); }
      } else {
        grid.querySelectorAll('.s-img-item').forEach(it => it.classList.remove('active'));
        item.classList.add('active');
        selectedImg = src;
        const selName = document.getElementById('selected-img-name');
        const selPreview = document.getElementById('selected-img-preview');
        if (selName) selName.textContent = name;
        if (selPreview) selPreview.src = src;
      }
    });
    grid.appendChild(item);
  });

  // Upload more
  const upload = document.getElementById('img-lib-upload');
  if (upload) {
    upload.addEventListener('change', e => {
      [...e.target.files].forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          const item = document.createElement('div');
          item.className = 's-img-item';
          const name = file.name;
          item.innerHTML = `<img src="${ev.target.result}" alt="${name}"><div class="s-img-overlay"></div><div class="s-img-name">${name}</div>`;
          grid.prepend(item);
          toast(`${name} added to library`, 'success');
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Resize / crop controls
  initSlider('imglib-slider-w', 'imglib-num-w', 'imglib-val-w', v => { markDirty(); }, 'px');
  initSlider('imglib-slider-h', 'imglib-num-h', 'imglib-val-h', v => { markDirty(); }, 'px');
}

/* ══════════════════════════════════════════════════
   PAGE 9: THEME LIBRARY
══════════════════════════════════════════════════ */
const THEMES = [
  { name: 'Royal Dark', tag: 'Default', nav: '#0a0b0d', hero: '#1a1200', btn: '#c6a15b' },
  { name: 'Midnight Gold', tag: 'Luxury', nav: '#0d0a1f', hero: '#1a0f2e', btn: '#f0c060' },
  { name: 'Rose Ivory', tag: 'Elegant', nav: '#1a0a0f', hero: '#f5f0ea', btn: '#c0697a' },
  { name: 'Forest Velvet', tag: 'Nature', nav: '#0a1a0f', hero: '#1a2f1a', btn: '#5ca870' },
  { name: 'Ocean Slate', tag: 'Modern', nav: '#0a1020', hero: '#0f1e35', btn: '#4a9fd4' },
  { name: 'Champagne', tag: 'Wedding', nav: '#f5f0e7', hero: '#faf7f2', btn: '#c6a15b' },
  { name: 'Crimson Night', tag: 'Dramatic', nav: '#0f0a0a', hero: '#1a0a0f', btn: '#d45050' },
  { name: 'Arctic Silver', tag: 'Minimal', nav: '#111827', hero: '#f8fafc', btn: '#6b7280' },
  { name: 'Ember Glow', tag: 'Warm', nav: '#1a0e05', hero: '#2d1a08', btn: '#e8874a' },
  { name: 'Pearl & Navy', tag: 'Classic', nav: '#0a0f2e', hero: '#f0f4ff', btn: '#3b5bdb' },
];

function initThemePage() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = '';
  THEMES.forEach((theme, i) => {
    const card = document.createElement('div');
    card.className = `s-theme-card${i === STUDIO.cms.theme.active ? ' active' : ''}`;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="s-theme-preview" style="background:${theme.hero};">
        <div class="s-tp-nav" style="background:${theme.nav};"></div>
        <div class="s-tp-hero" style="background:${theme.btn};opacity:0.5;"></div>
        <div class="s-tp-btn" style="background:${theme.btn};"></div>
      </div>
      <div class="s-theme-info">
        <div>
          <div class="s-theme-name">${theme.name}</div>
          <div class="s-theme-tag">${theme.tag}</div>
        </div>
        <button class="s-theme-apply" data-i="${i}">Apply</button>
      </div>
    `;
    card.querySelector('.s-theme-apply').addEventListener('click', (e) => {
      e.stopPropagation();
      applyTheme(i);
    });
    card.addEventListener('click', () => applyTheme(i));
    grid.appendChild(card);
  });
}

function applyTheme(i) {
  pushUndo('Theme change');
  STUDIO.cms.theme.active = i;
  const theme = THEMES[i];
  // Persist the theme palette into the shared CMS shape so public pages match the preview.
  STUDIO.cms.navbar = STUDIO.cms.navbar || {};
  STUDIO.cms.navbar.bgColor = theme.nav;
  STUDIO.cms.navbar.transparent = false;
  STUDIO.cms.buttons = STUDIO.cms.buttons || {};
  STUDIO.cms.buttons.gold = STUDIO.cms.buttons.gold || {};
  STUDIO.cms.buttons.gold.bgType = 'solid';
  STUDIO.cms.buttons.gold.bgColor = theme.btn;
  STUDIO.cms.buttons.gold.textColor = ['#f5f0ea', '#f8fafc', '#0a0b0d'].includes(theme.btn.toLowerCase()) ? '#171d19' : '#171d19';
  document.getElementById('theme-grid')?.querySelectorAll('.s-theme-card').forEach((c, idx) => c.classList.toggle('active', idx === i));
  applyToPreview(doc => {
    doc.documentElement.style.setProperty('--gold', theme.btn);
    doc.documentElement.style.setProperty('--ink', theme.nav);
    const nav = doc.querySelector('nav, header');
    if (nav) nav.style.background = theme.nav;
    const hero = doc.querySelector('.hero, .hero-section');
    if (hero) hero.style.background = theme.hero;
  });
  toast(`Theme "${theme.name}" applied!`, 'gold');
  markDirty();
}

/* ══════════════════════════════════════════════════
   PAGE 10: ANIMATION LIBRARY
══════════════════════════════════════════════════ */
const ANIMATIONS = [
  { name: 'Fade In', emoji: '✨' },
  { name: 'Slide Up', emoji: '⬆️' },
  { name: 'Slide Down', emoji: '⬇️' },
  { name: 'Slide Left', emoji: '⬅️' },
  { name: 'Slide Right', emoji: '➡️' },
  { name: 'Zoom In', emoji: '🔍' },
  { name: 'Zoom Out', emoji: '🔎' },
  { name: 'Bounce', emoji: '🏀' },
  { name: 'Flip X', emoji: '↔️' },
  { name: 'Flip Y', emoji: '↕️' },
  { name: 'Rotate', emoji: '🔄' },
  { name: 'Shake', emoji: '📳' },
  { name: 'Pulse', emoji: '💓' },
  { name: 'Wobble', emoji: '〰️' },
  { name: 'Swing', emoji: '🎢' },
  { name: 'Tada', emoji: '🎉' },
  { name: 'Rubberband', emoji: '🪀' },
  { name: 'Jello', emoji: '🟡' },
  { name: 'HeartBeat', emoji: '❤️' },
  { name: 'Ken Burns', emoji: '🎥' },
  { name: 'Parallax', emoji: '🏔️' },
  { name: 'Typewriter', emoji: '⌨️' },
  { name: 'Glitch', emoji: '📺' },
  { name: 'Blur In', emoji: '🌫️' },
  { name: 'Float', emoji: '🎈' },
  { name: 'Skew X', emoji: '📐' },
  { name: 'Roll In', emoji: '🎲' },
  { name: 'Light Speed', emoji: '⚡' },
  { name: 'Back In Up', emoji: '🚀' },
  { name: 'Back In Down', emoji: '🛬' },
  { name: 'Back In Left', emoji: '🏹' },
  { name: 'Back In Right', emoji: '🎯' },
  { name: 'Hinge', emoji: '🚪' },
  { name: 'Jack In Box', emoji: '🎁' },
  { name: 'Roll Out', emoji: '🎳' },
  { name: 'Zoom In Left', emoji: '🎠' },
  { name: 'Zoom In Right', emoji: '🎡' },
  { name: 'Zoom In Up', emoji: '🎢' },
  { name: 'Zoom In Down', emoji: '🎪' },
  { name: 'Attention', emoji: '📣' },
];

function initAnimationPage() {
  const grid = document.getElementById('anim-lib-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ANIMATIONS.forEach((anim, i) => {
    const card = document.createElement('div');
    card.className = `s-anim-card${STUDIO.cms.animations.activeItems.includes(i) ? ' active' : ''}`;
    card.dataset.index = i;
    card.innerHTML = `<div class="s-anim-thumb">${anim.emoji}</div><div class="s-anim-name">${anim.name}</div>`;
    card.addEventListener('click', () => {
      pushUndo('Animation toggle');
      const idx = STUDIO.cms.animations.activeItems.indexOf(i);
      if (idx > -1) {
        STUDIO.cms.animations.activeItems.splice(idx, 1);
        card.classList.remove('active');
      } else {
        STUDIO.cms.animations.activeItems.push(i);
        card.classList.add('active');
      }
      syncPreviewStyles();
      toast(anim.name + ' ' + (card.classList.contains('active') ? 'enabled' : 'disabled'), 'gold');
    });
    grid.appendChild(card);
  });

  // Persist animation timings, selected targets and behavior.
  const model = STUDIO.cms.animations;
  initSlider('anim-slider-speed', 'anim-num-speed', 'anim-val-speed', v => { model.speed = v; markDirty(); syncPreviewStyles(); }, 's');
  initSlider('anim-slider-delay', 'anim-num-delay', 'anim-val-delay', v => { model.delay = v; markDirty(); syncPreviewStyles(); }, 's');
  initSlider('anim-slider-duration', 'anim-num-duration', 'anim-val-duration', v => { model.duration = v; markDirty(); syncPreviewStyles(); }, 'ms');

  document.querySelectorAll('#anim-target-chips .s-chip').forEach(chip => {
    const target = chip.textContent.trim();
    chip.classList.toggle('active', model.targets.includes(target));
    chip.addEventListener('click', () => {
      const index = model.targets.indexOf(target);
      if (index >= 0 && model.targets.length > 1) {
        model.targets.splice(index, 1);
        chip.classList.remove('active');
      } else if (index < 0) {
        model.targets.push(target);
        chip.classList.add('active');
      }
      markDirty();
      syncPreviewStyles();
    });
  });

  document.querySelectorAll('#anim-direction-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.trim() === model.direction);
    chip.addEventListener('click', () => {
      document.querySelectorAll('#anim-direction-chips .s-chip').forEach(item => item.classList.toggle('active', item === chip));
      model.direction = chip.textContent.trim();
      markDirty();
      syncPreviewStyles();
    });
  });

  const scrollToggle = document.getElementById('anim-scroll-trigger');
  const repeatToggle = document.getElementById('anim-repeat-toggle');
  if (scrollToggle) {
    scrollToggle.classList.toggle('on', !!model.scrollTrigger);
    scrollToggle.addEventListener('click', () => {
      model.scrollTrigger = scrollToggle.classList.toggle('on');
      markDirty();
      syncPreviewStyles();
    });
  }
  if (repeatToggle) {
    repeatToggle.classList.toggle('on', !!model.repeatEveryView);
    repeatToggle.addEventListener('click', () => {
      model.repeatEveryView = repeatToggle.classList.toggle('on');
      markDirty();
      syncPreviewStyles();
    });
  }
}

/* ══════════════════════════════════════════════════
   PAGE 11: VISUAL EFFECTS
══════════════════════════════════════════════════ */
const EFFECTS = [
  { name: 'Glass Morphism', emoji: '🔮', cat: 'Background' },
  { name: 'Neon Glow', emoji: '💫', cat: 'Text' },
  { name: 'Gradient Border', emoji: '🌈', cat: 'Border' },
  { name: 'Drop Shadow', emoji: '🌑', cat: 'Shadow' },
  { name: 'Blur Backdrop', emoji: '🌫️', cat: 'Background' },
  { name: 'Gold Shimmer', emoji: '✨', cat: 'Text' },
  { name: 'Hover Lift', emoji: '☁️', cat: 'Hover' },
  { name: 'Scale On Hover', emoji: '🔭', cat: 'Hover' },
  { name: 'Color Tint', emoji: '🎨', cat: 'Image' },
  { name: 'Vignette', emoji: '🔲', cat: 'Image' },
  { name: 'Grain Texture', emoji: '📺', cat: 'Background' },
  { name: 'Light Leak', emoji: '💡', cat: 'Background' },
  { name: 'Bokeh Effect', emoji: '🌸', cat: 'Background' },
  { name: 'Overlay Tint', emoji: '🎭', cat: 'Image' },
  { name: 'Inner Shadow', emoji: '⬛', cat: 'Shadow' },
  { name: 'Box Inset', emoji: '📦', cat: 'Shadow' },
  { name: 'Text Emboss', emoji: '🗿', cat: 'Text' },
  { name: 'Underline Glow', emoji: '📏', cat: 'Text' },
  { name: 'Outline Stroke', emoji: '🖊️', cat: 'Text' },
  { name: 'Reflection', emoji: '🪞', cat: 'Image' },
  { name: 'Frosted Glass', emoji: '🧊', cat: 'Background' },
  { name: 'Parallax Depth', emoji: '🏔️', cat: 'Background' },
  { name: 'Gradient Text', emoji: '🌅', cat: 'Text' },
  { name: 'Button Glow', emoji: '🔦', cat: 'Button' },
  { name: 'Ripple Click', emoji: '💧', cat: 'Hover' },
  { name: 'Morph Shape', emoji: '🔴', cat: 'Shape' },
  { name: 'Scanlines', emoji: '📡', cat: 'Background' },
  { name: 'Duotone', emoji: '🎴', cat: 'Image' },
  { name: 'Color Shift', emoji: '🎠', cat: 'Hover' },
  { name: 'Border Pulse', emoji: '💓', cat: 'Border' },
  { name: 'Text Shadow', emoji: '👥', cat: 'Text' },
  { name: 'Ambient Glow', emoji: '🌟', cat: 'Shadow' },
  { name: 'Masked Reveal', emoji: '🎭', cat: 'Transition' },
  { name: 'Invert On Hover', emoji: '🔄', cat: 'Hover' },
  { name: 'Lens Flare', emoji: '☀️', cat: 'Background' },
  { name: 'Paint Streak', emoji: '🖌️', cat: 'Background' },
  { name: 'Glitch Lines', emoji: '⚡', cat: 'Text' },
  { name: 'Rotate Border', emoji: '🔁', cat: 'Border' },
  { name: 'Noise Overlay', emoji: '🎲', cat: 'Background' },
  { name: 'Chromatic Aberr.', emoji: '🌈', cat: 'Text' },
];

function initEffectsPage() {
  const grid = document.getElementById('effects-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Filter chips
  const cats = ['All', ...new Set(EFFECTS.map(e => e.cat))];
  const filterBar = document.getElementById('effects-filter-bar');
  if (filterBar) {
    filterBar.innerHTML = '';
    cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `s-chip${cat === 'All' ? ' active' : ''}`;
      chip.textContent = cat;
      chip.addEventListener('click', () => {
        filterBar.querySelectorAll('.s-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filterEffects(cat);
      });
      filterBar.appendChild(chip);
    });
  }

  EFFECTS.forEach((eff, i) => {
    const card = document.createElement('div');
    card.className = `s-effect-card${STUDIO.cms.effects.activeItems.includes(i) ? ' active' : ''}`;
    card.dataset.index = i;
    card.dataset.cat = eff.cat;
    card.innerHTML = `
      <div class="s-effect-icon">${eff.emoji}</div>
      <div class="s-effect-name">${eff.name}</div>
      <div class="s-effect-desc">${eff.cat}</div>
    `;
    card.addEventListener('click', () => {
      pushUndo('Effect toggle');
      const idx = STUDIO.cms.effects.activeItems.indexOf(i);
      if (idx > -1) { STUDIO.cms.effects.activeItems.splice(idx, 1); card.classList.remove('active'); }
      else { STUDIO.cms.effects.activeItems.push(i); card.classList.add('active'); }
      syncPreviewStyles();
      toast(eff.name + ' ' + (card.classList.contains('active') ? 'applied' : 'removed'), 'gold');
    });
    grid.appendChild(card);
  });

  function filterEffects(cat) {
    grid.querySelectorAll('.s-effect-card').forEach(card => {
      card.style.display = (cat === 'All' || card.dataset.cat === cat) ? '' : 'none';
    });
  }

  initSlider('effects-slider-intensity', 'effects-num-intensity', 'effects-val-intensity', v => {
    STUDIO.cms.effects.intensity = v;
    markDirty();
    syncPreviewStyles();
  }, '%');
}

/* ══════════════════════════════════════════════════
   PAGE 12: COMPONENTS LIBRARY
══════════════════════════════════════════════════ */
const COMPONENTS = [
  { name: 'Gold CTA Button', cat: 'Button', thumb: '🟡' },
  { name: 'Outline Button', cat: 'Button', thumb: '⬜' },
  { name: 'Pill Badge', cat: 'Badge', thumb: '💊' },
  { name: 'Gold Badge', cat: 'Badge', thumb: '🏅' },
  { name: 'Service Card', cat: 'Card', thumb: '🃏' },
  { name: 'Feature Block', cat: 'Section', thumb: '📦' },
  { name: 'Testimonial Card', cat: 'Card', thumb: '💬' },
  { name: 'Pricing Card', cat: 'Card', thumb: '💎' },
  { name: 'Gallery Grid', cat: 'Image', thumb: '🖼️' },
  { name: 'Image Masonry', cat: 'Image', thumb: '🎨' },
  { name: 'Divider Line', cat: 'Layout', thumb: '➖' },
  { name: 'Section Header', cat: 'Layout', thumb: '📋' },
  { name: 'Stats Counter', cat: 'Section', thumb: '📊' },
  { name: 'Team Member', cat: 'Card', thumb: '👤' },
  { name: 'Icon Feature', cat: 'Card', thumb: '⭐' },
  { name: 'Event Timeline', cat: 'Section', thumb: '📅' },
  { name: 'Package List', cat: 'Section', thumb: '📋' },
  { name: 'Contact Form', cat: 'Form', thumb: '📝' },
  { name: 'Map Embed', cat: 'Embed', thumb: '🗺️' },
  { name: 'Video Hero', cat: 'Section', thumb: '🎬' },
  { name: 'Countdown Timer', cat: 'Widget', thumb: '⏱️' },
  { name: 'Booking Widget', cat: 'Form', thumb: '📅' },
  { name: 'Accordion FAQ', cat: 'Section', thumb: '❓' },
  { name: 'Tab Section', cat: 'Section', thumb: '📂' },
  { name: 'Progress Bar', cat: 'Widget', thumb: '📈' },
  { name: 'Social Links', cat: 'Widget', thumb: '🔗' },
  { name: 'Newsletter Form', cat: 'Form', thumb: '📧' },
  { name: 'Alert Banner', cat: 'Widget', thumb: '🔔' },
  { name: 'Sticky Header', cat: 'Nav', thumb: '📌' },
  { name: 'Breadcrumb', cat: 'Nav', thumb: '🍞' },
  { name: 'Back to Top', cat: 'Nav', thumb: '⬆️' },
  { name: 'Cookie Notice', cat: 'Widget', thumb: '🍪' },
  { name: 'Quote Block', cat: 'Content', thumb: '❝' },
  { name: 'Blog Card', cat: 'Card', thumb: '📰' },
  { name: 'Icon Grid', cat: 'Section', thumb: '🔶' },
  { name: 'Full Width CTA', cat: 'Section', thumb: '📢' },
  { name: 'Split Section', cat: 'Layout', thumb: '📐' },
  { name: 'Overlay Card', cat: 'Card', thumb: '🖼️' },
  { name: 'Highlight Strip', cat: 'Section', thumb: '🌟' },
  { name: 'Floating Action', cat: 'Button', thumb: '🔵' },
];

function initComponentsPage() {
  const grid = document.getElementById('components-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Filter
  const cats = ['All', ...new Set(COMPONENTS.map(c => c.cat))];
  const filterBar = document.getElementById('comp-filter-bar');
  if (filterBar) {
    filterBar.innerHTML = '';
    cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `s-chip${cat === 'All' ? ' active' : ''}`;
      chip.textContent = cat;
      chip.addEventListener('click', () => {
        filterBar.querySelectorAll('.s-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        grid.querySelectorAll('.s-comp-card').forEach(c => {
          c.style.display = (cat === 'All' || c.dataset.cat === cat) ? '' : 'none';
        });
      });
      filterBar.appendChild(chip);
    });
  }

  COMPONENTS.forEach((comp, i) => {
    const card = document.createElement('div');
    card.className = `s-comp-card${STUDIO.cms.components.activeItems.includes(i) ? ' active' : ''}`;
    card.dataset.index = i;
    card.dataset.cat = comp.cat;
    card.innerHTML = `
      <div class="s-comp-thumb" style="font-size:1.8rem;">${comp.thumb}</div>
      <div class="s-comp-info">
        <div class="s-comp-name">${comp.name}</div>
        <div class="s-comp-cat">${comp.cat}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      pushUndo('Component toggle');
      const idx = STUDIO.cms.components.activeItems.indexOf(i);
      if (idx > -1) { STUDIO.cms.components.activeItems.splice(idx, 1); card.classList.remove('active'); }
      else { STUDIO.cms.components.activeItems.push(i); card.classList.add('active'); }
      syncPreviewStyles();
      toast(comp.name + ' ' + (card.classList.contains('active') ? 'enabled' : 'disabled') + ' for the live layout', 'gold');
    });
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════
   PAGE 13: FONT ANIMATION LIBRARY
══════════════════════════════════════════════════ */
const FONT_ANIMS = [
  'Typewriter','Wave','Gradient Slide','Neon Flicker','Gold Shimmer',
  'Bounce In','Elastic Snap','Blur Reveal','Letter Scatter','Word Fade',
  'Split Reveal','Slide Up Each','Rotate In','Swing In','Perspective',
  'Color Cycle','Glow Pulse','Shadow Expand','Underline Draw','Strike Through',
  'Char Flip','Liquid Morph','Scramble','Matrix Decode','Pixel Build',
  'Stamp In','Retract','Expand & Contract','Wobble Text','Spiral',
  'Rainbow Sweep','Fire Flicker','Ice Crystallize','Vintage Flicker','Cinematic',
  'Masked Wipe','Curtain Drop','Spring Bounce','Magnetic Pull','Atmospheric'
];

function initFontAnimPage() {
  const list = document.getElementById('font-anim-list');
  if (!list) return;
  list.innerHTML = '';
  FONT_ANIMS.forEach((name, i) => {
    const item = document.createElement('div');
    item.className = `s-fa-item${STUDIO.cms.fontAnimations.active === i ? ' active' : ''}`;
    item.dataset.index = i;
    item.innerHTML = `
      <div class="s-fa-num">${String(i+1).padStart(2,'0')}</div>
      <div class="s-fa-name">${name}</div>
      <div class="s-fa-preview">Aa</div>
    `;
    item.addEventListener('click', () => {
      list.querySelectorAll('.s-fa-item').forEach(it => it.classList.remove('active'));
      item.classList.add('active');
      STUDIO.cms.fontAnimations.active = i;
      pushUndo('Font animation');
      toast(`"${name}" applied`, 'gold');
      markDirty();
      previewFontAnim(name, i);
      syncPreviewStyles();
    });
    list.appendChild(item);
  });

  const model = STUDIO.cms.fontAnimations;
  initSlider('fontanim-slider-speed', 'fontanim-num-speed', 'fontanim-val-speed', v => { model.speed = v; markDirty(); syncPreviewStyles(); }, 's');
  initSlider('fontanim-slider-delay', 'fontanim-num-delay', 'fontanim-val-delay', v => { model.delay = v; markDirty(); syncPreviewStyles(); }, 's');
  initSlider('fontanim-slider-duration', 'fontanim-num-duration', 'fontanim-val-duration', v => { model.duration = v; markDirty(); syncPreviewStyles(); }, 'ms');

  document.querySelectorAll('#fontanim-target-chips .s-chip').forEach(chip => {
    const target = chip.textContent.trim();
    chip.classList.toggle('active', model.targets.includes(target));
    chip.addEventListener('click', () => {
      const idx = model.targets.indexOf(target);
      if (idx >= 0 && model.targets.length > 1) {
        model.targets.splice(idx, 1);
        chip.classList.remove('active');
      } else if (idx < 0) {
        model.targets.push(target);
        chip.classList.add('active');
      }
      markDirty();
      syncPreviewStyles();
    });
  });

  document.querySelectorAll('#fontanim-repeat-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.trim() === model.repeat);
    chip.addEventListener('click', () => {
      document.querySelectorAll('#fontanim-repeat-chips .s-chip').forEach(item => item.classList.toggle('active', item === chip));
      model.repeat = chip.textContent.trim();
      markDirty();
      syncPreviewStyles();
    });
  });
}

function previewFontAnim(name, i) {
  const prev = document.getElementById('fontanim-preview-text');
  if (!prev) return;
  prev.style.animation = 'none';
  prev.offsetHeight; // trigger reflow
  const animations = {
    'Typewriter': 'none', 'Wave': 'sfadeIn 0.5s ease', 'Gold Shimmer': 'sfadeIn 0.5s ease',
    'Bounce In': 'sfadeIn 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)',
    'Blur Reveal': 'sfadeIn 0.6s ease',
  };
  prev.style.animation = animations[name] || 'sfadeIn 0.5s ease';
}

/* ══════════════════════════════════════════════════
   SYNC CONTROLS FROM STATE
══════════════════════════════════════════════════ */
function syncAllControls() {
  const c = STUDIO.cms;
  if (!c) return;

  // Logo
  const lw = document.getElementById('logo-slider-w');
  const lwn = document.getElementById('logo-num-w');
  const lwv = document.getElementById('logo-val-w');
  if (lw && c.logo?.width) { lw.value = c.logo.width; if (lwn) lwn.value = c.logo.width; if (lwv) lwv.textContent = `${c.logo.width}px`; }

  const lh = document.getElementById('logo-slider-h');
  const lhn = document.getElementById('logo-num-h');
  const lhv = document.getElementById('logo-val-h');
  if (lh && c.logo?.height) { lh.value = c.logo.height; if (lhn) lhn.value = c.logo.height; if (lhv) lhv.textContent = `${c.logo.height}px`; }

  // Navbar
  const nh = document.getElementById('navbar-slider-h');
  const nhn = document.getElementById('navbar-num-h');
  const nhv = document.getElementById('navbar-val-h');
  if (nh && c.navbar?.height) { nh.value = c.navbar.height; if (nhn) nhn.value = c.navbar.height; if (nhv) nhv.textContent = `${c.navbar.height}px`; }

  const nColorSwatch = document.getElementById('navbar-color-swatch');
  const nColorHex = document.getElementById('navbar-color-hex');
  if (c.navbar?.bgColor) {
    if (nColorSwatch && c.navbar.bgColor.startsWith('#')) nColorSwatch.value = c.navbar.bgColor;
    if (nColorHex) nColorHex.value = c.navbar.bgColor;
  }

  const transpToggle = document.getElementById('navbar-transparent-toggle');
  if (transpToggle && c.navbar) {
    transpToggle.classList.toggle('on', !!c.navbar.transparent);
  }

  // Hero
  const hs = document.getElementById('hero-slider-scale');
  const hsn = document.getElementById('hero-num-scale');
  const hsv = document.getElementById('hero-val-scale');
  if (hs && c.hero?.scale) { hs.value = c.hero.scale; if (hsn) hsn.value = c.hero.scale; if (hsv) hsv.textContent = `${c.hero.scale}%`; }

  const hh = document.getElementById('hero-heading-text');
  if (hh && c.heroHeading?.text) hh.value = c.heroHeading.text;

  const hsub = document.getElementById('hero-sub-text');
  if (hsub && c.heroSub?.text) hsub.value = c.heroSub.text;

  // Restore all controls when the server draft loads or Undo/Redo changes state.
  const setPair = (sliderId, numberId, labelId, value, unit = '') => {
    if (!Number.isFinite(Number(value))) return;
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);
    const label = document.getElementById(labelId);
    if (slider) slider.value = Number(value);
    if (number) number.value = Number(value);
    if (label) label.textContent = String(value) + unit;
  };
  const hero = c.hero || {};
  setPair('hero-slider-scale','hero-num-scale','hero-val-scale',hero.scale ?? 100,'%');
  setPair('hero-slider-posx','hero-num-posx','hero-val-posx',hero.posX ?? 50,'%');
  setPair('hero-slider-posy','hero-num-posy','hero-val-posy',hero.posY ?? 50,'%');
  setPair('hero-slider-height','hero-num-height','hero-val-height',hero.height ?? 70,'vh');
  setPair('hero-slider-opacity','hero-num-opacity','hero-val-opacity',hero.overlayOpacity ?? 40,'%');
  setPair('hero-slider-brightness','hero-num-brightness','hero-val-brightness',hero.brightness ?? 100,'%');
  setPair('hero-slider-contrast','hero-num-contrast','hero-val-contrast',hero.contrast ?? 100,'%');
  setPair('hero-slider-animspeed','hero-num-animspeed','hero-val-animspeed',hero.animationSpeed ?? 10,'s');
  setPair('hero-slider-animdelay','hero-num-animdelay','hero-val-animdelay',hero.animationDelay ?? 3,'s');
  setPair('hero-slider-blur','hero-num-blur','hero-val-blur',hero.blur ?? 0,'px');
  const overlaySwatch = document.getElementById('hero-overlay-swatch');
  const overlayHex = document.getElementById('hero-overlay-hex');
  if (overlaySwatch && /^#[0-9a-f]{6}$/i.test(hero.overlayColor || '')) overlaySwatch.value = hero.overlayColor;
  if (overlayHex) overlayHex.value = hero.overlayColor || '#000000';
  document.querySelectorAll('#hero-display-modes .s-mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === (hero.displayMode || 'cover')));
  const heroToggles = {'hero-ken-burns':'kenBurns','hero-parallax':'parallax','hero-gradient':'gradient','hero-decorative':'decorative'};
  Object.entries(heroToggles).forEach(([id,key]) => document.getElementById(id+'-toggle')?.classList.toggle('on', !!hero[key]));

  const background = c.background || {};
  const bgPosX = document.getElementById('bg-slider-posx');
  const bgPosXNum = document.getElementById('bg-num-posx');
  const bgPosXVal = document.getElementById('bg-val-posx');
  if (bgPosX) { bgPosX.value = background.posX ?? 50; if (bgPosXNum) bgPosXNum.value = background.posX ?? 50; if (bgPosXVal) bgPosXVal.textContent = (background.posX ?? 50) + '%'; }
  const bgPosY = document.getElementById('bg-slider-posy');
  const bgPosYNum = document.getElementById('bg-num-posy');
  const bgPosYVal = document.getElementById('bg-val-posy');
  if (bgPosY) { bgPosY.value = background.posY ?? 50; if (bgPosYNum) bgPosYNum.value = background.posY ?? 50; if (bgPosYVal) bgPosYVal.textContent = (background.posY ?? 50) + '%'; }
  setPair('bg-slider-opacity','bg-num-opacity','bg-val-opacity',background.overlayOpacity ?? 30,'%');
  const bgColor = document.getElementById('bg-overlay-swatch');
  const bgColorHex = document.getElementById('bg-overlay-hex');
  if (bgColor && /^#[0-9a-f]{6}$/i.test(background.overlayColor || '')) bgColor.value = background.overlayColor;
  if (bgColorHex) bgColorHex.value = background.overlayColor || '#000000';
  const bgPreview = document.getElementById('bg-preview-img');
  if (bgPreview && background.src) { bgPreview.src = background.src; bgPreview.style.display = 'block'; }

  const heading = c.heroHeading || {};
  setPair('heading-slider-size','heading-num-size','heading-val-size',heading.size ?? 56,'px');
  setPair('heading-slider-lh','heading-num-lh','heading-val-lh',Math.round((heading.lineHeight ?? 1.15)*100),'');
  setPair('heading-slider-ls','heading-num-ls','heading-val-ls',heading.letterSpacing ?? -1,'px');
  const sub = c.heroSub || {};
  setPair('sub-slider-size','sub-num-size','sub-val-size',sub.size ?? 18,'px');
  setPair('sub-slider-lh','sub-num-lh','sub-val-lh',Math.round((sub.lineHeight ?? 1.6)*100),'');
  const subSwatch = document.getElementById('sub-color-swatch');
  const subHex = document.getElementById('sub-color-hex');
  if (subSwatch && /^#[0-9a-f]{6}$/i.test(sub.color || '')) subSwatch.value = sub.color;
  if (subHex) subHex.value = sub.color || '#e8eaf0';

  const syncGrid = (selector, index) => {
    document.querySelectorAll(selector + ' [data-index]').forEach(card => card.classList.toggle('active', Number(card.dataset.index) === Number(index || 0)));
  };
  syncGrid('#hero-anim-grid', hero.animation);
  syncGrid('#heading-anim-grid', heading.animation);
  syncGrid('#heading-font-grid', heading.font);
  syncGrid('#heading-color-grid', heading.colorCombo);
  syncGrid('#sub-preset-grid', sub.preset);
  syncGrid('#bg-anim-grid', c.background?.animation);

  document.querySelectorAll('#heading-align-chips .s-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.val === (heading.align || 'center')));
  document.querySelectorAll('#sub-align-chips .s-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.val === (sub.align || 'center')));

  // Sync every advanced control from the stored CMS after backend load / undo / redo.
  const setExplicitPair = (sliderId, numberId, labelId, value, unit) => {
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);
    const label = document.getElementById(labelId);
    if (Number.isFinite(Number(value))) {
      if (slider) slider.value = Number(value);
      if (number) number.value = Number(value);
      if (label) label.textContent = String(value) + (unit || '');
    }
  };

  const animation = c.animations || {};
  setExplicitPair('anim-slider-speed','anim-num-speed','anim-val-speed',animation.speed ?? 10,'s');
  setExplicitPair('anim-slider-delay','anim-num-delay','anim-val-delay',animation.delay ?? 0,'s');
  setExplicitPair('anim-slider-duration','anim-num-duration','anim-val-duration',animation.duration ?? 500,'ms');
  setExplicitPair('effects-slider-intensity','effects-num-intensity','effects-val-intensity',c.effects?.intensity ?? 100,'%');
  const fontAnim = c.fontAnimations || {};
  setExplicitPair('fontanim-slider-speed','fontanim-num-speed','fontanim-val-speed',fontAnim.speed ?? 10,'s');
  setExplicitPair('fontanim-slider-delay','fontanim-num-delay','fontanim-val-delay',fontAnim.delay ?? 0,'s');
  setExplicitPair('fontanim-slider-duration','fontanim-num-duration','fontanim-val-duration',fontAnim.duration ?? 500,'ms');

  const activeAnimations = Array.isArray(animation.activeItems) ? animation.activeItems : [];
  document.querySelectorAll('#anim-lib-grid .s-anim-card').forEach((card, index) => {
    card.classList.toggle('active', activeAnimations.includes(index));
  });
  const activeEffects = Array.isArray(c.effects?.activeItems) ? c.effects.activeItems : [];
  document.querySelectorAll('#effects-grid .s-effect-card').forEach((card, index) => {
    card.classList.toggle('active', activeEffects.includes(index));
  });
  const activeComponents = Array.isArray(c.components?.activeItems) ? c.components.activeItems : [];
  document.querySelectorAll('#components-grid .s-comp-card').forEach((card, index) => {
    card.classList.toggle('active', activeComponents.includes(index));
  });
  const fontIndex = Number.isInteger(Number(fontAnim.active)) ? Number(fontAnim.active) : 0;
  document.querySelectorAll('#font-anim-list .s-fa-item').forEach((item, index) => {
    item.classList.toggle('active', index === fontIndex);
  });

  const animationTargets = Array.isArray(animation.targets) ? animation.targets : ['Headings'];
  document.querySelectorAll('#anim-target-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', animationTargets.includes(chip.textContent.trim()));
  });
  const direction = animation.direction || 'Normal';
  document.querySelectorAll('#anim-direction-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.trim() === direction);
  });
  const scrollToggle = document.getElementById('anim-scroll-trigger');
  const repeatToggle = document.getElementById('anim-repeat-toggle');
  if (scrollToggle) scrollToggle.classList.toggle('on', animation.scrollTrigger !== false);
  if (repeatToggle) repeatToggle.classList.toggle('on', animation.repeatEveryView === true);

  const video = c.video || {};
  const videoUrlInput = document.getElementById('video-source-url');
  const videoPosterInput = document.getElementById('video-poster-url');
  if (videoUrlInput && !String(video.src || '').startsWith('blob:') && !String(video.src || '').startsWith('data:')) {
    videoUrlInput.value = video.src || '';
  }
  if (videoPosterInput) videoPosterInput.value = video.poster || 'assets/images/hero-venue.jpg';
  const videoToggleMap = {
    'video-autoplay':'autoplay','video-loop':'loop','video-muted':'muted',
    'video-controls':'controls','video-inline':'playsInline'
  };
  Object.entries(videoToggleMap).forEach(([id,property]) => {
    const toggle = document.getElementById(id+'-toggle');
    if (toggle) toggle.classList.toggle('on', property === 'controls' ? video[property] === true : video[property] !== false);
  });
  document.querySelectorAll('#page-video .s-display-modes .s-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === (video.objectFit || 'cover'));
  });
  setPair('video-slider-posx','video-num-posx','video-val-posx',video.posX ?? 50,'%');
  setPair('video-slider-posy','video-num-posy','video-val-posy',video.posY ?? 50,'%');

  const fontTargets = Array.isArray(fontAnim.targets) ? fontAnim.targets : ['Hero Heading'];
  document.querySelectorAll('#fontanim-target-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', fontTargets.includes(chip.textContent.trim()));
  });
  document.querySelectorAll('#fontanim-repeat-chips .s-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.trim() === (fontAnim.repeat || 'Once'));
  });

  document.querySelectorAll('#theme-grid .s-theme-card').forEach((card, index) => {
    card.classList.toggle('active', index === Number(c.theme?.active || 0));
  });

  syncPreviewStyles();
}

/* ══════════════════════════════════════════════════
   INIT ALL
══════════════════════════════════════════════════ */
function initAll() {
  // Sidebar navigation
  document.querySelectorAll('.s-nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Dashboard cards
  document.querySelectorAll('.s-dash-card[data-page]').forEach(card => {
    card.addEventListener('click', () => navigateTo(card.dataset.page));
  });

  // Header buttons
  const undoBtn = document.getElementById('btn-studio-undo');
  const redoBtn = document.getElementById('btn-studio-redo');
  if (undoBtn) { undoBtn.disabled = true; undoBtn.addEventListener('click', undo); }
  if (redoBtn) { redoBtn.disabled = true; redoBtn.addEventListener('click', redo); }

  document.getElementById('btn-studio-save')?.addEventListener('click', () => { pushUndo('Manual save'); saveDraft(); });
  document.getElementById('btn-studio-publish')?.addEventListener('click', publishLive);

  // Viewport buttons
  document.querySelectorAll('.s-vp-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewport(btn.dataset.vp));
  });

  // Page selector
  document.getElementById('page-selector')?.addEventListener('change', e => {
    const iframe = document.getElementById('studio-preview-frame');
    if (iframe) iframe.src = e.target.value;
  });

  // Page-specific init
  initLogoPage();
  initNavbarPage();
  initHeroImagePage();
  initHeroHeadingPage();
  initHeroSubPage();
  initBgPage();
  initVideoPage();
  initImageLibraryPage();
  initThemePage();
  initAnimationPage();
  initEffectsPage();
  initComponentsPage();
  initFontAnimPage();

  // Inner tabs
  document.querySelectorAll('.s-inner-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.dataset.group;
      document.querySelectorAll(`.s-inner-tab[data-group="${group}"]`).forEach(t => t.classList.remove('active'));
      document.querySelectorAll(`.s-inner-panel[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target)?.classList.add('active');
    });
  });

  // Publish modal
  const modal = document.getElementById('publish-modal');
  document.getElementById('btn-open-publish')?.addEventListener('click', () => modal?.classList.add('open'));
  document.getElementById('btn-close-publish')?.addEventListener('click', () => modal?.classList.remove('open'));
  document.getElementById('btn-cancel-publish')?.addEventListener('click', () => modal?.classList.remove('open'));
  document.getElementById('btn-confirm-publish')?.addEventListener('click', () => { modal?.classList.remove('open'); publishLive(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
  });

  // Autosave every 2min without interrupting the editor with toast popups.
  setInterval(() => saveDraft({ silent: true }), 120000);

  // ── Authentication Gate (server-validated session)
  initAuth();

  // ── Connect to backend server (auto-detect Node.js / PHP / Python)
  detectBackend().then(() => {
    // After detecting backend, try to load latest CMS from server
    loadFromBackend();
  });

  // ── Iframe Load Listeners (Auto-sync preview when iframes finish loading)
  getAllIframes().forEach(iframe => {
    iframe.addEventListener('load', () => {
      setTimeout(syncPreviewStyles, 100);
    });
  });

  // Navigate to dashboard initially
  navigateTo('dashboard');
  setTimeout(syncPreviewStyles, 400);

  console.log('Royal Banquet Admin Studio initialized ✓ (backend: auto-detect)');
}

/* ── SERVER-VALIDATED ADMIN SESSION ── */
function initAuth() {
  const overlay = document.getElementById('studio-login-overlay');
  const form = document.getElementById('studio-login-form');
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const errBox = document.getElementById('login-error-msg');
  const remember = document.getElementById('login-remember');
  const togglePass = document.getElementById('toggle-password-btn');
  const logoutBtn = document.getElementById('btn-studio-logout');
  const submitBtn = document.getElementById('btn-login-submit');

  const showError = message => {
    if (!errBox) return;
    errBox.textContent = message;
    errBox.style.display = 'block';
  };

  // A browser flag is not authentication. Verify the signed server session.
  (async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        studioAuthenticated = true;
        overlay?.classList.add('hidden');
        loadFromBackend();
      } else {
        studioAuthenticated = false;
        overlay?.classList.remove('hidden');
        if (response.status === 503) showError(result.message || 'Admin authentication is not configured on this deployment.');
        setTimeout(() => userInput?.focus(), 150);
      }
    } catch {
      studioAuthenticated = false;
      overlay?.classList.remove('hidden');
      showError('Cannot reach the sign-in service. Open the deployed Admin Studio URL and try again.');
    }
  })();

  togglePass?.addEventListener('click', () => {
    if (!passInput) return;
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    togglePass.style.color = show ? 'var(--s-gold)' : 'var(--s-text-muted)';
  });

  userInput?.addEventListener('input', () => { if (errBox) errBox.style.display = 'none'; });
  passInput?.addEventListener('input', () => { if (errBox) errBox.style.display = 'none'; });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (errBox) errBox.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userInput?.value || '',
          password: passInput?.value || '',
          remember: Boolean(remember?.checked)
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        showError(result.message || 'Sign-in failed. Check your credentials and server configuration.');
        passInput?.focus();
        passInput?.select();
        return;
      }

      studioAuthenticated = true;
      overlay?.classList.add('hidden');
      await loadFromBackend();
      toast('Admin session verified. Welcome to Royal Studio.', 'gold');
    } catch {
      studioAuthenticated = false;
      showError('Sign-in service is unavailable. No login was accepted.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
    } catch {}
    studioAuthenticated = false;
    overlay?.classList.remove('hidden');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (errBox) errBox.style.display = 'none';
    setTimeout(() => userInput?.focus(), 150);
    toast('Signed out of Royal Studio.', 'info');
  });
}

/* Start */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
