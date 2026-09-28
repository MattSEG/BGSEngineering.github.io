(() => {
  "use strict";

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const MOBILE = () => window.innerWidth <= 860;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Site config ---------------- */
  // GoatCounter site code (private, cookie-free stats). Empty string disables it.
  const GOATCOUNTER = "bgsengineering";
  if (GOATCOUNTER) {
    const gc = document.createElement("script");
    gc.async = true;
    gc.src = "https://gc.zgo.at/count.js";
    gc.dataset.goatcounter = `https://${GOATCOUNTER}.goatcounter.com/count`;
    document.head.appendChild(gc);
  }

  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; }
    catch (e) { b.textContent = "Select to copy"; }
    setTimeout(() => (b.textContent = "Copy email"), 1800);
  }));

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!RM && typeof window.Lenis !== "undefined" && hasGSAP) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const t = id === "#top" ? document.body : $(id);
      if (!t) return;
      e.preventDefault();
      document.documentElement.classList.remove("menu-open");
      $(".nav__burger").setAttribute("aria-expanded", "false");
      scrollTo(t);
    });
  });

  /* ---------------- Menu ---------------- */
  $(".nav__burger").addEventListener("click", (e) => {
    const open = document.documentElement.classList.toggle("menu-open");
    e.currentTarget.setAttribute("aria-expanded", String(open));
    $(".menu").setAttribute("aria-hidden", String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  /* ---------------- Frame sequence (U1) ---------------- */
  const FRAME_COUNT = 192;
  const frames = new Array(FRAME_COUNT);
  const frameSrc = (i) => `assets/frames/f${String(i + 1).padStart(3, "0")}.webp`;
  let framesLoaded = 0;
  const loadFrame = (i) => new Promise((res) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => { framesLoaded++; res(); };
    img.src = frameSrc(i);
    frames[i] = img;
  });

  /* ---------------- Loader ---------------- */
  const loader = $(".loader");
  const countEl = $(".loader__count");
  const polys = $$(".loader__mark polygon");
  polys.forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 4000;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });

  const firstBatch = [];
  for (let i = 0; i < FRAME_COUNT; i += 6) firstBatch.push(loadFrame(i));
  const minTime = new Promise((r) => setTimeout(r, RM ? 200 : 1700));
  const maxTime = new Promise((r) => setTimeout(r, 5000));
  const ready = Promise.race([Promise.all([Promise.all(firstBatch), minTime]), maxTime]);

  let shown = 0;
  const target = { v: 0 };
  const tickCount = () => {
    const goal = Math.round((framesLoaded / firstBatch.length) * 100);
    target.v = Math.max(target.v, clamp(goal, 0, 100));
    shown += (target.v - shown) * 0.12;
    countEl.textContent = String(Math.round(shown)).padStart(3, "0");
    if (!loader.dataset.done) requestAnimationFrame(tickCount);
  };
  tickCount();

  if (hasGSAP && !RM) {
    gsap.to(polys, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut", stagger: 0.12 });
  }

  ready.then(() => {
    // lazy-load the remaining frames in the background
    for (let i = 0; i < FRAME_COUNT; i++) if (!frames[i]) loadFrame(i);
    target.v = 100;
    const finish = () => {
      loader.dataset.done = "1";
      loader.remove();
      document.body.classList.remove("is-loading");
      if (lenis) lenis.start();
      if (hasGSAP) ScrollTrigger.refresh();
      intro();
    };
    if (!hasGSAP || RM) return finish();
    gsap.timeline({ onComplete: finish })
      .to(polys, { fill: "#fff", duration: 0.35, stagger: 0.06 }, 0.1)
      .to(".loader__mark", { scale: 0.86, duration: 0.5, ease: "power3.in" }, 0.35)
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, 0.7);
    loader.style.clipPath = "inset(0 0 0% 0)";
  });

  /* ---------------- Hero: chopped fiber field ---------------- */
  const hero = { prog: 0, ok: false };
  (function initFibers() {
    const canvas = $(".hero__gl");
    if (typeof window.THREE === "undefined") { document.documentElement.classList.add("no-webgl"); return; }
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); }
    catch (e) { document.documentElement.classList.add("no-webgl"); return; }
    hero.ok = true;
    renderer.setClearColor(0x050505, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    // The BGS mark, in its native coordinates (viewBox 0 0 1250 1442)
    const POLYS = [
      [[0,360],[625,2],[1250,360],[1250,722],[625,362],[0,722]],
      [[625,489],[968,675],[140,1160],[0,1080],[0,857]],
      [[241,1220],[1071,735],[1250,831],[1250,1080],[625,1440]]
    ];
    const inPoly = (x, y, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    const S = 3.1 / 1442;
    const N = MOBILE() ? 7000 : 16000;
    const V = N * 2;
    const aStart = new Float32Array(V * 3), aTarget = new Float32Array(V * 3);
    const aDirS = new Float32Array(V * 3), aDirT = new Float32Array(V * 3);
    const aEnd = new Float32Array(V), aRand = new Float32Array(V), aLen = new Float32Array(V);
    const pos = new Float32Array(V * 3);

    for (let f = 0; f < N; f++) {
      let x, y, k = 0;
      do { x = Math.random() * 1250; y = Math.random() * 1442; k++; }
      while (!POLYS.some((p) => inPoly(x, y, p)) && k < 60);
      const tx = (x - 625) * S, ty = -(y - 721) * S, tz = (Math.random() - 0.5) * 0.08;

      // start: a loose, flattened vortex of chopped fiber
      const r = 1.6 + Math.pow(Math.random(), 0.7) * 5.2;
      const th = Math.random() * Math.PI * 2;
      const sx = Math.cos(th) * r, sz = Math.sin(th) * r * 0.7 - 1.0, sy = (Math.random() - 0.5) * 3.6 * (0.5 + r / 7);

      const u = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      const ds = [q * Math.cos(ph), q * Math.sin(ph), u];
      const a = Math.random() * Math.PI; // quasi-isotropic: any in-plane angle
      const dt = [Math.cos(a), Math.sin(a), (Math.random() - 0.5) * 0.25];
      const rnd = Math.random();
      const len = 0.025 + Math.random() * 0.06;

      for (let e = 0; e < 2; e++) {
        const v = f * 2 + e, o = v * 3;
        aStart[o] = sx; aStart[o + 1] = sy; aStart[o + 2] = sz;
        aTarget[o] = tx; aTarget[o + 1] = ty; aTarget[o + 2] = tz;
        aDirS[o] = ds[0]; aDirS[o + 1] = ds[1]; aDirS[o + 2] = ds[2];
        aDirT[o] = dt[0]; aDirT[o + 1] = dt[1]; aDirT[o + 2] = dt[2];
        aEnd[v] = e === 0 ? -0.5 : 0.5;
        aRand[v] = rnd; aLen[v] = len;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aStart", new THREE.BufferAttribute(aStart, 3));
    geo.setAttribute("aTarget", new THREE.BufferAttribute(aTarget, 3));
    geo.setAttribute("aDirS", new THREE.BufferAttribute(aDirS, 3));
    geo.setAttribute("aDirT", new THREE.BufferAttribute(aDirT, 3));
    geo.setAttribute("aEnd", new THREE.BufferAttribute(aEnd, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
    geo.setAttribute("aLen", new THREE.BufferAttribute(aLen, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    const uniforms = {
      uTime: { value: 0 }, uProg: { value: RM ? 1 : 0 }, uAlpha: { value: 0 },
      uLight: { value: new THREE.Vector3(0.6, 0.5, 0.4) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aStart; attribute vec3 aTarget; attribute vec3 aDirS; attribute vec3 aDirT;
        attribute float aEnd; attribute float aRand; attribute float aLen;
        uniform float uTime; uniform float uProg; uniform vec3 uLight;
        varying float vA;
        float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
        void main(){
          float ang = uTime * (0.04 + 0.10 * aRand);
          float c = cos(ang), s = sin(ang);
          vec3 st = vec3(c*aStart.x - s*aStart.z, aStart.y + sin(uTime*.5 + aRand*6.2831)*.12, s*aStart.x + c*aStart.z);
          float t = ease(clamp((uProg - aRand*0.38) / 0.62, 0., 1.));
          vec3 ctr = mix(st, aTarget, t);
          vec3 swirl = normalize(vec3(-st.z, 0.2, st.x) + 1e-4);
          ctr += swirl * sin(t * 3.14159) * (0.4 + 0.9*aRand);
          vec3 d = normalize(mix(aDirS, aDirT, t) + 1e-4);
          float spin = uTime * (1.0 - t) * (0.6 + aRand);
          d = normalize(vec3(d.x*cos(spin) - d.y*sin(spin), d.x*sin(spin) + d.y*cos(spin), d.z));
          vec3 p = ctr + d * aLen * aEnd * (1.0 + (1.0 - t) * 0.6);
          float g = pow(abs(dot(d, normalize(uLight))), 5.0);
          vA = (0.14 + 0.86*g) * mix(0.45, 1.0, t);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uAlpha; varying float vA;
        void main(){ gl_FragColor = vec4(vec3(0.94), vA * uAlpha); }`
    });
    const lines = new THREE.LineSegments(geo, mat);
    const group = new THREE.Group();
    group.add(lines);
    scene.add(group);

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const fit = w / h < 0.8 ? 0.62 : 1;
      group.scale.setScalar(fit);
      group.userData.fit = fit;
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    const clock = new THREE.Clock();
    const render = () => {
      requestAnimationFrame(render);
      if (!visible) return;
      const t = clock.getElapsedTime();
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      mouse.sy += (mouse.y - mouse.sy) * 0.05;
      uniforms.uTime.value = RM ? 0 : t;
      uniforms.uProg.value = RM ? 1 : hero.prog;
      uniforms.uAlpha.value += ((loader.dataset.done ? 1 : 0.35) - uniforms.uAlpha.value) * 0.04;
      uniforms.uLight.value.set(Math.cos(t * 0.35) + mouse.sx * 1.5, Math.sin(t * 0.27) - mouse.sy * 1.5, 0.35);
      const p = hero.prog;
      group.rotation.y = mouse.sx * 0.35 * (1 - p * 0.5) + (1 - p) * t * 0.02;
      group.rotation.x = mouse.sy * 0.2;
      camera.position.z = 9.5 - p * 1.7;
      group.position.y = (MOBILE() ? 0.35 : 0.05) * p;
      renderer.render(scene, camera);
    };
    render();
  })();

  /* ---------------- Intro + scroll choreography ---------------- */
  function splitLines(el) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => `<span class="line"><span>${p.trim()}</span></span>`).join("");
  }

  function intro() {
    if (!hasGSAP || RM) return;
    gsap.from(".hero__title .line > span", { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.1 });
    gsap.from([".hero__sub", ".hero__top", ".hero__scroll", ".nav", ".hud"], { opacity: 0, y: 20, duration: 1.2, ease: "power3.out", stagger: 0.08, delay: 0.3 });
  }

  if (!hasGSAP) return;

  if (RM) {
    hero.prog = 1;
    drawPlatformStatic();
    initCursor();
    initLoupe();
    $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count));
    return;
  }

  // Hero pinned scroll: fibers converge into the mark
  gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true } })
    .to(hero, { prog: 1, duration: 0.72, ease: "none" }, 0)
    .to(".hero__title", { yPercent: -30, opacity: 0, duration: 0.3, ease: "power1.in" }, 0.02)
    .to([".hero__sub", ".hero__top", ".hero__scroll"], { opacity: 0, duration: 0.2 }, 0.02)
    .to(".hero__caption", { opacity: 1, duration: 0.15 }, 0.62)
    .to(".hero__caption", { opacity: 0, duration: 0.1 }, 0.9);

  // Manifesto: word-by-word illumination
  $$("[data-words]").forEach((el) => {
    const html = el.innerHTML.trim().replace(/\s+/g, " ");
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const out = [];
    tmp.childNodes.forEach((n) => {
      const wrap = (txt, tag) => txt.split(" ").filter(Boolean).map((w) => tag ? `<${tag}><span class="w">${w}</span></${tag}>` : `<span class="w">${w}</span>`).join(" ");
      if (n.nodeType === 3) out.push(wrap(n.textContent));
      else out.push(wrap(n.textContent, n.tagName.toLowerCase()));
    });
    el.innerHTML = out.join(" ");
    gsap.to(el.querySelectorAll(".w"), {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
    });
  });

  // Line reveals
  $$(".reveal-lines").forEach((el) => {
    splitLines(el);
    gsap.from(el.querySelectorAll(".line > span"), {
      yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });
  gsap.utils.toArray(".reveal-up, .props li, .creds li, .person, .partners li").forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.from(".why__list li", {
    y: 60, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08,
    scrollTrigger: { trigger: ".why__list", start: "top 80%" }
  });
  gsap.from(".contact__title .line > span", {
    yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.1,
    scrollTrigger: { trigger: ".contact__title", start: "top 85%" }
  });
  gsap.to(".contact__mark", { rotate: -8, yPercent: -12, ease: "none", scrollTrigger: { trigger: ".contact", start: "top bottom", end: "bottom top", scrub: true } });

  // Parallax figures
  $$(".parallax").forEach((el) => {
    const sp = parseFloat(el.dataset.speed || "0.1");
    gsap.to(el, { yPercent: sp * -100, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    const img = el.querySelector("img");
    gsap.to(img, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Material title
  gsap.from(".material__head .display", {
    letterSpacing: "0.3em", opacity: 0, duration: 1.6, ease: "expo.out",
    scrollTrigger: { trigger: ".material__head", start: "top 80%" }
  });
  gsap.fromTo(".loupe-wrap__img", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".loupe-wrap", start: "top bottom", end: "bottom top", scrub: true } });

  // Counters
  $$("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || "0", 10);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = o.v.toFixed(dec))
    });
  });

  // Process
  const steps = $$(".process__steps li");
  ScrollTrigger.create({
    trigger: ".process", start: "top top", end: "bottom bottom", scrub: true,
    onUpdate: (st) => {
      if (MOBILE()) return;
      $(".process__line i").style.transform = `scaleX(${st.progress})`;
      steps.forEach((s, i) => s.classList.toggle("on", st.progress >= i / steps.length - 0.02));
    }
  });

  // Platform: iris open, then scrub the U1 frames
  const pCanvas = $(".platform__canvas");
  const pctx = pCanvas.getContext("2d");
  let lastFrame = -1;
  const sizePlatform = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pCanvas.width = pCanvas.clientWidth * dpr;
    pCanvas.height = pCanvas.clientHeight * dpr;
    lastFrame = -1;
  };
  const drawFrame = (i) => {
    let img = frames[i];
    if (!img || !img.complete || !img.naturalWidth) {
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = frames[i - d], b = frames[i + d];
        if (a && a.complete && a.naturalWidth) { img = a; break; }
        if (b && b.complete && b.naturalWidth) { img = b; break; }
      }
    }
    if (!img || !img.naturalWidth) return;
    const cw = pCanvas.width, ch = pCanvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    let s = Math.max(cw / iw, ch / ih);
    if (ch > cw) s = Math.min(s, (cw / iw) * 1.9);
    const w = iw * s, h = ih * s;
    pctx.fillStyle = "#d4d4d4";
    pctx.fillRect(0, 0, cw, ch);
    pctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    if (ch > cw) {
      const g1 = pctx.createLinearGradient(0, (ch - h) / 2, 0, (ch - h) / 2 + 80);
      g1.addColorStop(0, "#d4d4d4"); g1.addColorStop(1, "rgba(212,212,212,0)");
      pctx.fillStyle = g1; pctx.fillRect(0, (ch - h) / 2, cw, 80);
      const g2 = pctx.createLinearGradient(0, (ch + h) / 2 - 80, 0, (ch + h) / 2);
      g2.addColorStop(0, "rgba(212,212,212,0)"); g2.addColorStop(1, "#d4d4d4");
      pctx.fillStyle = g2; pctx.fillRect(0, (ch + h) / 2 - 80, cw, 80);
    }
  };
  sizePlatform();
  window.addEventListener("resize", () => { sizePlatform(); drawFrame(0); });

  const callouts = $$(".callout");
  const ppNum = $(".pp-num");
  ScrollTrigger.create({
    trigger: ".platform", start: "top top", end: "bottom bottom", scrub: true,
    onUpdate: (st) => {
      const p = st.progress;
      const iris = clamp(p / 0.08, 0, 1);
      $(".platform__pin").style.clipPath = iris >= 1 ? "none" : `circle(${(iris * iris * 80).toFixed(2)}% at 50% 50%)`;
      const fp = clamp((p - 0.06) / 0.9, 0, 1);
      const idx = Math.round(fp * (FRAME_COUNT - 1));
      if (idx !== lastFrame) { drawFrame(idx); lastFrame = idx; ppNum.textContent = String(idx + 1).padStart(3, "0"); }
      callouts.forEach((c, i) => {
        const at = parseFloat(c.dataset.at);
        const last = i === callouts.length - 1;
        const on = p >= at - 0.08 && (last || p < at + 0.16);
        if (c._on !== on) {
          c._on = on;
          gsap.to(c, { opacity: on ? 1 : 0, y: on ? 0 : (p < at ? 24 : -24), duration: 0.6, ease: "power3.out", overwrite: true });
        }
      });
    }
  });
  gsap.fromTo(".platform__title", { y: 60 }, {
    y: 0, ease: "none",
    scrollTrigger: { trigger: ".platform", start: "top top", end: "bottom bottom", scrub: true }
  });
  // first paint once the first frame is in
  const firstPaint = () => (frames[0] && frames[0].naturalWidth ? drawFrame(0) : setTimeout(firstPaint, 120));
  firstPaint();

  // Studio reveal
  gsap.utils.toArray(".studio__grid figure").forEach((f, i) => {
    gsap.fromTo(f, { clipPath: "inset(100% 0 0 0)" }, {
      clipPath: "inset(0% 0 0 0)", duration: 1.3, ease: "expo.inOut", delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: f, start: "top 88%" }
    });
  });

  // Applications: horizontal travel on desktop
  const mm = gsap.matchMedia();
  mm.add("(min-width: 861px)", () => {
    const track = $(".apps__track");
    const dist = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".apps", start: "top top", end: () => "+=" + dist(), pin: ".apps__pin", scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  });
  mm.add("(max-width: 860px)", () => {
    gsap.utils.toArray(".app").forEach((a) => gsap.from(a, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: a, start: "top 88%" } }));
  });

  // HUD
  const hudIdx = $(".hud__idx"), hudName = $(".hud__name"), hudBar = $(".hud__bar i");
  $$("[data-hud]").forEach((s) => {
    ScrollTrigger.create({
      trigger: s, start: "top 55%", end: "bottom 55%",
      onToggle: (st) => { if (st.isActive) { hudIdx.textContent = s.dataset.hud; hudName.textContent = s.dataset.hudName; } }
    });
  });
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (st) => (hudBar.style.transform = `scaleX(${st.progress})`) });

  initCursor();
  initLoupe();

  window.addEventListener("load", () => ScrollTrigger.refresh());

  /* ---------------- helpers ---------------- */
  function drawPlatformStatic() {
    const c = $(".platform__canvas");
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      c.width = c.clientWidth; c.height = c.clientHeight;
      const s = Math.max(c.width / img.width, c.height / img.height);
      ctx.drawImage(img, (c.width - img.width * s) / 2, (c.height - img.height * s) / 2, img.width * s, img.height * s);
    };
    img.src = frameSrc(FRAME_COUNT - 1);
  }

  function initCursor() {
    if (!FINE) return;
    document.documentElement.classList.add("has-cursor");
    const cur = $(".cursor"), ring = $(".cursor__ring"), dot = $(".cursor__dot"), label = $(".cursor__label");
    const m = { x: -100, y: -100 }, r = { x: -100, y: -100 };
    window.addEventListener("pointermove", (e) => { m.x = e.clientX; m.y = e.clientY; });
    const loop = () => {
      r.x += (m.x - r.x) * 0.18; r.y += (m.y - r.y) * 0.18;
      dot.style.transform = `translate(${m.x}px,${m.y}px)`;
      ring.style.transform = `translate(${r.x}px,${r.y}px)`;
      label.style.transform = `translate(${r.x}px,${r.y}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$("[data-cursor]").forEach((el) => {
      el.addEventListener("pointerenter", () => { cur.classList.add("is-hover"); label.textContent = el.dataset.cursor; });
      el.addEventListener("pointerleave", () => cur.classList.remove("is-hover"));
    });
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - b.left - b.width / 2) * 0.25, y: (e.clientY - b.top - b.height / 2) * 0.35, duration: 0.5, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,0.4)" }));
    });
  }

  function initLoupe() {
    const wrap = $(".loupe-wrap"), lp = $(".loupe"), img = $(".loupe-wrap__img");
    if (!wrap) return;
    const Z = 2.6, R = 120;
    lp.style.backgroundImage = `url("${img.getAttribute("src")}")`;
    const move = (e) => {
      const b = wrap.getBoundingClientRect(), ib = img.getBoundingClientRect();
      const x = e.clientX - b.left, y = e.clientY - b.top;
      lp.style.left = x - R + "px"; lp.style.top = y - R + "px";
      lp.style.backgroundSize = `${ib.width * Z}px ${ib.height * Z}px`;
      const ix = e.clientX - ib.left, iy = e.clientY - ib.top;
      lp.style.backgroundPosition = `${-(ix * Z - R)}px ${-(iy * Z - R)}px`;
    };
    wrap.addEventListener("pointerenter", () => wrap.classList.add("is-on"));
    wrap.addEventListener("pointerleave", () => wrap.classList.remove("is-on"));
    wrap.addEventListener("pointermove", move);
  }
})();
