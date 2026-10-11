(() => {
  // Reveal the website in deliberate stages after the silent intro finishes.
  const revealWebsite = () => {
    if (!document.body) return;
    document.body.classList.remove('intro-pending');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.add('site-revealed');
      initHeroSlideshow();
    }));
  };

  let heroSlideshowStarted = false;
  function initHeroSlideshow() {
    if (heroSlideshowStarted) return;
    heroSlideshowStarted = true;
    const slides = [...document.querySelectorAll('[data-hero-slide]')];
    const dots = [...document.querySelectorAll('[data-hero-dot]')];
    if (slides.length < 2) return;
    let current = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
    let timer = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
        dot.setAttribute('aria-pressed', String(i === current));
      });
    };
    const stop = () => { if (timer) window.clearInterval(timer); timer = 0; };
    const start = () => {
      stop();
      if (reducedMotion) return;
      timer = window.setInterval(() => {
        if (!document.hidden) show(current + 1);
      }, 5000);
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); start(); }));
    const hero = document.querySelector('.hero-slideshow');
    hero?.addEventListener('mouseenter', stop);
    hero?.addEventListener('mouseleave', start);
    hero?.addEventListener('focusin', stop);
    hero?.addEventListener('focusout', event => { if (!hero.contains(event.relatedTarget)) start(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    show(current);
    start();
    const warmNext = () => {
      const next = slides[(current + 1) % slides.length];
      if (next && !next.complete) next.loading = 'eager';
    };
    slides.forEach((slide, i) => {
      if (i > 0) slide.addEventListener('load', warmNext, {once:true});
    });
  }

  const intro = document.getElementById('site-intro');
  if (intro) {
    const video = intro.querySelector('video');
    const sessionKey = 'royalHallIntroPlayed_v1';
    let alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem(sessionKey) === '1'; } catch (_) {}

    const finishIntro = (completed) => {
      if (completed) {
        try { sessionStorage.setItem(sessionKey, '1'); } catch (_) {}
      }
      document.body.classList.remove('intro-pending');
      intro.classList.add('is-hidden');
      // Let the intro veil begin fading away, then start the layered site entrance.
      window.setTimeout(revealWebsite, 140);
      window.setTimeout(() => intro.remove(), 760);
    };

    if (alreadyPlayed) {
      intro.remove();
      revealWebsite();
    } else if (video) {
      document.body.classList.add('intro-pending');
      video.muted = true;
      video.addEventListener('ended', () => finishIntro(true), {once:true});
      video.addEventListener('error', () => finishIntro(false), {once:true});

      const attemptPlayback = () => {
        const result = video.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            // Browser autoplay policies may require the visitor's first tap.
            const retry = () => { video.muted = true; video.play().catch(() => {}); };
            intro.addEventListener('pointerdown', retry, {once:true});
            intro.addEventListener('keydown', retry, {once:true});
          });
        }
      };

      video.addEventListener('canplay', attemptPlayback, {once:true});
      video.src = video.dataset.src;
      video.load();
    } else {
      finishIntro(false);
    }
  } else {
    revealWebsite();
  }


  // Apply React Bits-inspired ShinyText to selected luxury accents without a React runtime.
  document.querySelectorAll('.hero h1 em,.page-hero h1 em,.booking-intro h2,.hero .eyebrow,.page-hero .eyebrow')
    .forEach(element => element.classList.add('rb-shiny-text'));

  // Keep the looping venue film active while it is near/in view, and pause it far off screen.
  const venueFilm = document.querySelector('.venue-film');
  if (venueFilm) {
    venueFilm.muted = true;
    venueFilm.loop = true;
    venueFilm.playsInline = true;
    if ('IntersectionObserver' in window) {
      const filmObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const attempt = venueFilm.play();
            if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
          } else {
            venueFilm.pause();
          }
        });
      }, {threshold:0.08, rootMargin:'120px 0px 120px 0px'});
      filmObserver.observe(venueFilm);
    } else {
      const attempt = venueFilm.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    }
  }

  // React Bits-inspired Gooey Nav: one liquid gold active pill glides between real page links.
  function initRoyalGooeyNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav || nav.dataset.gooeyReady === 'true') return;
    const links = [...nav.querySelectorAll('a[href]')];
    if (!links.length) return;

    const normalizePath = value => {
      const path = (value || '').split(/[?#]/)[0].replace(/\\/g,'/');
      const last = path.split('/').filter(Boolean).pop();
      return !last || last === 'index.html' ? 'index.html' : last.toLowerCase();
    };
    const currentPath = normalizePath(window.location.pathname);
    let activeLink = links.find(link => normalizePath(link.getAttribute('href')) === currentPath) ||
      links.find(link => link.getAttribute('aria-current') === 'page') || links[0];

    links.forEach(link => {
      const active = link === activeLink;
      if (active) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });

    const svgNS = 'http://www.w3.org/2000/svg';
    if (!document.getElementById('royal-gooey-filter')) {
      const svg = document.createElementNS(svgNS,'svg');
      svg.setAttribute('aria-hidden','true');
      svg.setAttribute('focusable','false');
      svg.classList.add('royal-gooey-svg');
      svg.innerHTML = '<defs><filter id="royal-gooey-filter" x="-35%" y="-45%" width="170%" height="190%"><feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="goo-blur"></feGaussianBlur><feColorMatrix in="goo-blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9" result="goo"></feColorMatrix><feComposite in="SourceGraphic" in2="goo" operator="atop"></feComposite></filter></defs>';
      document.body.appendChild(svg);
    }

    const layer = document.createElement('span');
    layer.className = 'gooey-nav-layer';
    layer.setAttribute('aria-hidden','true');
    const blob = document.createElement('span');
    blob.className = 'gooey-nav-blob';
    const tail = document.createElement('span');
    tail.className = 'gooey-nav-tail';
    layer.append(blob,tail);
    nav.insertBefore(layer,nav.firstChild);

    let ready = false;
    let resizeFrame = 0;
    const place = (link, animate = true) => {
      if (!link || !nav.isConnected) return;
      const navBox = nav.getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      if (!navBox.width || !linkBox.width) return;
      const left = linkBox.left - navBox.left;
      const width = linkBox.width;
      layer.style.setProperty('--goo-x', left + 'px');
      layer.style.setProperty('--goo-width', width + 'px');
      blob.style.width = width + 'px';
      tail.style.width = Math.max(22, width * .46) + 'px';
      tail.style.left = Math.max(0,left - 9) + 'px';
      blob.style.left = left + 'px';
      blob.style.transitionDuration = animate ? '.62s' : '0s';
      layer.classList.add('is-positioned');
      nav.classList.add('gooey-nav-ready');
      if (!ready) {
        requestAnimationFrame(() => layer.classList.add('is-visible'));
        ready = true;
      }
    };

    links.forEach(link => {
      link.addEventListener('click', event => {
        links.forEach(item => item.classList.toggle('gooey-active', item === link));
        activeLink = link;
        place(link,true);
        // Let the liquid pill travel before same-tab navigation, while preserving
        // middle-click, modifier-click and links explicitly opening another tab.
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey || link.target === '_blank') return;
        event.preventDefault();
        window.setTimeout(() => { window.location.href = link.href; }, 230);
      });
      link.classList.toggle('gooey-active',link === activeLink);
    });

    place(activeLink,false);
    window.addEventListener('resize',() => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => place(activeLink,false));
    },{passive:true});

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => place(activeLink,false));
      observer.observe(nav);
      links.forEach(link => observer.observe(link));
    }
    nav.dataset.gooeyReady = 'true';
  }

  initRoyalGooeyNav();

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    const closeMenu = () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
    };
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('click', event => {
      if (nav.classList.contains('open') && !nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); }, {passive: true});
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only the supplied floral artwork remains fixed behind site content; hero photos scroll normally.
  document.documentElement.classList.add('js-motion-enabled');

  // Progressive, scroll-triggered story reveals. No animation library is required.
  const storySelector = [
    '.reveal',
    '.hero-content > .eyebrow',
    '.hero-content > h1',
    '.hero-content > .lede',
    '.hero-content > .btn-row',
    '.hero-content > .hero-note',
    '.section-head',
    '.card',
    '.card-media',
    '.split-media',
    '.feature',
    '.step',
    '.cta-banner',
    '.search-panel',
    '.gallery-item',
    '.video-card',
    '.form-panel',
    '.amenity-card',
    '.rating-panel',
    '.review-card',
    '.review-invite',
    '.page-hero .container'
  ].join(',');
  const mediaSelector = '.card-media,.split-media';
  let storyObserver = null;

  function markStoryVisible(element) {
    element.classList.add('is-story-visible');
    if (element.classList.contains('reveal')) element.classList.add('is-visible');
  }

  function refreshStory(root = document) {
    if (!root || !root.querySelectorAll) return;
    const targets = [...root.querySelectorAll(storySelector)];
    if (root instanceof Element && root.matches(storySelector)) targets.unshift(root);
    [...new Set(targets)].forEach(element => {
      const isMedia = element.matches(mediaSelector);
      element.classList.add(isMedia ? 'story-media-reveal' : 'story-reveal');
      if (!isMedia && !element.style.getPropertyValue('--story-delay')) {
        const siblings = [...element.parentElement.children].filter(sibling => sibling.classList.contains('story-reveal'));
        element.style.setProperty('--story-delay', Math.min(Math.max(0, siblings.indexOf(element)), 5) * 75 + 'ms');
      }
      if (reducedMotion || !storyObserver) markStoryVisible(element);
      else storyObserver.observe(element);
    });
  }

  if ('IntersectionObserver' in window && !reducedMotion) {
    storyObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        markStoryVisible(entry.target);
        storyObserver.unobserve(entry.target);
      });
    }, {threshold: .12, rootMargin: '0px 0px -36px 0px'});
  }

  // A thin progress line subtly connects the long-form story as the visitor scrolls.
  let progressBar = null;
  let scrollFrame = 0;
  if (!reducedMotion && document.body) {
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    document.body.prepend(progressBar);
  }

  function updateScrollEffects() {
    if (progressBar) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.transform = 'scaleX(' + progress + ')';
    }
    if (!reducedMotion) {
      document.querySelectorAll('.story-media-reveal img').forEach(image => {
        const bounds = image.getBoundingClientRect();
        if (bounds.bottom < -30 || bounds.top > window.innerHeight + 30) return;
        const distance = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / Math.max(1, window.innerHeight);
        const offset = Math.max(-12, Math.min(12, -distance * 24));
        image.style.setProperty('--parallax-y', offset.toFixed(1) + 'px');
      });
    }
    scrollFrame = 0;
  }

  function requestScrollEffects() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  }

  const luxuryEffectSelector =
    '.card,.amenity-card,.review-card,.rating-panel,.review-invite,.qr-card,'+
    '.review-hub-card,.feature,.step,.gallery-item,.menu-card,.search-panel,.form-panel';
  const luxuryEffectClasses = ['fx-glare','fx-tilt','fx-float','fx-edge','fx-image-zoom'];
  const cardEffectVariants = [
    'fx-card-glare','fx-card-tilt','fx-card-float','fx-card-border','fx-card-lift',
    'fx-image-zoom','fx-image-pan','fx-image-wipe','fx-image-caption','fx-review-reveal'
  ];
  const revealVariants = ['fx-scroll-reveal','fx-scroll-left','fx-scroll-right','fx-scroll-blur','fx-scroll-scale'];
  let luxuryEffectSequence = 0;
  let motionObserver = null;

  function attachMotionReveal(element) {
    if (!element || element.classList.contains('is-motion-visible')) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-motion-visible');
      return;
    }
    if (!motionObserver) {
      motionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-motion-visible');
          motionObserver.unobserve(entry.target);
        }
      }), {threshold:0.12,rootMargin:'0px 0px -5% 0px'});
    }
    motionObserver.observe(element);
  }

  function addClassTo(root, selector, classNames) {
    const nodes = [...root.querySelectorAll(selector)];
    if (root instanceof Element && root.matches(selector)) nodes.unshift(root);
    nodes.forEach(node => classNames.split(' ').forEach(name => node.classList.add(name)));
    return nodes;
  }

  function applyLuxuryEffects(root = document) {
    if (!root || !root.querySelectorAll) return;

    const targets = [...root.querySelectorAll(luxuryEffectSelector)];
    if (root instanceof Element && root.matches(luxuryEffectSelector)) targets.unshift(root);
    targets.forEach(element => {
      if (!element.classList.contains('luxury-interactive')) {
        element.classList.add('luxury-interactive',luxuryEffectClasses[luxuryEffectSequence % luxuryEffectClasses.length]);
        element.style.setProperty('--effect-delay',(luxuryEffectSequence % 7) * -.7 + 's');
        luxuryEffectSequence++;
      }
      const variant = cardEffectVariants[luxuryEffectSequence % cardEffectVariants.length];
      element.classList.add(variant);
      if (element.matches('.gallery-item,.card-media,.amenity-image')) element.classList.add('fx-gallery-parallax');
      if (element.matches('.review-card,.review-hub-card,.rating-panel,.review-invite')) element.classList.add('fx-review-reveal');
      if (element.matches('.gallery-item,.card,.amenity-card,.review-card,.review-hub-card')) attachMotionReveal(element);
    });

    addClassTo(root,'.section-head h2,.booking-intro h2,.cta-banner h2,.catering-preview-copy h2,.home-map-copy h2,.reviews-map-copy h2','fx-heading-glow fx-heading-line');
    addClassTo(root,'.section-head h2,.booking-intro h2,.cta-banner h2,.catering-preview-copy h2,.home-map-copy h2,.reviews-map-copy h2','fx-heading-sweep');
    addClassTo(root,'.hero h1 em,.page-hero h1 em,.hero .eyebrow,.page-hero .eyebrow','fx-text-shimmer');
    addClassTo(root,'.hero-title-primary','fx-text-rise');
    addClassTo(root,'.hero-title-accent','fx-text-blur');
    addClassTo(root,'.hero-brand-crest','fx-logo-pop');
    addClassTo(root,'.hero-slideshow [data-hero-slide]','fx-hero-crossfade');

    const buttons = addClassTo(root,'.btn,.btn-booking-primary,.menu-toggle','fx-button-sheen fx-button-lift fx-button-press fx-button-border');
    buttons.forEach(button => {
      if (button.matches('.btn-gold,.btn-booking-primary,.btn-light')) button.classList.add('fx-button-pulse');
      if (button.querySelector('span,.arrow')) button.classList.add('fx-button-arrow');
    });
    addClassTo(root,'.nav-links a','fx-nav-sweep fx-nav-glint');
    addClassTo(root,'.gallery-carousel-progress','fx-gallery-progress');
    addClassTo(root,'.search-panel','fx-panel-glow');
    addClassTo(root,'.search-panel .field','fx-form-focus fx-select-lift');
    addClassTo(root,'.search-panel .field:has(input[type="date"])','fx-date-glow');
    addClassTo(root,'.quick-search,.section-head,.cta-banner,.home-map-copy,.reviews-map-copy','fx-scroll-reveal');
    addClassTo(root,'.review-card,.review-hub-card,.rating-panel','fx-review-reveal');
    addClassTo(root,'.map-frame','fx-map-glint');
    addClassTo(root,'.site-footer .footer-links a,.site-footer-extras a','fx-footer-sweep');
    addClassTo(root,'.site-footer .footer-grid h3,.hero-slideshow-controls','fx-text-shimmer');
    addClassTo(root,'.gallery-filters,.circle-gallery-heading,.gallery-carousel-showcase','fx-separator-shimmer');

    const revealNodes = [...root.querySelectorAll('.fx-scroll-reveal,.fx-scroll-left,.fx-scroll-right,.fx-scroll-blur,.fx-scroll-scale,.fx-review-reveal,.fx-image-wipe,.fx-heading-line')];
    revealNodes.forEach(attachMotionReveal);
    document.body.classList.add('fx-background-ambient');
  }

  window.RoyalMotion = {
    refresh(root = document) {
      refreshStory(root);
      applyLuxuryEffects(root);
    }
  };
  refreshStory(document);
  applyLuxuryEffects(document);

  // Gallery cards are inserted after the shared script loads. Observe those additions too,
  // so the same reveal/glare effects work on phones and desktop rather than only static cards.
  if ('MutationObserver' in window && document.body) {
    let motionRefreshFrame = 0;
    const motionObserver = new MutationObserver(records => {
      if (motionRefreshFrame) cancelAnimationFrame(motionRefreshFrame);
      motionRefreshFrame = requestAnimationFrame(() => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            refreshStory(node);
            applyLuxuryEffects(node);
          });
        });
        updateScrollEffects();
        motionRefreshFrame = 0;
      });
    });
    motionObserver.observe(document.body, {childList:true,subtree:true});
  }

  // On narrow/touch devices, keep interactions tap-first. No hover transforms are required.
  const touchLayout = window.matchMedia('(hover:none), (pointer:coarse)').matches;
  if (touchLayout) {
    document.documentElement.classList.add('touch-layout');
    document.querySelectorAll('.venue-film').forEach(video => {
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
    });
  }

  // Pointer-tracked highlight and restrained 3D tilt. No canvas/WebGL loop needed.
  const canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (canHover && !reducedMotion) {
    let pointerFrame = 0;
    let pointerX = window.innerWidth * .82;
    let pointerY = window.innerHeight * .38;
    const updateSpotlight = () => {
      document.body.style.setProperty('--spot-x', (pointerX / Math.max(1,window.innerWidth) * 100).toFixed(2) + '%');
      document.body.style.setProperty('--spot-y', (pointerY / Math.max(1,window.innerHeight) * 100).toFixed(2) + '%');
      pointerFrame = 0;
    };
    document.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(updateSpotlight);
      const target = event.target.closest?.('.luxury-interactive.fx-tilt');
      if (target) {
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(1,rect.width);
        const y = (event.clientY - rect.top) / Math.max(1,rect.height);
        target.style.setProperty('--tilt-x', ((x - .5) * 7).toFixed(2) + 'deg');
        target.style.setProperty('--tilt-y', ((.5 - y) * 6).toFixed(2) + 'deg');
        target.style.setProperty('--mx',(x * 100).toFixed(1) + '%');
        target.style.setProperty('--my',(y * 100).toFixed(1) + '%');
      }
    }, {passive:true});
    document.addEventListener('pointerout', event => {
      const target = event.target.closest?.('.luxury-interactive.fx-tilt');
      if (target && !target.contains(event.relatedTarget)) {
        target.style.setProperty('--tilt-x','0deg');
        target.style.setProperty('--tilt-y','0deg');
      }
    }, {passive:true});
  }

  // Tiny magnetic pull on primary CTAs, only for precise-pointer devices.
  if (canHover && !reducedMotion) {
    document.querySelectorAll('.btn-gold,.btn-booking-primary').forEach(button => {
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        button.style.translate = (dx * .045).toFixed(1) + 'px ' + (dy * .07).toFixed(1) + 'px';
      }, {passive:true});
      button.addEventListener('pointerleave', () => { button.style.translate = ''; });
      button.addEventListener('blur', () => { button.style.translate = ''; });
    });
  }

  updateScrollEffects();
  window.addEventListener('scroll', requestScrollEffects, {passive: true});
  window.addEventListener('resize', requestScrollEffects, {passive: true});

  document.querySelectorAll('[data-gallery-filter]').forEach(btn => btn.addEventListener('click', () => {
    const wanted = btn.dataset.galleryFilter;
    document.querySelectorAll('[data-gallery-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('[data-gallery-category]').forEach(card => {
      card.hidden = wanted !== 'all' && card.dataset.galleryCategory !== wanted;
    });
  }));
  document.querySelectorAll('.faq-question').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  }));

  document.querySelectorAll('input[type="date"]').forEach(date => {
    const now = new Date();
    date.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  });

  document.querySelectorAll('form[data-enquiry-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const out = form.querySelector('[data-form-feedback]');
      const data = new FormData(form);
      const settings = window.ROYAL_HALL_CONFIG || {};
      const number = String(settings.whatsappNumber || '').replace(/\D/g, '');
      const message = [
        'Hello The Royal Party Hall, I would like to enquire about an event.',
        '',
        ...[...data.entries()].filter(([key, value]) => String(value).trim()).map(([key, value]) => key + ': ' + value)
      ].join('\n');
      if (number.length >= 10) {
        const whatsappUrl = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
        if (out) out.textContent = 'Redirecting to WhatsApp…';
        // Same-tab redirect works with the WhatsApp app on mobile and WhatsApp Web on desktop.
        window.location.assign(whatsappUrl);
        return;
      } else {
        const subject = encodeURIComponent('Event enquiry - The Royal Party Hall');
        const body = encodeURIComponent(message);
        if (settings.email) {
          window.location.href = 'mailto:' + settings.email + '?subject=' + subject + '&body=' + body;
          if (out) out.textContent = 'Your email app is opening with the enquiry details. Send the email to contact the venue.';
        } else if (out) {
          out.textContent = 'This demo prepares your enquiry locally. Configure the venue WhatsApp number or email in assets/js/config.js to submit enquiries.';
        }
      }
    });
  });

  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox && lightbox.querySelector('img');
  let currentImages = [], currentIndex = 0;
  function showImage(index) {
    if (!currentImages.length || !lightbox || !lightboxImage) return;
    currentIndex = (index + currentImages.length) % currentImages.length;
    const image = currentImages[currentIndex];
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || '';
  }
  function closeLightbox() { if (lightbox) lightbox.classList.remove('open'); document.body.style.overflow = ''; }
  window.RoyalLightbox = {
    open(images, index, dialog) {
      currentImages = images;
      currentIndex = index;
      showImage(index);
      (dialog || lightbox)?.classList.add('open');
      document.body.style.overflow = 'hidden';
      (dialog || lightbox)?.querySelector('[data-lb-close]')?.focus();
    }
  };
  document.querySelectorAll('[data-lightbox]').forEach(trigger => trigger.addEventListener('click', () => {
    if (trigger.dataset.galleryCategory !== undefined) return;
    currentImages = [...document.querySelectorAll('[data-lightbox] img')].filter(img => !img.closest('[hidden]'));
    const image = trigger.querySelector('img');
    window.RoyalLightbox.open(currentImages, Math.max(0, currentImages.indexOf(image)), lightbox);
  }));
  lightbox?.querySelector('[data-lb-close]')?.addEventListener('click', closeLightbox);
  lightbox?.querySelector('[data-lb-prev]')?.addEventListener('click', () => showImage(currentIndex - 1));
  lightbox?.querySelector('[data-lb-next]')?.addEventListener('click', () => showImage(currentIndex + 1));
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (event.key === 'ArrowRight') showImage(currentIndex + 1);
  });
})();