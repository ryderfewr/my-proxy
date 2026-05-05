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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      let html = await response.text();
      const base = new URL(targetUrl);
      const origin = base.origin;

      html = html.replace(/(href|src|action)="(https?:\/\/[^"]+)"/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(url)}"`);
      html = html.replace(/(href|src|action)="(\/\/[^"]+)"/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent("https:" + url)}"`);
      html = html.replace(/(href|src|action)="(\/[^"\/][^"]*)"/g,
        (_, attr, url) => `${attr}="/proxy?url=${encodeURIComponent(origin + url)}"`);

      const navBar = `
<style>
  #__proxy_nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
    background: #0f0f1a; color: white; padding: 8px 12px;
    display: flex; align-items: center; gap: 8px; font-family: sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
  }
  #__proxy_nav input {
    flex: 1; padding: 7px 12px; border-radius: 8px; border: 1px solid #333;
    font-size: 14px; background: #1e1e30; color: white; outline: none;
  }
  #__proxy_nav button {
    padding: 7px 16px; background: #5865f2; border: none; border-radius: 8px;
    color: white; cursor: pointer; font-size: 14px; font-weight: bold;
  }
  #__proxy_nav button:hover { background: #4752c4; }
  body { margin-top: 48px !important; }
</style>
<div id="__proxy_nav">
  <span style="font-size:18px">🌐</span>
  <input id="__proxy_url" type="text" value="${targetUrl}" placeholder="Enter a URL like https://example.com" />
  <button onclick="__proxyGo()">Go</button>
  <button onclick="history.back()" style="background:#333">← Back</button>
</div>
<script>
  function __proxyGo() {
    let url = document.getElementById('__proxy_url').value.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    window.location.href = '/proxy?url=' + encodeURIComponent(url);
  }
  document.getElementById('__proxy_url').addEventListener('keydown', e => {
    if (e.key === 'Enter') __proxyGo();
  });
</script>`;

      html = html.replace(/<body/i, navBar + "<body");
      res.send(html);
    } else {
      const buffer = await response.buffer();
      res.send(buffer);
    }
  } catch (err) {
    res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0f0f1a;color:white;">
        <h2>⚠️ Could not load that page</h2>
        <p style="color:#aaa">${err.message}</p>
        <p style="color:#aaa">Some sites block proxies. Try a different URL.</p>
        <a href="/" style="color:#5865f2;font-size:16px">← Back to home</a>
      </body></html>`);
  }
});

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
