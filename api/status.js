module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({
    success: true,
    server: 'Vercel Serverless',
    storageConfigured: Boolean(process.env.DATABASE_URL),
    authConfigured: Boolean(
      process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 32
    ),
    timestamp: new Date().toISOString()
  });
};
