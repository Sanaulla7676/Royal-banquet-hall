const { authConfig, isAuthenticated, isSameOrigin } = require('../lib/admin-auth.js');
const { writeStates, errorMessage } = require('../lib/cms-db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin request rejected.' });
  }
  if (!authConfig().configured) {
    return res.status(503).json({ success: false, message: 'Admin authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel.' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ success: false, message: 'Your admin session expired. Sign in again.' });
  }

  const cms = req.body;
  if (!cms || typeof cms !== 'object' || Array.isArray(cms) ||
      !cms.logo || !cms.navbar || !cms.hero || !cms.heroHeading) {
    return res.status(400).json({ success: false, message: 'Invalid Studio data. Open the full Admin Studio and publish again.' });
  }
  if (cms.video && /^(?:blob:|data:)/i.test(String(cms.video.src || ''))) {
    return res.status(400).json({
      success: false,
      message: 'The video source is temporary or embedded and cannot be published. Use a persistent HTTPS/CDN URL or a file path under assets/.'
    });
  }
  if (cms.video && cms.video.src &&
      !/^(?:https:\/\/|http:\/\/|\/|assets\/)/i.test(String(cms.video.src))) {
    return res.status(400).json({ success: false, message: 'Video URL must use HTTPS or a site asset path.' });
  }
  if (Buffer.byteLength(JSON.stringify(cms), 'utf8') > 4000000) {
    return res.status(413).json({ success: false, message: 'Published configuration is too large. Store media in Cloudinary and publish URLs instead of base64 data.' });
  }

  try {
    await writeStates([
      { key: 'draft', data: cms },
      { key: 'published', data: cms }
    ]);
    const publishedAt = new Date().toISOString();
    const report = [
      'Logo settings saved',
      'Navigation settings saved',
      'Hero settings saved',
      'Theme and visual settings saved'
    ];
    return res.status(200).json({
      success: true,
      message: 'CMS published to shared storage.',
      published_at: publishedAt,
      report
    });
  } catch (error) {
    const status = error && error.statusCode ? error.statusCode : 503;
    return res.status(status).json({ success: false, message: errorMessage(error) });
  }
};
