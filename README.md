# My Web Proxy

A simple self-hosted web proxy. Browse any site through your own server.

## Deploy FREE on Render.com (10 minutes)

1. **Create a GitHub account** at https://github.com if you don't have one
2. **Create a new repository** called `my-proxy`, upload all these files into it
3. **Go to https://render.com** and sign up for free
4. Click **"New +"** → **"Web Service"**
5. Connect your GitHub and select your `my-proxy` repo
6. Fill in:
   - **Name**: my-proxy (anything you want)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
7. Click **"Create Web Service"**
8. Wait ~2 minutes — Render gives you a free URL like `https://my-proxy-xxxx.onrender.com`
9. Open that URL and you're done! 🎉

## Run locally (on your own computer)

Make sure you have Node.js installed (https://nodejs.org):

```bash
npm install
node server.js
```

Then open http://localhost:3000 in your browser.

## Files

- `server.js` — the proxy backend
- `public/index.html` — the homepage UI
- `package.json` — dependencies
