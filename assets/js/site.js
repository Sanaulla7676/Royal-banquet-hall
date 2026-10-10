(() => {
  // Play the supplied logo animation once per tab session, then reveal the site.
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
      window.setTimeout(() => intro.remove(), 700);
    };

    if (alreadyPlayed) {
      intro.remove();
    } else if (video) {
      document.body.classList.add('intro-pending');
      video.muted = true;
      video.addEventListener('ended', () => finishIntro(true), {once:true});
      video.addEventListener('error', () => finishIntro(false), {once:true});

      const attemptPlayback = () => {
        const result = video.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            // If browser settings block muted autoplay, any tap on the video
            // retries playback. The intro itself still has no visible UI.
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
  }


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

  // Keep the current page's hero photograph pinned behind its content as the story scrolls.
  // The image is taken from the existing hero, so the homepage art and inner-page image choices stay intact.
  const storyHeroImage = document.querySelector('.hero-media img, .page-hero-media img');
  if (storyHeroImage && storyHeroImage.getAttribute('src')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'story-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.style.setProperty('--story-backdrop-image', 'url("' + storyHeroImage.src.replace(/"/g, '%22') + '")');
    document.body.prepend(backdrop);
  }

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

  window.RoyalMotion = {refresh: refreshStory};
  refreshStory(document);
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