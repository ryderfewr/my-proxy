const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url= parameter");

  try {
    const fetch = (await import("node-fetch")).default;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";

    // Remove security headers that block embedding
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.removeHeader?.("X-Frame-Options");
    res.removeHeader?.("Content-Security-Policy");

    if (contentType.includes("text/html")) {
      let html = await response.text();

      let base;
      try { base = new URL(targetUrl); } catch { base = { origin: "" }; }
      const origin = base.origin;

      // Inject base tag so relative URLs resolve correctly
      const baseTag = `<base href="${origin}/" />`;

      // Rewrite absolute links to go through proxy
      html = html.replace(/(href|src|action)=["'](https?:\/\/[^"']+)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(url)}"`);

      // Rewrite protocol-relative
      html = html.replace(/(href|src|action)=["'](\/\/[^"']+)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent("https:" + url)}"`);

      // Rewrite root-relative
      html = html.replace(/(href|src|action)=["'](\/[^"'\/][^"']*)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(origin + url)}"`);

      // Remove CSP meta tags
      html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, "");

      // Inject nav bar
      const navBar = `
<style>
  #__pnav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: #0f0f1a; color: white; padding: 7px 10px;
    display: flex; align-items: center; gap: 8px;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    box-shadow: 0 2px 16px rgba(0,0,0,0.6);
    height: 46px;
  }
  #__pnav a.home { font-size: 20px; text-decoration: none; }
  #__pnav input {
    flex: 1; padding: 6px 12px; border-radius: 8px;
    border: 1px solid #2a2a40; background: #1a1a2e;
    color: white; font-size: 13px; outline: none;
  }
  #__pnav input:focus { border-color: #7c6aff; }
  #__pnav button {
    padding: 6px 14px; border: none; border-radius: 8px;
    color: white; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  #__pnav .go { background: #7c6aff; }
  #__pnav .go:hover { background: #6a58e0; }
  #__pnav .back { background: #2a2a40; }
  #__pnav .back:hover { background: #3a3a55; }
  body { margin-top: 46px !important; padding-top: 0 !important; }
</style>
<div id="__pnav">
  <a class="home" href="/" title="Home">🌐</a>
  <input id="__purl" type="text" value="${targetUrl}" placeholder="Enter URL..." />
  <button class="go" onclick="__pgo()">Go</button>
  <button class="back" onclick="history.back()">← Back</button>
</div>
<script>
(function() {
  function __pgo() {
    var input = document.getElementById('__purl');
    var url = input ? input.value.trim() : '';
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    window.location.href = '/proxy?url=' + encodeURIComponent(url);
  }
  window.__pgo = __pgo;
  var inp = document.getElementById('__purl');
  if (inp) inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') __pgo(); });
})();
</script>`;

      // Insert nav after <head> opens, with base tag
      if (html.includes("<head>")) {
        html = html.replace("<head>", "<head>" + baseTag);
      } else if (html.includes("<HEAD>")) {
        html = html.replace("<HEAD>", "<HEAD>" + baseTag);
      }

      if (html.includes("<body")) {
        html = html.replace(/<body[^>]*>/, (m) => m + navBar);
      } else {
        html = navBar + html;
      }

      res.send(html);
    } else {
      // Stream non-HTML (images, CSS, JS, etc.)
      const buffer = await response.buffer();
      res.send(buffer);
    }
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send(`
      <html>
      <head><style>
        body { font-family: sans-serif; background: #0f0f1a; color: white; padding: 60px 40px; }
        h2 { color: #ff6a9e; } a { color: #7c6aff; font-size: 16px; }
        code { background: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
      </style></head>
      <body>
        <h2>⚠️ Could not load page</h2>
        <p style="color:#aaa;margin:12px 0">Error: <code>${err.message}</code></p>
        <p style="color:#888;margin-bottom:24px">Some sites block proxies or require login. Try a different site.</p>
        <a href="/">← Back to home</a>
      </body></html>`);
  }
});

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
