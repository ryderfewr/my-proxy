const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create a proxy middleware with error handling
const proxy = createProxyMiddleware({
  target: 'https://www.google.com',
  changeOrigin: true,
  secure: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Proxy Error</title></head>
      <body style="background:#080810;color:#f0f0ff;font-family:system-ui;padding:40px;text-align:center">
        <h2>⚠️ Cannot Load This Site</h2>
        <p>The proxy encountered an error: ${err.message}</p>
        <button onclick="location.href='/'">← Back to Home</button>
      </body>
      </html>
    `);
  }
});

// Proxy endpoint for Google searches
app.use('/search', proxy);

// Handle the main proxy endpoint
app.get('/proxy', (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.redirect('/');
  }
  
  // Fetch the requested URL
  fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  })
  .then(response => {
    // Forward headers (FIX: properly convert headers to object)
    const headers = {};
    for (let [key, value] of response.headers.entries()) {
      headers[key] = value;
    }
    res.set(headers);
    return response.text();
  })
  .then(html => {
    // Rewrite links in HTML
    let modifiedHtml = html;
    modifiedHtml = modifiedHtml.replace(/(href|src|action)="\/([^"]*)"/g, `$1="/proxy?url=${encodeURIComponent(url.split('/')[0] + '//' + url.split('/')[2])}/$2"`);
    modifiedHtml = modifiedHtml.replace(/(href|src|action)="(https?:\/\/[^"]*)"/g, `$1="/proxy?url=$2"`);
    
    // Add navigation bar
    const navBar = `
      <div style="position:fixed;top:0;left:0;right:0;background:#0d0d1f;border-bottom:2px solid #7c6aff;padding:10px;z-index:999999;font-family:system-ui">
        <form action="/proxy" method="get" style="display:flex;gap:8px">
          <input type="text" name="url" placeholder="Enter URL or search..." style="flex:1;padding:8px;border-radius:5px;border:1px solid #333;background:#1a1a2e;color:white">
          <button type="submit" style="padding:8px 16px;background:#7c6aff;border:none;border-radius:5px;color:white;cursor:pointer">Go</button>
          <button type="button" onclick="location.href='/'" style="padding:8px 16px;background:#ff6a9e;border:none;border-radius:5px;color:white;cursor:pointer">Home</button>
        </form>
      </div>
      <div style="height:50px"></div>
    `;
    
    modifiedHtml = modifiedHtml.replace(/<body([^>]*)>/i, `<body$1>${navBar}`);
    res.send(modifiedHtml);
  })
  .catch(err => {
    console.error('Fetch error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="background:#080810;color:#f0f0ff;font-family:system-ui;padding:40px;text-align:center">
        <h2>❌ Failed to Load</h2>
        <p>Could not load: ${url}</p>
        <p>Error: ${err.message}</p>
        <button onclick="location.href='/'">← Home</button>
      </body>
      </html>
    `);
  });
});

// Handle search queries properly
app.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.redirect('/');
  }
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  res.redirect(`/proxy?url=${encodeURIComponent(searchUrl)}`);
});

// Simple home route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My Proxy</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#080810;color:#f0f0ff;font-family:system-ui;padding:40px}
        .container{max-width:600px;margin:100px auto;text-align:center}
        h1{font-size:3rem;margin-bottom:20px;background:linear-gradient(135deg,#7c6aff,#ff6a9e);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .search-box{display:flex;gap:10px;margin:30px 0}
        input{flex:1;padding:15px;border-radius:10px;border:1px solid #333;background:#1a1a2e;color:white;font-size:16px}
        button{padding:15px 30px;background:#7c6aff;border:none;border-radius:10px;color:white;cursor:pointer;font-weight:bold}
        button:hover{background:#9b8aff}
        .links{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:30px}
        a{color:#7c6aff;text-decoration:none;padding:10px;background:#1a1a2e;border-radius:8px;display:block}
        a:hover{background:#7c6aff;color:white}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌐 My Proxy</h1>
        <p>Browse freely through this proxy</p>
        
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search Google or enter URL..." autofocus>
          <button onclick="go()">Go →</button>
        </div>
        
        <div class="links">
          <a href="/proxy?url=https://www.google.com">🔍 Google</a>
          <a href="/proxy?url=https://duckduckgo.com">🦆 DuckDuckGo</a>
          <a href="/proxy?url=https://en.wikipedia.org/wiki/Main_Page">📚 Wikipedia</a>
          <a href="/proxy?url=https://github.com">🐙 GitHub</a>
        </div>
        
        <p style="margin-top:30px;font-size:12px;color:#666">💡 Try: "cats" or "github.com"</p>
      </div>
      
      <script>
        function go() {
          let input = document.getElementById('searchInput').value.trim();
          if (!input) return;
          
          // Check if it's a URL
          const isUrl = input.includes('.') && !input.includes(' ');
          
          if (isUrl) {
            if (!input.startsWith('http')) input = 'https://' + input;
            window.location.href = '/proxy?url=' + encodeURIComponent(input);
          } else {
            window.location.href = '/search?q=' + encodeURIComponent(input);
          }
        }
        
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') go();
        });
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy server running on http://localhost:${PORT}`);
  console.log(`   Open this URL in your browser`);
});
