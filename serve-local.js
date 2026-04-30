const http = require("http");
const fs = require("fs");
const path = require("path");

const host = process.argv[2] || "127.0.0.1";
const port = Number(process.argv[3] || 4173);
const root = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          send(res, 404, "Not found", "text/plain; charset=utf-8");
          return;
        }
        send(res, 500, "Server error", "text/plain; charset=utf-8");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, content, mimeTypes[ext] || "application/octet-stream");
    });
  })
  .listen(port, host, () => {
    console.log(`Serving ${root} at http://${host}:${port}`);
  });
