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
    let isAnimating = false;
    let isPaused = false;
    let pointerStart = null;
    let dragDelta = 0;
    let suppressClick = false;
    let resizeFrame = 0;
    let autoTimer = null;
    const slots = [];

    for (let i = 0; i < count; i++) {
      const offset = i - centre;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'circle-gallery-card';
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
        if (suppressClick) {
          suppressClick = false;
          return;
        }
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

    function settleBy(steps) {
      if (isAnimating) return;
      steps = Math.max(-3, Math.min(3, Math.round(steps)));
      if (!steps) {
        ring.style.transition = 'transform .4s cubic-bezier(.19,.78,.2,1)';
        ring.style.transform = 'rotateY(0deg)';
        window.setTimeout(() => { ring.style.transition = ''; }, 430);
        return;
      }
      isAnimating = true;
      root.classList.add('is-changing');
      ring.style.transition = 'transform .78s cubic-bezier(.19,.78,.2,1)';
      ring.style.transform = 'rotateY(' + (-steps * stepAngle) + 'deg)';
      window.setTimeout(() => {
        activeIndex = modulo(activeIndex + steps, photos.length);
        refreshCards();
        ring.style.transition = 'none';
        ring.style.transform = 'rotateY(0deg)';
        ring.getBoundingClientRect();
        ring.style.transition = '';
        root.classList.remove('is-changing');
        isAnimating = false;
      }, 810);
    }

    function next() { settleBy(1); }
    function previous() { settleBy(-1); }

    root.querySelector('[data-circle-next]')?.addEventListener('click', next);
    root.querySelector('[data-circle-prev]')?.addEventListener('click', previous);
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
    });

    // Drag/swipe rotates the ring and snaps to the nearest photo when released.
    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('.circle-gallery-control')) return;
      pointerStart = {x:event.clientX, y:event.clientY};
      dragDelta = 0;
      isPaused = true;
      root.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', event => {
      if (!pointerStart || isAnimating) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.abs(dx) > Math.abs(dy) + 3) {
        dragDelta = dx;
        if (Math.abs(dx) > 8) {
          root.classList.add('is-dragging');
          ring.style.transition = 'none';
          ring.style.transform = 'rotateY(' + (-dx * stepAngle / 95) + 'deg)';
        }
      }
    });
    const endDrag = () => {
      if (!pointerStart) return;
      const steps = Math.round(-dragDelta / 95);
      if (Math.abs(dragDelta) > 18) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 250);
      }
      pointerStart = null;
      root.classList.remove('is-dragging');
      if (Math.abs(dragDelta) > 34) settleBy(steps || (dragDelta < 0 ? 1 : -1));
      else {
        ring.style.transition = 'transform .4s cubic-bezier(.19,.78,.2,1)';
        ring.style.transform = 'rotateY(0deg)';
        window.setTimeout(() => { ring.style.transition = ''; }, 430);
      }
      dragDelta = 0;
      if (!root.matches(':hover') && !root.contains(document.activeElement)) isPaused = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    root.addEventListener('mouseenter', () => { isPaused = true; });
    root.addEventListener('mouseleave', () => { if (!pointerStart && !root.contains(document.activeElement)) isPaused = false; });
    root.addEventListener('focusin', () => { isPaused = true; });
    root.addEventListener('focusout', event => {
      if (!root.contains(event.relatedTarget) && !root.matches(':hover')) isPaused = false;
    });

    function updateRadius() {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const width = Math.max(280, stage.clientWidth);
        const radius = Math.min(width * (width < 560 ? .39 : .42), 455);
        slots.forEach(slot => slot.card.style.setProperty('--circle-radius', radius.toFixed(1) + 'px'));
      });
    }
    window.addEventListener('resize', updateRadius, {passive:true});
    refreshCards();
    updateRadius();

    if (!reducedMotion) {
      autoTimer = window.setInterval(() => {
        if (!isPaused && !isAnimating && !document.hidden) next();
      }, 5200);
      document.addEventListener('visibilitychange', () => { if (document.hidden) isPaused = true; });
    }
    // Keep the carousel lightweight when it is not mounted to the viewport.
    root.dataset.carouselInitialized = 'true';
  }

  renderCircleGallery();

})();