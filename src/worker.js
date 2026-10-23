// near-disney.com Worker
// Static files in ./public are served by Workers Static Assets.
// Only /api/* reaches this code (see "run_worker_first" in wrangler.jsonc).
//
// POST /api/quote  ->  validates the "Get my all-in quote" form and emails it
// to vacation@near-disney.com through the Cloudflare Email Service send_email
// binding (QUOTE_EMAIL). Reply-To is the guest, so hitting Reply answers them.
// Nothing works live until the setup in QUOTE-FORM-SETUP.md is done.

const TO = "vacation@near-disney.com";
const FROM_DEFAULT = "quotes@near-disney.com";
const MAX_NIGHTS = 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote") {
      if (request.method === "POST") return handleQuote(request, env);
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    }
    // Anything else falls back to the static site.
    return env.ASSETS.fetch(request);
  },
};

async function handleQuote(request, env) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");

  // Same-origin check (blocks other sites posting into the form).
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return reply(wantsJson, 403, { ok: false, error: "Bad origin." });
  }
  if (Number(request.headers.get("Content-Length") || 0) > 10000) {
    return reply(wantsJson, 413, { ok: false, error: "Too large." });
  }

  let data;
  try {
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) data = await request.json();
    else data = Object.fromEntries(await request.formData());
  } catch {
    return reply(wantsJson, 400, { ok: false, error: "Could not read the form." });
  }

  // Spam trap 1: hidden honeypot field. Bots fill it, people never see it.
  // Pretend success so bots learn nothing.
  if (str(data.website)) return reply(wantsJson, 200, { ok: true });

  // Spam trap 2: the page stamps the time the form was shown; real people
  // take more than 3 seconds to fill it in.
  const shown = Number(data.t);
  if (shown && Date.now() - shown < 3000) return reply(wantsJson, 200, { ok: true });

  // Optional Turnstile check, only if a secret has been configured.
  if (env.TURNSTILE_SECRET) {
    const ok = await checkTurnstile(env.TURNSTILE_SECRET, str(data["cf-turnstile-response"]), request);
    if (!ok) return reply(wantsJson, 400, { ok: false, error: "Please tick the 'I am human' box and try again." });
  }

  const v = validate(data);
  if (v.errors.length) return reply(wantsJson, 400, { ok: false, error: v.errors.join(" ") });

  if (!env.QUOTE_EMAIL) {
    console.error("QUOTE_EMAIL binding missing: see QUOTE-FORM-SETUP.md");
    return reply(wantsJson, 503, { ok: false, error: "The form is not switched on yet. Please message us on WhatsApp or email vacation@near-disney.com." });
  }

  const q = v.value;
  const subject = `Website quote request: ${q.checkin} to ${q.checkout}, ${q.guestsLabel}, ${q.name}`;
  const lines = [
    "New quote request from near-disney.com/disney/",
    "",
    `Name:        ${q.name}`,
    `Email:       ${q.email}`,
    `Check-in:    ${q.checkin}`,
    `Check-out:   ${q.checkout}  (${q.nights} nights)`,
    `Guests:      ${q.guestsLabel}`,
    `Pool heat:   ${q.poolHeat ? "Yes ($15/day)" : "No"}`,
    `Message:     ${q.message || "-"}`,
    "",
    "Reply to this email to answer the guest directly.",
  ];
  try {
    await env.QUOTE_EMAIL.send({
      to: TO,
      from: { email: env.QUOTE_FROM || FROM_DEFAULT, name: "Near-Disney quote form" },
      replyTo: { email: q.email, name: q.name },
      subject,
      text: lines.join("\n"),
      html: `<pre style="font:14px/1.5 Menlo,Consolas,monospace">${esc(lines.join("\n"))}</pre>`,
    });
  } catch (e) {
    console.error("send failed", e && e.code, e && e.message);
    return reply(wantsJson, 502, { ok: false, error: "Sorry, that did not send. Please message us on WhatsApp or email vacation@near-disney.com." });
  }
  return reply(wantsJson, 200, { ok: true });
}

function validate(d) {
  const errors = [];
  const name = str(d.name).slice(0, 101);
  const email = str(d.email).toLowerCase();
  const checkin = str(d.checkin);
  const checkout = str(d.checkout);
  const guests = parseInt(str(d.guests), 10);
  const extra = str(d.extra) === "yes";
  const poolHeat = str(d.pool_heat);
  const message = str(d.message).slice(0, 1001);

  if (name.length < 2 || name.length > 100) errors.push("Please add your name.");
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email) || email.length > 200) errors.push("Please check your email address.");
  const ci = parseDate(checkin), co = parseDate(checkout);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  let nights = 0;
  if (!ci || !co) errors.push("Please pick check-in and check-out dates.");
  else {
    nights = Math.round((co - ci) / 86400000);
    if (ci < today - 86400000) errors.push("Check-in is in the past.");
    if (nights < 1) errors.push("Check-out must be after check-in.");
    if (nights > MAX_NIGHTS) errors.push(`For stays over ${MAX_NIGHTS} nights, please message us.`);
    if (ci - today > 2 * 365 * 86400000) errors.push("We only quote up to two years ahead.");
  }
  if (!(guests >= 1 && guests <= 10)) errors.push("Guests must be 1 to 10.");
  if (poolHeat !== "yes" && poolHeat !== "no") errors.push("Please choose yes or no for pool heat.");
  if (message.length > 1000) errors.push("Message is too long.");
  if (/[\r\n]/.test(name)) errors.push("Please check your name.");

  const guestsLabel = `${guests} guest${guests === 1 ? "" : "s"}` + (extra ? " + 11th on couch / infant in crib" : "");
  return { errors, value: { name, email, checkin, checkout, nights, guests, guestsLabel, poolHeat: poolHeat === "yes", message } };
}

function parseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(s + "T00:00:00Z");
  return Number.isNaN(t) ? null : t;
}

async function checkTurnstile(secret, token, request) {
  if (!token) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const j = await r.json().catch(() => ({}));
  return j.success === true;
}

function reply(json, status, body) {
  if (json) return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  // No-JavaScript fallback: send the browser back to the page with a status flag.
  const flag = body.ok ? "sent" : "error";
  return new Response(null, { status: 303, headers: { Location: `/disney/?quote=${flag}#quote`, "Cache-Control": "no-store" } });
}

const str = (x) => (typeof x === "string" ? x.trim() : "");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
