import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const pages = ['index.html','events.html','gallery.html','booking.html','experience.html','contact.html'];
const errors = [];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(target)) continue;
    const clean = target.split(/[?#]/)[0];
    if (!clean) continue;
    const resolved = path.resolve(root, path.dirname(page), clean);
    if (!fs.existsSync(resolved)) errors.push(page + ' references missing file: ' + target);
  }
  if (!/<main\b/.test(html) || !/<h1\b/.test(html)) errors.push(page + ' lacks main or h1');
}
const js = fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8');
if (!js.includes('data-enquiry-form')) errors.push('enquiry form handler missing');
if (!js.includes('data-gallery-filter')) errors.push('gallery filter handler missing');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Site checks passed for ' + pages.length + ' pages and core interaction hooks.');
