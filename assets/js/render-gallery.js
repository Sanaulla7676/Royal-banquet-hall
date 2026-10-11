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

  // React Bits-inspired Parallax Carousel / Coverflow with 5-card depth and a seamless data loop.
  function renderParallaxCarousel() {
    const root = document.getElementById('galleryCarousel');
    const stage = document.getElementById('galleryCarouselStage');
    const showcase = document.getElementById('galleryCarouselShowcase');
    const caption = document.getElementById('galleryCarouselCaption');
    const counter = document.getElementById('galleryCarouselCounter');
    const progress = document.getElementById('galleryCarouselProgress');
    const progressBar = document.getElementById('galleryCarouselProgressBar');
    if (!root || !stage || !media.photos.length) return;

    const photos = media.photos;
    const count = Math.min(5, photos.length);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slots = [];
    let activeIndex = 0;
    let inView = !('IntersectionObserver' in window);
    let paused = false;
    let animating = false;
    let timer = 0;
    let progressFrame = 0;
    let pointerStart = null;
    let dragDx = 0;
    let suppressClick = false;

    function mod(value, length) { return ((value % length) + length) % length; }

    function photoIndexFor(offset) { return mod(activeIndex + offset, photos.length); }

    function fillCard(slot, index) {
      const photo = photos[mod(index, photos.length)];
      slot.image.src = encodeURI(photo.src);
      slot.image.alt = photo.alt || photo.title || 'Royal Hall venue photograph';
      slot.label.textContent = photo.title || ('Venue photograph ' + (mod(index, photos.length) + 1));
      slot.number.textContent = String(mod(index, photos.length) + 1).padStart(2,'0');
      slot.card.setAttribute('aria-label','View photo ' + (mod(index, photos.length) + 1) + ' of ' + photos.length + ': ' + (photo.title || 'Venue photograph'));
      slot.card.dataset.photoIndex = String(mod(index, photos.length));
    }

    function positionCard(slot, offset, immediate = false, drag = 0) {
      const stageWidth = Math.max(280, stage.clientWidth);
      const cardWidth = slot.card.offsetWidth || Math.min(288,stageWidth * .4);
      const distance = Math.min(stageWidth * (stageWidth < 560 ? .265 : .26), cardWidth * .92);
      const abs = Math.abs(offset);
      const scale = abs === 0 ? 1 : abs === 1 ? .84 : .69;
      const opacity = abs === 0 ? 1 : abs === 1 ? .73 : .38;
      slot.card.style.zIndex = String(10 - abs);
      slot.card.style.opacity = String(opacity);
      slot.card.style.filter = abs === 0 ? 'brightness(1)' : 'brightness(' + (abs === 1 ? '.78' : '.59') + ')';
      slot.card.classList.toggle('is-centre',abs === 0);
      slot.card.classList.toggle('fx-gallery-center',abs === 0);
      slot.card.style.transform = 'translate(calc(-50% + ' + (offset * distance + drag * .46).toFixed(1) + 'px), -50%) scale(' + scale + ')';
      slot.card.setAttribute('aria-hidden',String(abs > 1));
      slot.card.tabIndex = abs > 1 ? -1 : 0;
      if (immediate) {
        slot.card.style.transition = 'none';
        slot.card.getBoundingClientRect();
        requestAnimationFrame(() => { slot.card.style.transition = ''; });
      }
    }

    function setStatus() {
      const photo = photos[activeIndex];
      if (caption) caption.textContent = photo.title || 'The Royal Hall';
      if (counter) counter.textContent = String(activeIndex + 1).padStart(2,'0') + ' / ' + String(photos.length).padStart(2,'0');
      root.setAttribute('aria-label','Featured photograph ' + (activeIndex + 1) + ' of ' + photos.length);
    }

    function resetProgress() {
      if (!progressBar || !progress) return;
      progress.classList.remove('is-running');
      progress.setAttribute('aria-valuenow','0');
      progressBar.style.width = '0%';
      void progress.offsetWidth;
      if (!reducedMotion && !paused && inView) {
        progress.classList.add('is-running');
      }
    }

    function pause() {
      paused = true;
      showcase?.classList.add('is-paused');
      if (timer) window.clearInterval(timer);
      timer = 0;
    }

    function startTimer() {
      if (timer) window.clearInterval(timer);
      timer = 0;
      if (reducedMotion || paused || !inView || document.hidden) return;
      showcase?.classList.remove('is-paused');
      resetProgress();
      timer = window.setInterval(() => move(1,false),4800);
    }

    function refreshPositions() {
      slots.forEach(slot => positionCard(slot,slot.offset,true));
    }

    function move(direction = 1, fromUser = true) {
      if (animating || photos.length < 2) return;
      if (fromUser) { paused = false; showcase?.classList.remove('is-paused'); startTimer(); }
      animating = true;
      root.classList.add('is-moving');
      root.classList.remove('is-paused');
      slots.forEach(slot => positionCard(slot,slot.offset - direction));
      window.setTimeout(() => {
        activeIndex = mod(activeIndex + direction,photos.length);
        slots.forEach(slot => {
          let nextOffset = slot.offset - direction;
          if (nextOffset < -2) {
            nextOffset = 2;
            slot.offset = nextOffset;
            slot.card.style.transition = 'none';
            fillCard(slot,photoIndexFor(nextOffset));
            positionCard(slot,nextOffset,true);
          } else if (nextOffset > 2) {
            nextOffset = -2;
            slot.offset = nextOffset;
            slot.card.style.transition = 'none';
            fillCard(slot,photoIndexFor(nextOffset));
            positionCard(slot,nextOffset,true);
          } else {
            slot.offset = nextOffset;
          }
        });
        setStatus();
        root.classList.remove('is-moving');
        animating = false;
        slots.forEach(slot => { slot.card.style.transition = ''; });
        resetProgress();
      }, reducedMotion ? 0 : 780);
    }

    for (let i = 0; i < count; i++) {
      const offset = i - 2;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-carousel-card luxury-interactive fx-glare fx-image-zoom fx-gallery-parallax fx-card-glare fx-card-border fx-card-lift';
      card.dataset.carouselOffset = String(offset);
      const image = document.createElement('img');
      image.loading = i < 3 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.draggable = false;
      const number = document.createElement('span');
      number.className = 'gallery-carousel-count';
      number.setAttribute('aria-hidden','true');
      const label = document.createElement('span');
      label.className = 'gallery-carousel-label';
      card.append(image,number,label);
      const slot = {card,image,number,label,offset};
      card.addEventListener('click',() => {
        if (suppressClick) { suppressClick = false; return; }
        if (slot.offset !== 0) {
          move(slot.offset < 0 ? -1 : 1,true);
          return;
        }
        const visibleImages = [...document.querySelectorAll('#galleryGrid [data-lightbox] img')];
        const selected = visibleImages.findIndex(img => (img.getAttribute('src') || '').replace(/^\.\//,'') === photos[activeIndex].src);
        window.RoyalLightbox?.open(visibleImages,Math.max(0,selected),document.querySelector('.lightbox'));
      });
      slots.push(slot);
      stage.appendChild(card);
    }

    slots.forEach(slot => {
      fillCard(slot,photoIndexFor(slot.offset));
      positionCard(slot,slot.offset,true);
    });
    setStatus();

    root.querySelector('[data-gallery-next]')?.addEventListener('click',() => move(1,true));
    root.querySelector('[data-gallery-prev]')?.addEventListener('click',() => move(-1,true));
    stage.addEventListener('keydown',event => {
      if(event.key === 'ArrowRight'){event.preventDefault();move(1,true)}
      if(event.key === 'ArrowLeft'){event.preventDefault();move(-1,true)}
    });

    stage.addEventListener('pointerdown',event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerStart = {x:event.clientX,y:event.clientY};
      dragDx = 0;
      pause();
    });
    stage.addEventListener('pointermove',event => {
      if(!pointerStart || animating) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if(Math.abs(dx) > Math.abs(dy) + 4 && Math.abs(dx) > 7) {
        dragDx = dx;
        root.classList.add('is-dragging');
        slots.forEach(slot => positionCard(slot,slot.offset, false,dx));
      }
    });
    const endDrag = () => {
      if(!pointerStart) return;
      pointerStart = null;
      root.classList.remove('is-dragging');
      if(Math.abs(dragDx) > 40) {
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; },300);
        const dir = dragDx < 0 ? 1 : -1;
        dragDx = 0;
        move(dir,true);
      } else {
        dragDx = 0;
        paused = false;
        showcase?.classList.remove('is-paused');
        refreshPositions();
        startTimer();
      }
    };
    window.addEventListener('pointerup',endDrag);
    window.addEventListener('pointercancel',endDrag);

    root.addEventListener('mouseenter',pause);
    root.addEventListener('mouseleave',() => { paused = false; startTimer(); });
    root.addEventListener('focusin',pause);
    root.addEventListener('focusout',event => {
      if(!root.contains(event.relatedTarget)){paused=false;startTimer()}
    });
    document.addEventListener('visibilitychange',() => {
      if(document.hidden) pause();
      else {paused=false;startTimer()}
    });

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        inView=Boolean(entries[0]?.isIntersecting);
        if(!inView)pause();
        else {paused=false;startTimer()}
      },{threshold:.08,rootMargin:'80px 0px 80px 0px'});
      io.observe(showcase || root);
    }
    window.addEventListener('resize',refreshPositions,{passive:true});
    if(!reducedMotion)startTimer();
    else progress?.classList.add('is-paused');
    root.dataset.carouselInitialized='true';
    root.dataset.carouselMode=reducedMotion?'manual-reduced-motion':'parallax-coverflow-loop';
  }

  renderParallaxCarousel();
})();