/* ══════════════════════════════════════════════════════════════════════════
   Access gate — Vercel Edge Middleware
   ══════════════════════════════════════════════════════════════════════════

   Runs on every request before any file is served, so index.html, app.js and
   the demo itself are never sent to an unauthenticated visitor. A client-side
   check could not do this: the files would already be on their machine by the
   time the check ran.

   Unlike the dataquartz-demos version this is modelled on, there are NO
   hardcoded credential defaults here. This repository is public on GitHub, so
   a default username, password or signing secret committed to it would be
   readable by anyone — which would both reveal the password and allow session
   cookies to be forged. All three values must come from the environment:

     AUTH_USER, AUTH_PASSWORD, AUTH_SECRET
        → Vercel → Settings → Environment Variables

   If any is missing the gate fails closed with a 503 explaining what to set,
   rather than silently letting requests through.

   As a side effect this also protects any future /api routes, which cannot be
   reached by anonymous visitors.

   No `config` export — Vercel runs this on every request by default, which is
   what we want. Paths in PUBLIC below are the only ones let through.
   ══════════════════════════════════════════════════════════════════════════ */

const COOKIE = "motorway_session";
const MAX_AGE = 60 * 60 * 24 * 7; // one week

// Everything the login screen itself needs in order to render.
const PUBLIC = new Set([
  "/login",
  "/login.html",
  "/style.css",
  "/motorway-logo.svg",
  "/hero.jpg",
  "/favicon.ico",
]);

const enc = new TextEncoder();

function env() {
  return {
    user: process.env.AUTH_USER || "",
    pass: process.env.AUTH_PASSWORD || "",
    secret: process.env.AUTH_SECRET || "",
  };
}

/** Constant-time-ish compare. Leaks length only, which is not sensitive here. */
function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  let bin = "";
  new Uint8Array(mac).forEach(function (b) { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Session token is `<expiry-ms>.<hmac(expiry-ms)>` — stateless, no store. */
async function issue(secret) {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return exp + "." + (await sign(exp, secret));
}

async function valid(token, secret) {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;

  const exp = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;

  return equal(mac, await sign(exp, secret));
}

function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(";");
  for (var i = 0; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq < 0) continue;
    if (parts[i].slice(0, eq).trim() === name) return parts[i].slice(eq + 1).trim();
  }
  return "";
}

function redirect(to, req, status, cookie) {
  const headers = { Location: new URL(to, req.url).toString() };
  const res = new Response(null, { status: status, headers: headers });
  if (cookie) res.headers.append("Set-Cookie", cookie);
  return res;
}

async function handleLogin(req) {
  const cfg = env();
  let username = "";
  let password = "";

  try {
    const form = await req.formData();
    username = String(form.get("username") || "");
    password = String(form.get("password") || "");
  } catch (e) {
    return redirect("/login?e=1", req, 303);
  }

  // Both compares always run — no early exit on a wrong username.
  const okUser = equal(username, cfg.user);
  const okPass = equal(password, cfg.pass);
  if (!cfg.user || !cfg.pass || !okUser || !okPass) {
    return redirect("/login?e=1", req, 303);
  }

  const token = await issue(cfg.secret);
  return redirect(
    "/",
    req,
    303,
    COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + MAX_AGE
  );
}

export default async function middleware(req) {
  const path = new URL(req.url).pathname;

  if (path === "/api/login" && req.method === "POST") return handleLogin(req);

  if (path === "/logout") {
    return redirect("/login", req, 303, COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  }

  if (PUBLIC.has(path)) return;

  const cfg = env();

  // Fail closed, and say why, rather than looping back to the sign-in screen
  // forever or — worse — serving the demo unprotected.
  if (!cfg.user || !cfg.pass || !cfg.secret) {
    return new Response(
      "Access gate is not configured. Set AUTH_USER, AUTH_PASSWORD and AUTH_SECRET " +
        "in the Vercel project's environment variables, then redeploy.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  if (await valid(readCookie(req, COOKIE), cfg.secret)) return;

  return redirect("/login", req, 307);
}
