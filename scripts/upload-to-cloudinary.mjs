#!/usr/bin/env node
/**
 * Royal Banquet Hall - Cloudinary Batch Asset Uploader
 * Transfers all 43 local images in assets/images/ to Cloudinary CDN
 * under cloud_name: pspn79yf and folder: royal-banquet/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const CMS_DATA_FILE = path.join(ROOT, 'assets', 'js', 'royal-cms-data.js');

function loadCmsData() {
  if (!fs.existsSync(CMS_DATA_FILE)) return {};
  const raw = fs.readFileSync(CMS_DATA_FILE, 'utf-8');
  const scope = { window: {} };
  try {
    new Function('window', raw)(scope.window);
    return scope.window.ROYAL_CMS_DATA || {};
  } catch {
    const m = raw.match(/window\.ROYAL_CMS_DATA\s*=\s*(\{[\s\S]*\});\s*$/);
    return m ? JSON.parse(m[1]) : {};
  }
}

function saveCmsData(data) {
  const content = `/**
 * Royal Banquet Hall - CMS & Studio Data Store
 * Automatically saved by Royal Admin Studio on ${new Date().toISOString()}
 */
window.ROYAL_CMS_DATA = ${JSON.stringify(data, null, 2)};
`;
  fs.writeFileSync(CMS_DATA_FILE, content, 'utf-8');
}

export async function transferAllImagesToCloudinary(onProgress) {
  const cms = loadCmsData();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server environment first.');
  }
  if (!cms.integrations) cms.integrations = {};
  if (!cms.integrations.cloudinary) cms.integrations.cloudinary = {};
  delete cms.integrations.cloudinary.apiSecret;
  delete cms.integrations.cloudinary.apiKey;
  cms.integrations.cloudinary.cloudName = cloudName;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  const files = fs.readdirSync(IMAGES_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext);
  });

  console.log(`Found ${files.length} images to transfer to Cloudinary (${cloudName})...`);

  if (!cms.customMedia) cms.customMedia = {};
  if (!cms.customMedia.imageReplacements) cms.customMedia.imageReplacements = {};
  if (!cms.cloudinaryImages) cms.cloudinaryImages = [];

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(IMAGES_DIR, fileName);
    const publicId = path.basename(fileName, path.extname(fileName));
    const localRelPath = `assets/images/${fileName}`;

    try {
      const uploadRes = await cloudinary.uploader.upload(filePath, {
        folder: 'royal-banquet',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        tags: ['royal-banquet', 'venue-asset']
      });

      const optimizedUrl = cloudinary.url(uploadRes.public_id, {
        fetch_format: 'auto',
        quality: 'auto'
      });

      cms.customMedia.imageReplacements[localRelPath] = optimizedUrl;

      const record = {
        fileName,
        localPath: localRelPath,
        publicId: uploadRes.public_id,
        secureUrl: uploadRes.secure_url,
        optimizedUrl,
        bytes: uploadRes.bytes,
        format: uploadRes.format,
        width: uploadRes.width,
        height: uploadRes.height
      };

      cms.cloudinaryImages.push(record);
      results.push(record);

      if (typeof onProgress === 'function') {
        onProgress({ current: i + 1, total: files.length, file: fileName, record });
      }

      console.log(`[${i + 1}/${files.length}] Uploaded ${fileName} -> ${optimizedUrl}`);
    } catch (err) {
      console.error(`Failed to upload ${fileName}:`, err.message);
      results.push({ fileName, error: err.message });
      if (typeof onProgress === 'function') {
        onProgress({ current: i + 1, total: files.length, file: fileName, error: err.message });
      }
    }
  }

  saveCmsData(cms);
  console.log(`Transfer complete! ${results.filter(r => !r.error).length}/${files.length} images uploaded.`);
  return { success: true, count: results.length, results };
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('upload-to-cloudinary.mjs')) {
  const secret = process.argv[2];
  transferAllImagesToCloudinary(secret)
    .then(res => console.log('Done!', res.count, 'images processed.'))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
