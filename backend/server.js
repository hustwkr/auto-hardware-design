const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

// ── Config ──────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT || "8080", 10);
const ADMIN_PW      = process.env.ADMIN_PASSWORD || "admin123";
const ROOT          = path.resolve(__dirname, "..");
const DEF_FILE      = path.join(__dirname, "defaults.json");
const TOKEN_TTL_MS  = 86_400_000; // 24 h

// ── Token store: Map<tokenHex, expiryMs> + periodic GC   ──
const tokens = new Map();

function validateToken(tok) {
  if (!tok) return false;
  const exp = tokens.get(tok);
  if (exp === undefined || Date.now() >= exp) { tokens.delete(tok); return false; }
  return true;
}

// Clean expired tokens every hour
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  let n = 0;
  for (const [t, e] of tokens) { if (now >= e) { tokens.delete(t); n++; } }
  if (n > 0) console.log(`[CLEANUP] ${n} expired token(s)`);
}, 3_600_000);

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
      l0: "5000", tmax: "105", vrated: "450", irated: "2000",
      dt0: "10", cooling: "1.0", workdays: "365", warrantyTarget: "10",
      scenario: "industrial",
      segments: [
        { dur: 6, ta: 75, vop: 400, rips: [
          { freq: 120, unit: "Hz", current: 800 },
          { freq: 2,   unit: "kHz", current: 500 }
        ]},
        { dur: 18, ta: 40, vop: 400, rips: [
          { freq: 120, unit: "Hz", current: 100 }
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

// ── Defaults structure validator ────────────────────────
function validateDefaults(d) {
  if (typeof d !== "object" || d === null) return false;
  const topAllowed = ["capacitor", "safety"];
  for (const k of Object.keys(d)) { if (!topAllowed.includes(k)) return false; }

  if (d.capacitor && typeof d.capacitor === "object") {
    const capK = ["l0","tmax","vrated","irated","dt0","cooling","workdays",
                  "warrantyTarget","scenario","segments"];
    for (const k of Object.keys(d.capacitor)) { if (!capK.includes(k)) return false; }
    if (Array.isArray(d.capacitor.segments)) {
      const segK = ["dur","ta","vop","rips"];
      for (const s of d.capacitor.segments) {
        if (typeof s !== "object") return false;
        for (const k of Object.keys(s)) { if (!segK.includes(k)) return false; }
      }
    }
  }

  if (d.safety && typeof d.safety === "object") {
    const safeK = ["sStd","sPd","sMg","sAlt","sOvc","sSysV_AC","sSysV_DC","nodes"];
    for (const k of Object.keys(d.safety)) { if (!safeK.includes(k)) return false; }
    if (Array.isArray(d.safety.nodes)) {
      const nodeK = ["name","vrms","ins","pcb","coat","circ","interp"];
      for (const n of d.safety.nodes) {
        if (typeof n !== "object") return false;
        for (const k of Object.keys(n)) { if (!nodeK.includes(k)) return false; }
      }
    }
  }
  return true;
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
function serveFile(res, fp) {
  const resolved = path.resolve(fp);
  if (!resolved.startsWith(ROOT)) { res.writeHead(403, {"Content-Type":"text/plain"}); res.end("Forbidden"); return; }
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache,no-store,must-revalidate" });
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

// ── Startup log (FIX: no password in plaintext) ────────
console.log(`Server starting on port ${PORT}`);
if (ADMIN_PW === "admin123") {
  console.warn("[SECURITY] Using default admin password! Set ADMIN_PASSWORD env var.");
}

// ── HTTP server ─────────────────────────────────────────
http.createServer(async function (req, res) {
  const clientIP = req.socket.remoteAddress || "unknown";
  const url      = new URL(req.url, "http://localhost");
  const p        = safePath(url.pathname);
  const tok      = getToken(req);

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
    if (body.password === ADMIN_PW) {
      const t = crypto.randomBytes(16).toString("hex");
      tokens.set(t, Date.now() + TOKEN_TTL_MS);  // store with expiry
      if (ct.includes("json")) { json(res, 200, { success: true, token: t }, true); }
      else { res.writeHead(302, { Location: "/admin", "Set-Cookie": `token=${t};Path=/;Max-Age=86400` }); res.end(); }
    } else {
      if (ct.includes("json")) json(res, 403, { error: "\u5bc6\u7801\u9519\u8bef" }, true);
      else { res.writeHead(302, { Location: "/admin/login?e=1" }); res.end(); }
    }
    return;
  }

  // ── LOGOUT (public) ──────────────────────────────────
  if (p === "/api/logout" && req.method === "POST") {
    tokens.delete(tok);
    json(res, 200, { success: true }, true);
    return;
  }

  // ── SESSION check (public) ───────────────────────────
  if (p === "/api/session") {
    json(res, 200, { authenticated: validateToken(tok) }, true);
    return;
  }

  // ── PUBLIC defaults (CORS wildcard OK) ───────────────
  if (p === "/api/defaults" && req.method === "GET") {
    json(res, 200, loadDefaults(), true);
    return;
  }

  // ── ADMIN defaults (FIX: CORS restricted to same-origin) ──
  if (p === "/api/admin/defaults") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    if (req.method === "GET")   { json(res, 200, loadDefaults(), false); return; }
    if (req.method === "PUT") {
      const body = await parseBody(req);
      if (!validateDefaults(body)) { json(res, 400, { error: "Invalid defaults structure" }, false); return; }
      saveDefaults(body);
      json(res, 200, { success: true }, false);
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

  // ── Main page (inject defaults JSON) ─────────────────
  if (p === "/" || p === "/index.html") {
    const fp = path.join(ROOT, "index.html");
    try {
      let html = fs.readFileSync(fp, "utf-8");
      html = html.replace("/*_DEFAULTS_JSON_*/", JSON.stringify(loadDefaults()));
      res.writeHead(200, { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-cache,no-store,must-revalidate" });
      res.end(html);
    } catch (_) { serveFile(res, fp); }
    return;
  }

  // ── Fallback: static file ────────────────────────────
  const sp = p === "/" ? "index.html" : p;
  serveFile(res, path.join(ROOT, sp));
}).listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}/`);
  console.log(`Admin:  http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on("SIGTERM", () => { clearInterval(cleanupTimer); process.exit(0); });
process.on("SIGINT",  () => { clearInterval(cleanupTimer); process.exit(0); });
