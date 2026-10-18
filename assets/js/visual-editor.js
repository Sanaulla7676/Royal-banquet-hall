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
  const fontOptions = [
    { name:'Playfair Display', category:'serif', stack:"'Playfair Display', serif", sample:'Royal Celebrations' },
    { name:'Cormorant Garamond', category:'serif', stack:"'Cormorant Garamond', serif", sample:'A Royal Celebration' },
    { name:'Libre Baskerville', category:'serif', stack:"'Libre Baskerville', serif", sample:'The Grand Occasion' },
    { name:'Lora', category:'editorial', stack:"'Lora', serif", sample:'A Day to Remember' },
    { name:'Cinzel', category:'display', stack:"'Cinzel', serif", sample:'ROYAL BANQUET' },
    { name:'Prata', category:'display', stack:"'Prata', serif", sample:'Elegant Moments' },
    { name:'Bodoni Moda', category:'editorial', stack:"'Bodoni Moda', serif", sample:'The Art of Celebration' },
    { name:'DM Serif Display', category:'display', stack:"'DM Serif Display', serif", sample:'Unforgettable Events' },
    { name:'Source Serif 4', category:'serif', stack:"'Source Serif 4', serif", sample:'The Perfect Venue' },
    { name:'Merriweather', category:'serif', stack:"'Merriweather', serif", sample:'Moments Made Special' },
    { name:'Crimson Pro', category:'editorial', stack:"'Crimson Pro', serif", sample:'A Beautiful Beginning' },
    { name:'EB Garamond', category:'serif', stack:"'EB Garamond', serif", sample:'Celebrate in Style' },
    { name:'Inter', category:'sans', stack:"'Inter', sans-serif", sample:'Make Every Moment Count' },
    { name:'DM Sans', category:'sans', stack:"'DM Sans', sans-serif", sample:'Designed for Your Day' },
    { name:'Manrope', category:'sans', stack:"'Manrope', sans-serif", sample:'A Place for Every Occasion' },
    { name:'Montserrat', category:'sans', stack:"'Montserrat', sans-serif", sample:'Create Lasting Memories' },
    { name:'Poppins', category:'sans', stack:"'Poppins', sans-serif", sample:'Celebrate Something Special' },
    { name:'Lato', category:'sans', stack:"'Lato', sans-serif", sample:'Moments that Matter' },
    { name:'Open Sans', category:'sans', stack:"'Open Sans', sans-serif", sample:'The Perfect Celebration' },
    { name:'Nunito Sans', category:'sans', stack:"'Nunito Sans', sans-serif", sample:'Your Day, Your Way' },
    { name:'Plus Jakarta Sans', category:'sans', stack:"'Plus Jakarta Sans', sans-serif", sample:'An Experience to Remember' },
    { name:'Work Sans', category:'sans', stack:"'Work Sans', sans-serif", sample:'Beautifully Done' },
    { name:'Urbanist', category:'sans', stack:"'Urbanist', sans-serif", sample:'Every Detail Matters' },
    { name:'Oswald', category:'display', stack:"'Oswald', sans-serif", sample:'MAKE IT MEMORABLE' }
  ];
  const styleProps = {
    color: 'color', backgroundColor: 'background-color', fontSize: 'font-size',
    fontFamily: 'font-family', fontWeight: 'font-weight', textAlign: 'text-align',
    lineHeight: 'line-height', letterSpacing: 'letter-spacing', textTransform: 'text-transform',
    borderRadius: 'border-radius', opacity: 'opacity', width: 'width', height: 'height',
    padding: 'padding', margin: 'margin', objectPosition: 'object-position',
    position: 'position', left: 'left', top: 'top', zIndex: 'z-index'
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
  let moveMode = false;
  let suppressNextCanvasClick = false;
  let activeFontCategory = 'all';

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

  async function handlePhotoUpload(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    const uploadButton = field('vb-photo-upload-button');
    const status = field('vb-photo-upload-status');
    const targetElement = currentElement;
    const targetSelector = currentSelector;
    const targetPage = activePage;

    if (!authenticated || !ready) {
      toast('Sign in and load the shared draft before uploading a photo.',true);
      input.value = '';
      return;
    }
    if (!targetElement || targetElement.tagName.toLowerCase() !== 'img' || !targetSelector) {
      toast('Select an image in the page preview first.',true);
      input.value = '';
      return;
    }
    const allowedTypes = new Set(['image/jpeg','image/png','image/webp','image/gif']);
    if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
      status.textContent = 'Unsupported file. Choose JPG, PNG, WebP or GIF.';
      status.classList.add('is-error');
      toast('Choose a JPG, PNG, WebP or GIF photo.',true);
      input.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      status.textContent = 'This photo is larger than 15 MB.';
      status.classList.add('is-error');
      toast('Photo uploads are limited to 15 MB.',true);
      input.value = '';
      return;
    }
    const frame = field('vb-page-frame');
    const layerTree = field('vb-layer-tree');
    const pageList = field('vb-page-list');
    const pageSelect = field('vb-page-select');
    const rightPanel = field('vb-right');
    const previousPointerEvents = {
      frame: frame.style.pointerEvents,
      layers: layerTree.style.pointerEvents,
      pages: pageList.style.pointerEvents,
      inspector: rightPanel.style.pointerEvents
    };
    uploadButton.disabled = true;
    input.disabled = true;
    pageSelect.disabled = true;
    frame.style.pointerEvents = 'none';
    layerTree.style.pointerEvents = 'none';
    pageList.style.pointerEvents = 'none';
    rightPanel.style.pointerEvents = 'none';
    status.classList.remove('is-error','is-success');
    status.textContent = 'Requesting a secure upload…';

    try {
      const signed = await request('/api/cloudinary/signature?resource_type=image');
      if (!signed.cloudName || !signed.apiKey || !signed.signature || !signed.timestamp) {
        throw new Error('The media service did not return a valid upload signature.');
      }
      const form = new FormData();
      form.append('file',file,file.name);
      form.append('api_key',signed.apiKey);
      form.append('timestamp',String(signed.timestamp));
      form.append('folder',signed.folder || 'royal-banquet');
      form.append('tags',signed.tags || 'royal-banquet,cms-upload');
      form.append('signature',signed.signature);
      status.textContent = 'Uploading ' + file.name + '…';
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/' + encodeURIComponent(signed.cloudName) + '/image/upload',
        { method:'POST', body:form, cache:'no-store' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.secure_url) {
        throw new Error(payload.error && payload.error.message ? payload.error.message : 'Cloudinary rejected the photo upload.');
      }
      const secureUrl = String(payload.secure_url);
      if (!/^https:\/\/res\.cloudinary\.com\//i.test(secureUrl)) {
        throw new Error('The upload service returned an unexpected image URL.');
      }
      const photoUrl = secureUrl.replace('/upload/','/upload/f_auto,q_auto/');
      if (activePage !== targetPage || currentSelector !== targetSelector || currentElement !== targetElement) {
        throw new Error('The selected image changed during upload. Select it again and retry.');
      }
      beginEdit();
      const entry = elementRecord(targetSelector,true);
      entry.src = photoUrl;
      const currentAlt = String(entry.alt !== undefined ? entry.alt : (targetElement.getAttribute('alt') || ''));
      if (!currentAlt.trim()) entry.alt = file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim().slice(0,500);
      setField('vb-src',photoUrl);
      setField('vb-alt',entry.alt !== undefined ? entry.alt : currentAlt);
      changed();
      renderInspector(targetElement);
      status.classList.remove('is-error');
      status.classList.add('is-success');
      status.textContent = 'Uploaded ' + file.name + '. Save Draft, then Publish to make it live.';
      toast('Photo uploaded and applied to the selected image. Save Draft, then Publish.');
    } catch (error) {
      status.classList.remove('is-success');
      status.classList.add('is-error');
      status.textContent = 'Upload failed: ' + (error.message || 'Unknown error.');
      toast('Photo upload failed: ' + (error.message || 'Unknown error.'),true);
    } finally {
      uploadButton.disabled = false;
      input.disabled = false;
      pageSelect.disabled = false;
      frame.style.pointerEvents = previousPointerEvents.frame;
      layerTree.style.pointerEvents = previousPointerEvents.layers;
      pageList.style.pointerEvents = previousPointerEvents.pages;
      rightPanel.style.pointerEvents = previousPointerEvents.inspector;
      input.value = '';
    }
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
    $('#vb-expand-layers').addEventListener('click', () => setLayersExpanded(true));
    $('#vb-collapse-layers').addEventListener('click', () => setLayersExpanded(false));
    $('#vb-move-mode').addEventListener('click', () => setMoveMode(!moveMode));
    $('#vb-open-font-picker').addEventListener('click', openFontPicker);
    $('#vb-close-font-picker').addEventListener('click', closeFontPicker);
    $('#vb-close-font-picker-backdrop').addEventListener('click', closeFontPicker);
    $('#vb-cancel-font-picker').addEventListener('click', closeFontPicker);
    $('#vb-font-search').addEventListener('input', renderFontChoices);
    $('#vb-font-categories').querySelectorAll('[data-font-category]').forEach(button => button.addEventListener('click', () => {
      activeFontCategory = button.dataset.fontCategory || 'all';
      $('#vb-font-categories').querySelectorAll('[data-font-category]').forEach(item => item.classList.toggle('is-active',item === button));
      renderFontChoices();
    }));
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
    $('#vb-photo-upload-button').addEventListener('click', () => {
      if (!currentElement || currentElement.tagName.toLowerCase() !== 'img') {
        toast('Select an image in the website preview before uploading a replacement.',true);
        return;
      }
      $('#vb-photo-upload').click();
    });
    $('#vb-photo-upload').addEventListener('change', handlePhotoUpload);
    bindInput('vb-alt', 'alt', 'change');
    bindInput('vb-target', 'target', 'change');
    $('#vb-font-family').addEventListener('change', event => updateStyle('fontFamily',event.target.value));
    bindStyle('vb-font-weight', 'fontWeight');
    bindStyle('vb-text-align', 'textAlign');
    bindStyle('vb-text-transform', 'textTransform');
    bindStyle('vb-radius', 'borderRadius');
    bindStyle('vb-padding', 'padding');
    bindStyle('vb-margin', 'margin');
    bindStyle('vb-object-position', 'objectPosition');
    bindSliderStyle('vb-font-size','fontSize','px','vb-font-size-number','vb-font-size-label');
    bindSliderStyle('vb-line-height','lineHeight','','vb-line-height-number','vb-line-height-label');
    bindSliderStyle('vb-letter-spacing','letterSpacing','px','vb-letter-spacing-number','vb-letter-spacing-label');
    bindSliderStyle('vb-width','width','px','vb-width-number','vb-width-label');
    bindSliderStyle('vb-height','height','px','vb-height-number','vb-height-label');
    $('#vb-width-preset').addEventListener('change', event => applyDimensionPreset('width',event.target.value));
    $('#vb-height-preset').addEventListener('change', event => applyDimensionPreset('height',event.target.value));
    document.querySelectorAll('[data-font-size]').forEach(button => button.addEventListener('click', () => applySliderValue('vb-font-size',button.dataset.fontSize,'px','vb-font-size-number','vb-font-size-label')));
    document.querySelectorAll('[data-line-height]').forEach(button => button.addEventListener('click', () => applySliderValue('vb-line-height',button.dataset.lineHeight,'','vb-line-height-number','vb-line-height-label')));
    $$('.vb-motion-card').forEach(button => button.addEventListener('click', () => {
      field('vb-motion').value = button.dataset.motionPreset;
      renderMotionUpdate();
      replayMotion();
    }));
    $('#vb-opacity').addEventListener('input', event => { $('#vb-opacity-label').textContent = Math.round(Number(event.target.value) * 100) + '%'; updateStyle('opacity', event.target.value); });
    $('#vb-cursor').addEventListener('change', event => updateElementProperty('cursor', event.target.value));
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
        syncDraftOverrides();
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
      'html.rbh-vb-hand-mode,html.rbh-vb-hand-mode *{cursor:auto!important;}',
      'html.rbh-vb-move-mode,html.rbh-vb-move-mode *{cursor:move!important;}',
      'html.rbh-vb-move-mode .rbh-vb-selected{outline:2px solid #d0a641!important;outline-offset:3px!important;cursor:move!important;}'
    ].join('');
    frameDoc.head.appendChild(style);
  }

  function attachSelectionEvents() {
    if (!frameDoc) return;
    frameDoc.documentElement.classList.toggle('rbh-vb-select-mode', selectMode);
    frameDoc.documentElement.classList.toggle('rbh-vb-hand-mode', !selectMode);
    frameDoc.addEventListener('click', event => {
      if (suppressNextCanvasClick) {
        suppressNextCanvasClick = false;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      if (!selectMode) return;
      const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
      const el = target && target.closest('a,button,img,video,source,h1,h2,h3,h4,h5,h6,p,span,li,article,section,header,footer,nav,main,div');
      if (!el || el === frameDoc.body || el === frameDoc.documentElement || el.closest('#royal-admin-dock,.rbh-admin-dock,.admin-preview-controls')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selectElement(el);
    }, true);
    frameDoc.addEventListener('pointerdown', event => {
      if (!moveMode || !currentElement || event.button !== 0) return;
      const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
      if (!(currentElement === target || currentElement.contains(target))) return;
      startCanvasDrag(event);
    }, true);
    frameDoc.addEventListener('mouseover', event => {
      if (!selectMode || moveMode) return;
      const target = event.target && event.target.nodeType === 1 ? event.target : event.target.parentElement;
      const el = target && target.closest('a,button,img,video,h1,h2,h3,h4,h5,h6,p,span,li,article,section,header,footer,nav,main,div');
      if (hoveredElement && hoveredElement !== currentElement) hoveredElement.classList.remove('rbh-vb-hover');
      hoveredElement = el;
      if (hoveredElement && hoveredElement !== currentElement) hoveredElement.classList.add('rbh-vb-hover');
    }, true);
    frameDoc.addEventListener('mouseout', event => {
      if (!selectMode || moveMode) return;
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

    const stableAttributeNames = ['data-section-id','data-component','data-block-id','data-testid','aria-label'];
    for (const name of stableAttributeNames) {
      const value = el.getAttribute(name);
      if (!value || value.length > 120 || /[\\"']/ .test(value)) continue;
      const selector = el.tagName.toLowerCase() + '[' + name + '="' + value + '"]';
      try { if (frameDoc.querySelectorAll(selector).length === 1) return selector; } catch {}
    }

    const dynamicClass = /^(?:is-|has-|aos-|gsap|active$|open$|visible$|rbh-vb|site-revealed$|fx-|story-reveal$|reveal(?:$|-)|scroll-reveal|animate(?:$|-)|animation(?:$|-)|motion(?:$|-))/i;
    const stableClasses = node => Array.from(node.classList || [])
      .filter(name => !dynamicClass.test(name) && !/^(?:fx-|aos-|gsap|is-|has-)/i.test(name))
      .filter(name => /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name))
      .sort((a,b) => a.length-b.length)
      .slice(0, 3);
    const partFor = node => {
      const tag = node.tagName.toLowerCase();
      const classes = stableClasses(node);
      return tag + classes.map(name => '.' + cssEscape(name)).join('');
    };

    const targetPart = partFor(el);
    const candidates = [targetPart];
    // Prefer a short, unique selector anchored in a stable semantic ancestor.
    // Use descendant combinators rather than nth-of-type, since scroll/animation
    // classes and dynamically inserted wrappers may differ on the public page.
    let ancestor = el.parentElement;
    while (ancestor && ancestor !== frameDoc.body && ancestor !== frameDoc.documentElement) {
      const ancestorPart = partFor(ancestor);
      if (stableClasses(ancestor).length || ['main','header','footer','nav'].includes(ancestor.tagName.toLowerCase())) {
        candidates.push(ancestorPart + ' ' + targetPart);
        const chain = [];
        let node = el;
        while (node && node !== ancestor && node !== frameDoc.body && node !== frameDoc.documentElement) {
          chain.unshift(partFor(node));
          node = node.parentElement;
        }
        if (node === ancestor) candidates.push([ancestorPart].concat(chain).join(' '));
      }
      try {
        for (const candidate of candidates) {
          if (frameDoc.querySelectorAll(candidate).length === 1) return candidate;
        }
      } catch {}
      ancestor = ancestor.parentElement;
      if (ancestor && ['MAIN','HEADER','FOOTER','NAV'].includes(ancestor.tagName)) {
        const rootPart = partFor(ancestor);
        const rootCandidate = rootPart + ' ' + targetPart;
        try { if (frameDoc.querySelectorAll(rootCandidate).length === 1) return rootCandidate; } catch {}
      }
    }

    // Last-resort path: stable classes and tags only, never transient body classes.
    const path = [];
    let node = el;
    while (node && node !== frameDoc.body && node !== frameDoc.documentElement) {
      path.unshift(partFor(node));
      if (node.tagName === 'MAIN' || node.tagName === 'HEADER' || node.tagName === 'FOOTER' || node.tagName === 'NAV') break;
      node = node.parentElement;
    }
    const fallback = path.join(' ');
    try { if (fallback && frameDoc.querySelectorAll(fallback).length === 1) return fallback; } catch {}
    return targetPart;
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
    const preset = ['none','fade-in','fade-up','slide-down','zoom-in','slide-left','slide-right','blur-in','bounce','pulse','rotate','shimmer','float'].includes(motion.preset) ? motion.preset : 'preserve';
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
      '@keyframes rbhVbSlideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes rbhVbBlurIn{from{opacity:0;filter:blur(12px)}to{opacity:1;filter:blur(0)}}',
      '@keyframes rbhVbBounce{0%{opacity:0;transform:translateY(18px)}60%{opacity:1;transform:translateY(-4px)}100%{transform:translateY(0)}}',
      '@keyframes rbhVbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}',
      '@keyframes rbhVbRotate{from{opacity:.2;transform:rotate(-6deg) scale(.96)}to{opacity:1;transform:rotate(0) scale(1)}}',
      '@keyframes rbhVbShimmer{0%,100%{filter:brightness(1)}50%{filter:brightness(1.26) drop-shadow(0 0 8px rgba(198,161,91,.45))}}',
      '[data-rbh-vb-motion="none"]{animation:none!important}',
      '[data-rbh-vb-motion="fade-in"]{animation:rbhVbFadeIn var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="fade-up"]{animation:rbhVbFadeUp var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="zoom-in"]{animation:rbhVbZoomIn var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="slide-left"]{animation:rbhVbSlideLeft var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="slide-right"]{animation:rbhVbSlideRight var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="slide-down"]{animation:rbhVbSlideDown var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="blur-in"]{animation:rbhVbBlurIn var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="bounce"]{animation:rbhVbBounce var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="pulse"]{animation:rbhVbPulse var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-in-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="rotate"]{animation:rbhVbRotate var(--rbh-vb-duration,800ms) var(--rbh-vb-easing,ease-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="shimmer"]{animation:rbhVbShimmer var(--rbh-vb-duration,1200ms) var(--rbh-vb-easing,ease-in-out) var(--rbh-vb-delay,0ms) both!important}',
      '[data-rbh-vb-motion="float"]{animation:rbhVbFloat var(--rbh-vb-duration,3000ms) var(--rbh-vb-easing,ease-in-out) var(--rbh-vb-delay,0ms) infinite alternate}',
      '@media(prefers-reduced-motion:reduce){[data-rbh-vb-motion]{animation:none!important;transition:none!important}}'
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
    if (['font-size','width','height','padding','margin','border-radius','left','top'].includes(cssProp)) return safeLength.test(val) || /^calc\([0-9a-zA-Z.%+*/()\s-]+\)$/i.test(val);
    if (['color','background-color'].includes(cssProp)) return /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\sdeg-]+\)|[a-z]{1,25}|var\(--[a-z0-9-]+\))$/i.test(val);
    if (cssProp === 'opacity') return Number.isFinite(Number(val)) && Number(val) >= 0 && Number(val) <= 1;
    if (cssProp === 'font-weight') return /^(normal|bold|[1-9]00)$/i.test(val);
    if (cssProp === 'font-family') return /^[a-zA-Z0-9 ,"'-]{1,100}$/.test(val);
    if (cssProp === 'line-height') return /^(normal|[0-9]*\.?[0-9]+(?:px|rem|em|%)?)$/i.test(val);
    if (cssProp === 'letter-spacing') return /^(normal|[-+]?[0-9]*\.?[0-9]+(?:px|rem|em|%)?)$/i.test(val);
    if (cssProp === 'text-transform') return ['none','capitalize','uppercase','lowercase','full-width'].includes(val);
    if (cssProp === 'position') return ['static','relative','absolute','fixed','sticky'].includes(val);
    if (cssProp === 'z-index') return /^\d{1,4}$/.test(val) && Number(val) <= 9999;
    if (cssProp === 'text-align') return ['left','right','center','justify','start','end'].includes(val);
    if (cssProp === 'object-position') return /^[a-zA-Z0-9.%\s-]+$/.test(val) && val.length < 60;
    if (cssProp === 'cursor') return ['pointer','default','grab','grabbing','move','text','not-allowed'].includes(val);
    return false;
  }

  function syncDraftOverrides() {
    if (!frameDoc || !$('#vb-page-frame').contentWindow) return;
    const page = (cms.pageOverrides || {})[activePage] || {};
    const elements = page.elements && typeof page.elements === 'object' ? page.elements : {};
    $('#vb-page-frame').contentWindow.postMessage({
      type: 'RBH_VB_PREVIEW_ELEMENTS',
      pageKey: activePage,
      elements
    }, window.location.origin);
  }

  function applyDraftOverrides() {
    syncDraftOverrides();
  }
  function isSafeSelector(selector) {
    return typeof selector === 'string' && selector.length < 1200 && !/[{};]/.test(selector) && /^[a-zA-Z0-9_#.:>\[\]="'\\*+~()\-\s]+$/.test(selector);
  }

  function buildLayers() {
    if (!frameDoc) return;
    const tree = $('#vb-layer-tree');
    tree.replaceChildren();
    const roots = Array.from(frameDoc.body.children).filter(el => !['SCRIPT','STYLE','NOSCRIPT','LINK','META'].includes(el.tagName));
    const allRows = [];
    let count = 0;
    function addNode(el, parent, depth) {
      if (count >= 600 || !el || !el.tagName || ['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','META','LINK'].includes(el.tagName)) return;
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
      if (children.length && depth < 8) {
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
      const matches = !query || value.includes(query);
      item.row.style.display = matches ? 'flex' : 'none';
      if (matches && query) {
        let ancestorGroup = item.row.parentElement && item.row.parentElement.parentElement && item.row.parentElement.parentElement.closest('.vb-layer-group');
        while (ancestorGroup) {
          const ancestorRow = ancestorGroup.querySelector(':scope > .vb-layer-row');
          const childWrap = ancestorGroup.querySelector(':scope > .vb-layer-children');
          if (ancestorRow) ancestorRow.style.display = 'flex';
          if (childWrap) {
            childWrap.hidden = false;
            const arrow = ancestorRow && ancestorRow.querySelector('.vb-layer-disclose');
            if (arrow && !arrow.disabled) arrow.textContent = '▾';
          }
          ancestorGroup = ancestorGroup.parentElement && ancestorGroup.parentElement.closest('.vb-layer-group');
        }
      }
    });
  }
  function syncLayerSelection() {
    const rows = $('#vb-layer-tree')._vbRows || [];
    rows.forEach(item => item.row.classList.toggle('is-selected', item.el === currentElement));
    const selected = rows.find(item => item.el === currentElement);
    if (selected && !$('#vb-layer-search').value.trim()) selected.row.scrollIntoView({block:'nearest'});
  }
  function setLayersExpanded(expanded) {
    $$('#vb-layer-tree .vb-layer-group').forEach(group => {
      const childWrap = group.querySelector(':scope > .vb-layer-children');
      const row = group.querySelector(':scope > .vb-layer-row');
      const arrow = row && row.querySelector('.vb-layer-disclose');
      if (!childWrap) return;
      childWrap.hidden = !expanded;
      if (arrow && !arrow.disabled) arrow.textContent = expanded ? '▾' : '▸';
    });
  }
  function updateSelectionOutline() {
    if (!frameDoc) return;
    $$('.rbh-vb-selected',frameDoc).forEach(el => { if (el !== currentElement) el.classList.remove('rbh-vb-selected'); });
    if (currentElement && frameDoc.documentElement.contains(currentElement)) currentElement.classList.add('rbh-vb-selected');
  }

  function field(id) { return $('#' + id); }
  function setField(id,value) { const node = field(id); if (node) node.value = value == null ? '' : String(value); }
  function showRow(id,visible) { const node = $('#' + id); if (node) node.hidden = !visible; }
  function clampRange(id,value) {
    const node = field(id), number = Number(value);
    return clamp(Number.isFinite(number) ? number : Number(node?.value || 0),Number(node?.min || 0),Number(node?.max || 100));
  }
  function formatValue(value) {
    return String(Math.round(Number(value) * 100) / 100).replace(/\.0+$/,'');
  }
  function syncSliderControls(rangeId,numberId,labelId,value,suffix='') {
    const range = field(rangeId), number = field(numberId);
    if (!range || !number) return;
    const n = clampRange(rangeId,value);
    range.value = String(n);
    number.value = String(n);
    const label = labelId && field(labelId);
    if (label) label.textContent = formatValue(n) + suffix;
  }
  function applySliderValue(rangeId,value,unit,numberId,labelId) {
    if (!currentElement || !ready) return;
    syncSliderControls(rangeId,numberId,labelId,value,unit);
    const numeric = field(rangeId).value;
    const cssValue = unit ? numeric + unit : numeric;
    const keys = {'vb-font-size':'fontSize','vb-line-height':'lineHeight','vb-letter-spacing':'letterSpacing','vb-width':'width','vb-height':'height'};
    const key = keys[rangeId];
    if (!key) return;
    if (key === 'width') setField('vb-width-preset','');
    if (key === 'height') setField('vb-height-preset','');
    updateStyle(key,cssValue);
  }
  function bindSliderStyle(rangeId,key,unit,numberId,labelId) {
    const range = field(rangeId), number = field(numberId);
    const sync = source => {
      const value = clampRange(rangeId,source.value);
      syncSliderControls(rangeId,numberId,labelId,value,unit);
      if (key === 'width') setField('vb-width-preset','');
      if (key === 'height') setField('vb-height-preset','');
      updateStyle(key,unit ? formatValue(value) + unit : formatValue(value));
    };
    [range,number].forEach(node => {
      node.addEventListener('focus',beginEdit);
      node.addEventListener('input',event => sync(event.target));
      node.addEventListener('change',event => { sync(event.target); finishEdit(); });
    });
  }
  function computedPixelValue(el,cssProperty,fallback=0) {
    if (!el || !frameDoc) return fallback;
    const style = frameDoc.defaultView.getComputedStyle(el);
    const value = parseFloat(style.getPropertyValue(cssProperty));
    if (Number.isFinite(value)) return value;
    const rect = el.getBoundingClientRect();
    if (cssProperty === 'width') return rect.width || fallback;
    if (cssProperty === 'height') return rect.height || fallback;
    return fallback;
  }
  function applyDimensionPreset(key,value) {
    if (!value || !currentElement) return;
    const labelId = key === 'width' ? 'vb-width-label' : 'vb-height-label';
    const label = field(labelId);
    if (label) label.textContent = value;
    updateStyle(key,value);
    toast((key === 'width' ? 'Width' : 'Height') + ' set to ' + value + '.');
  }
  function googleFontHref(fontName) {
    const font = fontOptions.find(item => item.name === fontName);
    if (!font) return '';
    return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(font.name).replace(/%20/g,'+') + ':wght@400;500;600;700;800&display=swap';
  }
  function loadGoogleFontForDocument(doc,fontName) {
    if (!doc || !fontName) return;
    const href = googleFontHref(fontName);
    if (!href) return;
    const id = 'rbh-vb-font-' + fontName.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    let link = doc.getElementById(id);
    if (link) return;
    link = doc.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  }
  function loadFontLibrary(doc) {
    if (!doc || doc.getElementById('rbh-vb-font-library')) return;
    const query = fontOptions.map(font => 'family=' + encodeURIComponent(font.name).replace(/%20/g,'+') + ':wght@400;500;600;700;800').join('&');
    const link = doc.createElement('link');
    link.id = 'rbh-vb-font-library';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' + query + '&display=swap';
    doc.head.appendChild(link);
  }
  function openFontPicker() {
    if (!currentElement) { toast('Select a heading, subheading, or text element first.',true); return; }
    loadFontLibrary(document);
    loadFontLibrary(frameDoc);
    renderFontChoices();
    $('#vb-font-picker').hidden = false;
    $('#vb-font-search').focus();
  }
  function closeFontPicker() {
    $('#vb-font-picker').hidden = true;
    $('#vb-open-font-picker').focus();
  }
  function renderFontChoices() {
    const grid = $('#vb-font-grid');
    if (!grid) return;
    const query = ($('#vb-font-search').value || '').trim().toLowerCase();
    const current = String(field('vb-font-family').value || '').toLowerCase();
    const visible = fontOptions.filter(font =>
      (activeFontCategory === 'all' || font.category === activeFontCategory) &&
      (!query || (font.name + ' ' + font.category).toLowerCase().includes(query))
    );
    grid.replaceChildren();
    visible.forEach(font => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'vb-font-card' + (current.includes(font.name.toLowerCase()) ? ' is-active' : '');
      card.setAttribute('role','listitem');
      const sample = document.createElement('span');
      sample.className = 'vb-font-preview';
      sample.style.fontFamily = font.stack;
      sample.textContent = font.sample;
      const name = document.createElement('span');
      name.className = 'vb-font-name';
      name.textContent = font.name;
      const meta = document.createElement('span');
      meta.className = 'vb-font-meta';
      meta.textContent = ({serif:'Classic serif',sans:'Modern sans serif',display:'Statement display',editorial:'Editorial serif'})[font.category] || font.category;
      card.append(sample,name,meta);
      card.addEventListener('click',() => {
        loadGoogleFontForDocument(document,font.name);
        loadGoogleFontForDocument(frameDoc,font.name);
        setField('vb-font-family',font.stack);
        updateStyle('fontFamily',font.stack);
        closeFontPicker();
        toast(font.name + ' applied to the selected element.');
      });
      grid.appendChild(card);
    });
    $('#vb-font-count').textContent = visible.length + (visible.length === 1 ? ' font' : ' fonts');
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'vb-font-empty';
      empty.textContent = 'No fonts match that search. Try another name or category.';
      grid.appendChild(empty);
    }
  }
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
    showRow('vb-upload-row',tag === 'img');
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
    const computed = frameDoc.defaultView.getComputedStyle(el);
    const fontSizePx = computedPixelValue(el,'font-size',48);
    syncSliderControls('vb-font-size','vb-font-size-number','vb-font-size-label',fontSizePx,'px');
    const familyValue = styles.fontFamily !== undefined ? styles.fontFamily : getStyleValue(el,'fontFamily');
    setField('vb-font-family',familyValue);
    const familyName = String(familyValue || '').split(',')[0].replace(/['"]/g,'').trim();
    loadGoogleFontForDocument(frameDoc,familyName);
    setField('vb-font-weight',styles.fontWeight !== undefined ? styles.fontWeight : getStyleValue(el,'fontWeight'));
    setField('vb-text-align',styles.textAlign !== undefined ? styles.textAlign : getStyleValue(el,'textAlign'));
    setField('vb-text-transform',styles.textTransform !== undefined ? styles.textTransform : getStyleValue(el,'textTransform'));
    let lineHeightValue = styles.lineHeight !== undefined ? Number(styles.lineHeight) : NaN;
    if (!Number.isFinite(lineHeightValue) || lineHeightValue > 3) {
      const lineHeightPx = parseFloat(computed.lineHeight);
      lineHeightValue = Number.isFinite(lineHeightPx) && fontSizePx > 0 ? lineHeightPx / fontSizePx : 1.4;
    }
    syncSliderControls('vb-line-height','vb-line-height-number','vb-line-height-label',lineHeightValue || 1.4,'');
    const letterPx = styles.letterSpacing !== undefined ? computedPixelValue(el,'letter-spacing',0) : computedPixelValue(el,'letter-spacing',0);
    syncSliderControls('vb-letter-spacing','vb-letter-spacing-number','vb-letter-spacing-label',letterPx,'px');
    setField('vb-radius',styles.borderRadius !== undefined ? styles.borderRadius : getStyleValue(el,'borderRadius'));
    const opacity = styles.opacity !== undefined ? Number(styles.opacity) : Number(getStyleValue(el,'opacity'));
    setField('vb-opacity',Number.isFinite(opacity) ? opacity : 1);
    $('#vb-opacity-label').textContent = Math.round(Number(field('vb-opacity').value) * 100) + '%';
    const widthValue = styles.width !== undefined ? styles.width : (el.style.width || '');
    const heightValue = styles.height !== undefined ? styles.height : (el.style.height || '');
    syncSliderControls('vb-width','vb-width-number','vb-width-label',computedPixelValue(el,'width',640),'px');
    syncSliderControls('vb-height','vb-height-number','vb-height-label',computedPixelValue(el,'height',360),'px');
    setField('vb-width-preset',['auto','fit-content','25%','50%','75%','100%'].includes(widthValue) ? widthValue : '');
    setField('vb-height-preset',['auto','25vh','50vh','70vh','100vh'].includes(heightValue) ? heightValue : '');
    if (field('vb-width-preset').value === '') $('#vb-width-label').textContent = widthValue || ('Auto · ' + Math.round(computedPixelValue(el,'width',640)) + 'px');
    else $('#vb-width-label').textContent = widthValue;
    if (field('vb-height-preset').value === '') $('#vb-height-label').textContent = heightValue || ('Auto · ' + Math.round(computedPixelValue(el,'height',360)) + 'px');
    else $('#vb-height-label').textContent = heightValue;
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
    $$('.vb-motion-card').forEach(button => button.classList.toggle('is-active',button.dataset.motionPreset === (motion.preset || 'preserve')));
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
  function bindSliderStyle(rangeId,key,unit,numberId,labelId) {
    const range = field(rangeId), number = field(numberId);
    const sync = source => {
      const value = clampRange(rangeId,source.value);
      syncSliderControls(rangeId,numberId,labelId,value,unit);
      if (key === 'width') setField('vb-width-preset','');
      if (key === 'height') setField('vb-height-preset','');
      updateStyle(key,unit ? formatValue(value) + unit : formatValue(value));
    };
    [range,number].forEach(node => {
      node.addEventListener('focus',beginEdit);
      node.addEventListener('input',event => sync(event.target));
      node.addEventListener('change',event => { sync(event.target); finishEdit(); });
    });
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
    } else if (key === 'href') {
      if (!isSafeHref(value)) { toast('Enter a safe internal, HTTP(S), telephone, or email destination.',true); return; }
      entry.href = String(value).trim();
    } else if (key === 'src') {
      if (!isSafeMediaUrl(value)) { toast('Use an HTTPS URL or a site-relative media path.',true); return; }
      entry.src = String(value).trim();
    } else if (key === 'alt') {
      entry.alt = String(value).slice(0,500);
    } else if (key === 'target') {
      entry.target = value === '_blank' ? '_blank' : '_self';
    } else if (key === 'cursor') {
      if (value && !isAllowedStyle('cursor',value)) { toast('That cursor option is not supported.',true); return; }
      if (value) entry.cursor = value;
      else delete entry.cursor;
    } else if (key === 'hidden') {
      entry.hidden = Boolean(value);
    }
    changed();
  }

  function updateStyle(key,value) {
    if (!currentElement || !currentSelector || !ready) return;
    if (key === 'fontFamily') loadGoogleFontForDocument(frameDoc, String(value || '').split(',')[0].replace(/['"]/g,'').trim());
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    const next = String(value == null ? '' : value).trim();
    if (next && !isAllowedStyle(key,next)) { toast('That CSS value is not supported or is invalid.',true); return; }
    entry.styles = entry.styles || {};
    if (next === '') delete entry.styles[key];
    else entry.styles[key] = next;
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
    changed();
  }

  function renderMotionUpdate() {
    if (!currentElement || !currentSelector || !ready) return;
    beginEdit();
    const entry = elementRecord(currentSelector,true);
    const preset = field('vb-motion').value;
    if (preset === 'preserve') {
      delete entry.motion;
    } else {
      entry.motion = {
        preset,
        duration: clamp(Number(field('vb-motion-duration').value) || 800,100,15000),
        delay: clamp(Number(field('vb-motion-delay').value) || 0,0,10000),
        easing: safeEasing(field('vb-motion-easing').value)
      };
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
    syncDraftOverrides();
    // Do not traverse the live iframe DOM from the inspector change handler. Some
    // site scripts measure animated content during text edits, so keep this path
    // synchronous, small, and independent of the selected element's subtree.
    if (currentElement) {
      const tag = currentElement.tagName.toLowerCase();
      const label = currentSelector || tag;
      $('#vb-selected-summary').textContent = '<' + tag + '> · ' + label.slice(0, 72);
      $('#vb-selected-chip-text').textContent = label.slice(0, 40);
      $('#vb-inspector-title').textContent = tag;
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

  function setMoveMode(enabled) {
    if (enabled && !currentElement) {
      toast('Select an element first, then use Move to reposition it.',true);
      return;
    }
    if (enabled && currentElement) {
      // Move the whole brand lockup first so the logo mark and wordmark stay together.
      const logo = currentElement.closest('.site-header .brand, .site-header .brand-lockup') ||
        currentElement.closest('.site-header .brand-logo');
      if (logo && logo !== currentElement) selectElement(logo);
    }
    moveMode = Boolean(enabled);
    if (moveMode) selectMode = true;
    ['vb-move-mode'].forEach(id => field(id).classList.toggle('is-active',moveMode));
    ['vb-select-mode','vb-tool-select'].forEach(id => field(id).classList.toggle('is-active',selectMode && !moveMode));
    ['vb-hand-mode','vb-tool-hand'].forEach(id => field(id).classList.toggle('is-active',!selectMode));
    if (frameDoc) {
      frameDoc.documentElement.classList.toggle('rbh-vb-move-mode',moveMode);
      frameDoc.documentElement.classList.toggle('rbh-vb-select-mode',selectMode);
      frameDoc.documentElement.classList.toggle('rbh-vb-hand-mode',!selectMode);
    }
    $('#vb-canvas-hint').textContent = moveMode
      ? 'Move mode: drag the selected element. For the logo, the full brand lockup moves together.'
      : (selectMode ? 'Click any supported element to edit it' : 'Hand mode: scroll and interact with the page');
  }

  function startCanvasDrag(event) {
    if (!currentElement || !currentSelector || !frameDoc) return;
    const element = currentElement;
    const selector = currentSelector;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    beginEdit();
    const entry = elementRecord(selector,true);
    entry.styles = entry.styles || {};
    const cssLeft = parseFloat(entry.styles.left !== undefined ? entry.styles.left : element.style.left);
    const cssTop = parseFloat(entry.styles.top !== undefined ? entry.styles.top : element.style.top);
    const startLeft = Number.isFinite(cssLeft) ? cssLeft : 0;
    const startTop = Number.isFinite(cssTop) ? cssTop : 0;
    const startX = event.clientX;
    const startY = event.clientY;
    const startDocLeft = rect.left + (frameDoc.defaultView.scrollX || 0);
    const startDocTop = rect.top + (frameDoc.defaultView.scrollY || 0);
    const pageWidth = Math.max(frameDoc.documentElement.scrollWidth,frameDoc.body.scrollWidth,frameDoc.defaultView.innerWidth);
    const pageHeight = Math.max(frameDoc.documentElement.scrollHeight,frameDoc.body.scrollHeight,frameDoc.defaultView.innerHeight);
    const lowerLeft = startLeft - startDocLeft;
    const upperLeft = startLeft + pageWidth - startDocLeft - rect.width;
    const lowerTop = startTop - startDocTop;
    const upperTop = startTop + pageHeight - startDocTop - rect.height;
    let moved = false;
    const pointerTarget = event.target;
    try { if (pointerTarget.setPointerCapture) pointerTarget.setPointerCapture(event.pointerId); } catch {}
    const onMove = moveEvent => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      const left = clamp(startLeft + dx,Math.min(lowerLeft,upperLeft),Math.max(lowerLeft,upperLeft));
      const top = clamp(startTop + dy,Math.min(lowerTop,upperTop),Math.max(lowerTop,upperTop));
      entry.styles.position = 'relative';
      entry.styles.left = Math.round(left) + 'px';
      entry.styles.top = Math.round(top) + 'px';
      entry.styles.zIndex = '1001';
      element.style.setProperty('position','relative','important');
      element.style.setProperty('left',entry.styles.left,'important');
      element.style.setProperty('top',entry.styles.top,'important');
      element.style.setProperty('z-index','1001','important');
    };
    const onEnd = endEvent => {
      if (endEvent.pointerId !== event.pointerId) return;
      frameDoc.removeEventListener('pointermove',onMove,true);
      frameDoc.removeEventListener('pointerup',onEnd,true);
      frameDoc.removeEventListener('pointercancel',onEnd,true);
      if (moved) {
        suppressNextCanvasClick = true;
        changed();
        toast('Element position updated. Save Draft to keep it, then Publish to make it live.');
        setTimeout(() => { suppressNextCanvasClick = false; },0);
      } else {
        editSnapshot = null;
      }
    };
    frameDoc.addEventListener('pointermove',onMove,true);
    frameDoc.addEventListener('pointerup',onEnd,true);
    frameDoc.addEventListener('pointercancel',onEnd,true);
  }

  function setSelectMode(enabled) {
    if (!enabled && moveMode) setMoveMode(false);
    selectMode = Boolean(enabled);
    ['vb-select-mode','vb-tool-select'].forEach(id => field(id).classList.toggle('is-active',selectMode && !moveMode));
    ['vb-hand-mode','vb-tool-hand'].forEach(id => field(id).classList.toggle('is-active',!selectMode));
    if (frameDoc) {
      frameDoc.documentElement.classList.toggle('rbh-vb-select-mode',selectMode && !moveMode);
      frameDoc.documentElement.classList.toggle('rbh-vb-hand-mode',!selectMode);
      frameDoc.documentElement.classList.toggle('rbh-vb-move-mode',moveMode);
      if (!selectMode && hoveredElement) hoveredElement.classList.remove('rbh-vb-hover');
    }
    $('#vb-canvas-hint').textContent = moveMode
      ? 'Move mode: drag the selected element. For the logo, the full brand lockup moves together.'
      : (selectMode ? 'Click any supported element to edit it' : 'Hand mode: scroll and interact with the page');
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
      $('#vb-page-frame').contentWindow.postMessage({type:'RBH_VB_REPLAY_MOTION',selector:currentSelector},window.location.origin);
      toast('Animation replay requested in the preview.');
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
