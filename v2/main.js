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

  // Hero mode: "scroll" (default, scroll-driven assembly) or "auto" / "auto-stats" (assembly plays on load)
  const HERO_MODE = document.body.dataset.hero || "scroll";
  const AUTO = HERO_MODE.startsWith("auto");
  const SETTLE = HERO_MODE === "settle";
  let autoTween = null;

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

  /* ---------------- Hero: chopped carbon tow condenses into the mark ---------------- */
  const hero = { prog: 0, white: 0, ok: false };
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
    camera.position.set(0, 0, 9.5);

  // BGS mark, native coordinates (viewBox 0 0 1250 1442)
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
  const corners = (cx, cy, a, L, W) => {
    const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux, l = L / 2, w = W / 2;
    return [[cx+ux*l+vx*w, cy+uy*l+vy*w],[cx+ux*l-vx*w, cy+uy*l-vy*w],[cx-ux*l+vx*w, cy-uy*l+vy*w],[cx-ux*l-vx*w, cy-uy*l-vy*w],[cx+ux*l, cy+uy*l],[cx-ux*l, cy-uy*l]];
  };
  const fits = (poly, cs) => cs.every(([x, y]) => inPoly(x, y, poly));
  const nearestEdge = (poly, x, y) => {
    let best = null;
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const dx = bx - ax, dy = by - ay, len2 = dx*dx + dy*dy;
      const t = Math.max(0, Math.min(1, ((x-ax)*dx + (y-ay)*dy) / len2));
      const px = ax + dx*t, py = ay + dy*t, d = Math.hypot(x-px, y-py);
      if (!best || d < best.d) best = { d, ang: Math.atan2(dy, dx), nx: (x-px)/(d||1), ny: (y-py)/(d||1) };
    }
    return best;
  };

  // Chip recipe (mark px units; the mark is 1250 px wide). 3/8 in tow reads as ~60 px chips here.
  const BASE_L = 62;
  const makeChip = () => {
    const r = Math.random();
    if (r < 0.55) return { L: BASE_L * (0.85 + Math.random()*0.35), W: 14 + Math.random()*22, kind: 0 };   // bundle
    if (r < 0.86) return { L: BASE_L * (0.8 + Math.random()*0.4),  W: 4 + Math.random()*7,  kind: 1 };    // split strip
    return { L: BASE_L * (0.9 + Math.random()*0.8), W: 1.2 + Math.random()*1.3, kind: 2 };                // single filament
  };

  const chips = [];
  const N_FILL = MOBILE() ? 2600 : 5200;
  // 2) random fill, quasi-isotropic; chips that would cross an edge align to it instead
  let guard = 0;
  while (chips.length < N_FILL && guard++ < N_FILL * 20) {
    const x = Math.random()*1250, y = Math.random()*1442;
    const poly = POLYS.find(p => inPoly(x, y, p));
    if (!poly) continue;
    const c = makeChip();
    let a = Math.random() * Math.PI, cx = x, cy = y;
    if (!fits(poly, corners(cx, cy, a, c.L, c.W))) {
      const e = nearestEdge(poly, cx, cy);
      const need = c.W/2 + 1;
      if (e.d < need) { cx += e.nx*(need - e.d); cy += e.ny*(need - e.d); }
      let ok = false;
      for (let s = 0; s < 6 && !ok; s++) {
        a = e.ang + (Math.random()-0.5) * 0.9;
        ok = fits(poly, corners(cx, cy, a, c.L, c.W));
        if (!ok) c.L *= 0.8;
      }
      if (!ok) continue;
    }
    chips.push({ ...c, x: cx, y: cy, a, z: Math.random() });
  }

  // ---------- GPU buffers ----------
  const S = 3.1 / 1442;
  const n = chips.length;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("uv", base.getAttribute("uv"));
  geo.instanceCount = n;
  const A = (k) => new Float32Array(n * k);
  const aStart = A(3), aTarget = A(3), aUs = A(3), aNs = A(3), aUt = A(3), aSize = A(2), aRnd = A(4);
  const randUnit = () => { const u = Math.random()*2-1, p = Math.random()*Math.PI*2, q = Math.sqrt(1-u*u); return [q*Math.cos(p), q*Math.sin(p), u]; };
  chips.forEach((c, i) => {
    const r = 1.6 + Math.pow(Math.random(), 0.7) * 5.2, th = Math.random()*Math.PI*2;
    aStart.set([Math.cos(th)*r, (Math.random()-0.5)*3.6*(0.5 + r/7), Math.sin(th)*r*0.7 - 1.0], i*3);
    const layer = c.kind === 2 ? 0.012 : c.z * 0.008;
    aTarget.set([(c.x - 625)*S, -(c.y - 721)*S, layer], i*3);
    const u = randUnit(); let nn = randUnit();
    const d = u[0]*nn[0] + u[1]*nn[1] + u[2]*nn[2];
    nn = [nn[0]-d*u[0], nn[1]-d*u[1], nn[2]-d*u[2]];
    aUs.set(u, i*3); aNs.set(nn, i*3);
    aUt.set([Math.cos(c.a), -Math.sin(c.a), (Math.random()-0.5)*0.05], i*3);
    aSize.set([c.L*S, c.W*S], i*2);
    const strands = c.kind === 2 ? 1 : Math.max(3, Math.round(c.W * 1.6));
    aRnd.set([Math.random(), Math.random(), strands, Math.random()], i*4);
  });
  const IA = (arr, k) => new THREE.InstancedBufferAttribute(arr, k);
  geo.setAttribute("aStart", IA(aStart, 3)); geo.setAttribute("aTarget", IA(aTarget, 3));
  geo.setAttribute("aUs", IA(aUs, 3)); geo.setAttribute("aNs", IA(aNs, 3)); geo.setAttribute("aUt", IA(aUt, 3));
  geo.setAttribute("aSize", IA(aSize, 2)); geo.setAttribute("aRnd", IA(aRnd, 4));

  const uniforms = {
    uTime: { value: 0 }, uProg: { value: RM ? 1 : 0 }, uFade: { value: 0 }, uWhite: { value: 0 }, uTurns: { value: 2 },
    uL1: { value: new THREE.Vector3(0.6, 0.5, 0.8) }, uL2: { value: new THREE.Vector3(-0.7, -0.3, 0.6) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: `
      attribute vec3 aStart; attribute vec3 aTarget; attribute vec3 aUs; attribute vec3 aNs; attribute vec3 aUt;
      attribute vec2 aSize; attribute vec4 aRnd;
      uniform float uTime; uniform float uProg; uniform float uTurns;
      varying vec2 vUv; varying vec3 vT; varying vec3 vW; varying vec4 vRnd; varying float vK; varying float vP;
      vec3 rot(vec3 v, vec3 k, float a){ return v*cos(a) + cross(k,v)*sin(a) + k*dot(k,v)*(1.0-cos(a)); }
      float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
      void main(){
        float ang = uTime * (0.04 + 0.10*aRnd.w);
        float c = cos(ang), s = sin(ang);
        vec3 st = vec3(c*aStart.x - s*aStart.z, aStart.y + sin(uTime*.5 + aRnd.w*6.2831)*.12, s*aStart.x + c*aStart.z);
        float t = ease(clamp((uProg - aRnd.x*0.38) / 0.62, 0., 1.));
        float W = pow(1.0 - smoothstep(0.2, 0.95, uProg), 1.6) * (1.5708 + 6.2832 * uTurns);
        float cw = cos(W), sw = sin(W);
        vec3 tgt = vec3(cw*aTarget.x + sw*aTarget.z, aTarget.y, -sw*aTarget.x + cw*aTarget.z);
        vec3 ut = vec3(cw*aUt.x + sw*aUt.z, aUt.y, -sw*aUt.x + cw*aUt.z);
        vec3 nt = vec3(sw, 0.0, cw);
        vec3 ctr = mix(st, tgt, t);
        ctr += normalize(vec3(-st.z, 0.2, st.x) + 1e-4) * sin(t*3.14159) * (0.4 + 0.9*aRnd.w);
        vec3 u = normalize(mix(aUs, ut, t) + 1e-4);
        vec3 n = normalize(mix(aNs, nt, t) + 1e-4);
        float spin = uTime * (1.0 - t) * (0.6 + aRnd.w);
        vec3 ax = normalize(vec3(aRnd.w-.5, aRnd.y-.5, 1.2));
        u = rot(u, ax, spin); n = rot(n, ax, spin);
        n = normalize(n - dot(n,u)*u);
        vec3 v = cross(n, u);
        vec3 p = ctr + u*position.x*aSize.x + v*position.y*aSize.y;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vW = wp.xyz; vT = normalize(mat3(modelMatrix) * u);
        vUv = uv; vRnd = aRnd; vK = aSize.y; vP = t;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uL1; uniform float uFade; uniform float uWhite;
      varying vec2 vUv; varying vec3 vT; varying vec3 vW; varying vec4 vRnd; varying float vK; varying float vP;
      float h(float x){ return fract(sin(x*127.1 + 311.7) * 43758.5453); }
      void main(){
        float strands = vRnd.z;
        float id = floor(vUv.y * strands);
        float sid = id + vRnd.w * 1000.0;
        float e0 = h(sid) * 0.07, e1 = h(sid + 7.0) * 0.07;
        if (strands > 2. && (vUv.x < e0 || vUv.x > 1.0 - e1)) discard;
        if (strands > 4. && h(sid + 3.0) < 0.05) discard;
        float streak = 0.72 + 0.28 * h(sid + 11.0);
        float g = pow(abs(dot(normalize(vT), normalize(uL1))), 5.0);
        float lum = (0.2 + 0.8 * g) * mix(0.45, 1.0, vP) * mix(0.6, 1.0, vRnd.y) * streak;
        lum = mix(lum, 0.95, smoothstep(0.0, 0.8, uWhite));
        gl_FragColor = vec4(vec3(lum) * uFade, 1.0);
      }`
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  group.children[0].frustumCulled = false;
  scene.add(group);
  const logoMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  POLYS.forEach((poly) => {
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2((x - 625) * S, -(y - 721) * S)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), logoMat);
    m.position.z = 0.03; m.renderOrder = 10;
    group.add(m);
  });

  const resize = () => {
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      group.scale.setScalar(w / hh < 0.8 ? 0.62 : 1);
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    const clock = new THREE.Clock();
    let white = 0;
    const render = () => {
      requestAnimationFrame(render);
      if (!visible) return;
      const t = clock.getElapsedTime();
      mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
      const p = RM ? 1 : hero.prog;
      white += ((RM ? 0 : hero.white) - white) * 0.1;
      uniforms.uTime.value = RM ? 0 : t;
      uniforms.uProg.value = p;
      uniforms.uWhite.value = white;
      logoMat.opacity = Math.max(0, (white - 0.45) / 0.55);
      uniforms.uFade.value += ((loader.dataset.done ? 1 : 0.35) - uniforms.uFade.value) * 0.04;
      uniforms.uL1.value.set(Math.cos(t * 0.35) + mouse.sx * 1.5, Math.sin(t * 0.27) - mouse.sy * 1.5, 0.35);
      group.rotation.y = (mouse.sx * 0.35 * (1 - p * 0.5) + (1 - p) * t * 0.02) * (1 - white * 0.7);
      group.rotation.x = mouse.sy * 0.2 * (1 - white * 0.7);
      camera.position.z = 9.5 - p * 1.7;
      if (SETTLE) {
        // drift up and to the right while assembling, landing beside the headline
        const asp = canvas.clientWidth / canvas.clientHeight, port = asp < 0.8;
        const halfH = Math.tan(17.5 * Math.PI / 180) * camera.position.z, halfW = halfH * asp;
        const cx = port ? 0.70 : 0.78, cy = port ? 0.24 : 0.33, hFrac = port ? 0.26 : 0.42;
        const e = p * p * (3 - 2 * p);
        const base = port ? 0.62 : 1, tgt = hFrac * 2 * halfH / 3.1;
        group.scale.setScalar(base + (tgt - base) * e);
        group.position.set((cx * 2 - 1) * halfW * e, (1 - cy * 2) * halfH * e, 0);
      } else if (AUTO) {
        const asp = canvas.clientWidth / canvas.clientHeight;
        if (asp < 0.8) group.position.set(0, 0.8, 0);
        else group.position.set(Math.min(2.3, 0.315 * camera.position.z * asp - 1.35 * group.scale.x - 0.35), -0.05, 0);
      } else group.position.y = (MOBILE() ? 0.35 : 0.05) * p;
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
    if (AUTO) {
      autoTween = gsap.to(hero, { prog: 1, duration: 4.6, ease: "power1.inOut", delay: 0.2 });
      $$(".hero__stats > div").forEach((el, i) => {
        const b = el.querySelector("b[data-to]");
        gsap.from(el, { opacity: 0, y: 24, duration: 0.9, ease: "power3.out", delay: 1.1 + i * 0.75 });
        if (b) {
          const o = { v: 0 }, end = parseFloat(b.dataset.to), dec = parseInt(b.dataset.dec || "0", 10);
          gsap.to(o, { v: end, duration: 1.4, ease: "expo.out", delay: 1.1 + i * 0.75, onUpdate: () => (b.textContent = (b.dataset.pre || "") + o.v.toFixed(dec) + (b.dataset.suf || "")) });
        }
      });
    }
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
  if (SETTLE) {
    // hero height = scroll needed for the headline to reach the top; the canvas stays pinned until then
    const heroEl = $(".hero"), titleEl = $(".hero__title");
    const sizeHero = () => {
      heroEl.style.height = "";
      const vh = window.innerHeight;
      const releaseY = MOBILE() ? vh * 0.42 : 110;
      const titleTop = titleEl.getBoundingClientRect().top - heroEl.getBoundingClientRect().top;
      heroEl.style.height = Math.max(vh, titleTop - releaseY + vh) + "px";
    };
    sizeHero();
    ScrollTrigger.addEventListener("refreshInit", sizeHero);
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true } })
      .to(hero, { prog: 1, duration: 0.72, ease: "none" }, 0)
      .to([".hero__top", ".hero__scroll"], { opacity: 0, duration: 0.2 }, 0)
      .to(hero, { white: 1, duration: 0.2, ease: "power1.inOut" }, 0.78)
      .to({}, { duration: 0.02 }, 0.98);
  } else if (AUTO) {
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (st) => { if (st.progress > 0.02 && autoTween && autoTween.progress() < 1) autoTween.timeScale(4); } } })
      .to(hero, { white: 1, duration: 0.7, ease: "power1.inOut" }, 0.05)
      .to([".hero__title", ".hero__sub", ".hero__stats"], { opacity: 0, y: -40, duration: 0.5 }, 0.1)
      .to([".hero__top", ".hero__scroll"], { opacity: 0, duration: 0.3 }, 0);
  } else gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true } })
    .to(hero, { prog: 1, duration: 0.66, ease: "none" }, 0)
    .to(".hero__title", { yPercent: -30, opacity: 0, duration: 0.3, ease: "power1.in" }, 0.02)
    .to([".hero__sub", ".hero__top", ".hero__scroll"], { opacity: 0, duration: 0.2 }, 0.02)
    .to(".hero__caption", { opacity: 1, duration: 0.1 }, 0.56)
    .to(".hero__caption", { opacity: 0, duration: 0.08 }, 0.74)
    .to(hero, { white: 1, duration: 0.16, ease: "power1.inOut" }, 0.8)
    .to({}, { duration: 0.04 }, 0.96);

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
