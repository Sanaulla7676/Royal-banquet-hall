import puppeteer from 'puppeteer-core';

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const STUDIO_URL = process.env.STUDIO_URL || 'http://localhost:3001/admin-studio.html';
const LIVE_URL = process.env.LIVE_URL || 'http://localhost:3001/index.html';
const ADMIN_USER = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD_VALUE = process.env.ADMIN_PASSWORD || '';

async function run() {
  if (!ADMIN_USER || !ADMIN_PASSWORD_VALUE) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in the test environment before running the admin smoke test.');
  }
  console.log('=== STARTING COMPLETE STUDIO LIVE PREVIEW & PUBLISH VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('[STUDIO CONSOLE]:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[STUDIO PAGEERROR]:', err));

  console.log('1. Loading Admin Studio:', STUDIO_URL);
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle2' });

  // Handle Login if overlay present
  const loginOverlay = await page.$('#studio-login-overlay');
  const isHidden = await page.evaluate(el => el ? el.classList.contains('hidden') : true, loginOverlay);
  if (!isHidden) {
    console.log('Signing in with the test environment credentials...');
    await page.type('#login-username', ADMIN_USER);
    await page.type('#login-password', ADMIN_PASSWORD_VALUE);
    await page.click('#btn-login-submit');
    await new Promise(r => setTimeout(r, 1200));
  }

  // ── TEST 1: LOGO CUSTOMIZATION (PAGE 1)
  console.log('2. Navigating to Page 1 (Logo Customization)...');
  await page.click('.s-nav-item[data-page="logo"]');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Adjusting logo width to 220px and height to 150px...');
  await page.evaluate(() => {
    const sw = document.getElementById('logo-slider-w');
    const sh = document.getElementById('logo-slider-h');
    if (sw) {
      sw.value = 220;
      sw.dispatchEvent(new Event('input', { bubbles: true }));
      sw.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (sh) {
      sh.value = 150;
      sh.dispatchEvent(new Event('input', { bubbles: true }));
      sh.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Inspect Logo preview inside iframe
  const logoPreviewState = await page.evaluate(() => {
    const pageLogo = document.getElementById('page-logo');
    const iframe = pageLogo ? pageLogo.querySelector('iframe') : null;
    if (!iframe) return { error: 'No iframe on page-logo' };
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const win = iframe.contentWindow;
    const logo = doc.querySelector('.site-header .brand-logo, .brand img');
    return {
      computedWidth: logo ? win.getComputedStyle(logo).width : null,
      computedHeight: logo ? win.getComputedStyle(logo).height : null,
      inlineWidth: logo ? logo.style.width : null,
      inlineHeight: logo ? logo.style.height : null,
      cmsState: window.STUDIO?.cms?.logo
    };
  });
  console.log('✓ Page 1 Logo Preview Inspection:', logoPreviewState);
  await page.screenshot({ path: 'screenshot_page1_logo.png' });
  console.log('Saved screenshot_page1_logo.png');

  // ── TEST 2: NAVBAR CUSTOMIZATION (PAGE 2)
  console.log('3. Navigating to Page 2 (Navbar Customization)...');
  await page.click('.s-nav-item[data-page="navbar"]');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Changing Navbar background color to Royal Blue #1055e0...');
  await page.evaluate(() => {
    const hex = document.getElementById('navbar-color-hex');
    const swatch = document.getElementById('navbar-color-swatch');
    if (hex && swatch) {
      hex.value = '#1055e0';
      swatch.value = '#1055e0';
      hex.dispatchEvent(new Event('input', { bubbles: true }));
      hex.dispatchEvent(new Event('change', { bubbles: true }));
      swatch.dispatchEvent(new Event('input', { bubbles: true }));
      swatch.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // Inspect Navbar preview inside iframe
  const navbarPreviewState = await page.evaluate(() => {
    const pageNav = document.getElementById('page-navbar');
    const iframe = pageNav ? pageNav.querySelector('iframe') : null;
    if (!iframe) return { error: 'No iframe on page-navbar' };
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const win = iframe.contentWindow;
    const header = doc.querySelector('.site-header');
    return {
      computedBgColor: header ? win.getComputedStyle(header).backgroundColor : null,
      inlineBg: header ? header.style.background : null,
      cmsNavbarState: window.STUDIO?.cms?.navbar
    };
  });
  console.log('✓ Page 2 Navbar Preview Inspection:', navbarPreviewState);
  await page.screenshot({ path: 'screenshot_page2_navbar.png' });
  console.log('Saved screenshot_page2_navbar.png');

  // ── TEST 3: PUBLISH TO LIVE WEBSITE
  console.log('4. Publishing Live via Publish Modal...');
  await page.click('#btn-open-publish');
  await new Promise(r => setTimeout(r, 600));

  console.log('Clicking Confirm Publish...');
  await page.click('#btn-confirm-publish');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot_studio_published.png' });
  console.log('Saved screenshot_studio_published.png');

  // ── TEST 4: VERIFY ON LIVE WEBSITE (INDEX.HTML)
  console.log('5. Opening Live Website in new tab:', LIVE_URL);
  const livePage = await browser.newPage();
  await livePage.setViewport({ width: 1440, height: 900 });

  livePage.on('console', msg => console.log('[LIVE CONSOLE]:', msg.type(), msg.text()));
  livePage.on('pageerror', err => console.error('[LIVE PAGEERROR]:', err));

  await livePage.goto(LIVE_URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await livePage.evaluate(() => {
    sessionStorage.setItem('royalHallIntroPlayed_v1', '1');
    const intro = document.getElementById('site-intro');
    if (intro) intro.remove();
    document.body.classList.remove('intro-pending');
  });
  await new Promise(r => setTimeout(r, 800));

  const liveState = await livePage.evaluate(() => {
    const header = document.querySelector('.site-header');
    const logo = document.querySelector('.site-header .brand-logo, .brand img');
    return {
      headerBg: header ? window.getComputedStyle(header).backgroundColor : null,
      headerMinHeight: header ? window.getComputedStyle(header).minHeight : null,
      logoWidth: logo ? window.getComputedStyle(logo).width : null,
      logoHeight: logo ? window.getComputedStyle(logo).height : null,
      publishedInStorage: localStorage.getItem('royal_cms_published') ? true : false
    };
  });
  console.log('✓ Live Website Verification Result:', liveState);

  await livePage.screenshot({ path: 'screenshot_live_website.png' });
  console.log('Saved screenshot_live_website.png');

  await browser.close();
  console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
