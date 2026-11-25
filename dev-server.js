// Local run without Vercel: node dev-server.js  ->  http://localhost:3000
// Serves public/ and routes /api/chat-products to the same relay Vercel uses.
const http = require('http');
const fs = require('fs');
const path = require('path');
const relay = require('./api/chat-products');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/api/chat-products') return relay(req, res);

  const file = path.join(PUBLIC, urlPath === '/' ? 'index.html' : path.normalize(urlPath));
  if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log(`Chat Products tester on http://localhost:${PORT}`));
