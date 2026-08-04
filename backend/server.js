const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

// ── Config ──────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT || "8080", 10);

// Read ADMIN_PASSWORD: env var > .env file > error
let ADMIN_PW        = process.env.ADMIN_PASSWORD;
if (!ADMIN_PW) {
  try {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const match = envContent.match(/^ADMIN_PASSWORD\s*=\s*(.+)$/m);
      if (match) ADMIN_PW = match[1].trim();
    }
  } catch (_) {}
}

if (!ADMIN_PW) {
  console.error("[SECURITY] No admin password found.");
  console.error("   Option 1: export ADMIN_PASSWORD=your-strong-password");
  console.error("   Option 2: create backend/.env with ADMIN_PASSWORD=your-strong-password");
  process.exit(1);
}

const WEAK_PASSWORDS = ["admin123", "password", "12345678", "admin", "letmein", "qwerty123", "changeme"];
if (WEAK_PASSWORDS.includes(ADMIN_PW.toLowerCase()) || ADMIN_PW.length < 12) {
  console.error("[SECURITY] Refusing to start: admin password is too weak (<12 chars or common password).");
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
  try {
    const inputHash = hashPassword(input);
    return crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(ADMIN_HASH, "hex"));
  }
  catch (_) { return false; }
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
  // Verify signature (timing-safe)
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch (_) { return false; }
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

// ── Periodic cleanup of expired rate-limit entries (prevent memory leak) ──
setInterval(() => {
  const cutoff = Date.now() - 300_000;
  for (const [ip, entry] of loginAttempts) {
    if (entry.time < cutoff) loginAttempts.delete(ip);
  }
}, 600_000).unref(); // every 10 min, don't keep process alive

// ── Defaults helpers ────────────────────────────────────
function loadDefaults() {
  try { return JSON.parse(fs.readFileSync(DEF_FILE, "utf-8")); }
  catch (_) { return createDefaults(); }
}

function saveDefaults(d) {
  fs.writeFileSync(DEF_FILE, JSON.stringify(d, null, 2), "utf-8");
}

// ── Email config helpers ─────────────────────────────────
function loadEmailConfig() {
  const fileCfg = (() => { try { return JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, "utf-8")); } catch (_) { return {}; } })();
  return {
    smtp: {
      host: process.env.SMTP_HOST || fileCfg.smtp?.host || "",
      port: parseInt(process.env.SMTP_PORT || fileCfg.smtp?.port || "587", 10),
      secure: (process.env.SMTP_SECURE || String(fileCfg.smtp?.secure || false)) === "true",
      auth: {
        user: process.env.SMTP_USER || fileCfg.smtp?.auth?.user || "",
        pass: process.env.SMTP_PASS || fileCfg.smtp?.auth?.pass || ""
      }
    },
    from: process.env.SMTP_FROM || fileCfg.from || "",
    to: process.env.SMTP_TO || fileCfg.to || ""
  };
}

function saveEmailConfig(d) {
  fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(d, null, 2), "utf-8");
}

const EMAIL_CONFIG_FILE = path.join(__dirname, "email.config.json");

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

// ── Email notification for feedback ────────────────────
const net = require('net');
const tls = require('tls');

// Quoted-Printable encode for MIME
function quotedPrintableEncode(str) {
  const encoded = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 128) {
      encoded.push(str.charAt(i));
    } else {
      // Encode non-ASCII characters as =XX format
      const buf = Buffer.from(str.substring(i, i + 1), 'utf-8');
      for (let j = 0; j < buf.length; j++) {
        encoded.push('=' + buf[j].toString(16).toUpperCase());
      }
    }
  }
  return encoded.join('');
}

// Base64 encode for MIME header
function mimeBase64Encode(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

// Encode header for non-ASCII characters
function encodeMimeHeader(str) {
  if (/^[\x00-\x7F]*$/.test(str)) {
    return str;
  }
  const encoded = mimeBase64Encode(str);
  return `=?UTF-8?B?${encoded}?=`;
}

// HTML escape for email content (simple approach)
function htmlEscape(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendFeedbackEmail(feedback) {
  const config = loadEmailConfig();
  const recipient = process.env.FEEDBACK_EMAIL || 'wangkerou@solaxpower.com';
  const subject = encodeMimeHeader(`[Feedback] ${feedback.title}`);
  const body = `
New feedback received:

From: ${htmlEscape(feedback.name)}
Title: ${htmlEscape(feedback.title)}
Time: ${htmlEscape(feedback.timestamp)}
ID: ${htmlEscape(feedback.id)}

Content:
${htmlEscape(feedback.content)}
`;

  // If no email config, log to console
  if (!config?.smtp?.host || config.smtp.host === 'smtp.example.com') {
    console.log(`[EMAIL] No SMTP configured. Email content logged:`);
    console.log(`To: ${recipient}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    return false;
  }

  try {
    // Send via SMTP
    await sendSmtpEmail(config.smtp, config.from || config.smtp.auth.user, recipient, subject, body, feedback);
    console.log(`[EMAIL] Notification sent to ${recipient}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] SMTP failed: ${error.message}`);
    return false;
  }
}

function sendSmtpEmail(smtpConfig, from, to, subject, body, feedback) {
  return new Promise((resolve, reject) => {
    const port = smtpConfig.port || 587;
    const host = smtpConfig.host;
    const useTLS = port === 465;

    function onConnect(socket) {
      let responseBuffer = '';
      let currentResolve = null;
      let currentReject = null;

      function onData(data) {
        responseBuffer += data.toString();
        // Check if we have a complete response (ends with space or newline after 3-digit code)
        if (responseBuffer.match(/\r\n$/) || (responseBuffer.length >= 4 && responseBuffer.charAt(3) === ' ')) {
          const code = parseInt(responseBuffer.substring(0, 3));
          const response = responseBuffer;
          responseBuffer = '';
          if (currentResolve) {
            const cb = currentResolve;
            currentResolve = null;
            cb(code, response);
          }
        }
      }

      function sendCommand(cmd) {
        return new Promise((res, rej) => {
          currentResolve = res;
          currentReject = rej;
          if (cmd) {
            socket.write(cmd + '\r\n');
          }
        });
      }

      socket.on('data', onData);
      socket.on('error', (err) => {
        if (currentReject) currentReject(err);
      });

      (async () => {
        try {
          // Wait for greeting
          const [code] = await new Promise((res) => {
            currentResolve = (c, r) => res([c, r]);
            // Timeout for greeting
            setTimeout(() => res([0, 'timeout']), 5000);
          });

          if (code !== 220) {
            throw new Error(`SMTP greeting failed: ${code}`);
          }

          // EHLO
          const ehloCode = await sendCommand('EHLO localhost');
          if (ehloCode !== 250) {
            throw new Error(`EHLO failed: ${ehloCode}`);
          }

          // If port 465, we're already in TLS (from tls.connect options)
          // If port 587, we need STARTTLS
          if (!useTLS) {
            const starttlsCode = await sendCommand('STARTTLS');
            if (starttlsCode !== 220) {
              throw new Error(`STARTTLS failed: ${starttlsCode}`);
            }

            // Upgrade to TLS
            const tlsSocket = tls.connect({
              socket
            }, () => {
              // Continue with TLS connection
            });

            // Replace socket event handlers for TLS
            socket.removeListener('data', onData);
            socket = tlsSocket;
            socket.on('data', onData);
            socket.on('error', (err) => {
              if (currentReject) currentReject(err);
            });

            // Wait for TLS upgrade
            await new Promise((res) => setTimeout(res, 100));

            // EHLO again after TLS
            const ehloCode2 = await sendCommand('EHLO localhost');
            if (ehloCode2 !== 250) {
              throw new Error(`EHLO after TLS failed: ${ehloCode2}`);
            }
          }

          // AUTH
          if (smtpConfig.auth) {
            const authCode = await sendCommand('AUTH LOGIN');
            if (authCode !== 334) {
              throw new Error(`AUTH LOGIN failed: ${authCode}`);
            }

            // Username
            const userCode = await sendCommand(Buffer.from(smtpConfig.auth.user).toString('base64'));
            if (userCode !== 334) {
              throw new Error(`Username failed: ${userCode}`);
            }

            // Password
            const passCode = await sendCommand(Buffer.from(smtpConfig.auth.pass).toString('base64'));
            if (passCode !== 235) {
              throw new Error(`Password failed: ${passCode}`);
            }
          }

          // MAIL FROM
          const mailCode = await sendCommand(`MAIL FROM:<${from}>`);
          if (mailCode !== 250) {
            throw new Error(`MAIL FROM failed: ${mailCode}`);
          }

          // RCPT TO
          const rcptCode = await sendCommand(`RCPT TO:<${to}>`);
          if (rcptCode !== 250) {
            throw new Error(`RCPT TO failed: ${rcptCode}`);
          }

          // DATA
          const dataCode = await sendCommand('DATA');
          if (dataCode !== 354) {
            throw new Error(`DATA failed: ${dataCode}`);
          }

          // Create feedback content as attachment
          const feedbackContent = [
            `问题反馈`,
            `========`,
            ``,
            `姓名: ${feedback.name}`,
            `标题: ${feedback.title}`,
            `时间: ${feedback.timestamp}`,
            `ID: ${feedback.id}`,
            ``,
            `内容:`,
            `${feedback.content}`
          ].join('\r\n');

          const boundary = '----=_Part_' + Date.now();
          const filename = `feedback_${Date.now()}.txt`;
          const contentBase64 = Buffer.from(feedbackContent, 'utf-8').toString('base64');

          const emailData = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            body,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"; name="${filename}"`,
            `Content-Disposition: attachment; filename="${filename}"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            contentBase64,
            ``,
            `--${boundary}--`
          ].join('\r\n');

          const messageCode = await sendCommand(emailData + '\r\n.');
          if (messageCode !== 250) {
            throw new Error(`Message failed: ${messageCode}`);
          }

          // QUIT
          await sendCommand('QUIT');

          socket.destroy();
          resolve();
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      })();
    }

    const socket = net.createConnection(port, host, () => {
      if (useTLS) {
        // For port 465, wrap in TLS immediately
        const tlsSocket = tls.connect({
          socket
        }, () => {
          onConnect(tlsSocket);
        });
      } else {
        onConnect(socket);
      }
    });

    socket.on('error', (err) => reject(err));
    socket.setTimeout(30000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timeout'));
    });
  });
}

// FIX: cd() fallback now matches defaults.json exactly
function createDefaults() {
  return {
    capacitor: {
      l0: 5000, tmax: 105, tau: 10, vrated: 450, irated: 2000,
      dt0: 10, workdays: 365, warrantyTarget: 10,
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
      sStd: "iec", sPd: 2, sMg: "ii", sAlt: 3000,
      sIsolation: "isolated", sOvc_AC: "ii", sOvc_DC: "i",
      sSysV_AC: 300, sSysV_DC: 600,
      nodes: [
        { name: "L-N",    vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac",  interp: false },
        { name: "L-PE",   vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac",  interp: false },
        { name: "DC+-PE", vrms: 800, ins: "reinf", pcb: 0, coat: 0, circ: "dc",  interp: false }
      ]
    },
    filter: {
      type: "mfb2",
      series: "e24",
      fc: 1000,
      gain: 1,
      Q: 0.707
    },
    pcb: {
      width: 0.25,
      copper: "1",
      position: "external",
      deltaT: 10,
      ambTemp: 25,
      length: 50,
      targetI: 0
    }
  };
}

// ── Defaults structure validator (warn on unknown fields, reject only structural errors) --
function validateDefaults(d) {
  if (typeof d !== "object" || d === null) return { ok: false, error: "Root must be an object" };
  const topAllowed = ["capacitor", "safety", "filter", "pcb"];
  var warnings = [];

  for (const k of Object.keys(d)) {
    if (!topAllowed.includes(k)) {
      return { ok: false, error: "Unknown top-level key: " + k };
    }
  }

  if (d.capacitor && typeof d.capacitor === "object") {
    const capK = ["l0","tmax","tau","vrated","irated","dt0","workdays",
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
    const safeK = ["sStd","sPd","sMg","sAlt","sIsolation","sOvc_AC","sOvc_DC","sSysV_AC","sSysV_DC","nodes"];
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

  if (d.filter && typeof d.filter === "object") {
    const filterK = ["type","series","fc","gain","Q"];
    for (const k of Object.keys(d.filter)) {
      if (!filterK.includes(k)) warnings.push("Unknown filter key: " + k);
    }
  }

  if (d.pcb && typeof d.pcb === "object") {
    const pcbK = ["width","copper","position","deltaT","ambTemp","length","targetI"];
    for (const k of Object.keys(d.pcb)) {
      if (!pcbK.includes(k)) warnings.push("Unknown pcb key: " + k);
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
    const chunks = [];
    let sz = 0;
    req.on("data", c => {
      sz += c.length;
      if (sz > MAX_BODY) {
        req.destroy();
        r({});
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        // Combine all chunks and parse as UTF-8 JSON
        const body = Buffer.concat(chunks).toString('utf-8');
        r(JSON.parse(body));
      } catch (_) {
        r({});
      }
    });
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
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net");
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

  // ── Feedback submission (public) ────────────────────
  if (p === "/api/feedback" && req.method === "POST") {
    const body = await parseBody(req);
    const name = (body.name || "").replace(/[\r\n]/g, "").trim();
    const title = (body.title || "").replace(/[\r\n]/g, "").trim();
    const content = body.content || "";
    if (!name || !title || !content) {
      json(res, 400, { error: "Missing required fields (name, title, content)" }, true);
      return;
    }
    const entry = addFeedback(name, title, content);
    console.log(`[FEEDBACK] New feedback from "${name}": "${title}" (ID: ${entry.id})`);

    // Send email notification asynchronously
    sendFeedbackEmail(entry).catch(err => {
      console.error(`[FEEDBACK] Email notification failed: ${err.message}`);
    });

    json(res, 201, { success: true, id: entry.id }, true);
    return;
  }

  // ── Feedback list (admin only) ────────────────────
  if (p === "/api/feedback" && req.method === "GET") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    json(res, 200, loadFeedback(), false);
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

  // ── ADMIN email config ──────────────────────────────────
  if (p === "/api/admin/email-config") {
    if (!validateToken(tok)) { json(res, 401, { error: "Unauthorized" }, false); return; }
    if (req.method === "GET") { json(res, 200, loadEmailConfig(), false); return; }
    if (req.method === "PUT") {
      const body = await parseBody(req);
      saveEmailConfig(body);
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

// Graceful shutdown
process.on("SIGTERM", () => { process.exit(0); });
process.on("SIGINT",  () => { process.exit(0); });
