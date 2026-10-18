import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const pages=['index.html','events.html','gallery.html','booking.html','experience.html','contact.html','catering.html','reviews.html','packages.html'];
const requireMedia=process.env.REQUIRE_MEDIA==='1';
const errors=[];
for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const target=match[1];
    if(/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(target))continue;
    const clean=decodeURIComponent(target.split(/[?#]/)[0]);
    if(!clean)continue;
    const resolved=path.resolve(root,path.dirname(page),clean);
    if(!fs.existsSync(resolved)){
      const isMedia=/^assets\/(images|videos)\//.test(clean);
      if(requireMedia||!isMedia)errors.push(page+' references missing file: '+target);
    }
  }
  if(!/<main\b/.test(html)||!/<h1\b/.test(html))errors.push(page+' lacks main or h1');
}
const dataText=fs.readFileSync(path.join(root,'assets/js/gallery-data.js'),'utf8');
const m=dataText.match(/window\.ROYAL_HALL_MEDIA\s*=\s*(\{[\s\S]*\});\s*$/);
if(!m)errors.push('gallery manifest assignment missing');
else{
  try{
    const media=JSON.parse(m[1]);
    if((media.photos||[]).length!==35)errors.push('Expected 35 photo records, found '+(media.photos||[]).length);
    if((media.videos||[]).length!==7)errors.push('Expected 7 video records, found '+(media.videos||[]).length);
    if(requireMedia){
      for(const photo of media.photos||[])if(!fs.existsSync(path.resolve(root,decodeURIComponent(photo.src))))errors.push('Missing photo: '+photo.src);
      for(const video of media.videos||[])if(!fs.existsSync(path.resolve(root,decodeURIComponent(video.src))))errors.push('Missing video: '+video.src);
      for(const alias of ['assets/images/hero-venue.jpg','assets/images/venue-entrance.jpg','assets/images/hall-interior.jpg','assets/images/stage-celebration.jpg','assets/images/cake-display.jpg'])if(!fs.existsSync(path.resolve(root,alias)))errors.push('Missing image alias: '+alias);
    }
  }catch(error){errors.push('Gallery manifest is not valid JSON: '+error.message);}
}

// Guard the full phone navbar crest and direct, high-priority intro video startup.
const siteCss=fs.readFileSync(path.join(root,'assets/css/site.css'),'utf8');
const siteJs=fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8');
const cmsJs=fs.readFileSync(path.join(root,'assets/js/royal-cms.js'),'utf8');
const adminHtml=fs.readFileSync(path.join(root,'admin-studio.html'),'utf8');
for(const marker of ['.site-header .container.nav > .brand > img.brand-logo','width:106px!important','object-fit:cover!important']) {
  if(!siteCss.includes(marker)) errors.push('Missing full phone-navbar crest rule: '+marker);
}
for(const marker of ['royalHallIntroPlayed_v4','INTRO_START_TIMEOUT_MS = 4400','video.preload = \'auto\'','video.play()']) {
  if(!siteJs.includes(marker)) errors.push('Missing prioritized intro video behavior: '+marker);
}
if(siteCss.includes('site-intro-fallback')||siteCss.includes('royal-fallback-shine')) errors.push('Old synthetic intro fallback styles must be removed.');
if(siteJs.includes('site-intro-fallback')||siteJs.includes('intro-fallback-title')) errors.push('Old synthetic intro fallback script must be removed.');
if(!cmsJs.includes('const mobileNavbar = Boolean(window.matchMedia')||!cmsJs.includes("img.style.setProperty('width','100%','important')")) errors.push('CMS is overriding the full mobile navbar logo dimensions.');
if(!adminHtml.includes('THE <span style="color:var(--s-gold)">ROYAL HALL</span>')) errors.push('Admin header branding is not The Royal Hall.');
for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  if(!html.includes('assets/css/site.css?v=20261018-mobile-nav-logo-v3')) errors.push(page+' is missing the mobile navbar logo CSS version.');
  if(!html.includes('assets/js/site.js?v=20261018-video-priority-v2')) errors.push(page+' is missing the direct-video startup script version.');
  if(!html.includes('assets/js/royal-cms.js?v=20261018-mobile-logo-sizing-v2')) errors.push(page+' is missing the CMS logo-sizing fix.');
  const introStart=html.indexOf('<div id="site-intro"');
  if(introStart>=0){
    const introEnd=html.indexOf('</video>',introStart);
    const intro=introEnd>=0?html.slice(introStart,introEnd+8):'';
    if(!intro.includes('src="https://d2ol7oe51mr4n9.cloudfront.net/')) errors.push(page+' intro video source is not available to the HTML preload scanner.');
    if(!intro.includes('preload="auto"')||!intro.includes('autoplay')||!intro.includes('fetchpriority="high"')) errors.push(page+' intro video is missing high-priority eager playback attributes.');
    if(intro.includes('poster=')||intro.includes('data-src=')) errors.push(page+' intro video must not use the synthetic poster/deferred source.');
    if(!html.includes('as="video"')) errors.push(page+' is missing the high-priority intro video preload.');
  }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('PASS: six pages, internal links and gallery manifest validated'+(requireMedia?' including every image/video asset.':'; run with REQUIRE_MEDIA=1 after importing assets to verify binary media.'));
