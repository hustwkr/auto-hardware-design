const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

// ── Config ──────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT || "8080", 10);
const ROOT          = path.resolve(__dirname, "..");
const DEF_FILE      = path.join(__dirname, "defaults.json");
const TOKEN_TTL_MS  = 86_400_000; // 24 h
const ADMIN_HASH_FILE = path.join(__dirname, ".admin_hash");

// ── Admin hash management (single file: salt:hash) ─────────
let ADMIN_HASH = null; // in-memory cache

function loadAdminHash() {
  try {
    const data = fs.readFileSync(ADMIN_HASH_FILE, "utf-8").trim();
    const parts = data.split(":");
    if (parts.length === 2 && parts[0].length === 32 && parts[1].length === 128) {
      ADMIN_HASH = { salt: parts[0], hash: parts[1] };
      return true;
    }
  } catch (_) {}
  return false;
}

function saveAdminHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  fs.writeFileSync(ADMIN_HASH_FILE, salt + ":" + hash, "utf-8");
  ADMIN_HASH = { salt, hash };
  console.log("[AUTH] Admin password set, hash saved to " + ADMIN_HASH_FILE);
}

function checkPassword(input) {
  if (!ADMIN_HASH) return false;
  try {
    const inputHash = crypto.scryptSync(input, ADMIN_HASH.salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(ADMIN_HASH.hash, "hex"));
  } catch (_) { return false; }
}

// ── Signed tokens (zero-dep JWT-like: payload.sig) ──────
const TOKEN_SECRET_FILE = path.join(__dirname, ".token_secret");
let TOKEN_SECRET = process.env.TOKEN_SECRET;
if (!TOKEN_SECRET) {
  try { TOKEN_SECRET = fs.readFileSync(TOKEN_SECRET_FILE, "utf-8").trim(); }
  catch (_) {
    TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(TOKEN_SECRET_FILE, TOKEN_SECRET, "utf-8");
    console.log("[AUTH] Generated new token secret -> " + TOKEN_SECRET_FILE);
  }
}

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
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch (_) { return false; }
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
  if (prev && now - prev.time < 300_000) {
    if (prev.count >= 10) return true;
    prev.count++;
    loginAttempts.set(ip, prev);
  } else {
    loginAttempts.set(ip, { time: now, count: 1 });
  }
  return false;
}

setInterval(() => {
  const cutoff = Date.now() - 300_000;
  for (const [ip, entry] of loginAttempts) {
    if (entry.time < cutoff) loginAttempts.delete(ip);
  }
}, 600_000).unref();

// ── Defaults helpers ────────────────────────────────────
function loadDefaults() {
  try { return JSON.parse(fs.readFileSync(DEF_FILE, "utf-8")); }
  catch (_) { return createDefaults(); }
}

function saveDefaults(d) {
  fs.writeFileSync(DEF_FILE, JSON.stringify(d, null, 2), "utf-8");
}

function validateDefaults(d) {
  if (!d || typeof d !== "object") return { ok: false, error: "Body must be a JSON object" };
  var warnings = [];
  // Validate capacitor section
  if (d.capacitor) {
    var capFields = ["l0","tmax","vrated","irated","dt0","workdays","warrantyTarget","kva","kvb","cooling","scenario","capType"];
    capFields.forEach(function(k) {
      if (d.capacitor[k] === undefined) warnings.push("capacitor." + k + " is missing");
    });
    if (d.capacitor.segments && !Array.isArray(d.capacitor.segments)) warnings.push("capacitor.segments must be an array");
  } else {
    warnings.push("capacitor section is missing");
  }
  // Validate safety section
  if (d.safety) {
    var safFields = ["sStd","sPd","sMg","sAlt","sIsolation","sOvc_AC","sOvc_DC","sSysV_AC","sSysV_DC"];
    safFields.forEach(function(k) {
      if (d.safety[k] === undefined) warnings.push("safety." + k + " is missing");
    });
    if (d.safety.nodes && !Array.isArray(d.safety.nodes)) warnings.push("safety.nodes must be an array");
  } else {
    warnings.push("safety section is missing");
  }
  return { ok: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// ── Feedback helpers ───────────────────────────────────
const FEEDBACK_FILE = path.join(__dirname, "feedback.json");

function loadFeedback() {
  try { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8")); }
  catch (_) { return []; }
}

function saveFeedback(feedback) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), "utf-8");
}

function addFeedback(name, title, content) {
  var feedback = loadFeedback();
  var entry = {
    id: Date.now() + '-' + crypto.randomBytes(8).toString('hex'),
    name: name,
    title: title,
    content: content,
    timestamp: new Date().toISOString(),
    read: false
  };
  feedback.push(entry);
  saveFeedback(feedback);
  return entry;
}

// ── URL sanitisation ────────────────────────────────────
function safePath(p) {
  const cleaned = p.replace(/\.\./g, "").replace(/\/+/g, "/");
  return cleaned.startsWith("/") ? cleaned : "/";
}

// ── Security headers (applied to every response) ────────
function addSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
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

function parseBody(req) {
  return new Promise(r => {
    const chunks = [];
    let sz = 0;
    req.on("data", c => { sz += c.length; if (sz > MAX_BODY) { req.destroy(); r({}); return; } chunks.push(c); });
    req.on("end", () => { try { r(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); } catch (_) { r({}); } });
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

// ── Startup ─────────────────────────────────────────────
if (!loadAdminHash()) {
  console.log("[AUTH] No admin password configured. First-run setup required.");
  console.log("       Go to http://localhost:" + PORT + "/admin/setup to set a password.");
}
console.log(`Server starting on port ${PORT}`);

// ── HTTP server ─────────────────────────────────────────
http.createServer(async function (req, res) {
  const clientIP = req.socket.remoteAddress || "unknown";
  const url      = new URL(req.url, "http://localhost");
  const p        = safePath(url.pathname);
  const tok      = getToken(req);

  addSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,x-auth-token", "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS" });
    res.end(); return;
  }

  // ── Admin setup (public, first-run only) ─────────────
  if (p === "/api/admin/setup" && req.method === "POST") {
    if (ADMIN_HASH) { json(res, 400, { error: "Password already set" }, false); return; }
    const body = await parseBody(req);
    const pw = body.password;
    if (!pw || pw.length < 8) { json(res, 400, { error: "Password must be at least 8 characters" }, false); return; }
    saveAdminHash(pw);
    json(res, 200, { success: true }, false);
    return;
  }

  // ── Change password (admin only) ─────────────────────
  if (p === "/api/admin/change-password" && req.method === "POST") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    const body = await parseBody(req);
    if (!checkPassword(body.oldPassword)) { json(res, 403, { error: "Old password is incorrect" }, false); return; }
    if (!body.newPassword || body.newPassword.length < 8) { json(res, 400, { error: "New password must be at least 8 characters" }, false); return; }
    saveAdminHash(body.newPassword);
    json(res, 200, { success: true }, false);
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
      if (ct.includes("json")) json(res, 403, { error: "密码错误" }, true);
      else { res.writeHead(302, { Location: "/admin/login?e=1" }); res.end(); }
    }
    return;
  }

  // ── LOGOUT (public) ──────────────────────────────────
  if (p === "/api/logout" && req.method === "POST") {
    json(res, 200, { success: true }, true); return;
  }

  // ── SESSION check (public) ───────────────────────────
  if (p === "/api/session") {
    json(res, 200, { authenticated: validateToken(tok) }, true); return;
  }

  // ── PUBLIC defaults ──────────────────────────────────
  if (p === "/api/defaults" && req.method === "GET") {
    json(res, 200, loadDefaults(), false); return;
  }

  // ── Feedback submission (public) ────────────────────
  if (p === "/api/feedback" && req.method === "POST") {
    const body = await parseBody(req);
    const name = (body.name || "").replace(/[\r\n]/g, "").trim();
    const title = (body.title || "").replace(/[\r\n]/g, "").trim();
    const content = body.content || "";
    if (!name || !title || !content) { json(res, 400, { error: "Missing required fields (name, title, content)" }, true); return; }
    const entry = addFeedback(name, title, content);
    console.log(`[FEEDBACK] New feedback from "${name}": "${title}" (ID: ${entry.id})`);
    json(res, 201, { success: true, id: entry.id }, true); return;
  }

  // ── Feedback list / update (admin only) ──────────────
  if (p === "/api/feedback" && req.method === "GET") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    json(res, 200, loadFeedback(), false); return;
  }
  if (p === "/api/feedback" && req.method === "PUT") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    const body = await parseBody(req);
    var feedback = loadFeedback();
    var found = false;
    feedback.forEach(function(fb) { if (fb.id === body.id) { fb.read = body.read; found = true; } });
    if (found) { saveFeedback(feedback); json(res, 200, { success: true }, false); }
    else json(res, 404, { error: "Feedback not found" }, false);
    return;
  }

  // ── ADMIN defaults ──────────────────────────────────
  if (p === "/api/admin/defaults") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    if (req.method === "GET")   { json(res, 200, loadDefaults(), false); return; }
    if (req.method === "PUT") {
      const body = await parseBody(req);
      var result = validateDefaults(body);
      if (!result.ok) { json(res, 400, { error: result.error }, false); return; }
      if (result.warnings) console.warn("[DEFAULTS] " + result.warnings.join("; "));
      saveDefaults(body);
      json(res, 200, { success: true, warnings: result.warnings || [] }, false); return;
    }
    res.writeHead(405); res.end(); return;
  }

  // ── Admin static files (path-traversal protected) ────
  if (p === "/admin" || p === "/admin/") {
    if (!ADMIN_HASH) { res.writeHead(302, { Location: "/admin/setup" }); res.end(); return; }
    serveFile(res, path.join(__dirname, "admin", "dashboard.html")); return;
  }
  if (p === "/admin/login") {
    if (!ADMIN_HASH) { res.writeHead(302, { Location: "/admin/setup" }); res.end(); return; }
    serveFile(res, path.join(__dirname, "admin", "login.html")); return;
  }
  if (p.startsWith("/admin/")) {
    var fn = p.replace("/admin/", "");
    if (!fn.endsWith(".html")) fn += ".html";
    if (!["dashboard.html", "login.html", "setup.html", "change-password.html"].includes(fn)) { res.writeHead(403); res.end("Forbidden"); return; }
    serveFile(res, path.join(__dirname, "admin", fn));
    return;
  }

  // ── Main page (static) ───────────────────
  if (p === "/" || p === "/index.html") { serveFile(res, path.join(ROOT, "index.html")); return; }

  // ── Fallback: static file (whitelist only safe paths) ─
  const sp = p === "/" ? "index.html" : p;
  const safeSp = sp.replace(/\\/g, "/").replace(/^\/+/, "");
  const ALLOWED_PREFIXES = ["css/", "js/"];
  const ALLOWED_FILES = ["index.html", "hwlogo.png", "sw.js"];
  const isAllowed = ALLOWED_FILES.includes(safeSp) || ALLOWED_PREFIXES.some(prefix => safeSp.startsWith(prefix));
  if (!isAllowed) { res.writeHead(403, {"Content-Type":"text/plain"}); res.end("Forbidden"); return; }
  serveFile(res, path.join(ROOT, sp));
}).listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}/`);
  console.log(`Admin:  http://localhost:${PORT}/admin`);
});

process.on("SIGTERM", () => { process.exit(0); });
process.on("SIGINT",  () => { process.exit(0); });