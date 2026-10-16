const { clearSessionCookie, isSameOrigin } = require('../../lib/admin-auth.js');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!isSameOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin request rejected.' });
  }
  clearSessionCookie(req, res);
  return res.status(200).json({ success: true, message: 'Signed out.' });
};
