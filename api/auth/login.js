const {
  authConfig,
  credentialsMatch,
  setSessionCookie,
  isSameOrigin
} = require('../../lib/admin-auth.js');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin sign-in rejected.' });
  }
  if (!authConfig().configured) {
    return res.status(503).json({
      success: false,
      message: 'Admin sign-in is not configured. Add ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET to the Vercel project environment, then redeploy.'
    });
  }

  const body = req.body || {};
  if (!credentialsMatch(body.username, body.password)) {
    return res.status(401).json({ success: false, message: 'Invalid Login ID or password.' });
  }

  setSessionCookie(req, res, body.remember === true);
  return res.status(200).json({
    success: true,
    message: 'Authentication successful.',
    user: { id: process.env.ADMIN_USERNAME, role: 'Administrator' }
  });
};
