export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { username, password } = req.body || {};
  const validUser = (username || '').trim().toLowerCase() === 'royal hall';
  const validPass = (password || '') === 'Royal@07';

  if (validUser && validPass) {
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: { id: 'Royal Hall', role: 'Administrator' },
      token: 'royal_auth_' + Date.now()
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid Login ID or Password'
  });
}
