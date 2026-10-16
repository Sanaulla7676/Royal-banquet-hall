const { authConfig, isAuthenticated } = require('../../lib/admin-auth.js');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!authConfig().configured) {
    return res.status(503).json({ success: false, message: 'Admin authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel.' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ success: false, message: 'Not signed in.' });
  }
  return res.status(200).json({ success: true, user: { id: process.env.ADMIN_USERNAME, role: 'Administrator' } });
};
