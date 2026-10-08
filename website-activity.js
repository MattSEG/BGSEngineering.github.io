/* Homepage-only measurements. No persistent visitor ID, cookies, fingerprints or AI keys. */
(() => {
  "use strict";
  const script = document.currentScript;
  const endpoint = script && script.dataset.endpoint;
  const params = new URLSearchParams(location.search);
  if (!endpoint || !["/", "/index.html"].includes(location.pathname)) return;
  if (params.get("analytics") === "off" || navigator.globalPrivacyControl || navigator.doNotTrack === "1") return;
  try { if (localStorage.getItem("bgs_analytics_optout") === "1") return; } catch (_) {}
  if (!crypto.randomUUID) return;
  const id = crypto.randomUUID(); // Memory only. A refresh creates another page session.
  const sections = {};
  const actions = new Set();
  const candidates = [...document.querySelectorAll("main section[data-hud]")];
  const allowed = new Set(["email_signature", "email", "linkedin", "qr", "presentation", "search", "referral"]);
  const tag = params.get("utm_source") || "";
  let referrer = "";
  try { referrer = new URL(document.referrer).hostname; } catch (_) {}
  let total = 0;
  let lastTick = performance.now();
  let lastInput = lastTick;
  let started = false;
  let inFlight = false;
  let stopped = false;
  let ticks = 0;

  function sectionAtCenter() {
    const midpoint = innerHeight * 0.5;
    for (const section of candidates) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= midpoint && rect.bottom > midpoint) return section.dataset.hud;
    }
    return "00";
  }

  function tick() {
    const now = performance.now();
    const elapsed = Math.min((now - lastTick) / 1000, 2);
    lastTick = now;
    if (stopped || document.visibilityState !== "visible" || now - lastInput > 60000) return;
    total += elapsed;
    const section = sectionAtCenter();
    sections[section] = (sections[section] || 0) + elapsed;
  }

  function payload(kind) {
    const rounded = {};
    for (const [key, seconds] of Object.entries(sections)) rounded[key] = Math.floor(seconds);
    return JSON.stringify({session: id, kind, page: "/", active_seconds: Math.floor(total),
      sections: rounded, actions: [...actions], referrer,
      utm_source: allowed.has(tag) ? tag : ""});
  }

  function send(final = false) {
    if (stopped || (inFlight && !final)) return;
    inFlight = true;
    fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"},
      credentials: "omit", mode: "cors", keepalive: final, body: payload(started ? "update" : "start")})
      .then(response => { if (response.ok) started = true; })
      .catch(() => {})
      .finally(() => { inFlight = false; });
  }

  for (const event of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) {
    addEventListener(event, () => { lastInput = performance.now(); }, {passive: true});
  }
  document.addEventListener("click", event => {
    const anchor = event.target.closest("a[href]");
    const copy = event.target.closest("[data-copy]");
    if (copy && copy.dataset.copy === "info@bgsengineering.com") actions.add("copy_email");
    if (anchor) {
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("mailto:")) actions.add(href.includes("Keep%20me%20posted") ? "updates" : "email");
      try {
        const url = new URL(href, location.href);
        if (url.hostname === "www.linkedin.com" || url.hostname === "linkedin.com") actions.add("linkedin");
        if (url.origin === location.origin && (/\.pdf$/i.test(url.pathname) || anchor.hasAttribute("download"))) actions.add("download");
      } catch (_) {}
    }
    if (anchor || copy) { tick(); send(true); }
  });
  document.addEventListener("visibilitychange", () => {
    // Tick on visibility changes resets the clock; hidden periods never accrue later.
    tick();
    if (document.visibilityState === "hidden") send(true);
  });
  addEventListener("pagehide", () => { tick(); send(true); });
  addEventListener("bgs-analytics-optout", () => { stopped = true; });
  send();
  setInterval(() => {
    tick();
    if (++ticks % 15 === 0 && document.visibilityState === "visible") send();
  }, 1000);
})();
