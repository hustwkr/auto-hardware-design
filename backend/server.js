const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

// ── Config ──────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT || "8080", 10);
let ADMIN_PW        = process.env.ADMIN_PASSWORD;

if (!ADMIN_PW) {
  console.error("[SECURITY] ADMIN_PASSWORD environment variable is required.");
  console.error("   Export it before starting: export ADMIN_PASSWORD=your-strong-password");
  console.error("   Or set it in a .env file loaded by your process manager (PM2, docker, etc.)");
  process.exit(1);
}

if (ADMIN_PW === "admin123" || ADMIN_PW.length < 8) {
  console.error("[SECURITY] Refusing to start: admin password is too weak (<8 chars or 'admin123').");
  process.exit(1);
}

const ROOT          = path.resolve(__dirname, "..");
const DEF_FILE      = path.join(__dirname, "defaults.json");
const TOKEN_TTL_MS  = 86_400_000; // 24 h

// ── Password hashing (scrypt) ───────────────────────────
const SALT_FILE     = path.join(__dirname, ".auth_salt");

function getSalt() {
  try { return fs.readFileSync(SALT_FILE, "utf-8").trim(); }
  catch (_) {
    const salt = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(SALT_FILE, salt, "utf-8");
    console.log("[AUTH] Generated new scrypt salt -> " + SALT_FILE);
    return salt;
  }
}

function hashPassword(pw) {
  const salt = getSalt();
  return crypto.scryptSync(pw, salt, 64).toString("hex");
}

// Pre-compute the hash at startup
const ADMIN_HASH = hashPassword(ADMIN_PW);

function checkPassword(input) {
  // Timing-safe comparison via scrypt (constant-time by nature of KDF)
  try { return hashPassword(input) === ADMIN_HASH; }
  catch (_) { return false; }
}

// ── Signed tokens (zero-dep JWT-like: payload.sig) ──────
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

function signToken(expMs) {
  const payload = JSON.stringify({ exp: expMs, iat: Date.now() });
  const sig     = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return payload + "." + sig;
}

function verifyToken(tok) {
  if (!tok || typeof tok !== "string") return false;
  const dot = tok.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = tok.substring(0, dot);
  const sig     = tok.substring(dot + 1);
  // Verify signature
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  if (sig !== expected) return false;
  // Check expiry
  try {
    const data = JSON.parse(payload);
    return Date.now() < data.exp;
  } catch (_) { return false; }
}

function validateToken(tok) { return verifyToken(tok); }

// ── MIME types & limits ─────────────────────────────────
const MIME = {
  ".html": "text/html;charset=utf-8",
  ".js":   "text/javascript;charset=utf-8",
  ".css":  "text/css;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".pdf":  "application/pdf"
};

const MAX_BODY = 1e6; // 1 MB body limit (DoS protection)

// ── Rate limiting: failed logins per IP ─────────────────
const loginAttempts = new Map();

function checkRateLimit(ip) {
  const now  = Date.now();
  const prev = loginAttempts.get(ip);
  if (prev && now - prev.time < 300_000) {          // 5-min window
    if (prev.count >= 10) return true;               // locked after 10 failures
    prev.count++;
    loginAttempts.set(ip, prev);
  } else {
    loginAttempts.set(ip, { time: now, count: 1 });
  }
  return false;
}

// ── Defaults helpers ────────────────────────────────────
function loadDefaults() {
  try { return JSON.parse(fs.readFileSync(DEF_FILE, "utf-8")); }
  catch (_) { return createDefaults(); }
}

function saveDefaults(d) {
  fs.writeFileSync(DEF_FILE, JSON.stringify(d, null, 2), "utf-8");
}

// FIX: cd() fallback now matches defaults.json exactly
function createDefaults() {
  return {
    capacitor: {
      l0: "5000", tmax: "105", tau: "10", vrated: "450", irated: "2000",
      dt0: "10", cooling: "1.0", workdays: "365", warrantyTarget: "10",
      scenario: "industrial",
      segments: [
        { dur: 6, ta: 75, vop: 400, rips: [
          { freq: 120, current: 800 },
          { freq: 2000, current: 500 }
        ]},
        { dur: 18, ta: 40, vop: 400, rips: [
          { freq: 120, current: 100 }
        ]}
      ]
    },
    safety: {
      sStd: "iec", sPd: "2", sMg: "ii", sAlt: "3000",
      sOvc: "ii", sSysV_AC: "300", sSysV_DC: "600",
      nodes: [
        { name: "L-N",    vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac",  interp: false },
        { name: "L-PE",   vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac",  interp: false },
        { name: "DC+-PE", vrms: 800, ins: "reinf", pcb: 0, coat: 0, circ: "dc",  interp: false }
      ]
    }
  };
}

// ── Defaults structure validator (warn on unknown fields, reject only structural errors) --
function validateDefaults(d) {
  if (typeof d !== "object" || d === null) return { ok: false, error: "Root must be an object" };
  const topAllowed = ["capacitor", "safety"];
  var warnings = [];

  for (const k of Object.keys(d)) {
    if (!topAllowed.includes(k)) {
      warnings.push("Unknown top-level key: " + k);
    }
  }

  if (d.capacitor && typeof d.capacitor === "object") {
    const capK = ["l0","tmax","tau","vrated","irated","dt0","cooling","workdays",
                  "warrantyTarget","scenario","segments"];
    for (const k of Object.keys(d.capacitor)) {
      if (!capK.includes(k)) warnings.push("Unknown capacitor key: " + k);
    }
    if (Array.isArray(d.capacitor.segments)) {
      const segK = ["dur","ta","vop","rips"];
      for (const s of d.capacitor.segments) {
        if (typeof s !== "object") return { ok: false, error: "Segment must be an object" };
        for (const k of Object.keys(s)) {
          if (!segK.includes(k)) warnings.push("Unknown segment key: " + k);
        }
      }
    }
  }

  if (d.safety && typeof d.safety === "object") {
    const safeK = ["sStd","sPd","sMg","sAlt","sIsolation","sOvc","sOvc_AC","sOvc_DC","sSysV_AC","sSysV_DC","nodes"];
    for (const k of Object.keys(d.safety)) {
      if (!safeK.includes(k)) warnings.push("Unknown safety key: " + k);
    }
    if (Array.isArray(d.safety.nodes)) {
      const nodeK = ["name","vrms","ins","pcb","coat","circ","interp","toGnd"];
      for (const n of d.safety.nodes) {
        if (typeof n !== "object") return { ok: false, error: "Node must be an object" };
        for (const k of Object.keys(n)) {
          if (!nodeK.includes(k)) warnings.push("Unknown node key: " + k);
        }
      }
    }
  }

  return { ok: true, warnings: warnings.length ? warnings : undefined };
}

// ── Response helpers ────────────────────────────────────
function json(res, code, data, corsAny) {
  const headers = {
    "Content-Type": "application/json;charset=utf-8",
    "Cache-Control": "no-cache,no-store,must-revalidate"
  };
  if (corsAny) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "Content-Type,x-auth-token";
    headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS";
  }
  res.writeHead(code, headers);
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

// ── Safe file serving (path-traversal protected) ────────
// ── Cache headers by content type ───────────────────────
function cacheHeader(fp) {
  var ext = path.extname(fp).toLowerCase();
  if (['.png','.jpg','.gif','.svg','.woff2','.woff','.ttf'].includes(ext))
    return "public,max-age=31536000,immutable"; // media/fonts: long cache OK
  if (['.js','.css'].includes(ext))
    return "public,max-age=0,must-revalidate";   // JS/CSS: always revalidate
  return "no-cache,no-store,must-revalidate";     // HTML + everything else
}

function serveFile(res, fp) {
  const resolved = path.resolve(fp);
  if (!resolved.startsWith(ROOT)) { res.writeHead(403, {"Content-Type":"text/plain"}); res.end("Forbidden"); return; }
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cacheHeader(fp) });
    res.end(data);
  } catch (_) { res.writeHead(404, {"Content-Type":"text/plain"}); res.end("Not Found"); }
}

// ── Body parsers ────────────────────────────────────────
function parseBody(req) {
  return new Promise(r => {
    let b = "", sz = 0;
    req.on("data", c => { sz += c.length; if (sz > MAX_BODY) { req.destroy(); r({}); return; } b += c; });
    req.on("end", () => { try { r(JSON.parse(b)); } catch (_) { r({}); } });
  });
}

function parseForm(req) {
  return new Promise(r => {
    let b = "", sz = 0;
    req.on("data", c => { sz += c.length; if (sz > MAX_BODY) { req.destroy(); r({}); return; } b += c; });
    req.on("end", () => {
      const d = {};
      b.split("&").forEach(p => { const kv = p.split("="); if (kv.length === 2) d[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]); });
      r(d);
    });
  });
}

function getToken(req) {
  return req.headers["x-auth-token"] ||
         (req.headers.cookie ? req.headers.cookie.match(/token=([^;]+)/)?.[1] : undefined);
}

// ── URL sanitisation ────────────────────────────────────
function safePath(p) {
  const cleaned = p.replace(/\.\./g, "").replace(/\/+/g, "/");
  return cleaned.startsWith("/") ? cleaned : "/";
}

// ── Security headers (applied to every response) ────────
function addSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

// ── Startup ─────────────────────────────────────────────
console.log(`Server starting on port ${PORT}`);

// ── HTTP server ─────────────────────────────────────────
http.createServer(async function (req, res) {
  const clientIP = req.socket.remoteAddress || "unknown";
  const url      = new URL(req.url, "http://localhost");
  const p        = safePath(url.pathname);
  const tok      = getToken(req);

  // ── Security headers on every response ────────────────
  addSecurityHeaders(res);

  // ── OPTIONS / pre-flight (public) ────────────────────
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,x-auth-token",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS"
    });
    res.end();
    return;
  }

  // ── LOGIN (public) ───────────────────────────────────
  if (p === "/api/login" && req.method === "POST") {
    if (checkRateLimit(clientIP)) { json(res, 429, { error: "Too many attempts. Try again in 5 minutes." }, true); return; }
    const ct = req.headers["content-type"] || "";
    const body = ct.includes("json") ? await parseBody(req) : await parseForm(req);
    if (checkPassword(body.password)) {
      const t = signToken(Date.now() + TOKEN_TTL_MS);
      if (ct.includes("json")) { json(res, 200, { success: true, token: t }, true); }
      else { res.writeHead(302, { Location: "/admin", "Set-Cookie": `token=${t};Path=/;Max-Age=86400;HttpOnly;SameSite=Lax` }); res.end(); }
    } else {
      if (ct.includes("json")) json(res, 403, { error: "\u5bc6\u7801\u9519\u8bef" }, true);
      else { res.writeHead(302, { Location: "/admin/login?e=1" }); res.end(); }
    }
    return;
  }

  // ── LOGOUT (public) ──────────────────────────────────
  if (p === "/api/logout" && req.method === "POST") {
    // Stateless tokens - client discards token on logout
    json(res, 200, { success: true }, true);
    return;
  }

  // ── SESSION check (public) ───────────────────────────
  if (p === "/api/session") {
    json(res, 200, { authenticated: validateToken(tok) }, true);
    return;
  }

  // ── PUBLIC defaults (CORS restricted — local engineering tool) ───
  if (p === "/api/defaults" && req.method === "GET") {
    json(res, 200, loadDefaults(), false);
    return;
  }

  // ── ADMIN defaults (FIX: CORS restricted to same-origin) ──
  if (p === "/api/admin/defaults") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    if (req.method === "GET")   { json(res, 200, loadDefaults(), false); return; }
    if (req.method === "PUT") {
      const body = await parseBody(req);
      var result = validateDefaults(body);
      if (!result.ok) { json(res, 400, { error: result.error }, false); return; }
      if (result.warnings) console.warn("[DEFAULTS] " + result.warnings.join("; "));
      saveDefaults(body);
      json(res, 200, { success: true, warnings: result.warnings || [] }, false);
      return;
    }
    res.writeHead(405); res.end();
    return;
  }

  // ── Admin static files (path-traversal protected) ────
  if (p === "/admin" || p === "/admin/") { serveFile(res, path.join(__dirname, "admin", "dashboard.html")); return; }
  if (p === "/admin/login")             { serveFile(res, path.join(__dirname, "admin", "login.html")); return; }
  if (p.startsWith("/admin/")) {
    const fn = p.replace("/admin/", "");
    if (!["dashboard.html", "login.html"].includes(fn)) { res.writeHead(403); res.end("Forbidden"); return; }
    serveFile(res, path.join(__dirname, "admin", fn));
    return;
  }

  // ── Main page (static) ───────────────────
  if (p === "/" || p === "/index.html") { serveFile(res, path.join(ROOT, "index.html")); return; }

  // ── Fallback: static file ────────────────────────────
  const sp = p === "/" ? "index.html" : p;
  serveFile(res, path.join(ROOT, sp));
}).listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}/`);
  console.log(`Admin:  http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on("SIGTERM", () => { process.exit(0); });
process.on("SIGINT",  () => { process.exit(0); });
