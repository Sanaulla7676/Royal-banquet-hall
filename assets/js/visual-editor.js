(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pages = [
    { file: 'index.html', label: 'Home', icon: '⌂', route: '/' },
    { file: 'events.html', label: 'Events', icon: '✦', route: '/events.html' },
    { file: 'gallery.html', label: 'Gallery', icon: '▧', route: '/gallery.html' },
    { file: 'experience.html', label: 'Experience', icon: '✧', route: '/experience.html' },
    { file: 'catering.html', label: 'Catering', icon: '♨', route: '/catering.html' },
    { file: 'reviews.html', label: 'Reviews', icon: '☆', route: '/reviews.html' },
    { file: 'contact.html', label: 'Contact', icon: '✉', route: '/contact.html' },
    { file: 'booking.html', label: 'Booking', icon: '▦', route: '/booking.html' },
    { file: 'packages.html', label: 'Packages', icon: '◇', route: '/packages.html' }
  ];
  const styleProps = {
    color: 'color', backgroundColor: 'background-color', fontSize: 'font-size',
    fontFamily: 'font-family', fontWeight: 'font-weight', textAlign: 'text-align',
    borderRadius: 'border-radius', opacity: 'opacity', width: 'width', height: 'height',
    padding: 'padding', margin: 'margin', objectPosition: 'object-position'
  };
  const safeLength = /^(auto|inherit|initial|unset|normal|none|fit-content|max-content|min-content|0|[-+]?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|vh|vw|%|ch|ex|svh|dvh)?)(?:\s+[-+]?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|vh|vw|%|ch|ex|svh|dvh)?){0,3}$/i;
  let cms = {};
  let ready = false;
  let authenticated = false;
  let activePage = 'index.html';
  let currentElement = null;
  let currentSelector = '';
  let frameDoc = null;
  let selectMode = true;
  let dirty = false;
  let savedState = '';
  let history = [];
  let historyIndex = -1;
  let editSnapshot = null;
  let baseStates = new WeakMap();
  let hoveredElement = null;
  let zoom = 1;
  let toastTimer = null;

  function clone(value) { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
  function pageRecord(pageKey = activePage) {
    if (!cms.pageOverrides || typeof cms.pageOverrides !== 'object') cms.pageOverrides = {};
    if (!cms.pageOverrides[pageKey] || typeof cms.pageOverrides[pageKey] !== 'object') cms.pageOverrides[pageKey] = {};
    if (!cms.pageOverrides[pageKey].elements || typeof cms.pageOverrides[pageKey].elements !== 'object') cms.pageOverrides[pageKey].elements = {};
    return cms.pageOverrides[pageKey];
  }
  function elementRecord(selector = currentSelector, create = false) {
    if (!selector) return null;
    const page = create ? pageRecord() : (cms.pageOverrides || {})[activePage];
    if (!page) return null;
    if (!page.elements || typeof page.elements !== 'object') {
      if (!create) return null;
      page.elements = {};
    }
    if (create && (!page.elements[selector] || typeof page.elements[selector] !== 'object')) page.elements[selector] = {};
    return page.elements[selector] || null;
  }
  function toast(message, isError = false) {
    const node = $('#vb-toast');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', !!isError);
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 3200);
  }
  function saveStatus(label, type = '') {
    const node = $('#vb-save-state');
    node.classList.remove('is-dirty', 'is-error');
    if (type) node.classList.add(type);
    node.lastElementChild.textContent = label;
  }
  async function request(url, method = 'GET', body) {
    const options = { method, credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      const error = new Error(result.message || result.error || ('Request failed (' + response.status + ')'));
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async function start() {
    $('#vb-login-form').addEventListener('submit', login);
    $('#vb-page-select').addEventListener('change', () => changePage($('#vb-page-select').value));
    $('#vb-page-search').addEventListener('input', renderPages);
    $('#vb-layer-search').addEventListener('input', filterLayers);
    $('#vb-refresh-layers').addEventListener('click', buildLayers);
    $('#vb-reload').addEventListener('click', () => loadPreview(true));
    $('#vb-save-draft').addEventListener('click', saveDraft);
    $('#vb-tool-save').addEventListener('click', saveDraft);
    $('#vb-publish').addEventListener('click', () => $('#vb-confirm').hidden = false);
    $('#vb-cancel-publish').addEventListener('click', () => $('#vb-confirm').hidden = true);
    $('#vb-confirm-publish').addEventListener('click', publishLive);
    $('#vb-undo').addEventListener('click', undo);
    $('#vb-redo').addEventListener('click', redo);
    $('#vb-collapse-left').addEventListener('click', collapseLeft);
    $('#vb-reset-element').addEventListener('click', resetElement);
    $('#vb-inspector-reset').addEventListener('click', resetElement);
    $('#vb-tool-reset').addEventListener('click', resetElement);
    $('#vb-preview-motion').addEventListener('click', replayMotion);
    $('#vb-select-mode').addEventListener('click', () => setSelectMode(true));
    $('#vb-hand-mode').addEventListener('click', () => setSelectMode(false));
    $('#vb-tool-select').addEventListener('click', () => setSelectMode(true));
    $('#vb-tool-hand').addEventListener('click', () => setSelectMode(false));
    $('#vb-zoom-in').addEventListener('click', () => setZoom(zoom + 0.1));
    $('#vb-zoom-out').addEventListener('click', () => setZoom(zoom - 0.1));
    $('#vb-zoom-reset').addEventListener('click', () => setZoom(1));
    $$('.vb-device-switch button').forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device)));
    $$('.vb-inspector-tabs button').forEach(button => button.addEventListener('click', () => setInspectorTab(button.dataset.tab)));
    $('#vb-color').addEventListener('input', event => { $('#vb-color-text').value = event.target.value; updateStyle('color', event.target.value); });
    $('#vb-color-text').addEventListener('change', event => { updateStyle('color', event.target.value); });
    $('#vb-bg').addEventListener('input', event => { $('#vb-bg-text').value = event.target.value; updateStyle('backgroundColor', event.target.value); });
    $('#vb-bg-text').addEventListener('change', event => updateStyle('backgroundColor', event.target.value));
    bindInput('vb-text', 'text', 'change');
    bindInput('vb-href', 'href', 'change');
    bindInput('vb-behavior-href', 'href', 'change');
    bindInput('vb-src', 'src', 'change');
    bindInput('vb-alt', 'alt', 'change');
    bindInput('vb-target', 'target', 'change');
    bindStyle('vb-font-size', 'fontSize');
    bindStyle('vb-font-family', 'fontFamily');
    bindStyle('vb-font-weight', 'fontWeight');
    bindStyle('vb-text-align', 'textAlign');
    bindStyle('vb-radius', 'borderRadius');
    bindStyle('vb-width', 'width');
    bindStyle('vb-height', 'height');
    bindStyle('vb-padding', 'padding');
    bindStyle('vb-margin', 'margin');
    bindStyle('vb-object-position', 'objectPosition');
    $('#vb-opacity').addEventListener('input', event => { $('#vb-opacity-label').textContent = Math.round(Number(event.target.value) * 100) + '%'; updateStyle('opacity', event.target.value); });
    $('#vb-cursor').addEventListener('change', event => updateStyle('cursor', event.target.value));
    $('#vb-hidden').addEventListener('change', event => updateElementProperty('hidden', event.target.checked));
    $('#vb-mobile-font-size').addEventListener('change', event => updateResponsive('fontSize', event.target.value));
    $('#vb-mobile-width').addEventListener('change', event => updateResponsive('width', event.target.value));
    $('#vb-mobile-hidden').addEventListener('change', event => updateResponsive('hidden', event.target.checked));
    $('#vb-motion').addEventListener('change', renderMotionUpdate);
    $('#vb-motion-duration').addEventListener('change', renderMotionUpdate);
    $('#vb-motion-delay').addEventListener('change', renderMotionUpdate);
    $('#vb-motion-easing').addEventListener('change', renderMotionUpdate);
    document.addEventListener('keydown', keyboardShortcuts);
    window.addEventListener('beforeunload', event => {
      if (dirty) { event.preventDefault(); event.returnValue = ''; }
    });

    renderPages();
    saveStatus('Checking access');
    try {
      const session = await request('/api/auth/session');
      authenticated = Boolean(session.success);
    } catch { authenticated = false; }
    if (authenticated) {
      $('#vb-login').hidden = true;
      $('#vb-app').hidden = false;
      await loadCms();
    } else {
      $('#vb-login').hidden = false;
      $('#vb-app').hidden = true;
      $('#vb-username').focus();
    }
  }

  async function login(event) {
    event.preventDefault();
    const button = $('#vb-login-submit');
    const error = $('#vb-login-error');
    button.disabled = true;
    button.textContent = 'Signing in…';
    error.classList.remove('is-visible');
    try {
      await request('/api/auth/login', 'POST', {
        username: $('#vb-username').value,
        password: $('#vb-password').value,
        remember: $('#vb-remember').checked
      });
      authenticated = true;
      $('#vb-login').hidden = true;
      $('#vb-app').hidden = false;
      await loadCms();
    } catch (err) {
      error.textContent = err.message || 'Sign-in failed. Check your credentials and try again.';
      error.classList.add('is-visible');
    } finally {
      button.disabled = false;
      button.innerHTML = 'Sign in to Visual Builder <span aria-hidden="true">↗</span>';
    }
  }

  async function loadCms() {
    saveStatus('Loading draft');
    try {
      const result = await request('/api/admin/load-cms');
      cms = result.data && typeof result.data === 'object' ? result.data : {};
      if (!cms.pageOverrides || typeof cms.pageOverrides !== 'object') cms.pageOverrides = {};
      savedState = JSON.stringify(cms);
      ready = true;
      dirty = false;
      resetHistory();
      saveStatus('Draft loaded');
      renderPages();
      await loadPreview(false);
      toast('Connected to the shared CMS draft.');
    } catch (err) {
      ready = false;
      saveStatus('Draft load failed', 'is-error');
      toast('Could not load the shared draft. Editing and publishing are paused to protect existing data: ' + err.message, true);
      $('#vb-save-draft').disabled = true;
      $('#vb-publish').disabled = true;
    }
  }

  function renderPages() {
    const list = $('#vb-page-list');
    const query = ($('#vb-page-search').value || '').trim().toLowerCase();
    list.replaceChildren();
    pages.filter(page => page.label.toLowerCase().includes(query) || page.file.toLowerCase().includes(query)).forEach(page => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vb-page-item' + (page.file === activePage ? ' is-active' : '');
      button.innerHTML = '<span class="vb-page-icon"></span><span></span><span class="vb-page-path"></span>';
      button.children[0].textContent = page.icon;
      button.children[1].textContent = page.label;
      button.children[2].textContent = page.route;
      button.setAttribute('aria-current', page.file === activePage ? 'page' : 'false');
      button.addEventListener('click', () => changePage(page.file));
      list.appendChild(button);
    });
    $('#vb-page-select').value = activePage;
    const page = pages.find(item => item.file === activePage) || pages[0];
    $('#vb-route').textContent = page.route;
    $('#vb-open-live').href = page.file;
  }

  function changePage(pageFile) {
    if (!pages.some(page => page.file === pageFile)) return;
    activePage = pageFile;
    currentElement = null;
    currentSelector = '';
    hoveredElement = null;
    clearInspector();
    renderPages();
    loadPreview(false);
  }

  async function loadPreview(forceReload) {
    const frame = $('#vb-page-frame');
    const loading = $('#vb-frame-loading');
    loading.hidden = false;
    $('#vb-canvas-hint').textContent = 'Click any supported element to edit it';
    frame.onload = () => {
      try {
        frameDoc = frame.contentDocument;
        if (!frameDoc || !frameDoc.body) throw new Error('The page preview is unavailable');
        baseStates = new WeakMap();
        injectEditorCss();
        attachSelectionEvents();
        buildLayers();
        applyDraftOverrides();
        loading.hidden = true;
        updateSelectionOutline();
      } catch (err) {
        loading.hidden = false;
        loading.querySelector('strong').textContent = 'Preview could not be attached';
        loading.querySelector('small').textContent = 'Make sure this editor and the website are served from the same domain.';
        toast('Preview access failed: ' + err.message, true);
      }
    };
    const url = new URL(activePage, window.location.href);
    if (forceReload) url.searchParams.set('vb-refresh', String(Date.now()));
    frame.src = url.pathname + url.search;
  }

  function injectEditorCss() {
    if (!frameDoc || $('#rbh-visual-builder-editor-css', frameDoc)) return;
    const style = frameDoc.createElement('style');
    style.id = 'rbh-visual-builder-editor-css';
    style.textContent = [
      '.rbh-vb-selected{outline:2px solid #5368ee!important;outline-offset:2px!important;cursor:crosshair!important;}',
      '.rbh-vb-hover:not(.rbh-vb-selected){outline:1px dashed #5368ee!important;outline-offset:1px!important;}',
      'html.rbh-vb-select-mode,html.rbh-vb-select-mode *{cursor:crosshair!important;}',
      'html.rbh-vb-hand-mode,html.rbh-vb-hand-mode *{cursor:auto!important;}'
    ].join('');
    frameDoc.head.appendChild(style);
  }

  function attachSelectionEvents() {
    if (!frameDoc) return;
    frameDoc.documentElement.classList.toggle('rbh-vb-select-mode', selectMode);
    frameDoc.documentElement.classList.toggle('rbh-vb-hand-mode', !selectMode);
    frameDoc.addEventListener('click', event => {
      if (!selectMode) return;
      const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
      const el = target && target.closest('a,button,img,video,source,h1,h2,h3,h4,h5,h6,p,span,li,article,section,header,footer,nav,main,div');
      if (!el || el === frameDoc.body || el === frameDoc.documentElement || el.closest('#royal-admin-dock,.rbh-admin-dock,.admin-preview-controls')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selectElement(el);
    }, true);
    frameDoc.addEventListener('mouseover', event => {
      if (!selectMode) return;
      const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
      const el = target && target.closest('a,button,img,video,h1,h2,h3,h4,h5,h6,p,span,li,article,section,header,footer,nav,main,div');
      if (hoveredElement && hoveredElement !== currentElement) hoveredElement.classList.remove('rbh-vb-hover');
      hoveredElement = el;
      if (hoveredElement && hoveredElement !== currentElement) hoveredElement.classList.add('rbh-vb-hover');
    }, true);
    frameDoc.addEventListener('mouseout', event => {
      if (!selectMode) return;
      if (hoveredElement && hoveredElement !== currentElement) hoveredElement.classList.remove('rbh-vb-hover');
    }, true);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, character => '\\' + character);
  }

  function stableSelector(el) {
    if (!el || !el.tagName) return '';
    if (el.id) return '#' + cssEscape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== frameDoc.documentElement) {
      if (node.id) { parts.unshift('#' + cssEscape(node.id)); break; }
      let part = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).filter(name => !/^(is-|has-|aos-|gsap|active$|open$|visible$|rbh-vb)/i.test(name)).slice(0, 2);
      if (classes.length) part += classes.map(name => '.' + cssEscape(name)).join('');
      if (node.parentElement) {
        const sameTag = Array.from(node.parentElement.children).filter(sibling => sibling.tagName === node.tagName);
        if (sameTag.length > 1) part += ':nth-of-type(' + (sameTag.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      if (node === frameDoc.body) break;
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function selectElement(el) {
    if (!el || !frameDoc || !frameDoc.documentElement.contains(el)) return;
    if (currentElement && currentElement !== el) currentElement.classList.remove('rbh-vb-selected');
    if (hoveredElement && hoveredElement !== el) hoveredElement.classList.remove('rbh-vb-hover');
    currentElement = el;
    currentSelector = stableSelector(el);
    el.classList.remove('rbh-vb-hover');
    el.classList.add('rbh-vb-selected');
    $('#vb-selected-summary').textContent = '<' + el.tagName.toLowerCase() + '> · ' + describeElement(el);
    $('#vb-inspector-title').textContent = describeElement(el);
    $('#vb-inspector-subtitle').textContent = el.tagName.toLowerCase() + (el.id ? ' · #' + el.id : '') + (el.classList && el.classList.length ? ' · .' + Array.from(el.classList).slice(0, 2).join('.') : '');
    $('#vb-selected-chip-text').textContent = describeElement(el);
    $('#vb-selected-chip').hidden = false;
    $('#vb-inspector-reset').disabled = false;
    $('#vb-reset-element').disabled = false;
    $('#vb-no-selection').hidden = true;
    $('#vb-canvas-hint').textContent = 'Selected: ' + el.tagName.toLowerCase() + ' · choose a property to edit';
    $('#vb-layer-meta').textContent = 'Selected ' + el.tagName.toLowerCase() + ' · ' + describeElement(el);
    renderInspector(el);
    updateSelectionOutline();
    syncLayerSelection();
  }

  function describeElement(el) {
    if (!el) return 'Element';
    const tag = el.tagName.toLowerCase();
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim().slice(0, 40);
    if (tag === 'img') return (el.getAttribute('alt') || 'Image').trim().slice(0, 40);
    if (tag === 'video') return 'Video';
    if (el.id) return el.id.replace(/[-_]/g, ' ').slice(0, 40);
    const text = readText(el);
    if (text) return text.slice(0, 40);
    if (el.classList && el.classList.length) return Array.from(el.classList).filter(name => !/^(is-|aos-|rbh-vb)/.test(name)).slice(0, 2).join(' ') || tag;
    return tag;
  }

  function readText(el) {
    if (!el) return '';
    const walker = frameDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const pieces = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && !node.parentElement.closest('script,style,svg')) {
        const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (text) pieces.push(text);
      }
    }
    return pieces.join(' ').trim();
  }

  function hasTextContent(el) {
    const tag = el.tagName.toLowerCase();
    const accepted = ['h1','h2','h3','h4','h5','h6','p','a','button','label','span','li','figcaption','small','strong','em','blockquote'];
    return accepted.includes(tag) && readText(el).length > 0 && readText(el).length < 600;
  }

  function captureBase(el) {
    if (baseStates.has(el)) return baseStates.get(el);
    const computed = frameDoc.defaultView.getComputedStyle(el);
    const styleValues = {};
    Object.values(styleProps).concat(['cursor']).forEach(prop => {
      styleValues[prop] = { value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) };
    });
    const walker = frameDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && !node.parentElement.closest('script,style,svg')) textNodes.push({ node, value: node.nodeValue });
    }
    const base = {
      textNodes,
      href: el.getAttribute('href'),
      src: el.getAttribute('src'),
      alt: el.getAttribute('alt'),
      target: el.getAttribute('target'),
      rel: el.getAttribute('rel'),
      hidden: el.hasAttribute('hidden'),
      hiddenStyle: styleValues.display,
      styleValues,
      motion: el.getAttribute('data-rbh-vb-motion'),
      motionDuration: el.getAttribute('data-rbh-vb-duration'),
      motionDelay: el.getAttribute('data-rbh-vb-delay'),
      motionEasing: el.getAttribute('data-rbh-vb-easing')
    };
    baseStates.set(el, base);
    return base;
  }

  function restoreBase(el) {
    const base = baseStates.get(el);
    if (!base) return;
    base.textNodes.forEach(item => { if (item.node && item.node.isConnected) item.node.nodeValue = item.value; });
    [['href',base.href],['src',base.src],['alt',base.alt],['target',base.target],['rel',base.rel]].forEach(pair => {
      if (pair[1] === null) el.removeAttribute(pair[0]); else el.setAttribute(pair[0], pair[1]);
    });
    if (base.hidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden');
    Object.entries(base.styleValues).forEach(([prop, data]) => {
      if (data.value) el.style.setProperty(prop, data.value, data.priority);
      else el.style.removeProperty(prop);
    });
    [['data-rbh-vb-motion',base.motion],['data-rbh-vb-duration',base.motionDuration],['data-rbh-vb-delay',base.motionDelay],['data-rbh-vb-easing',base.motionEasing]].forEach(pair => {
      if (pair[1] === null) el.removeAttribute(pair[0]); else el.setAttribute(pair[0], pair[1]);
    });
  }

  function restoreOverride(el, entry) {
    if (!el || !entry) return;
    const base = captureBase(el);
    if (entry.text !== undefined) {
      const nodes = base.textNodes.filter(item => item.node && item.node.isConnected);
      if (nodes.length) {
        nodes[0].node.nodeValue = entry.text;
        nodes.slice(1).forEach(item => { item.node.nodeValue = ''; });
      }
    }
    if (entry.href !== undefined && el.tagName.toLowerCase() === 'a') {
      if (isSafeHref(entry.href)) el.setAttribute('href', entry.href);
    }
    if (entry.src !== undefined && ['img','video','source'].includes(el.tagName.toLowerCase())) {
      if (isSafeMediaUrl(entry.src)) el.setAttribute('src', entry.src);
    }
    if (entry.alt !== undefined && el.tagName.toLowerCase() === 'img') el.setAttribute('alt', String(entry.alt).slice(0, 500));
    if (entry.target !== undefined && el.tagName.toLowerCase() === 'a') {
      el.setAttribute('target', entry.target === '_blank' ? '_blank' : '_self');
      if (entry.target === '_blank') el.setAttribute('rel', 'noopener noreferrer');
      else if (base.rel === null) el.removeAttribute('rel');
      else el.setAttribute('rel', base.rel);
    }
    if (entry.hidden === true) el.style.setProperty('display', 'none', 'important');
    else if (entry.hidden === false) {
      const original = base.styleValues.display;
      if (original.value) el.style.setProperty('display', original.value, original.priority);
      else el.style.removeProperty('display');
      el.removeAttribute('hidden');
    }
    if (entry.styles && typeof entry.styles === 'object') {
      Object.entries(entry.styles).forEach(([prop,value]) => {
        if (isAllowedStyle(prop,value)) el.style.setProperty(styleProps[prop] || prop, String(value), 'important');
      });
    }
    if (entry.responsive && typeof entry.responsive === 'object') {
      const isMobile = frameDoc.defaultView.matchMedia('(max-width: 767px)').matches;
      const responsive = isMobile ? entry.responsive.mobile : null;
      if (responsive) {
        if (responsive.fontSize && isAllowedStyle('fontSize', responsive.fontSize)) el.style.setProperty('font-size', responsive.fontSize, 'important');
        if (responsive.width && isAllowedStyle('width', responsive.width)) el.style.setProperty('width', responsive.width, 'important');
        if (responsive.hidden === true) el.style.setProperty('display', 'none', 'important');
      }
    }
    if (entry.cursor !== undefined && isAllowedStyle('cursor',entry.cursor)) el.style.setProperty('cursor',entry.cursor,'important');
    if (entry.motion && typeof entry.motion === 'object' && entry.motion.preset && entry.motion.preset !== 'preserve') applyMotion(el, entry.motion);
  }

  function applyMotion(el, motion) {
    const preset = ['none','fade-in','fade-up','zoom-in','slide-left','slide-right','float'].includes(motion.preset) ? motion.preset : 'preserve';
    if (preset === 'preserve') {
      el.removeAttribute('data-rbh-vb-motion');
      return;
    }
    el.setAttribute('data-rbh-vb-motion', preset);
    el.setAttribute('data-rbh-vb-duration', String(clamp(Number(motion.duration) || 800,100,15000)));
    el.setAttribute('data-rbh-vb-delay', String(clamp(Number(motion.delay) || 0,0,10000)));
    el.setAttribute('data-rbh-vb-easing', safeEasing(motion.easing));
    let style = $('#rbh-visual-builder-motion-css', frameDoc);
    if (!style) {
      style = frameDoc.createElement('style');
      style.id = 'rbh-visual-builder-motion-css';
      frameDoc.head.appendChild(style);
    }
    style.textContent = [
      '@keyframes rbhVbFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes rbhVbFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes rbhVbZoomIn{from{opacity:.5;transform:scale(.94)}to{opacity:1;transform:scale(1)}}',
      '@keyframes rbhVbSlideLeft{from{opacity:.2;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}',
      '@keyframes rbhVbSlideRight{from{opacity:.2;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}',
      '@keyframes rbhVbFloat{from{transform:translateY(0)}to{transform:translateY(-8px)}}',
      '[data-rbh-vb-motion="none"]{animation:none!important}',
      '[data-rbh-vb-motion="fade-in"]{animation:rbhVbFadeIn var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="fade-up"]{animation:rbhVbFadeUp var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="zoom-in"]{animation:rbhVbZoomIn var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="slide-left"]{animation:rbhVbSlideLeft var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="slide-right"]{animation:rbhVbSlideRight var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="float"]{animation:rbhVbFloat 3s ease-in-out infinite alternate}'
    ].join('\n');
    el.style.setProperty('--rbh-vb-duration', clamp(Number(motion.duration) || 800,100,15000) + 'ms');
    el.style.setProperty('--rbh-vb-delay', clamp(Number(motion.delay) || 0,0,10000) + 'ms');
    el.style.setProperty('--rbh-vb-easing', safeEasing(motion.easing));
  }

  function safeEasing(value) {
    return ['ease','ease-in','ease-out','ease-in-out','linear','cubic-bezier(.2,.7,.2,1)'].includes(value) ? value : 'ease';
  }
  function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }

  function isSafeHref(value) {
    const v = String(value || '').trim();
    return v.length <= 2000 && (/^(https?:\/\/|\/|\.\/|\.\.\/|#|mailto:|tel:)/i.test(v) || /^[a-z0-9][a-z0-9._/-]*(?:[?#].*)?$/i.test(v)) && !/^(javascript|data|vbscript):/i.test(v);
  }
  function isSafeMediaUrl(value) {
    const v = String(value || '').trim();
    return v.length <= 2000 && (/^https?:\/\//i.test(v) || v.startsWith('/') || v.startsWith('assets/') || v.startsWith('./') || v.startsWith('../'));
  }
  function isAllowedStyle(prop,value) {
    if (value === '' || value === null || value === undefined) return false;
    const cssProp = styleProps[prop] || prop;
    const val = String(value).trim();
    if (val.length > 180 || /[;{}<>]/.test(val) || /url\s*\(|expression\s*\(|javascript:/i.test(val)) return false;
    if (['font-size','width','height','padding','margin','border-radius'].includes(cssProp)) return safeLength.test(val) || /^calc\([0-9a-zA-Z.%+*/()\s-]+\)$/i.test(val);
    if (['color','background-color'].includes(cssProp)) return /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\sdeg-]+\)|[a-z]{1,25}|var\(--[a-z0-9-]+\))$/i.test(val);
    if (cssProp === 'opacity') return Number.isFinite(Number(val)) && Number(val) >= 0 && Number(val) <= 1;
    if (cssProp === 'font-weight') return /^(normal|bold|[1-9]00)$/i.test(val);
    if (cssProp === 'font-family') return /^[a-zA-Z0-9 ,"'-]{1,100}$/.test(val);
    if (cssProp === 'text-align') return ['left','right','center','justify','start','end'].includes(val);
    if (cssProp === 'object-position') return /^[a-zA-Z0-9.%\s-]+$/.test(val) && val.length < 60;
    if (cssProp === 'cursor') return ['pointer','default','grab','grabbing','move','text','not-allowed'].includes(val);
    return false;
  }

  function applyDraftOverrides() {
    if (!frameDoc) return;
    const elements = (((cms.pageOverrides || {})[activePage] || {}).elements || {});
    Object.entries(elements).forEach(([selector,entry]) => {
      if (!isSafeSelector(selector) || !entry || typeof entry !== 'object') return;
      try {
        const el = frameDoc.querySelector(selector);
        if (el) restoreOverride(el,entry);
      } catch {}
    });
  }
  function isSafeSelector(selector) {
    return typeof selector === 'string' && selector.length < 1200 && !/[{};]/.test(selector) && /^[a-zA-Z0-9_#.:>\[\]="'\\*+~()\-\s]+$/.test(selector);
  }

  function buildLayers() {
    if (!frameDoc) return;
    const tree = $('#vb-layer-tree');
    tree.replaceChildren();
    const roots = Array.from(frameDoc.body.children).filter(el => !['SCRIPT','STYLE','NOSCRIPT','LINK','META'].includes(el.tagName) && !el.classList.contains('rbh-vb-selected'));
    const allRows = [];
    let count = 0;
    function addNode(el, parent, depth) {
      if (count >= 200 || !el || !el.tagName || ['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','META','LINK'].includes(el.tagName)) return;
      if (el.id === 'royal-admin-dock' || el.classList.contains('rbh-visual-editor-toolbar')) return;
      count++;
      const selector = stableSelector(el);
      const group = document.createElement('div');
      group.className = 'vb-layer-group';
      const row = document.createElement('div');
      row.className = 'vb-layer-row';
      row.dataset.selector = selector;
      row.style.paddingLeft = (7 + Math.min(depth,6) * 10) + 'px';
      const children = Array.from(el.children || []).filter(child => !['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','META','LINK'].includes(child.tagName));
      const arrow = document.createElement('button');
      arrow.type = 'button';
      arrow.className = 'vb-layer-disclose';
      arrow.textContent = children.length ? '▾' : '·';
      arrow.setAttribute('aria-label', children.length ? 'Collapse layer' : 'No nested layers');
      arrow.disabled = !children.length;
      const kind = document.createElement('span');
      kind.className = 'vb-layer-kind';
      kind.textContent = layerIcon(el.tagName);
      const name = document.createElement('span');
      name.className = 'vb-layer-name';
      name.textContent = describeElement(el);
      const tag = document.createElement('span');
      tag.className = 'vb-layer-tag';
      tag.textContent = el.tagName.toLowerCase();
      row.append(arrow,kind,name,tag);
      row.addEventListener('click', event => { event.stopPropagation(); selectElement(el); });
      arrow.addEventListener('click', event => {
        event.stopPropagation();
        const childWrap = group.lastElementChild;
        if (!childWrap || !childWrap.classList.contains('vb-layer-children')) return;
        childWrap.hidden = !childWrap.hidden;
        arrow.textContent = childWrap.hidden ? '▸' : '▾';
      });
      group.appendChild(row);
      allRows.push({row,selector,el,name});
      if (children.length && depth < 5) {
        const childWrap = document.createElement('div');
        childWrap.className = 'vb-layer-children';
        children.forEach(child => addNode(child,childWrap,depth+1));
        group.appendChild(childWrap);
      }
      parent.appendChild(group);
    }
    roots.forEach(root => addNode(root,tree,0));
    tree._vbRows = allRows;
    filterLayers();
    syncLayerSelection();
  }
  function layerIcon(tag) {
    return ({HEADER:'▰',NAV:'☰',MAIN:'▣',FOOTER:'▤',SECTION:'▦',ARTICLE:'▧',IMG:'▧',VIDEO:'▷',A:'↗',BUTTON:'◉',H1:'T',H2:'T',H3:'T',P:'¶'})[tag] || '◦';
  }
  function filterLayers() {
    const query = ($('#vb-layer-search').value || '').trim().toLowerCase();
    const rows = $('#vb-layer-tree')._vbRows || [];
    rows.forEach(item => {
      const value = [item.name.textContent,item.el.tagName,item.el.id,Array.from(item.el.classList || []).join(' ')].join(' ').toLowerCase();
      item.row.style.display = !query || value.includes(query) ? 'flex' : 'none';
    });
  }
  function syncLayerSelection() {
    const rows = $('#vb-layer-tree')._vbRows || [];
    rows.forEach(item => item.row.classList.toggle('is-selected', item.el === currentElement));
  }
  function updateSelectionOutline() {
    if (!frameDoc) return;
    $$('.rbh-vb-selected',frameDoc).forEach(el => { if (el !== currentElement) el.classList.remove('rbh-vb-selected'); });
    if (currentElement && frameDoc.documentElement.contains(currentElement)) currentElement.classList.add('rbh-vb-selected');
  }

  function field(id) { return $('#' + id); }
  function setField(id,value) { const node = field(id); if (node) node.value = value == null ? '' : String(value); }
  function showRow(id,visible) { const node = $('#' + id); if (node) node.hidden = !visible; }
  function colorToHex(value,fallback) {
    if (!value) return fallback;
    const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (match) return '#' + [match[1],match[2],match[3]].map(part => Number(part).toString(16).padStart(2,'0')).join('');
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map(char => char+char).join('');
    return fallback;
  }
  function getStyleValue(el,prop) {
    const css = styleProps[prop] || prop;
    return el.style.getPropertyValue(css) || frameDoc.defaultView.getComputedStyle(el).getPropertyValue(css);
  }
  function renderInspector(el) {
    if (!el || !frameDoc) return clearInspector();
    const entry = elementRecord(currentSelector,false) || {};
    const tag = el.tagName.toLowerCase();
    const link = tag === 'a';
    const media = ['img','video','source'].includes(tag);
    const text = hasTextContent(el);
    showRow('vb-text-row',text);
    showRow('vb-href-row',link);
    showRow('vb-src-row',media);
    showRow('vb-alt-row',tag === 'img');
    showRow('vb-target-row',link);
    showRow('vb-behavior-href-row',link);
    showRow('vb-hidden-row',true);
    showRow('vb-object-position-row',tag === 'img');
    setField('vb-text',text ? (entry.text !== undefined ? entry.text : readText(el)) : '');
    setField('vb-href',entry.href !== undefined ? entry.href : (el.getAttribute('href') || ''));
    setField('vb-behavior-href',entry.href !== undefined ? entry.href : (el.getAttribute('href') || ''));
    setField('vb-src',entry.src !== undefined ? entry.src : (el.getAttribute('src') || ''));
    setField('vb-alt',entry.alt !== undefined ? entry.alt : (el.getAttribute('alt') || ''));
    setField('vb-target',entry.target !== undefined ? entry.target : (el.getAttribute('target') || '_self'));
    field('vb-hidden').checked = entry.hidden === true;
    const styles = entry.styles || {};
    const color = styles.color !== undefined ? styles.color : getStyleValue(el,'color');
    const bg = styles.backgroundColor !== undefined ? styles.backgroundColor : getStyleValue(el,'backgroundColor');
    setField('vb-color',colorToHex(color,'#272727'));
    setField('vb-color-text',color);
    setField('vb-bg',colorToHex(bg,'#ffffff'));
    setField('vb-bg-text',bg);
    setField('vb-font-size',styles.fontSize !== undefined ? styles.fontSize : getStyleValue(el,'fontSize'));
    setField('vb-font-family',styles.fontFamily !== undefined ? styles.fontFamily : getStyleValue(el,'fontFamily'));
    setField('vb-font-weight',styles.fontWeight !== undefined ? styles.fontWeight : getStyleValue(el,'fontWeight'));
    setField('vb-text-align',styles.textAlign !== undefined ? styles.textAlign : getStyleValue(el,'textAlign'));
    setField('vb-radius',styles.borderRadius !== undefined ? styles.borderRadius : getStyleValue(el,'borderRadius'));
    const opacity = styles.opacity !== undefined ? Number(styles.opacity) : Number(getStyleValue(el,'opacity'));
    setField('vb-opacity',Number.isFinite(opacity) ? opacity : 1);
    $('#vb-opacity-label').textContent = Math.round(Number(field('vb-opacity').value) * 100) + '%';
    setField('vb-width',styles.width !== undefined ? styles.width : el.style.width);
    setField('vb-height',styles.height !== undefined ? styles.height : el.style.height);
    setField('vb-padding',styles.padding !== undefined ? styles.padding : el.style.padding);
    setField('vb-margin',styles.margin !== undefined ? styles.margin : el.style.margin);
    setField('vb-object-position',styles.objectPosition !== undefined ? styles.objectPosition : (el.style.objectPosition || ''));
    setField('vb-cursor',entry.cursor || '');
    const mobile = (entry.responsive || {}).mobile || {};
    setField('vb-mobile-font-size',mobile.fontSize || '');
    setField('vb-mobile-width',mobile.width || '');
    field('vb-mobile-hidden').checked = mobile.hidden === true;
    const motion = entry.motion || {};
    setField('vb-motion',motion.preset || 'preserve');
    setField('vb-motion-duration',motion.duration || 800);
    setField('vb-motion-delay',motion.delay || 0);
    setField('vb-motion-easing',motion.easing || 'ease-out');
    $('#vb-inspector-title').textContent = describeElement(el);
  }

  function clearInspector() {
    $('#vb-inspector-title').textContent = 'Select an element';
    $('#vb-inspector-subtitle').textContent = 'Choose any component in the preview.';
    $('#vb-selected-chip-text').textContent = 'No selection';
    $('#vb-selected-summary').textContent = 'Nothing selected';
    $('#vb-layer-meta').textContent = 'Choose an element in the canvas';
    $('#vb-canvas-hint').textContent = 'Click any supported element on the page to edit it';
    $('#vb-selected-chip').hidden = false;
    $('#vb-no-selection').hidden = false;
    $('#vb-inspector-reset').disabled = true;
    $('#vb-reset-element').disabled = true;
  }

  function bindInput(id,key,eventName) {
    field(id).addEventListener(eventName, event => updateElementProperty(key,event.target.value));
  }
  function bindStyle(id,key) {
    const node = field(id);
    node.addEventListener('focus', beginEdit);
    node.addEventListener('change', event => updateStyle(key,event.target.value));
  }
  function beginEdit() {
    if (!editSnapshot) editSnapshot = JSON.stringify(cms);
  }
  function finishEdit() {
    if (editSnapshot !== null) {
      const before = editSnapshot;
      editSnapshot = null;
      const after = JSON.stringify(cms);
      if (before !== after) pushHistoryState(after);
    }
  }
  function updateElementProperty(key,value) {
    if (!currentElement || !currentSelector || !ready) return;
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    if (key === 'text') {
      if (!hasTextContent(currentElement)) return;
      entry.text = String(value).slice(0,12000);
      const nodes = captureBase(currentElement).textNodes.filter(item => item.node && item.node.isConnected);
      if (nodes.length) { nodes[0].node.nodeValue = entry.text; nodes.slice(1).forEach(item => { item.node.nodeValue = ''; }); }
    } else if (key === 'href') {
      if (!isSafeHref(value)) { toast('Enter a safe internal, HTTP(S), telephone, or email destination.',true); return; }
      entry.href = String(value).trim();
      if (currentElement.tagName.toLowerCase() === 'a') currentElement.setAttribute('href',entry.href);
    } else if (key === 'src') {
      if (!isSafeMediaUrl(value)) { toast('Use an HTTPS URL or a site-relative media path.',true); return; }
      entry.src = String(value).trim();
      currentElement.setAttribute('src',entry.src);
    } else if (key === 'alt') {
      entry.alt = String(value).slice(0,500);
      if (currentElement.tagName.toLowerCase() === 'img') currentElement.setAttribute('alt',entry.alt);
    } else if (key === 'target') {
      entry.target = value === '_blank' ? '_blank' : '_self';
      if (currentElement.tagName.toLowerCase() === 'a') {
        currentElement.setAttribute('target',entry.target);
        if (entry.target === '_blank') currentElement.setAttribute('rel','noopener noreferrer');
      }
    } else if (key === 'hidden') {
      entry.hidden = Boolean(value);
      if (entry.hidden) currentElement.style.setProperty('display','none','important');
      else {
        const base = captureBase(currentElement).styleValues.display;
        if (base.value) currentElement.style.setProperty('display',base.value,base.priority);
        else currentElement.style.removeProperty('display');
      }
    }
    changed();
  }

  function updateStyle(key,value) {
    if (!currentElement || !currentSelector || !ready) return;
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    const next = String(value == null ? '' : value).trim();
    const prop = styleProps[key] || key;
    if (next && !isAllowedStyle(key,next)) { toast('That CSS value is not supported or is invalid.',true); return; }
    entry.styles = entry.styles || {};
    if (next === '') {
      delete entry.styles[key];
      const base = captureBase(currentElement).styleValues[prop];
      if (base && base.value) currentElement.style.setProperty(prop,base.value,base.priority);
      else currentElement.style.removeProperty(prop);
    } else {
      entry.styles[key] = next;
      currentElement.style.setProperty(prop,next,'important');
    }
    if (!Object.keys(entry.styles).length) delete entry.styles;
    changed();
  }

  function updateResponsive(key,value) {
    if (!currentElement || !currentSelector || !ready) return;
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    entry.responsive = entry.responsive || {};
    entry.responsive.mobile = entry.responsive.mobile || {};
    if (key === 'hidden') entry.responsive.mobile.hidden = Boolean(value);
    else {
      const next = String(value || '').trim();
      if (next && !isAllowedStyle(key,next)) { toast('Enter a supported CSS value.',true); return; }
      if (next) entry.responsive.mobile[key] = next;
      else delete entry.responsive.mobile[key];
    }
    if (!Object.keys(entry.responsive.mobile).length) delete entry.responsive.mobile;
    if (!Object.keys(entry.responsive).length) delete entry.responsive;
    applySingleOverride(currentElement,entry);
    changed();
  }

  function renderMotionUpdate() {
    if (!currentElement || !currentSelector || !ready) return;
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    const preset = field('vb-motion').value;
    if (preset === 'preserve') {
      delete entry.motion;
      const base = captureBase(currentElement);
      if (base.motion === null) currentElement.removeAttribute('data-rbh-vb-motion');
      else currentElement.setAttribute('data-rbh-vb-motion',base.motion);
      ['duration','delay','easing'].forEach(key => {
        const attr = 'data-rbh-vb-' + key;
        const value = base['motion' + key[0].toUpperCase() + key.slice(1)];
        if (value === null) currentElement.removeAttribute(attr); else currentElement.setAttribute(attr,value);
      });
      currentElement.style.removeProperty('--rbh-vb-duration');
      currentElement.style.removeProperty('--rbh-vb-delay');
      currentElement.style.removeProperty('--rbh-vb-easing');
    } else {
      entry.motion = {
        preset,
        duration: clamp(Number(field('vb-motion-duration').value) || 800,100,15000),
        delay: clamp(Number(field('vb-motion-delay').value) || 0,0,10000),
        easing: safeEasing(field('vb-motion-easing').value)
      };
      applyMotion(currentElement,entry.motion);
    }
    changed();
  }

  function applySingleOverride(el,entry) {
    if (!el || !entry) return;
    const base = captureBase(el);
    Object.entries(entry.styles || {}).forEach(([key,value]) => {
      const prop = styleProps[key] || key;
      if (isAllowedStyle(key,value)) el.style.setProperty(prop,value,'important');
    });
    const responsive = (entry.responsive || {}).mobile || {};
    if (frameDoc.defaultView.matchMedia('(max-width: 767px)').matches) {
      if (responsive.fontSize) el.style.setProperty('font-size',responsive.fontSize,'important');
      if (responsive.width) el.style.setProperty('width',responsive.width,'important');
      if (responsive.hidden) el.style.setProperty('display','none','important');
      else if (responsive.hidden === false && entry.hidden !== true) {
        const d = base.styleValues.display;
        if (d.value) el.style.setProperty('display',d.value,d.priority); else el.style.removeProperty('display');
      }
    }
  }

  function changed() {
    dirty = true;
    saveStatus('Unsaved changes','is-dirty');
    $('#vb-draft-label').textContent = 'Unpublished draft';
    $('#vb-save-draft').disabled = false;
    $('#vb-publish').disabled = false;
    renderPages();
    syncLayerSelection();
    if (currentElement) {
      $('#vb-selected-summary').textContent = '<' + currentElement.tagName.toLowerCase() + '> · ' + describeElement(currentElement);
      $('#vb-selected-chip-text').textContent = describeElement(currentElement);
    }
    clearTimeout(changed.timer);
    changed.timer = setTimeout(finishEdit,350);
  }

  function resetElement() {
    if (!currentSelector || !ready) return;
    const page = pageRecord();
    if (!page.elements || !page.elements[currentSelector]) { toast('This element has no saved override.'); return; }
    beginEdit();
    delete page.elements[currentSelector];
    if (!Object.keys(page.elements).length) delete page.elements;
    if (currentElement) restoreBase(currentElement);
    renderInspector(currentElement);
    changed();
    toast('Element overrides removed. Original page styling and animation are restored.');
  }

  function resetHistory() {
    history = [JSON.stringify(cms)];
    historyIndex = 0;
    updateHistoryButtons();
  }
  function pushHistoryState(state) {
    if (history[historyIndex] === state) return;
    history = history.slice(0,historyIndex+1);
    history.push(state);
    if (history.length > 60) history.shift();
    historyIndex = history.length-1;
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    $('#vb-undo').disabled = historyIndex <= 0;
    $('#vb-redo').disabled = historyIndex < 0 || historyIndex >= history.length-1;
  }
  function applyHistoryState(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    const previousSelector = currentSelector;
    cms = JSON.parse(history[index]);
    dirty = JSON.stringify(cms) !== savedState;
    saveStatus(dirty ? 'Unsaved changes' : 'Saved draft',dirty ? 'is-dirty' : '');
    if (frameDoc) {
      if (currentElement) restoreBase(currentElement);
      currentElement = null;
      currentSelector = '';
      applyDraftOverrides();
      if (previousSelector) {
        try { const el = frameDoc.querySelector(previousSelector); if (el) selectElement(el); else clearInspector(); } catch { clearInspector(); }
      } else clearInspector();
      buildLayers();
    }
    renderPages();
    updateHistoryButtons();
  }
  function undo() { if (historyIndex > 0) applyHistoryState(historyIndex-1); }
  function redo() { if (historyIndex < history.length-1) applyHistoryState(historyIndex+1); }
  function keyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveDraft(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')) { event.preventDefault(); redo(); }
  }

  async function saveDraft() {
    if (!authenticated || !ready) { toast('The shared CMS draft is not ready. No save was attempted.',true); return false; }
    saveStatus('Saving draft','is-dirty');
    $('#vb-save-draft').disabled = true;
    try {
      const result = await request('/api/save-cms','POST',cms);
      if (!result.success) throw new Error(result.message || 'Draft save failed.');
      savedState = JSON.stringify(cms);
      dirty = false;
      editSnapshot = null;
      localStorage.setItem('rbh_studio_cms',JSON.stringify(cms));
      saveStatus('Draft saved');
      $('#vb-draft-label').textContent = 'Saved draft · not live';
      pushHistoryState(JSON.stringify(cms));
      toast('Draft saved to shared CMS storage. The live website is unchanged.');
      return true;
    } catch (err) {
      saveStatus('Save failed','is-error');
      toast('Draft was not confirmed as saved: ' + err.message,true);
      return false;
    } finally {
      $('#vb-save-draft').disabled = false;
    }
  }

  async function publishLive() {
    if (!authenticated || !ready) { toast('The shared CMS draft is not ready. Publishing is blocked.',true); return; }
    const confirmButton = $('#vb-confirm-publish');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Publishing…';
    try {
      const saveResult = await request('/api/save-cms','POST',cms);
      if (!saveResult.success) throw new Error(saveResult.message || 'Draft save failed.');
      const result = await request('/api/publish','POST',cms);
      if (!result.success) throw new Error(result.message || 'The server did not confirm publishing.');
      savedState = JSON.stringify(cms);
      dirty = false;
      localStorage.setItem('rbh_studio_cms',JSON.stringify(cms));
      localStorage.setItem('royal_cms_published',JSON.stringify(cms));
      $('#vb-confirm').hidden = true;
      $('#vb-draft-label').textContent = 'Published configuration';
      saveStatus('Published');
      pushHistoryState(JSON.stringify(cms));
      toast('Publish was confirmed by the shared backend. Refreshing the preview.');
      await loadPreview(true);
    } catch (err) {
      saveStatus('Publish failed','is-error');
      toast('Publishing failed. The existing live page was not assumed to change: ' + err.message,true);
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Publish live';
    }
  }

  function setSelectMode(enabled) {
    selectMode = Boolean(enabled);
    ['vb-select-mode','vb-tool-select'].forEach(id => field(id).classList.toggle('is-active',selectMode));
    ['vb-hand-mode','vb-tool-hand'].forEach(id => field(id).classList.toggle('is-active',!selectMode));
    if (frameDoc) {
      frameDoc.documentElement.classList.toggle('rbh-vb-select-mode',selectMode);
      frameDoc.documentElement.classList.toggle('rbh-vb-hand-mode',!selectMode);
      if (!selectMode && hoveredElement) hoveredElement.classList.remove('rbh-vb-hover');
    }
    $('#vb-canvas-hint').textContent = selectMode ? 'Click any supported element on the page to edit it' : 'Hand mode: scroll and interact with the page';
  }
  function setDevice(device) {
    const preview = $('#vb-preview-frame');
    preview.classList.remove('vb-device-desktop','vb-device-tablet','vb-device-mobile');
    preview.classList.add('vb-device-' + device);
    $$('.vb-device-switch button').forEach(button => {
      const selected = button.dataset.device === device;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-pressed',selected ? 'true' : 'false');
    });
    if (frameDoc) {
      setTimeout(() => {
        try { frameDoc.defaultView.dispatchEvent(new Event('resize')); } catch {}
      },80);
    }
  }
  function setZoom(value) {
    zoom = clamp(Math.round(value*100)/100,0.5,1.3);
    $('#vb-preview-frame').style.transform = zoom === 1 ? '' : 'scale(' + zoom + ')';
    $('#vb-zoom-value').textContent = Math.round(zoom*100) + '%';
  }
  function setInspectorTab(tab) {
    $$('.vb-inspector-tabs button').forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-selected',active ? 'true' : 'false');
    });
    $$('.vb-inspector-pane').forEach(pane => pane.classList.toggle('is-active',pane.dataset.pane === tab));
    $('#vb-no-selection').hidden = Boolean(currentElement);
  }
  function collapseLeft() {
    $('.vb-left').classList.toggle('is-collapsed');
    $('.vb-workspace').classList.toggle('is-left-collapsed');
    $('#vb-collapse-left').textContent = $('.vb-left').classList.contains('is-collapsed') ? '›' : '‹';
  }
  function replayMotion() {
    if (!currentElement) return;
    const entry = elementRecord(currentSelector,false) || {};
    if (entry.motion && entry.motion.preset && entry.motion.preset !== 'preserve') {
      const preset = entry.motion.preset;
      currentElement.removeAttribute('data-rbh-vb-motion');
      void currentElement.offsetWidth;
      applyMotion(currentElement,entry.motion);
      toast('Animation replayed in the preview.');
    } else {
      currentElement.animate([{opacity:.65,offset:0},{opacity:1,offset:1}],{duration:450,easing:'ease-out'});
      toast('Existing animation settings are preserved. Previewed a temporary selection fade.');
    }
  }

  start().catch(error => {
    saveStatus('Editor error','is-error');
    toast('The editor could not initialize: ' + error.message,true);
  });
})();
