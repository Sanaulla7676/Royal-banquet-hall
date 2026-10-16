const { readState, errorMessage } = require('./_lib/cms-db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  try {
    const row = await readState('published');
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
