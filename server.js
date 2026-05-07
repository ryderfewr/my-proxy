const express = require("express");
const http = require("http");
const path = require("path");
const wisp = require("wisp-server-node");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const uvDist = path.join(__dirname, "node_modules/@titaniumnetwork-dev/ultraviolet/dist");
const bareMuxDist = path.join(__dirname, "node_modules/@mercuryworkshop/bare-mux/dist");
const epoxyDist = path.join(__dirname, "node_modules/@mercuryworkshop/epoxy-transport/dist");

// Serve the root service worker with proper scope header
app.get("/sw.js", (req, res) => {
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, "public/sw.js"));
});

// Serve our custom uv.config.js BEFORE the dist version so it takes priority
app.get("/uv/uv.config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, "public/uv/uv.config.js"));
});

// Serve Ultraviolet's dist files (bundle, sw, handler, client)
app.use("/uv/", express.static(uvDist));

// Serve bare-mux worker (SharedWorker for transport management)
app.use("/bare-mux/", express.static(bareMuxDist));

// Serve epoxy transport (WASM-based wisp transport)
app.use("/epoxy/", express.static(epoxyDist));

// Serve our public folder
app.use(express.static(path.join(__dirname, "public")));

// Wisp handles WebSocket connections (needed for sites that use websockets)
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on http://0.0.0.0:${PORT}`);
});
