import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const pages=['index.html','events.html','gallery.html','booking.html','experience.html','contact.html'];
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
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('PASS: six pages, internal links and gallery manifest validated'+(requireMedia?' including every image/video asset.':'; run with REQUIRE_MEDIA=1 after importing assets to verify binary media.'));
