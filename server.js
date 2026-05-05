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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";

    // Strip headers that block iframe embedding
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("X-Frame-Options", "ALLOWALL");
    res.set("Content-Security-Policy", "");

    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Remove any CSP or X-Frame-Options meta tags from the HTML itself
      html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, "");

      // Add base tag so relative resources (images, CSS, JS) load correctly
      let origin = "";
      try { origin = new URL(targetUrl).origin; } catch {}
      const baseTag = `<base href="${origin}/">`;
      html = html.replace(/<head>/i, `<head>${baseTag}`);

      res.send(html);
    } else {
      const buffer = await response.buffer();
      res.send(buffer);
    }

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send(`<p>Error: ${err.message}</p>`);
  }
});

app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
