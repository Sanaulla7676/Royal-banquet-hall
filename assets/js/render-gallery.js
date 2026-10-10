(() => {
  const media = window.ROYAL_HALL_MEDIA || {photos:[],videos:[]};
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function card(photo,index) {
    const src=encodeURI(photo.src);
    return '<button class="gallery-item reveal" data-gallery-category="'+esc(photo.category)+'" data-lightbox type="button" aria-label="Open photo: '+esc(photo.alt)+'"><img src="'+src+'" alt="'+esc(photo.alt)+'" loading="lazy" onerror="this.closest(\'button\').hidden=true"><span class="gallery-caption">'+esc(photo.title||('Venue photo '+(index+1)))+'</span></button>';
  }
  function renderPhotos(target,limit) {
    if(!target)return;
    target.innerHTML=media.photos.slice(0,limit||media.photos.length).map(card).join('');
    target.querySelectorAll('[data-lightbox]').forEach(btn=>btn.addEventListener('click',()=>{
      const imgs=[...target.querySelectorAll('[data-lightbox] img')].filter(img=>!img.closest('[hidden]'));
      window.RoyalLightbox?.open(imgs,imgs.indexOf(btn.querySelector('img')),document.querySelector('.lightbox'));
    }));
    window.RoyalMotion?.refresh(target);
  }
  renderPhotos(document.getElementById('galleryGrid'));
  renderPhotos(document.getElementById('homeGallery'),12);
  const videos=document.getElementById('videoGallery');
  if(videos){
    videos.innerHTML=media.videos.map((v,i)=>'<article class="card video-card reveal"><div class="card-media"><video controls preload="metadata" poster="'+esc(v.poster||'assets/images/hero-venue.jpg')+'"><source src="'+encodeURI(v.src)+'" type="video/mp4">Your browser does not support embedded video.</video></div><div class="card-body"><span class="card-meta">Video '+String(i+1).padStart(2,'0')+'</span><h3>'+esc(v.title||'Venue video')+'</h3><p>'+esc(v.description||'A look at the venue and event details.')+'</p></div></article>').join('');
    window.RoyalMotion?.refresh(videos);
  }
  if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));}

  // React Bits Circle Gallery-inspired 3D carousel, implemented without a React dependency.
  // Nine cards form an orbit. The center image advances through the full photo dataset.
  function renderCircleGallery() {
    const root = document.getElementById('circleGallery');
    const stage = document.getElementById('circleGalleryStage');
    const ring = document.getElementById('circleGalleryRing');
    const status = document.getElementById('circleGalleryStatus');
    if (!root || !stage || !ring || !media.photos.length) return;

    const photos = media.photos;
    const count = Math.min(9, photos.length);
    const centre = Math.floor(count / 2);
    const stepAngle = 360 / count;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let totalRotation = 0;
    let lastBoundary = 0;
    let lastFrame = 0;
    let rafId = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragBaseRotation = 0;
    let tween = null;
    let inView = !('IntersectionObserver' in window);
    const slots = [];

    stage.tabIndex = 0;
    stage.setAttribute('aria-roledescription', 'carousel');

    for (let i = 0; i < count; i++) {
      const offset = i - centre;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'circle-gallery-card luxury-interactive fx-glare fx-image-zoom';
      card.dataset.circleSlot = String(i);
      card.style.setProperty('--circle-angle', (offset * stepAngle) + 'deg');
      card.setAttribute('aria-label', 'Open featured venue photo');

      const image = document.createElement('img');
      image.loading = i < 5 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.draggable = false;

      const indexLabel = document.createElement('span');
      indexLabel.className = 'circle-gallery-index';
      indexLabel.setAttribute('aria-hidden', 'true');

      const caption = document.createElement('span');
      caption.className = 'circle-gallery-caption';
      card.append(image, indexLabel, caption);
      card.addEventListener('click', () => {
        const imgs = [...ring.querySelectorAll('.circle-gallery-card img')];
        const selected = imgs.indexOf(image);
        if (selected >= 0) window.RoyalLightbox?.open(imgs, selected, document.querySelector('.lightbox'));
      });
      slots.push({card, image, indexLabel, caption, offset});
      ring.appendChild(card);
    }

    function modulo(value, length) { return ((value % length) + length) % length; }

    function setCard(slot) {
      const photoIndex = modulo(activeIndex + slot.offset, photos.length);
      const photo = photos[photoIndex];
      slot.image.src = encodeURI(photo.src);
      slot.image.alt = photo.alt || photo.title || 'Royal Hall venue photograph';
      slot.caption.textContent = photo.title || ('Venue photo ' + (photoIndex + 1));
      slot.indexLabel.textContent = String(photoIndex + 1).padStart(2, '0');
      slot.card.setAttribute('aria-label', 'View photo ' + (photoIndex + 1) + ' of ' + photos.length + ': ' + (photo.title || 'Venue photo'));
      slot.card.dataset.photoIndex = String(photoIndex);
    }

    function refreshCards() {
      slots.forEach(setCard);
      const activePhoto = photos[activeIndex];
      if (status) status.textContent = 'PHOTO ' + String(activeIndex + 1).padStart(2, '0') + ' / ' + photos.length + '  ·  ' + (activePhoto.title || 'The Royal Hall');
      stage.setAttribute('aria-label', 'Photo ' + (activeIndex + 1) + ' of ' + photos.length + ': ' + (activePhoto.title || 'Venue photo'));
    }

    // Re-index by one card-width each time the orbit crosses a card, so rotation stays seamless.
    function syncOrbit() {
      const boundary = Math.trunc(totalRotation / stepAngle);
      while (boundary > lastBoundary) {
        activeIndex = modulo(activeIndex - 1, photos.length);
        lastBoundary++;
        refreshCards();
      }
      while (boundary < lastBoundary) {
        activeIndex = modulo(activeIndex + 1, photos.length);
        lastBoundary--;
        refreshCards();
      }
      const visibleRotation = totalRotation - lastBoundary * stepAngle;
      ring.style.transform = 'rotateY(' + visibleRotation.toFixed(3) + 'deg)';
    }

    function tweenTo(target, duration = 680) {
      tween = {from:totalRotation,to:target,start:performance.now(),duration};
    }

    function move(direction) {
      if (dragging) return;
      const target = totalRotation + (direction * stepAngle);
      tweenTo(target, 690);
    }
    root.querySelector('[data-circle-next]')?.addEventListener('click', () => move(1));
    root.querySelector('[data-circle-prev]')?.addEventListener('click', () => move(-1));
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    });

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('.circle-gallery-control')) return;
      dragging = true;
      tween = null;
      dragStartX = event.clientX;
      dragBaseRotation = totalRotation;
      root.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', event => {
      if (!dragging) return;
      totalRotation = dragBaseRotation + (event.clientX - dragStartX) * .22;
      syncOrbit();
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      const snapped = Math.round(totalRotation / stepAngle) * stepAngle;
      tweenTo(snapped, 360);
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    function updateRadius() {
      const width = Math.max(280, stage.clientWidth);
      const radius = Math.min(width * (width < 560 ? .39 : .42), 455);
      slots.forEach(slot => slot.card.style.setProperty('--circle-radius', radius.toFixed(1) + 'px'));
    }
    window.addEventListener('resize', updateRadius, {passive:true});

    // Auto-spin forever while visible. Respect reduced-motion and browser-tab visibility.
    function tick(now) {
      if (!lastFrame) lastFrame = now;
      const delta = Math.min(40, Math.max(0, now - lastFrame));
      lastFrame = now;
      if (!reducedMotion && inView && !document.hidden && !dragging) {
        if (tween) {
          const progress = Math.min(1, (now - tween.start) / tween.duration);
          const eased = progress < .5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          totalRotation = tween.from + (tween.to - tween.from) * eased;
          if (progress >= 1) tween = null;
        } else {
          totalRotation += delta * .012; // 12 degrees per second; continuous loop.
        }
        syncOrbit();
      }
      rafId = requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inView = Boolean(entries[0]?.isIntersecting);
      }, {threshold:.06,rootMargin:'80px 0px 80px 0px'});
      observer.observe(root);
    }
    refreshCards();
    updateRadius();
    syncOrbit();
    if (!reducedMotion) rafId = requestAnimationFrame(tick);
    root.dataset.carouselInitialized = 'true';
    root.dataset.carouselMode = reducedMotion ? 'manual-reduced-motion' : 'continuous-loop';
  }
  renderCircleGallery();

})();