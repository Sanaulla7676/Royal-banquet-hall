(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }), {threshold: .12});
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-visible'));

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

  const date = document.querySelector('[name="eventDate"]');
  if (date) {
    const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10);
    date.min = localToday;
  }

  document.querySelectorAll('form[data-enquiry-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
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
        window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
        if (out) out.textContent = 'Your enquiry details are ready in WhatsApp. Please send the message to contact the venue.';
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
    lightboxImage.alt = image.alt;
  }
  function closeLightbox() { if (lightbox) lightbox.classList.remove('open'); document.body.style.overflow = ''; }
  document.querySelectorAll('[data-lightbox]').forEach(trigger => trigger.addEventListener('click', () => {
    currentImages = [...document.querySelectorAll('[data-lightbox] img')].filter(img => !img.closest('[hidden]'));
    const image = trigger.querySelector('img');
    currentIndex = Math.max(0, currentImages.indexOf(image));
    showImage(currentIndex);
    if (lightbox) { lightbox.classList.add('open'); document.body.style.overflow = 'hidden'; lightbox.querySelector('[data-lb-close]')?.focus(); }
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