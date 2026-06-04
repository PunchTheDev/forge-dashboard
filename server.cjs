// Zero-dependency static SPA server for ./dist with on-the-fly brotli + gzip.
//
// Why this exists: `pm2 serve dist 8080 --spa` uses serve-handler, which does
// not compress responses and has no flag to enable it. Every cold landing was
// transferring ~370 KB raw of JS+CSS that brotli'd to ~100 KB. This file is the
// drop-in replacement: bare Node http + zlib, no npm deps to install on the
// production box.
//
// Behavior:
//   - Reads files from ./dist (relative to this file).
//   - Picks brotli if Accept-Encoding includes "br", else gzip if it includes
//     "gzip", else identity. Caches each (path, encoding) pair in memory once
//     compressed; the dashboard build is small (~600 KB total) so the working
//     set is trivial.
//   - Sends `Cache-Control: public, max-age=31536000, immutable` for
//     fingerprinted /assets/* and `no-cache` for everything else (index.html,
//     robots.txt, sitemap.xml).
//   - SPA fallback: any non-file path with an Accept header that wants HTML
//     returns dist/index.html (200).
//   - Sets CORS headers identical to the old serve-handler config so nothing
//     downstream breaks: `Access-Control-Allow-Origin: *`,
//     `Access-Control-Allow-Methods: GET`.

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = parseInt(process.env.PORT || "8080", 10);
const ROOT = path.join(__dirname, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

// Already-compressed binary types — skip on-the-fly compression.
const SKIP_COMPRESS_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".ttf", ".wasm", ".ico"]);

// In-memory cache: key = `${absPath}::${encoding}`, value = Buffer.
const cache = new Map();

function pickEncoding(acceptEncoding, ext) {
  if (SKIP_COMPRESS_EXT.has(ext)) return "identity";
  if (!acceptEncoding) return "identity";
  const ae = acceptEncoding.toLowerCase();
  if (ae.includes("br")) return "br";
  if (ae.includes("gzip")) return "gzip";
  return "identity";
}

function compress(buf, encoding) {
  if (encoding === "br") {
    return zlib.brotliCompressSync(buf, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
      },
    });
  }
  if (encoding === "gzip") {
    return zlib.gzipSync(buf, { level: 9 });
  }
  return buf;
}

function getCompressed(absPath, encoding) {
  const key = `${absPath}::${encoding}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = fs.readFileSync(absPath);
  const out = compress(raw, encoding);
  cache.set(key, out);
  return out;
}

function safeJoin(root, urlPath) {
  // Strip query/hash; resolve; ensure result stays under root.
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const resolved = path.normalize(path.join(root, clean));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body);
  else res.end();
}

function serveFile(req, res, absPath) {
  let stat;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(absPath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const isAsset = absPath.includes(`${path.sep}assets${path.sep}`);
  const cacheControl = isAsset ? "public, max-age=31536000, immutable" : "no-cache";

  const encoding = pickEncoding(req.headers["accept-encoding"], ext);
  const body = encoding === "identity" ? fs.readFileSync(absPath) : getCompressed(absPath, encoding);

  const headers = {
    "Content-Type": mime,
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    Vary: "Accept-Encoding",
  };
  if (encoding !== "identity") headers["Content-Encoding"] = encoding;

  send(res, 200, headers, body);
  return true;
}

function serveSpaIndex(req, res) {
  const indexPath = path.join(ROOT, "index.html");
  return serveFile(req, res, indexPath);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { Allow: "GET, HEAD" }, "Method Not Allowed");
  }

  const absPath = safeJoin(ROOT, req.url || "/");
  if (!absPath) return send(res, 400, {}, "Bad Request");

  // Direct file hit
  if (serveFile(req, res, absPath)) return;

  // Directory request — try index.html within it
  try {
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      if (serveFile(req, res, path.join(absPath, "index.html"))) return;
    }
  } catch {
    // fall through to SPA fallback
  }

  // SPA fallback for client-side routes (no extension OR Accept wants HTML)
  const accept = req.headers.accept || "";
  const hasExt = path.extname(req.url || "").length > 0;
  if (!hasExt || accept.includes("text/html")) {
    if (serveSpaIndex(req, res)) return;
  }

  send(res, 404, { "Content-Type": "text/plain" }, "Not Found");
});

server.listen(PORT, () => {
  console.log(`forge-dashboard server listening on :${PORT} (root=${ROOT})`);
});
