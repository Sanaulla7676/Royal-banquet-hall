const { authConfig, isAuthenticated, isSameOrigin } = require('../../lib/admin-auth.js');
const { readState, errorMessage } = require('../../lib/cms-db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!authConfig().configured) {
    return res.status(503).json({ success: false, message: 'Admin authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel.' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ success: false, message: 'Please sign in to load the admin draft.' });
  }
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin request rejected.' });
  }
  try {
    const row = await readState('draft') || await readState('published');
    return res.status(200).json({
      success: true,
      data: row && row.data ? row.data : {},
      updatedAt: row && row.updated_at ? row.updated_at : null
    });
  } catch (error) {
    const status = error && error.statusCode ? error.statusCode : 503;
    return res.status(status).json({ success: false, message: errorMessage(error) });
  }
};
