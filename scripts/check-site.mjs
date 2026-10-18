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

// Protect the phone-only crest scale, animated intro fallback and Admin Studio rebrand from regressions.
const siteCss=fs.readFileSync(path.join(root,'assets/css/site.css'),'utf8');
const siteJs=fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8');
const adminHtml=fs.readFileSync(path.join(root,'admin-studio.html'),'utf8');
for(const marker of ['transform:scale(1.08)!important','site-intro-fallback','royal-fallback-letter-in','royal-fallback-shine']) {
  if(!siteCss.includes(marker)) errors.push('Missing responsive logo or Royal Hall fallback style: '+marker);
}
for(const marker of ['royalHallIntroPlayed_v3','INTRO_FALLBACK_DURATION_MS','showIntroFallback','intro-video-active']) {
  if(!siteJs.includes(marker)) errors.push('Missing resilient intro fallback behavior: '+marker);
}
if(!adminHtml.includes('THE <span style="color:var(--s-gold)">ROYAL HALL</span>')) errors.push('Admin header branding is not The Royal Hall.');
if(adminHtml.includes('ROYAL BANQUET HALL')) errors.push('Old hall name remains in Admin Studio branding.');
for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  if(!html.includes('assets/css/site.css?v=20261018-royal-mobile-intro-v1')) errors.push(page+' is missing the mobile crest/intro stylesheet version.');
  if(!html.includes('assets/js/site.js?v=20261018-royal-letter-fallback-v1')) errors.push(page+' is missing the resilient intro script version.');
  const introStart=html.indexOf('<div id="site-intro"');
  const introEnd=introStart>=0?html.indexOf('</div>',introStart):-1;
  const intro=introStart>=0&&introEnd>=0?html.slice(introStart,introEnd+6):'';
  if(intro.includes('poster=')) errors.push(page+' should use the animated brand fallback, not a venue-photo poster.');
}

if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('PASS: six pages, internal links and gallery manifest validated'+(requireMedia?' including every image/video asset.':'; run with REQUIRE_MEDIA=1 after importing assets to verify binary media.'));
