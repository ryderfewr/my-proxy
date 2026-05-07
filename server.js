const express = require("express");
const http = require("http");
const path = require("path");
const { WispServer } = require("wisp-server-node");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Serve Ultraviolet's built-in files (the actual proxy engine)
const uvPath = path.dirname(require.resolve("@titaniumnetwork-dev/ultraviolet"));
app.use("/uv/", express.static(path.join(uvPath, "dist")));

// Serve our public folder
app.use(express.static(path.join(__dirname, "public")));

// Wisp handles WebSocket connections (needed for sites that use websockets)
const wispServer = new WispServer({ logLevel: "NONE" });
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) {
    wispServer.routeRequest(req, socket, head);
  }
});

server.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
