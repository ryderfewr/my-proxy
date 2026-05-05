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
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");

    if (contentType.includes("text/html")) {
      let html = await response.text();

      let base;
      try { base = new URL(targetUrl); } catch { base = { origin: "", href: targetUrl }; }
      const origin = base.origin;

      // Remove security headers that block the proxy
      html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, "");

      // Inject base tag so relative resources load from correct origin
      const baseTag = `<base href="${origin}/" target="_self">`;

      // Rewrite absolute links through proxy
      html = html.replace(/(href|src|action)=["'](https?:\/\/[^"'\s>]+)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(url)}"`);

      // Rewrite protocol-relative
      html = html.replace(/(href|src|action)=["'](\/\/[^"'\s>]+)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent("https:" + url)}"`);

      // Rewrite root-relative
      html = html.replace(/(href|src|action)=["'](\/[^"'\s>][^"']*)["']/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(origin + url)}"`);

      // Nav bar injected into page
      const navBar = `
<style>
  #__pnav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: #0f0f1a; padding: 7px 10px;
    display: flex; align-items: center; gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 2px 16px rgba(0,0,0,0.7);
    height: 46px;
  }
  #__pnav a { font-size: 20px; text-decoration: none; }
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
  #__pnav .bk { background: #2a2a40; }
  body { margin-top: 46px !important; }
</style>
<div id="__pnav">
  <a href="/" title="Home">🌐</a>
  <input id="__purl" type="text" value="${targetUrl}" />
  <button class="go" onclick="__pg()">Go</button>
  <button class="bk" onclick="history.back()">← Back</button>
</div>
<script>
(function(){
  function __pg(){
    var v=document.getElementById('__purl').value.trim();
    if(!v)return;
    if(!v.startsWith('http'))v='https://'+v;
    window.location.href='/proxy?url='+encodeURIComponent(v);
  }
  window.__pg=__pg;
  var i=document.getElementById('__purl');
  if(i)i.addEventListener('keydown',function(e){if(e.key==='Enter')__pg();});
})();
</script>`;

      // Insert base tag in head, nav bar after body opens
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, `<head>${baseTag}`);
      }
      if (/<body[^>]*>/i.test(html)) {
        html = html.replace(/<body([^>]*)>/i, `<body$1>${navBar}`);
      } else {
        html = navBar + html;
      }

      res.send(html);
    } else {
      // Pass through images, CSS, JS, fonts, etc.
      const buffer = await response.buffer();
      res.send(buffer);
    }
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send(`
      <html><head><style>
        body{font-family:sans-serif;background:#0f0f1a;color:white;padding:60px 40px;text-align:center}
        h2{color:#ff6a9e;margin-bottom:16px} p{color:#888;margin:8px 0}
        a{color:#7c6aff;font-size:16px;display:inline-block;margin-top:24px}
      </style></head>
      <body>
        <h2>⚠️ Couldn't load that page</h2>
        <p>This site may be blocking the proxy, or there was a network error.</p>
        <p style="font-size:13px;color:#555">${err.message}</p>
        <a href="/">← Back to home</a>
      </body></html>`);
  }
});

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
