/**
 * Royal Banquet Hall - CMS Client Runtime & In-Context Visual Studio
 * Automatically loaded on public pages to render customized themes, fonts, buttons,
 * navbar, layout resizing, media replacements, and floating in-context editor.
 */

(() => {
  const STORAGE_KEY = 'royal_cms_data_store';
  const AUTH_KEY = 'royal_admin_session';

  // 1. Initialize State
  let cmsData = window.ROYAL_CMS_DATA || {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cmsData = deepMerge(cmsData, parsed);
      window.ROYAL_CMS_DATA = cmsData;
    }
  } catch (err) {
    console.warn('[Royal CMS] Could not load localStorage data:', err);
  }

  // Load published Studio customizations (only when published from studio!)
  function applyStudioPublished(pub) {
    if (!pub || typeof pub !== 'object') return;
    cmsData.studioPublished = pub;
    cmsData.navbar = cmsData.navbar || {};

    if (pub.logo) {
      if (pub.logo.width) cmsData.navbar.logoWidth = pub.logo.width;
      if (pub.logo.height) cmsData.navbar.logoHeight = pub.logo.height;
      if (pub.logo.src) cmsData.navbar.logoSrc = pub.logo.src;
      if (pub.logo.position) cmsData.navbar.logoPosition = pub.logo.position;
    }
    if (pub.navbar) {
      if (pub.navbar.bgColor) cmsData.navbar.bgColor = pub.navbar.bgColor;
      if (pub.navbar.height) cmsData.navbar.height = pub.navbar.height;
      cmsData.navbar.transparent = !!pub.navbar.transparent;
      if (pub.navbar.cta) cmsData.navbar.cta = pub.navbar.cta;
      if (Array.isArray(pub.navbar.links)) cmsData.navbar.links = pub.navbar.links;
    }

    // Apply the same core settings that are edited in the Admin Studio to every visitor.
    const hero = document.querySelector('.hero, .hero-section');
    if (pub.hero) {
      const slides = Array.from(document.querySelectorAll('.hero-slideshow [data-hero-slide]'));
      if (pub.hero.src && slides.length) slides[0].src = pub.hero.src;
      if (hero && Number.isFinite(Number(pub.hero.height))) {
        hero.style.setProperty('min-height', Number(pub.hero.height) + 'vh', 'important');
      }
      slides.forEach(img => {
        if (Number.isFinite(Number(pub.hero.posX)) && Number.isFinite(Number(pub.hero.posY))) {
          img.style.objectPosition = Number(pub.hero.posX) + '% ' + Number(pub.hero.posY) + '%';
        }
        if (Number.isFinite(Number(pub.hero.scale))) {
          img.style.transform = 'scale(' + (Number(pub.hero.scale) / 100) + ')';
        }
        if (Number.isFinite(Number(pub.hero.brightness))) {
          img.style.filter = 'brightness(' + Number(pub.hero.brightness) + '%) contrast(' +
            (Number.isFinite(Number(pub.hero.contrast)) ? Number(pub.hero.contrast) : 100) + '%)';
        }
      });
      if (hero && pub.hero.displayMode) {
        hero.style.setProperty('--cms-hero-display-mode', pub.hero.displayMode);
      }
    }

    if (pub.heroHeading) {
      const heading = document.querySelector('.hero-content h1') ||
        document.querySelector('.hero-title-primary');
      if (heading && typeof pub.heroHeading.text === 'string') {
        const completeTitle = pub.heroHeading.text.trim();
        const primary = heading.querySelector('.hero-title-primary');
        const accent = heading.querySelector('.hero-title-accent');
        if (primary && accent && completeTitle) {
          const words = completeTitle.split(/\s+/);
          accent.textContent = words.pop() || '';
          primary.textContent = words.join(' ') + (words.length ? ' ' : '');
        } else {
          heading.textContent = completeTitle;
        }
      }
      if (heading && Number.isFinite(Number(pub.heroHeading.size))) {
        heading.style.fontSize = Number(pub.heroHeading.size) + 'px';
      }
      if (heading && Number.isFinite(Number(pub.heroHeading.weight))) {
        heading.style.fontWeight = String(Number(pub.heroHeading.weight));
      }
      if (heading && Number.isFinite(Number(pub.heroHeading.lineHeight))) {
        heading.style.lineHeight = String(Number(pub.heroHeading.lineHeight));
      }
      if (heading && Number.isFinite(Number(pub.heroHeading.letterSpacing))) {
        heading.style.letterSpacing = Number(pub.heroHeading.letterSpacing) + 'px';
      }
    }

    if (pub.heroSub) {
      const subheading = document.querySelector('.hero-content .lede') ||
        document.querySelector('.hero-content p');
      if (subheading && typeof pub.heroSub.text === 'string') subheading.textContent = pub.heroSub.text;
      if (subheading && Number.isFinite(Number(pub.heroSub.size))) {
        subheading.style.fontSize = Number(pub.heroSub.size) + 'px';
      }
    }

    if (pub.background && pub.background.src) {
      document.body.style.backgroundImage = 'url("' + String(pub.background.src).replace(/"/g, '%22') + '")';
      document.body.style.backgroundPosition = Number(pub.background.posX ?? 50) + '% ' +
        Number(pub.background.posY ?? 50) + '%';
      document.body.style.backgroundSize = 'cover';
    }

    if (pub.video && pub.video.src) {
      document.querySelectorAll('#site-intro video, .site-intro-video, .site-intro video').forEach(video => {
        if (video.tagName.toLowerCase() === 'video') {
          if (video.src !== new URL(pub.video.src, window.location.href).href) video.src = pub.video.src;
          video.autoplay = pub.video.autoplay !== false;
          video.loop = pub.video.loop !== false;
          video.muted = pub.video.muted !== false;
        } else {
          video.dataset.src = pub.video.src;
        }
      });
    }

    // Theme presets are intentionally mapped here rather than requiring the editor's iframe.
    const themePresets = [
      { nav: '#0a0b0d', hero: '#1a1200', gold: '#c6a15b' },
      { nav: '#0d0a1f', hero: '#1a0f2e', gold: '#f0c060' },
      { nav: '#1a0a0f', hero: '#f5f0ea', gold: '#c0697a' },
      { nav: '#0a1a0f', hero: '#1a2f1a', gold: '#5ca870' },
      { nav: '#0a1020', hero: '#0f1e35', gold: '#4a9fd4' },
      { nav: '#f5f0e7', hero: '#faf7f2', gold: '#c6a15b' },
      { nav: '#0f0a0a', hero: '#1a0a0f', gold: '#d45050' },
      { nav: '#111827', hero: '#f8fafc', gold: '#6b7280' },
      { nav: '#1a0e05', hero: '#2d1a08', gold: '#e8874a' },
      { nav: '#0a0f2e', hero: '#f0f4ff', gold: '#3b5bdb' }
    ];
    const activeTheme = Number(pub.theme && pub.theme.active);
    if (Number.isInteger(activeTheme) && themePresets[activeTheme]) {
      const theme = themePresets[activeTheme];
      document.documentElement.style.setProperty('--gold', theme.gold);
      document.documentElement.style.setProperty('--ink', theme.nav);
      cmsData.navbar = cmsData.navbar || {};
      cmsData.navbar.bgColor = (pub.navbar && pub.navbar.bgColor) || theme.nav;
      cmsData.navbar.transparent = pub.navbar && typeof pub.navbar.transparent === 'boolean' ?
        pub.navbar.transparent : false;
      cmsData.buttons = cmsData.buttons || {};
      cmsData.buttons.background = (pub.buttons && pub.buttons.gold && pub.buttons.gold.bgColor) || theme.gold;
      if (hero && !pub.hero?.src) hero.style.backgroundColor = theme.hero;
    }

    // Convert the Studio button controls to the existing public-site runtime format.
    const goldButton = pub.buttons && pub.buttons.gold;
    if (goldButton) {
      cmsData.buttons = cmsData.buttons || {};
      cmsData.buttons.borderRadius = goldButton.borderRadius || '999px';
      cmsData.buttons.padding = (goldButton.paddingY || '14px') + ' ' + (goldButton.paddingX || '24px');
      cmsData.buttons.fontSize = goldButton.fontSize || '0.82rem';
      if (goldButton.bgColor) cmsData.buttons.background = goldButton.bgColor;
      if (goldButton.textColor) cmsData.buttons.textColor = goldButton.textColor;
    }

    applyNavbar();
    if (pub.logo && pub.logo.position) {
      const brand = document.querySelector('.site-header .brand, .site-header .brand-lockup');
      if (brand) {
        const positions = { left: 'flex-start', center: 'center', right: 'flex-end' };
        brand.style.setProperty('justify-content', positions[pub.logo.position] || 'flex-start', 'important');
      }
    }
    applyThemeAndStyles();
    applyButtons();
    applyLayoutOverrides();
    applyMediaReplacements();
    applyVenueDetails();
    applySectionOrdering();
    applyStudioAdvancedStyles(pub);
  }

  try {
    const pubStr = localStorage.getItem('royal_cms_published');
    if (pubStr) {
      const pub = JSON.parse(pubStr);
      applyStudioPublished(pub);
    }
  } catch (err) {}

  // Fetch published CMS from server if available (e.g. for external / public visitors)
  (async function fetchPublishedFromServer() {
    try {
      let res = await fetch('/api/load-cms').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('data/cms-settings.json').catch(() => null);
      }
      if (res && res.ok) {
        const json = await res.json();
        const pub = json.data || json;
        if (pub && (pub.logo || pub.navbar || pub.hero || pub.heroHeading)) {
          // Server-published content is authoritative; localStorage must never pin a stale live version.
          applyStudioPublished(pub);
          try { localStorage.setItem('royal_cms_published', JSON.stringify(pub)); } catch {}
        }
      }
    } catch (e) {}
  })();

  // Listen for studio preview postMessage
  window.addEventListener('message', ev => {
    if (ev.data && ev.data.type === 'STUDIO_PREVIEW_SYNC') {
      applyStudioPublished(ev.data.cms);
    }
  });

  function deepMerge(target, source) {
    if (!source) return target;
    const output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  // 2. Dynamic Style Injection for Theme, Typography & Buttons
  let dynamicStyleTag = document.getElementById('royal-cms-dynamic-styles');
  if (!dynamicStyleTag) {
    dynamicStyleTag = document.createElement('style');
    dynamicStyleTag.id = 'royal-cms-dynamic-styles';
    document.head.appendChild(dynamicStyleTag);
  }

  function applyThemeAndStyles() {
    if (!cmsData.theme) return;
    const colors = cmsData.theme.colors || {};
    const typo = cmsData.typography || {};
    const btns = cmsData.buttons || {};

    let css = `
      :root {
        --cream: ${colors['--cream'] || '#f5f0e7'} !important;
        --paper: ${colors['--paper'] || '#fffdf9'} !important;
        --ink: ${colors['--ink'] || '#171d19'} !important;
        --ink2: ${colors['--ink2'] || '#252b25'} !important;
        --gold: ${colors['--gold'] || '#c6a15b'} !important;
        --gold2: ${colors['--gold2'] || '#927039'} !important;
        --text: ${colors['--text'] || '#26251f'} !important;
        --muted: ${colors['--muted'] || '#77736a'} !important;
        --line: ${colors['--line'] || 'rgba(23, 29, 25, 0.14)'} !important;
        --serif: ${typo.headingFont || "'Playfair Display', Georgia, serif"} !important;
        --sans: ${typo.bodyFont || "'DM Sans', Arial, sans-serif"} !important;
      }
    `;

    // Button customizations
    if (btns.gold) {
      const g = btns.gold;
      css += `
        .btn-gold {
          background: ${g.bgType === 'solid' ? g.bgColor : (g.gradient || g.bgColor)} !important;
          color: ${g.textColor || '#1d2117'} !important;
          border-radius: ${g.borderRadius || '999px'} !important;
          padding: ${g.paddingY || '14px'} ${g.paddingX || '24px'} !important;
          font-size: ${g.fontSize || '0.82rem'} !important;
          font-weight: ${g.fontWeight || '700'} !important;
          box-shadow: ${g.shadow || 'none'} !important;
          border: ${g.borderWidth || '1px'} solid ${g.borderColor || 'transparent'} !important;
          transition: all 0.25s ease !important;
        }
        .btn-gold:hover {
          ${g.hoverEffect === 'lift' ? 'transform: translateY(-2px) !important;' : ''}
          ${g.hoverEffect === 'glow' ? 'box-shadow: 0 0 25px rgba(212, 175, 55, 0.5) !important;' : ''}
          ${g.hoverEffect === 'zoom' ? 'transform: scale(1.04) !important;' : ''}
        }
      `;
    }

    if (btns.dark) {
      const d = btns.dark;
      css += `
        .btn-dark {
          background: ${d.bgColor || '#171d19'} !important;
          color: ${d.textColor || '#ffffff'} !important;
          border-radius: ${d.borderRadius || '999px'} !important;
          padding: ${d.paddingY || '14px'} ${d.paddingX || '24px'} !important;
          font-size: ${d.fontSize || '0.82rem'} !important;
          box-shadow: ${d.shadow || 'none'} !important;
        }
      `;
    }

    if (btns.outline) {
      const o = btns.outline;
      css += `
        .btn-outline {
          background: ${o.bgColor || 'transparent'} !important;
          color: ${o.textColor || 'currentColor'} !important;
          border-radius: ${o.borderRadius || '999px'} !important;
          padding: ${o.paddingY || '14px'} ${o.paddingX || '24px'} !important;
          font-size: ${o.fontSize || '0.82rem'} !important;
          border: 1px solid currentColor !important;
        }
      `;
    }

    // Typography scale
    if (typo.headingScale && typo.headingScale !== 1) {
      css += `
        h1 { font-size: calc(clamp(2.8rem, 6.5vw, 5.7rem) * ${typo.headingScale}) !important; }
        h2 { font-size: calc(clamp(2.2rem, 4.4vw, 4rem) * ${typo.headingScale}) !important; }
        h3 { font-size: calc(1.75rem * ${typo.headingScale}) !important; }
      `;
    }

    // Apply layout overrides
    if (cmsData.layoutOverrides && cmsData.layoutOverrides.elements) {
      for (const [selector, styles] of Object.entries(cmsData.layoutOverrides.elements)) {
        if (!styles || Object.keys(styles).length === 0) continue;
        css += `\n ${selector} {\n`;
        for (const [prop, val] of Object.entries(styles)) {
          if (val) css += `  ${prop}: ${val} !important;\n`;
        }
        css += ` }\n`;
      }
    }

    // Custom CSS from admin
    if (cmsData.customCss) {
      css += `\n/* Custom Admin CSS */\n${cmsData.customCss}\n`;
    }

    // Apply header & logo styles from published CMS
    if (cmsData.navbar) {
      const nw = cmsData.navbar.logoWidth;
      const nh = cmsData.navbar.logoHeight;
      const nbg = cmsData.navbar.transparent ? 'transparent' : (cmsData.navbar.bgColor || '#0a0b0d');
      const nH = cmsData.navbar.height;
      if (nw) {
        css += `\n.site-header .brand-logo, .brand img { width: ${nw}px !important; max-width: ${nw}px !important; }\n`;
      }
      if (nh) {
        css += `\n.site-header .brand-logo, .brand img { height: ${nh}px !important; max-height: ${nh}px !important; }\n`;
      }
      if (nbg) {
        css += `\n.site-header { background: ${nbg} !important; }\n`;
      }
      if (nH) {
        css += `\n.site-header, .site-header .nav { min-height: ${nH}px !important; }\n`;
      }
    }

    dynamicStyleTag.textContent = css;

    // Load Google fonts if specified
    if (typo.headingGoogle || typo.bodyGoogle) {
      ensureGoogleFonts(typo.headingGoogle, typo.bodyGoogle, typo.accentGoogle);
    }
  }

  function ensureGoogleFonts(...fonts) {
    const valid = fonts.filter(Boolean);
    if (!valid.length) return;
    const id = 'royal-cms-google-fonts';
    let link = document.getElementById(id);
    const href = `https://fonts.googleapis.com/css2?${valid.map(f => `family=${f}`).join('&')}&display=swap`;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }

  // 3. Navigation & Header Customizer Application
  function applyNavbar() {
    if (!cmsData.navbar) return;
    const navConfig = cmsData.navbar;

    // Header bar styles
    const siteHeader = document.querySelector('.site-header');
    if (siteHeader) {
      if (navConfig.transparent) {
        siteHeader.style.setProperty('background', 'transparent', 'important');
        siteHeader.style.setProperty('border-bottom', '1px solid rgba(255,255,255,0.12)', 'important');
      } else if (navConfig.bgColor) {
        siteHeader.style.setProperty('background', navConfig.bgColor, 'important');
        siteHeader.style.setProperty('border-bottom', '1px solid rgba(198,161,91,0.25)', 'important');
      }
      if (navConfig.height) {
        siteHeader.style.setProperty('min-height', `${navConfig.height}px`, 'important');
      }
    }

    // Logo update
    const brandLogos = document.querySelectorAll('.site-header .brand-logo, .brand img');
    brandLogos.forEach(brandLogo => {
      if (navConfig.logoSrc) brandLogo.src = navConfig.logoSrc;
      if (navConfig.logoWidth) {
        brandLogo.width = navConfig.logoWidth;
        brandLogo.style.setProperty('width', `${navConfig.logoWidth}px`, 'important');
        brandLogo.style.setProperty('max-width', `${navConfig.logoWidth}px`, 'important');
        document.documentElement.style.setProperty('--cms-logo-width', `${navConfig.logoWidth}px`);
      }
      if (navConfig.logoHeight) {
        brandLogo.height = navConfig.logoHeight;
        brandLogo.style.setProperty('height', `${navConfig.logoHeight}px`, 'important');
        brandLogo.style.setProperty('min-height', `${navConfig.logoHeight}px`, 'important');
        document.documentElement.style.setProperty('--cms-logo-height', `${navConfig.logoHeight}px`);
      }
      if (navConfig.logoAlt) brandLogo.alt = navConfig.logoAlt;
    });

    // CTA Button
    const headerCta = document.querySelector('.nav-actions .btn-gold');
    if (headerCta && navConfig.cta) {
      if (navConfig.cta.show === false) {
        headerCta.style.display = 'none';
      } else {
        headerCta.style.display = '';
        if (navConfig.cta.label) headerCta.textContent = navConfig.cta.label;
        if (navConfig.cta.href) headerCta.href = navConfig.cta.href;
      }
    }

    // Navigation Links
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer && navConfig.links && navConfig.links.length > 0) {
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const visibleLinks = navConfig.links.filter(l => l.visible !== false);

      navLinksContainer.innerHTML = '';
      visibleLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        if (currentPath === link.href || (currentPath === '' && link.href === 'index.html')) {
          a.setAttribute('aria-current', 'page');
        }
        navLinksContainer.appendChild(a);
      });
    }
  }

  // 4. Media Replacements (Images, Slideshows, Gallery & Videos)
  function applyMediaReplacements() {
    if (!cmsData.customMedia) return;

    // Image Replacements
    const replacements = cmsData.customMedia.imageReplacements || {};
    if (Object.keys(replacements).length > 0) {
      const allImgs = document.querySelectorAll('img');
      allImgs.forEach(img => {
        const src = img.getAttribute('src');
        if (src && replacements[src]) {
          img.src = replacements[src];
        }
      });
    }

    // Hero Slideshow Placements
    if (Array.isArray(cmsData.customMedia.heroSlideshow) && cmsData.customMedia.heroSlideshow.length > 0) {
      const slideshow = document.querySelector('.hero-slideshow');
      if (slideshow) {
        const slides = Array.from(slideshow.querySelectorAll('[data-hero-slide]'));
        cmsData.customMedia.heroSlideshow.forEach((item, idx) => {
          const src = typeof item === 'string' ? item : item.src;
          const title = typeof item === 'object' && item.title ? item.title : 'The Royal Hall';
          if (slides[idx]) {
            slides[idx].src = src;
            slides[idx].alt = title;
          } else {
            const newImg = document.createElement('img');
            newImg.className = 'hero-slide';
            newImg.setAttribute('data-hero-slide', '');
            newImg.src = src;
            newImg.alt = title;
            slideshow.appendChild(newImg);
          }
        });
      }
    }

    // Gallery Custom Items Placements
    if (Array.isArray(cmsData.customMedia.galleryItems) && cmsData.customMedia.galleryItems.length > 0) {
      if (window.ROYAL_HALL_MEDIA && Array.isArray(window.ROYAL_HALL_MEDIA.photos)) {
        cmsData.customMedia.galleryItems.forEach(item => {
          const exists = window.ROYAL_HALL_MEDIA.photos.some(p => p.src === item.src);
          if (!exists) {
            const pos = typeof item.position === 'number' && item.position >= 0 ? item.position : 0;
            window.ROYAL_HALL_MEDIA.photos.splice(pos, 0, {
              src: item.src,
              category: item.category || 'venue',
              title: item.title || 'Venue Photo',
              alt: item.alt || item.title || 'Royal Hall venue photograph',
              tags: item.category || 'venue'
            });
          }
        });
      }
    }

    // Custom Section Placements (e.g. split-showcase, catering)
    if (Array.isArray(cmsData.customMedia.placements)) {
      cmsData.customMedia.placements.forEach(p => {
        if (p.selector && p.src) {
          const el = document.querySelector(p.selector);
          if (el) {
            if (el.tagName.toLowerCase() === 'img') {
              el.src = p.src;
              if (p.title) el.alt = p.title;
            } else {
              el.style.backgroundImage = `url("${p.src}")`;
            }
          }
        }
      });
    }

    // Intro Video
    if (cmsData.customMedia.introVideoUrl) {
      const introVideo = document.querySelector('.site-intro-video');
      if (introVideo) {
        introVideo.dataset.src = cmsData.customMedia.introVideoUrl;
        if (introVideo.src) introVideo.src = cmsData.customMedia.introVideoUrl;
      }
    }
  }

  // 5. Venue Contact Details Synchronization
  function applyVenueDetails() {
    if (!cmsData.venue) return;
    const v = cmsData.venue;

    // Update global config object
    if (window.ROYAL_HALL_CONFIG) {
      if (v.whatsappNumber) window.ROYAL_HALL_CONFIG.whatsappNumber = v.whatsappNumber;
      if (v.email) window.ROYAL_HALL_CONFIG.email = v.email;
      if (v.locationLabel) window.ROYAL_HALL_CONFIG.locationLabel = v.locationLabel;
      if (v.locationUrl) window.ROYAL_HALL_CONFIG.locationUrl = v.locationUrl;
    }

    // Update tel: and mailto: and wa.me links
    if (v.whatsappNumber) {
      const waLinks = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]');
      waLinks.forEach(a => {
        a.href = `https://wa.me/${v.whatsappNumber}`;
      });
    }
  }

  // 6. Section Reordering from Layout Overrides
  function applySectionOrdering() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const pageOverrides = (cmsData.layoutOverrides?.sections || {})[currentPath];
    if (!pageOverrides || !Array.isArray(pageOverrides) || pageOverrides.length === 0) return;

    const main = document.querySelector('main');
    if (!main) return;

    pageOverrides.forEach(sectionId => {
      const el = document.getElementById(sectionId) || document.querySelector(`[data-section-id="${sectionId}"]`);
      if (el && el.parentElement === main) {
        main.appendChild(el);
      }
    });
  }

  // 7. Buttons Customization Application
  function applyButtons() {
    if (!cmsData.buttons) return;
    const styleId = 'royal-cms-button-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    let cssText = `.btn, .btn-gold, .btn-dark, .btn-outline, .nav-actions .btn {\n`;
    if (cmsData.buttons.borderRadius) cssText += `  border-radius: ${cmsData.buttons.borderRadius} !important;\n`;
    if (cmsData.buttons.minHeight) cssText += `  min-height: ${cmsData.buttons.minHeight} !important;\n`;
    if (cmsData.buttons.padding) cssText += `  padding: ${cmsData.buttons.padding} !important;\n`;
    if (cmsData.buttons.fontSize) cssText += `  font-size: ${cmsData.buttons.fontSize} !important;\n`;
    if (cmsData.buttons.background) cssText += `  background: ${cmsData.buttons.background} !important;\n`;
    if (cmsData.buttons.textColor) cssText += `  color: ${cmsData.buttons.textColor} !important;\n`;
    cssText += `}\n`;
    styleTag.textContent = cssText;
  }

  // 8. Element Layout Overrides Application
  function applyLayoutOverrides() {
    if (!cmsData.layoutOverrides?.elements) return;
    const styleId = 'royal-cms-layout-overrides';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    let cssText = '';
    for (const [sel, styles] of Object.entries(cmsData.layoutOverrides.elements)) {
      cssText += `${sel} {\n`;
      for (const [prop, val] of Object.entries(styles)) {
        cssText += `  ${prop}: ${val} !important;\n`;
      }
      cssText += `}\n`;
    }
    styleTag.textContent = cssText;
  }

  // --------------------------------------------------------------------------
  // ADMIN AUTHENTICATION & IN-CONTEXT STUDIO BAR
  // --------------------------------------------------------------------------
  let serverSessionVerified = false;

  function isAuthenticated() {
    return serverSessionVerified;
  }

  function setAuthenticated(val) {
    serverSessionVerified = Boolean(val);
  }

  let isEditMode = false;
  let activeSelectedElement = null;

  function initAdminUI() {
    // Check if ?admin=login in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('admin')) {
      if (!isAuthenticated()) {
        openLoginModal();
      }
    }

    // Keyboard shortcut: Ctrl + Shift + A to open Admin Modal
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAuthenticated()) {
          toggleEditMode();
        } else {
          openLoginModal();
        }
      }
    });

    // Discreet crown button in footer/corner
    injectDiscreetAdminKey();

    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        setAuthenticated(Boolean(response.ok && data.success));
        if (isAuthenticated()) renderAdminDock();
      })
      .catch(() => setAuthenticated(false));
  }

  function injectDiscreetAdminKey() {
    if (document.querySelector('.royal-admin-quick-key')) return;
    const btn = document.createElement('button');
    btn.className = 'royal-admin-quick-key';
    btn.setAttribute('aria-label', 'Royal Studio Admin');
    btn.title = 'Royal Admin Studio (Ctrl+Shift+A)';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    btn.onclick = () => {
      if (isAuthenticated()) {
        renderAdminDock();
        showToast('Royal Admin Session Active', 'info');
      } else {
        openLoginModal();
      }
    };
    document.body.appendChild(btn);
  }

  function openLoginModal() {
    if (document.querySelector('.admin-login-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'admin-login-modal';
    modal.innerHTML =
      '<div class="admin-login-card">' +
        '<img class="admin-login-logo" src="assets/images/royal-hall-crest.webp" alt="Royal Crest">' +
        '<h2 class="admin-login-title">Royal Admin Studio</h2>' +
        '<p class="admin-login-subtitle">Sign in to open the protected visual editor</p>' +
        '<form id="admin-login-form">' +
          '<div class="admin-form-group"><input type="text" id="admin-login-username" class="admin-input" placeholder="Admin login ID" required autocomplete="username" style="text-align:center;"></div>' +
          '<div class="admin-form-group"><input type="password" id="admin-pin-input" class="admin-input" placeholder="Admin password" required autocomplete="current-password" style="text-align:center;font-size:1.1rem;letter-spacing:0.08em;"></div>' +
          '<div id="admin-login-error" role="alert" style="display:none;color:#ffb4a9;font-size:0.82rem;margin:10px 0;"></div>' +
          '<button type="submit" class="admin-header-btn btn-gold" style="width:100%;justify-content:center;padding:12px;font-size:0.9rem;">Sign In</button>' +
        '</form>' +
        '<button type="button" id="admin-login-cancel" style="background:transparent;border:0;color:#9ba49e;font-size:0.78rem;margin-top:14px;cursor:pointer;">Cancel</button>' +
      '</div>';
    document.body.appendChild(modal);

    const form = modal.querySelector('#admin-login-form');
    const userInput = modal.querySelector('#admin-login-username');
    const input = modal.querySelector('#admin-pin-input');
    const error = modal.querySelector('#admin-login-error');
    const cancel = modal.querySelector('#admin-login-cancel');

    cancel.onclick = () => modal.remove();
    modal.onclick = event => { if (event.target === modal) modal.remove(); };

    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      if (error) error.style.display = 'none';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userInput.value, password: input.value, remember: false })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          if (error) {
            error.textContent = result.message || 'Sign-in failed. Check credentials and server configuration.';
            error.style.display = 'block';
          }
          return;
        }
        setAuthenticated(true);
        modal.remove();
        renderAdminDock();
        showToast('Admin session verified. Visual editor unlocked.', 'success');
      } catch {
        if (error) {
          error.textContent = 'The sign-in service is unavailable. No login was accepted.';
          error.style.display = 'block';
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    };
    setTimeout(() => userInput.focus(), 50);
  }

  function renderAdminDock() {
    let dock = document.querySelector('.royal-admin-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.className = 'royal-admin-dock';
      document.body.appendChild(dock);
    }

    dock.innerHTML = `
      <div class="royal-admin-dock-badge">
        Royal Studio
      </div>
      <button class="royal-admin-dock-btn ${isEditMode ? 'active' : ''}" id="cms-btn-toggle-edit" title="Toggle Visual Canvas Editor">
        ${isEditMode ? 'Editing ON' : 'Visual Edit'}
      </button>
      <a class="royal-admin-dock-btn" href="admin.html" target="_blank" title="Open Full Dashboard">
        Studio Dashboard ↗
      </a>
      <button class="royal-admin-dock-btn save-btn" id="cms-btn-save-all" title="Save All Edits">
        Save Live
      </button>
      <button class="royal-admin-dock-btn" id="cms-btn-logout" title="Lock Admin Mode">
        Logout
      </button>
    `;

    dock.querySelector('#cms-btn-toggle-edit').onclick = toggleEditMode;
    dock.querySelector('#cms-btn-save-all').onclick = saveAllChanges;
    dock.querySelector('#cms-btn-logout').onclick = async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
      } catch {}
      setAuthenticated(false);
      if (isEditMode) toggleEditMode();
      dock.remove();
      showToast('Logged out of Admin Studio', 'info');
    };
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('royal-cms-editing', isEditMode);
    renderAdminDock();

    if (isEditMode) {
      setupVisualEditor();
      showToast('Visual Edit Mode Active: Double-click text to edit, click any element to resize or reposition.', 'success');
    } else {
      teardownVisualEditor();
    }
  }

  function setupVisualEditor() {
    // 1. Text inline editing
    const textElements = document.querySelectorAll('h1, h2, h3, p, .eyebrow, .lede, .hero-note span, .booking-step p, .booking-step strong');
    textElements.forEach(el => {
      el.classList.add('cms-editable-highlight');
      el.setAttribute('title', 'Double-click to edit text inline');
      el.ondblclick = (e) => {
        e.stopPropagation();
        el.contentEditable = 'true';
        el.focus();
        showToast('Editing text... Click outside when finished.', 'info');
      };
      el.onblur = () => {
        el.contentEditable = 'false';
      };
    });

    // 2. Image replacement pill on hover
    const images = document.querySelectorAll('main img, .brand-logo');
    images.forEach(img => {
      if (img.parentElement.classList.contains('cms-image-hover-wrapper')) return;
      const wrap = document.createElement('div');
      wrap.className = 'cms-image-hover-wrapper';
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);

      const btn = document.createElement('button');
      btn.className = 'cms-image-replace-btn';
      btn.innerHTML = 'Replace Image';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageReplaceModal(img);
      };
      wrap.appendChild(btn);
    });

    // 3. Element click inspector / resizer
    document.addEventListener('click', handleElementSelection, true);
  }

  function teardownVisualEditor() {
    document.querySelectorAll('.cms-editable-highlight').forEach(el => {
      el.classList.remove('cms-editable-highlight');
      el.contentEditable = 'false';
    });
    document.querySelectorAll('.cms-selected-box').forEach(el => {
      el.classList.remove('cms-selected-box');
    });
    const drawer = document.querySelector('.cms-element-resizer-drawer');
    if (drawer) drawer.remove();
    document.removeEventListener('click', handleElementSelection, true);
  }

  function handleElementSelection(e) {
    if (!isEditMode) return;
    // Don't select admin dock or drawer elements
    if (e.target.closest('.royal-admin-dock') || e.target.closest('.cms-element-resizer-drawer') || e.target.closest('.admin-login-modal') || e.target.closest('.cms-image-replace-btn')) {
      return;
    }

    const target = e.target.closest('section, .hero, .card, .search-panel, .btn, .cta-banner, header.site-header, footer.site-footer, h1, h2, img');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('.cms-selected-box').forEach(el => el.classList.remove('cms-selected-box'));
    target.classList.add('cms-selected-box');
    activeSelectedElement = target;

    openElementResizerDrawer(target);
  }

  function openElementResizerDrawer(element) {
    let drawer = document.querySelector('.cms-element-resizer-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'cms-element-resizer-drawer';
      document.body.appendChild(drawer);
    }

    const tagName = element.tagName.toLowerCase();
    const className = element.className.split(' ').filter(c => !c.startsWith('cms-')).slice(0, 2).join('.');
    const identifier = tagName + (className ? `.${className}` : '');

    // Read current computed styles
    const computed = window.getComputedStyle(element);

    drawer.innerHTML = `
      <div class="cms-drawer-header">
        <div class="cms-drawer-title">
          <span>Layout & Resize</span>
          <span style="font-size:0.75rem;background:rgba(212,175,55,0.15);padding:2px 6px;border-radius:4px;color:var(--admin-gold);">${identifier}</span>
        </div>
        <button class="cms-drawer-close" id="cms-close-drawer">×</button>
      </div>

      <!-- Section Reordering (if section) -->
      ${element.tagName.toLowerCase() === 'section' || element.classList.contains('hero') || element.classList.contains('quick-search') ? `
      <div class="cms-control-group" style="display:flex;gap:8px;margin-bottom:18px;">
        <button id="cms-move-up" class="royal-admin-dock-btn" style="flex:1;justify-content:center;">Move Up</button>
        <button id="cms-move-down" class="royal-admin-dock-btn" style="flex:1;justify-content:center;">Move Down</button>
      </div>` : ''}

      <!-- Width Slider -->
      <div class="cms-control-group">
        <div class="cms-control-label">
          <span>Width</span>
          <span class="val" id="cms-val-width">${computed.width}</span>
        </div>
        <input type="range" class="cms-range-slider" id="cms-slider-width" min="100" max="1400" step="10" value="${parseInt(computed.width) || 600}">
      </div>

      <!-- Min Height Slider -->
      <div class="cms-control-group">
        <div class="cms-control-label">
          <span>Height / Min-Height</span>
          <span class="val" id="cms-val-height">${computed.minHeight !== '0px' ? computed.minHeight : computed.height}</span>
        </div>
        <input type="range" class="cms-range-slider" id="cms-slider-height" min="50" max="1000" step="10" value="${parseInt(computed.minHeight) || parseInt(computed.height) || 300}">
      </div>

      <!-- Padding Slider -->
      <div class="cms-control-group">
        <div class="cms-control-label">
          <span>Padding (Vertical)</span>
          <span class="val" id="cms-val-padding">${computed.paddingTop}</span>
        </div>
        <input type="range" class="cms-range-slider" id="cms-slider-padding" min="0" max="180" step="4" value="${parseInt(computed.paddingTop) || 0}">
      </div>

      <!-- Margin Slider -->
      <div class="cms-control-group">
        <div class="cms-control-label">
          <span>Margin (Bottom)</span>
          <span class="val" id="cms-val-margin">${computed.marginBottom}</span>
        </div>
        <input type="range" class="cms-range-slider" id="cms-slider-margin" min="0" max="120" step="4" value="${parseInt(computed.marginBottom) || 0}">
      </div>

      <!-- Scale Slider -->
      <div class="cms-control-group">
        <div class="cms-control-label">
          <span>Scale Factor</span>
          <span class="val" id="cms-val-scale">1.0x</span>
        </div>
        <input type="range" class="cms-range-slider" id="cms-slider-scale" min="0.5" max="1.6" step="0.05" value="1.0">
      </div>

      <!-- Position Offset X / Y -->
      <div class="cms-control-group" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <div class="cms-control-label"><span>Offset X</span><span class="val" id="cms-val-x">0px</span></div>
          <input type="range" class="cms-range-slider" id="cms-slider-x" min="-100" max="100" step="2" value="0">
        </div>
        <div>
          <div class="cms-control-label"><span>Offset Y</span><span class="val" id="cms-val-y">0px</span></div>
          <input type="range" class="cms-range-slider" id="cms-slider-y" min="-100" max="100" step="2" value="0">
        </div>
      </div>

      <!-- Reset Styles for Element -->
      <button id="cms-btn-reset-element" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:6px;padding:8px;font-size:0.75rem;cursor:pointer;margin-top:10px;">
        Reset Custom Styles
      </button>
    `;

    drawer.querySelector('#cms-close-drawer').onclick = () => drawer.remove();

    // Section movement
    const btnUp = drawer.querySelector('#cms-move-up');
    const btnDown = drawer.querySelector('#cms-move-down');
    if (btnUp) {
      btnUp.onclick = () => {
        const prev = element.previousElementSibling;
        if (prev && element.parentElement) {
          element.parentElement.insertBefore(element, prev);
          saveCurrentSectionOrder();
          showToast('Section moved up', 'info');
        }
      };
    }
    if (btnDown) {
      btnDown.onclick = () => {
        const next = element.nextElementSibling;
        if (next && element.parentElement) {
          element.parentElement.insertBefore(next, element);
          saveCurrentSectionOrder();
          showToast('Section moved down', 'info');
        }
      };
    }

    // Sliders Live Listeners
    const widthSlider = drawer.querySelector('#cms-slider-width');
    const heightSlider = drawer.querySelector('#cms-slider-height');
    const padSlider = drawer.querySelector('#cms-slider-padding');
    const marSlider = drawer.querySelector('#cms-slider-margin');
    const scaleSlider = drawer.querySelector('#cms-slider-scale');
    const xSlider = drawer.querySelector('#cms-slider-x');
    const ySlider = drawer.querySelector('#cms-slider-y');

    let currentScale = 1.0;
    let currentX = 0;
    let currentY = 0;

    function updateTransform() {
      element.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
    }

    widthSlider.oninput = (e) => {
      const v = `${e.target.value}px`;
      element.style.maxWidth = v;
      element.style.width = '100%';
      drawer.querySelector('#cms-val-width').textContent = v;
      recordElementStyle(identifier, 'max-width', v);
    };

    heightSlider.oninput = (e) => {
      const v = `${e.target.value}px`;
      element.style.minHeight = v;
      drawer.querySelector('#cms-val-height').textContent = v;
      recordElementStyle(identifier, 'min-height', v);
    };

    padSlider.oninput = (e) => {
      const v = `${e.target.value}px`;
      element.style.paddingTop = v;
      element.style.paddingBottom = v;
      drawer.querySelector('#cms-val-padding').textContent = v;
      recordElementStyle(identifier, 'padding-top', v);
      recordElementStyle(identifier, 'padding-bottom', v);
    };

    marSlider.oninput = (e) => {
      const v = `${e.target.value}px`;
      element.style.marginBottom = v;
      drawer.querySelector('#cms-val-margin').textContent = v;
      recordElementStyle(identifier, 'margin-bottom', v);
    };

    scaleSlider.oninput = (e) => {
      currentScale = parseFloat(e.target.value);
      drawer.querySelector('#cms-val-scale').textContent = `${currentScale}x`;
      updateTransform();
      recordElementStyle(identifier, 'transform', element.style.transform);
    };

    xSlider.oninput = (e) => {
      currentX = parseInt(e.target.value);
      drawer.querySelector('#cms-val-x').textContent = `${currentX}px`;
      updateTransform();
      recordElementStyle(identifier, 'transform', element.style.transform);
    };

    ySlider.oninput = (e) => {
      currentY = parseInt(e.target.value);
      drawer.querySelector('#cms-val-y').textContent = `${currentY}px`;
      updateTransform();
      recordElementStyle(identifier, 'transform', element.style.transform);
    };

    drawer.querySelector('#cms-btn-reset-element').onclick = () => {
      element.style.width = '';
      element.style.maxWidth = '';
      element.style.minHeight = '';
      element.style.paddingTop = '';
      element.style.paddingBottom = '';
      element.style.marginBottom = '';
      element.style.transform = '';
      if (cmsData.layoutOverrides?.elements?.[identifier]) {
        delete cmsData.layoutOverrides.elements[identifier];
      }
      showToast('Element styles reset to default', 'info');
      drawer.remove();
    };
  }

  function recordElementStyle(selector, prop, val) {
    if (!cmsData.layoutOverrides) cmsData.layoutOverrides = {};
    if (!cmsData.layoutOverrides.elements) cmsData.layoutOverrides.elements = {};
    if (!cmsData.layoutOverrides.elements[selector]) cmsData.layoutOverrides.elements[selector] = {};
    cmsData.layoutOverrides.elements[selector][prop] = val;
  }

  function saveCurrentSectionOrder() {
    const main = document.querySelector('main');
    if (!main) return;
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const sections = Array.from(main.children).map(child => child.id || child.dataset.sectionId || child.className.split(' ')[0]);
    if (!cmsData.layoutOverrides) cmsData.layoutOverrides = {};
    if (!cmsData.layoutOverrides.sections) cmsData.layoutOverrides.sections = {};
    cmsData.layoutOverrides.sections[currentPath] = sections;
  }

  // --------------------------------------------------------------------------
  // IMAGE REPLACE MODAL (Cloudinary, Local Upload, or URL)
  // --------------------------------------------------------------------------
  function openImageReplaceModal(imgElement) {
    const oldSrc = imgElement.getAttribute('src');
    const modal = document.createElement('div');
    modal.className = 'admin-login-modal';
    modal.innerHTML = `
      <div class="admin-login-card" style="width:min(100%, 540px);text-align:left;">
        <h3 style="font-family:var(--admin-serif);color:#fff;margin:0 0 4px;font-size:1.3rem;">Replace Image</h3>
        <p style="font-size:0.78rem;color:var(--admin-text-muted);margin:0 0 16px;">Target: <code>${oldSrc}</code></p>
        
        <!-- Cloudinary / Drag Drop -->
        <div class="admin-upload-zone" id="modal-drop-zone">
          <div class="icon" style="font-weight:700;color:#c6a15b;">CDN</div>
          <h4>Upload to Cloudinary / Local Storage</h4>
          <p>Drag and drop your new image here or click to browse</p>
          <input type="file" id="modal-file-input" accept="image/*" style="display:none;">
        </div>

        <div style="margin:16px 0;text-align:center;font-size:0.75rem;color:var(--admin-text-muted);position:relative;">
          <span style="background:var(--admin-bg-surface);padding:0 10px;position:relative;z-index:1;">OR PASTE IMAGE URL</span>
          <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,0.1);z-index:0;"></div>
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">Image Direct Web URL</label>
          <input type="url" id="modal-url-input" class="admin-input" placeholder="https://res.cloudinary.com/... or https://...">
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
          <button type="button" class="admin-header-btn" id="modal-cancel-btn">Cancel</button>
          <button type="button" class="admin-header-btn btn-gold" id="modal-apply-btn">Apply Image</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const fileInput = modal.querySelector('#modal-file-input');
    const dropZone = modal.querySelector('#modal-drop-zone');
    const urlInput = modal.querySelector('#modal-url-input');

    dropZone.onclick = () => fileInput.click();
    modal.querySelector('#modal-cancel-btn').onclick = () => modal.remove();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handleImageUpload(file, imgElement, oldSrc, modal);
    };

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleImageUpload(file, imgElement, oldSrc, modal);
    };

    modal.querySelector('#modal-apply-btn').onclick = () => {
      const url = urlInput.value.trim();
      if (url) {
        setReplacement(oldSrc, url, imgElement);
        modal.remove();
        showToast('Image URL replaced successfully!', 'success');
      }
    };
  }

  function handleImageUpload(file, imgElement, oldSrc, modal) {
    showToast('Uploading to Cloudinary...', 'info');

    // Convert file to base64 for server-side upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;

      // Attempt 1: Server-side upload via admin server (uses official SDK with api_secret)
      fetch('/api/cloudinary/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64Data,
          folder: 'royal-banquet',
          tags: ['cms-upload', 'royal-hall']
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.url) {
          setReplacement(oldSrc, data.optimizedUrl || data.url, imgElement);
          modal.remove();
          showToast(`Uploaded to Cloudinary CDN! (${(data.bytes / 1024).toFixed(0)} KB, ${data.format})`, 'success');
        } else {
          // Server couldn't upload (maybe no api_secret), try unsigned browser upload
          attemptUnsignedBrowserUpload(file, imgElement, oldSrc, modal, base64Data);
        }
      })
      .catch(() => {
        // Server not running or errored, try unsigned browser upload
        attemptUnsignedBrowserUpload(file, imgElement, oldSrc, modal, base64Data);
      });
    };
    reader.readAsDataURL(file);
  }

  function attemptUnsignedBrowserUpload(file, imgElement, oldSrc, modal, base64Fallback) {
    const cloudName = cmsData.integrations?.cloudinary?.cloudName || 'pspn79yf';
    const uploadPreset = cmsData.integrations?.cloudinary?.uploadPreset;

    if (cloudName && uploadPreset) {
      showToast('Trying unsigned browser upload to Cloudinary...', 'info');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'royal-banquet');

      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.secure_url) {
          setReplacement(oldSrc, data.secure_url, imgElement);
          modal.remove();
          showToast('Uploaded via unsigned preset to Cloudinary!', 'success');
        } else {
          applyLocalFallback(base64Fallback, imgElement, oldSrc, modal);
        }
      })
      .catch(() => {
        applyLocalFallback(base64Fallback, imgElement, oldSrc, modal);
      });
    } else {
      applyLocalFallback(base64Fallback, imgElement, oldSrc, modal);
    }
  }

  function applyLocalFallback(dataUrl, imgElement, oldSrc, modal) {
    showToast('Stored image locally (configure Cloudinary for CDN hosting)', 'info');
    setReplacement(oldSrc, dataUrl, imgElement);
    modal.remove();
  }

  function setReplacement(oldSrc, newSrc, imgElement) {
    imgElement.src = newSrc;
    if (!cmsData.customMedia) cmsData.customMedia = {};
    if (!cmsData.customMedia.imageReplacements) cmsData.customMedia.imageReplacements = {};
    cmsData.customMedia.imageReplacements[oldSrc] = newSrc;
  }

  // --------------------------------------------------------------------------
  // SAVE & PERSISTENCE
  // --------------------------------------------------------------------------
  function saveAllChanges() {
    cmsData.lastSaved = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cmsData));
    } catch (e) {
      console.error('Failed to write to localStorage', e);
    }
    showToast(
      'This legacy in-context editor only saves locally. Use the full Admin Studio to save a shared draft and publish changes.',
      'info'
    );
  }

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Expose global methods for Admin Panel or developer console
  window.RoyalCMS = {
    getData: () => cmsData,
    setData: (newData) => {
      cmsData = newData;
      window.ROYAL_CMS_DATA = cmsData;
      applyThemeAndStyles();
      applyNavbar();
      applyButtons();
      applyLayoutOverrides();
      applyMediaReplacements();
      applyVenueDetails();
      saveAllChanges();
    },
    save: saveAllChanges,
    toggleEditor: toggleEditMode,
    openLogin: openLoginModal,
    showToast: showToast
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyThemeAndStyles();
      applyNavbar();
      applyButtons();
      applyLayoutOverrides();
      applyMediaReplacements();
      applyVenueDetails();
      applySectionOrdering();
      initAdminUI();
    });
  } else {
    applyThemeAndStyles();
    applyNavbar();
    applyButtons();
    applyLayoutOverrides();
    applyMediaReplacements();
    applyVenueDetails();
    applySectionOrdering();
    initAdminUI();
  }
})();
