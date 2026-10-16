export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    server: 'Vercel Serverless',
    timestamp: new Date().toISOString()
  });
}
