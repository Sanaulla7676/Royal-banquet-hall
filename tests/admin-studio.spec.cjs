const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.STUDIO_BASE_URL || 'http://127.0.0.1:4173';
const TEST_USER = 'qa-admin';
const TEST_PASSWORD = 'AdminTestPass123!';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+tY7sAAAAASUVORK5CYII=', 'base64');

function initialCms() {
  return {
    logo: { src:'assets/images/royal-hall-crest.webp', width:145, height:98, position:'left', mobileScale:true, hideOnSmall:false, textFallback:true },
    navbar: { design:0, buttonStyle:0, animation:0, hoverAnimation:0, height:72, bgColor:'#0a0b0d', transparent:true, sticky:true, hamburger:true },
    hero: { src:'assets/images/hero-venue.jpg', scale:100, posX:50, posY:50, height:70, animation:0, displayMode:'cover', overlayColor:'#000000', overlayOpacity:40, brightness:100, contrast:100, animationSpeed:10, animationDelay:3, blur:0, kenBurns:false, parallax:false, gradient:false, decorative:false },
    heroHeading: { text:'A Royal Celebration Awaits', animation:0, font:0, colorCombo:0, size:56, weight:800, lineHeight:1.15, letterSpacing:-1, align:'center' },
    heroSub: { text:'The Perfect Venue for Weddings, Receptions, Birthdays, Corporate Events & More.', preset:0, size:18, weight:400, lineHeight:1.6 },
    background: { src:'', animation:0, posX:50, posY:50, overlayOpacity:30, overlayColor:'#000000', fixed:true, gradient:true },
    video: { src:'', autoplay:true, loop:true, muted:true, controls:false, playsInline:true, objectFit:'cover', poster:'assets/images/hero-venue.jpg', posX:50, posY:50 },
    theme: { active:0, customColors:{gold:'#c6a15b',background:'#0a0b0d',ink:'#171d19',cream:'#f5f0e7'} },
    animations: { activeItems:[], speed:10, delay:0, duration:500, targets:['Headings'], direction:'Normal', scrollTrigger:true, repeatEveryView:false },
    effects: { activeItems:[], intensity:100 },
    components: { activeItems:[] },
    fontAnimations: { active:0, targets:['Hero Heading'], speed:10, delay:0, duration:500, repeat:'Once' },
    settings: { autoSave:false, livePreview:true, keyboardShortcuts:true, animationPreviews:true, confirmDestructive:false },
    mediaLibrary:[], mediaLabels:{}, hiddenMediaAssets:[], imageSizing:{}, pageOverrides:{},
    integrations:{cloudinary:{cloudName:'test-cloud'}}
  };
}

async function mockBackend(page) {
  let authenticated = false;
  let draft = initialCms();
  let published = initialCms();
  const calls = { save:0, publish:0, login:0, logout:0, upload:0 };

  await page.route('**/api/status', route => route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({success:true,server:'Playwright mock',storageConfigured:true,storage:'Neon PostgreSQL',authConfigured:true,cloudinaryConfigured:true})
  }));
  await page.route('**/api/auth/session', route => route.fulfill({
    status:authenticated?200:401, contentType:'application/json',
    body:JSON.stringify(authenticated?{success:true,user:{id:TEST_USER,role:'Administrator'}}:{success:false,message:'Not signed in.'})
  }));
  await page.route('**/api/auth/login', async route => {
    calls.login++;
    const body = route.request().postDataJSON();
    if (body.username === TEST_USER && body.password === TEST_PASSWORD) {
      authenticated = true;
      return route.fulfill({status:200,contentType:'application/json',headers:{'set-cookie':'rbh_admin_session=qa-session; Path=/; SameSite=Lax'},body:JSON.stringify({success:true,user:{id:TEST_USER,role:'Administrator'}})});
    }
    return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false,message:'Invalid Login ID or password.'})});
  });
  await page.route('**/api/auth/logout', async route => {
    authenticated=false; calls.logout++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Signed out.'})});
  });
  await page.route('**/api/admin/load-cms', route => route.fulfill({
    status:authenticated?200:401, contentType:'application/json',
    body:JSON.stringify(authenticated?{success:true,data:draft,source:'test-neon-draft'}:{success:false,message:'Not signed in.'})
  }));
  await page.route('**/api/load-cms', route => route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({success:true,data:published,source:'test-neon-published',updatedAt:'2026-10-16T00:00:00.000Z'})
  }));
  await page.route('**/api/save-cms', async route => {
    calls.save++;
    draft = route.request().postDataJSON();
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Draft saved to test backend.',timestamp:new Date().toISOString()})});
  });
  await page.route('**/api/publish', async route => {
    calls.publish++;
    draft = route.request().postDataJSON();
    published = JSON.parse(JSON.stringify(draft));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Published to test backend.',published_at:new Date().toISOString(),report:[]})});
  });
  await page.route('**/api/cloudinary/status', route => route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({success:true,connected:true,configured:true,cloudName:'test-cloud',status:'ok'})
  }));
  await page.route('**/api/cloudinary/signature**', route => route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({success:true,cloudName:'test-cloud',apiKey:'test-key',timestamp:Math.floor(Date.now()/1000),folder:'royal-banquet',tags:'royal-banquet,cms-upload',signature:'test-signature',resourceType:'image'})
  }));
  await page.route('https://api.cloudinary.com/**', async route => {
    calls.upload++;
    const url = 'https://res.cloudinary.com/test-cloud/image/upload/test-asset-'+calls.upload+'.png';
    return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({secure_url:url,public_id:'royal-banquet/test-asset-'+calls.upload,bytes:512,format:'png',resource_type:'image'})});
  });
  await page.route('https://res.cloudinary.com/test-cloud/**', route => route.fulfill({
    status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:PNG
  }));
  return { calls, snapshot:()=>({draft,published,authenticated}) };
}

async function signIn(page) {
  await page.goto(BASE_URL + '/admin-studio.html');
  await expect(page.locator('#studio-login-overlay')).not.toHaveClass(/hidden/);
  await page.locator('#login-username').fill(TEST_USER);
  await page.locator('#login-password').fill(TEST_PASSWORD);
  await page.locator('#btn-login-submit').click();
  await expect(page.locator('#studio-login-overlay')).toHaveClass(/hidden/);
  await expect.poll(() => page.evaluate(() => window.STUDIO && window.STUDIO.currentPage)).toBe('dashboard');
  await page.waitForTimeout(250);
}

async function studioCss(page) {
  return page.locator('iframe').first().evaluate(frame =>
    frame.contentDocument?.getElementById('studio-live-styles')?.textContent || ''
  );
}

test('sign-in, all navigation pages, editable background image, save/publish and sign-out work', async ({ page }) => {
  test.setTimeout(90000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const backend = await mockBackend(page);
  await signIn(page);

  const pageKeys = await page.locator('.s-nav-item[data-page]').evaluateAll(items => items.map(item => item.dataset.page));
  expect(pageKeys).toContain('background');
  expect(pageKeys).toContain('font-animations');
  for (const key of pageKeys) {
    await page.locator('.s-nav-item[data-page="' + key + '"]').click();
    await expect.poll(() => page.evaluate(() => window.STUDIO.currentPage)).toBe(key);
  }

  await page.locator('.s-nav-item[data-page="background"]').click();
  const bgCardCount = await page.locator('#bg-anim-grid [data-index]').count();
  expect(bgCardCount).toBe(15);
  const backgroundEffects = ['', 'GoldWave','Stars','Ripple','Rotate','Pulse','Aurora','Lightning','Galaxy','Matrix','Fire','Snow','Bokeh','Confetti','Grid'];
  for (let index=0; index<bgCardCount; index++) {
    await page.locator('#bg-anim-grid [data-index="' + index + '"]').click();
    await expect.poll(() => page.evaluate(() => window.STUDIO.cms.background.animation)).toBe(index);
    if (index > 0) await expect.poll(async () => (await studioCss(page)).includes('rbhStudioBg' + backgroundEffects[index])).toBeTruthy();
  }

  const backgroundUrl='/assets/images/stage-celebration.jpg';
  await page.locator('#bg-url-input').fill(backgroundUrl);
  await page.locator('#bg-url-input').press('Tab');
  await expect.poll(() => page.evaluate(() => window.STUDIO.cms.background.src)).toBe(backgroundUrl);
  await page.locator('#btn-bg-image-remove').click();
  await expect.poll(() => page.evaluate(() => window.STUDIO.cms.background.src)).toBe('');

  await page.locator('#bg-upload').setInputFiles({name:'studio-bg.png',mimeType:'image/png',buffer:PNG});
  await expect.poll(() => page.evaluate(() => window.STUDIO.cms.background.src)).toContain('res.cloudinary.com/test-cloud');
  expect(backend.calls.upload).toBe(1);

  await page.locator('#bg-fixed-toggle').click();
  await page.locator('#bg-gradient-toggle').click();
  await page.locator('#bg-num-opacity').fill('46');
  await page.locator('#bg-num-posx').fill('37');
  await page.locator('#bg-num-posy').fill('62');

  await page.locator('#btn-studio-save').click();
  await expect.poll(() => backend.calls.save).toBeGreaterThan(0);
  await page.locator('#btn-open-publish').click();
  await page.locator('#btn-confirm-publish').click();
  await expect.poll(() => backend.calls.publish).toBe(1);
  const stored = backend.snapshot().published;
  expect(stored.background.src).toContain('res.cloudinary.com/test-cloud');
  expect(stored.background.animation).toBe(14);
  expect(stored.background.fixed).toBe(false);
  expect(stored.background.gradient).toBe(false);
  expect(stored.background.overlayOpacity).toBe(46);
  expect(stored.background.posX).toBe(37);
  expect(stored.background.posY).toBe(62);

  await page.locator('#btn-studio-logout').click();
  await expect(page.locator('#studio-login-overlay')).not.toHaveClass(/hidden/);
  expect(backend.calls.logout).toBe(1);
  expect(pageErrors).toEqual([]);
});

test('hero, heading, navbar, section and font animation presets all update saved editor state', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await mockBackend(page);
  await signIn(page);

  await page.locator('.s-nav-item[data-page="hero-image"]').click();
  const heroCount=await page.locator('#hero-anim-grid [data-index]').count();
  expect(heroCount).toBe(10);
  const heroNames=['','rbhStudioHeroZoomIn','rbhStudioHeroZoomOut','rbhStudioHeroFade','rbhStudioHeroUp','rbhStudioHeroLeft','rbhStudioHeroRight','rbhStudioHeroParallax','rbhStudioHeroKenBurns','rbhStudioHeroBlur'];
  for(let i=0;i<heroCount;i++){
    await page.locator('#hero-anim-grid [data-index="'+i+'"]').click();
    await expect.poll(()=>page.evaluate(()=>window.STUDIO.cms.hero.animation)).toBe(i);
    if(i>0) await expect.poll(async()=> (await studioCss(page)).includes(heroNames[i])).toBeTruthy();
  }

  await page.locator('.s-nav-item[data-page="hero-heading"]').click();
  const headingCount=await page.locator('#heading-anim-grid [data-index]').count();
  expect(headingCount).toBe(12);
  const headingNames=['','rbhStudioHeadingFadeUp','rbhStudioHeadingSlideDown','rbhStudioHeadingTypewriter','rbhStudioHeadingWave','rbhStudioHeadingExplode','rbhStudioHeadingBlur','rbhStudioHeadingGlitch','rbhStudioHeadingBounce','rbhStudioHeadingScatter','rbhStudioHeadingGold','rbhStudioHeadingMask'];
  for(let i=0;i<headingCount;i++){
    await page.locator('#heading-anim-grid [data-index="'+i+'"]').click();
    await expect.poll(()=>page.evaluate(()=>window.STUDIO.cms.heroHeading.animation)).toBe(i);
    if(i>0) await expect.poll(async()=> (await studioCss(page)).includes(headingNames[i])).toBeTruthy();
  }

  await page.locator('.s-nav-item[data-page="navbar"]').click();
  for (const [selector,property,count] of [['#navbar-anim-grid','animation',10],['#navbar-hover-grid','hoverAnimation',10]]) {
    const actual=await page.locator(selector+' [data-index]').count();
    expect(actual).toBe(count);
    for(let i=0;i<actual;i++){
      await page.locator(selector+' [data-index="'+i+'"]').click();
      await expect.poll(()=>page.evaluate(property=>window.STUDIO.cms.navbar[property],property)).toBe(i);
    }
  }

  await page.locator('.s-nav-item[data-page="animations"]').click();
  const animations=page.locator('#anim-lib-grid .s-anim-card');
  const animationsCount=await animations.count();
  expect(animationsCount).toBe(40);
  for(let i=0;i<animationsCount;i++){
    await animations.nth(i).click();
    await expect.poll(()=>page.evaluate(index=>window.STUDIO.cms.animations.activeItems.includes(index),i)).toBeTruthy();
  }

  await page.locator('.s-nav-item[data-page="font-animations"]').click();
  const fonts=page.locator('#font-anim-list .s-fa-item');
  const fontCount=await fonts.count();
  expect(fontCount).toBe(40);
  for(let i=0;i<fontCount;i++){
    await fonts.nth(i).click();
    await expect.poll(()=>page.evaluate(()=>window.STUDIO.cms.fontAnimations.active)).toBe(i);
  }

  await page.locator('.s-nav-item[data-page="effects"]').click();
  const effects=page.locator('#effects-grid .s-effect-card');
  const effectsCount=await effects.count();
  expect(effectsCount).toBe(40);
  for(let i=0;i<effectsCount;i++){
    await effects.nth(i).click();
    await expect.poll(()=>page.evaluate(index=>window.STUDIO.cms.effects.activeItems.includes(index),i)).toBeTruthy();
  }

  await page.locator('.s-nav-item[data-page="components"]').click();
  const components=page.locator('#components-grid .s-comp-card');
  const componentsCount=await components.count();
  expect(componentsCount).toBe(40);
  for(let i=0;i<componentsCount;i++){
    await components.nth(i).click();
    await expect.poll(()=>page.evaluate(index=>window.STUDIO.cms.components.activeItems.includes(index),i)).toBeTruthy();
  }

  expect(pageErrors).toEqual([]);
});

test('media library crop and display dimensions are real CMS actions', async ({ page }) => {
  test.setTimeout(90000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/assets/images/photo-01.jpeg', route => route.fulfill({status:200,contentType:'image/png',body:PNG}));
  const backend = await mockBackend(page);
  await signIn(page);
  await page.locator('.s-nav-item[data-page="image-library"]').click();
  await expect(page.locator('.s-img-item img').first()).toBeVisible({timeout:8000});
  await page.locator('.s-img-item').first().evaluate(item => item.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, view:window })));
  await expect(page.locator('#selected-img-name')).not.toHaveValue('', {timeout:5000});
  await page.locator('#imglib-num-w').fill('640');
  await page.locator('#imglib-num-h').fill('360');
  await page.locator('#btn-imglib-apply-size').click({timeout:8000});
  await expect.poll(()=>page.evaluate(()=>Object.keys(window.STUDIO.cms.imageSizing).length),{timeout:7000}).toBe(1);
  const cropCountBefore=await page.evaluate(()=>window.STUDIO.cms.mediaLibrary.length);
  await page.locator('#btn-imglib-crop').click({timeout:8000});
  await expect.poll(()=>page.evaluate(()=>window.STUDIO.cms.mediaLibrary.length),{timeout:20000}).toBe(cropCountBefore+1);
  expect(backend.calls.upload).toBe(1);
  const asset=await page.evaluate(()=>window.STUDIO.cms.mediaLibrary.at(-1));
  expect(asset.publicId).toContain('royal-banquet/test-asset-');
  expect(asset.name).toContain('Cropped');
  expect(pageErrors).toEqual([]);
});


test('top-bar page selector edits and publishes page-specific hero, CTA buttons and logo placement', async ({ page }) => {
  test.setTimeout(90000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const backend = await mockBackend(page);
  await signIn(page);

  await page.locator('#page-selector').selectOption('events.html');
  await expect.poll(() => page.evaluate(() => window.STUDIO.currentEditPage)).toBe('events.html');
  await expect.poll(() => page.locator('iframe[title="Hero Preview"]').getAttribute('src')).toContain('events.html');

  await page.locator('.s-nav-item[data-page="hero-image"]').click();
  await page.locator('#page-hero-src').fill('/assets/images/photo-02.jpeg');
  await page.locator('#page-hero-title').fill('Events Page Only');
  await page.locator('#page-hero-subtitle').fill('A separate hero description for the Events page.');
  await page.locator('#page-hero-num-posx').fill('72');
  await page.locator('#page-hero-num-posy').fill('28');
  await page.locator('#page-hero-num-height').fill('64');
  await page.locator('#page-hero-num-opacity').fill('36');
  await page.locator('#page-hero-overlay-color').fill('#112233');
  await expect.poll(() => page.evaluate(() => window.STUDIO.cms.pageOverrides['events.html']?.hero?.title)).toBe('Events Page Only');

  await page.locator('#btn-page-button-pick').click();
  await expect(page.locator('#btn-page-button-pick')).toHaveText(/Click a highlighted button/);
  await page.frameLocator('iframe[title="Hero Preview"]').locator('.page-hero .btn-row a.btn-gold').click();
  await expect(page.locator('#page-button-target')).toHaveValue('primary');
  await page.locator('#page-button-label').fill('Enquire about this event');
  await page.locator('#page-button-href').fill('booking.html?event=events-page');
  await page.locator('#page-button-bg').fill('#234567');
  await page.locator('#page-button-color').fill('#ffffff');
  await page.locator('#page-button-radius').fill('18');
  await page.locator('#page-button-size').fill('17');

  await page.locator('.s-nav-item[data-page="logo"]').click();
  await page.locator('#page-logo-placement').selectOption('custom');
  await page.locator('#page-logo-num-x').fill('72');
  await page.locator('#page-logo-num-y').fill('24');
  await expect.poll(() => page.evaluate(() => window.STUDIO.cms.pageOverrides['events.html']?.logo?.placement)).toBe('custom');

  await page.locator('.s-nav-item[data-page="hero-image"]').click();
  const preview = page.frameLocator('iframe[title="Hero Preview"]');
  await expect(preview.locator('.page-hero h1')).toHaveText('Events Page Only', {timeout:12000});
  await expect(preview.locator('.page-hero-media img')).toHaveAttribute('src', '/assets/images/photo-02.jpeg', {timeout:12000});
  await expect(preview.locator('.page-hero .btn-row a.btn-gold')).toHaveText('Enquire about this event', {timeout:12000});
  await expect(preview.locator('.page-hero .btn-row a.btn-gold')).toHaveAttribute('href','booking.html?event=events-page');

  await page.locator('#btn-studio-save').click();
  await expect.poll(() => backend.calls.save).toBeGreaterThan(0);
  await page.locator('#btn-open-publish').click();
  await page.locator('#btn-confirm-publish').click();
  await expect.poll(() => backend.calls.publish).toBe(1);
  const stored = backend.snapshot().published;
  expect(stored.pageOverrides['events.html'].hero).toMatchObject({
    src:'/assets/images/photo-02.jpeg',title:'Events Page Only',
    subtitle:'A separate hero description for the Events page.',
    posX:72,posY:28,height:64,overlayOpacity:36,overlayColor:'#112233'
  });
  expect(stored.pageOverrides['events.html'].buttons.primary).toMatchObject({
    label:'Enquire about this event',href:'booking.html?event=events-page',
    bgColor:'#234567',textColor:'#ffffff',borderRadius:18,fontSize:17
  });
  expect(stored.pageOverrides['events.html'].logo).toMatchObject({placement:'custom',x:72,y:24});
  expect(pageErrors).toEqual([]);
});

test('public page renderer applies published page-specific hero, button and free logo position', async ({ page }) => {
  const published = initialCms();
  published.pageOverrides = {
    'events.html': {
      hero: {
        src:'/assets/images/photo-02.jpeg',title:'Published Events Hero',
        subtitle:'A page-specific published summary.',posX:64,posY:30,height:62,
        overlayOpacity:25,overlayColor:'#223344'
      },
      buttons: {
        primary:{label:'Published Events CTA',href:'booking.html?event=published',bgColor:'#345678',textColor:'#ffffff',borderRadius:16,fontSize:18}
      },
      logo:{placement:'custom',x:68,y:22}
    }
  };
  await page.route('**/api/load-cms', route => route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({success:true,data:published,source:'test-published'})
  }));
  await page.goto(BASE_URL + '/events.html');
  await expect(page.locator('.page-hero h1')).toHaveText('Published Events Hero');
  await expect(page.locator('.page-hero-media img')).toHaveAttribute('src','/assets/images/photo-02.jpeg');
  await expect(page.locator('.page-hero .lede')).toHaveText('A page-specific published summary.');
  const cta=page.locator('.page-hero .btn-row a.btn-gold');
  await expect(cta).toHaveText('Published Events CTA');
  await expect(cta).toHaveAttribute('href','booking.html?event=published');
  await expect(page.locator('[data-rbh-logo-placement="custom"]')).toBeAttached();
  const logoPlacement=await page.locator('[data-rbh-logo-placement="custom"]').evaluate(node=>({
    position:getComputedStyle(node).position,
    x:node.style.getPropertyValue('--rbh-logo-x'),
    y:node.style.getPropertyValue('--rbh-logo-y')
  }));
  expect(logoPlacement).toEqual({position:'fixed',x:'68%',y:'22%'});

  // Removing the per-page override must restore the original hero and navbar layout.
  const resetCms = JSON.parse(JSON.stringify(published));
  resetCms.pageOverrides = {};
  await page.evaluate(cms => window.postMessage({type:'STUDIO_PREVIEW_SYNC',cms}, '*'), resetCms);
  await expect(page.locator('.page-hero h1')).toContainText('Bring your people');
  await expect(page.locator('.page-hero h1')).toContainText('together beautifully.');
  await expect.poll(()=>page.locator('.page-hero-media img').getAttribute('src')).toMatch(/^https:\/\/res\.cloudinary\.com\/pspn79yf\/image\/upload\//);
  await expect(page.locator('.page-hero .btn-row a.btn-gold')).not.toHaveText('Published Events CTA');
  await expect.poll(()=>page.locator('.page-hero').evaluate(node=>node.style.minHeight)).toBe('');
  await expect.poll(()=>page.locator('.page-hero-media img').evaluate(node=>node.style.objectPosition)).toBe('');
  await expect(page.locator('.site-header .brand[data-rbh-logo-placement="custom"]')).toHaveCount(0);
  await expect(page.locator('.site-header .brand')).toBeAttached();
});
