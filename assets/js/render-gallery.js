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
  }
  renderPhotos(document.getElementById('galleryGrid'));
  renderPhotos(document.getElementById('homeGallery'),12);
  const videos=document.getElementById('videoGallery');
  if(videos)videos.innerHTML=media.videos.map((v,i)=>'<article class="card video-card reveal"><div class="card-media"><video controls preload="metadata" poster="'+esc(v.poster||'assets/images/hero-venue.jpg')+'"><source src="'+encodeURI(v.src)+'" type="video/mp4">Your browser does not support embedded video.</video></div><div class="card-body"><span class="card-meta">Video '+String(i+1).padStart(2,'0')+'</span><h3>'+esc(v.title||'Venue video')+'</h3><p>'+esc(v.description||'A look at the venue and event details.')+'</p></div></article>').join('');
  if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));}
})();