(() => {
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;

  // Dil seçimi (sayfalar arasında hatırlanır)
  const setLang = (l) => {
    root.lang = l;
    $('lang-tr').setAttribute('aria-pressed', l === 'tr');
    $('lang-en').setAttribute('aria-pressed', l === 'en');
    try { localStorage.setItem('be-lang', l); } catch (e) {}
  };
  let saved = 'tr';
  try { saved = localStorage.getItem('be-lang') || 'tr'; } catch (e) {}
  setLang(saved);
  $('lang-tr').addEventListener('click', () => setLang('tr'));
  $('lang-en').addEventListener('click', () => setLang('en'));

  // Mobil menü
  const nav = document.querySelector('.nav');
  const menuBtn = $('menu-btn');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  // E-posta kopyala
  const btn = $('copy-email');
  if (btn) btn.addEventListener('click', () => {
    const el = $('email');
    const done = () => { const old = btn.innerHTML; btn.textContent = root.lang === 'en' ? 'Copied' : 'Kopyalandı'; setTimeout(() => { btn.innerHTML = old; }, 1600); };
    const select = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    if (navigator.clipboard) navigator.clipboard.writeText(el.textContent).then(done, select); else select();
  });

  // Ana sayfa: kanun telleri. İmleç bir telin üstünden geçince tel titreşir.
  const cv = $('strings');
  if (cv) {
    const ctx = cv.getContext('2d');
    const COURSES = 26;
    const brass = css('--brass', '#d6a24a'), line = css('--line', '#3a2c25');
    let W = 0, H = 0, strings = [], last = null, raf = null;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const top = H * 0.08, gap = (H * 0.86) / (COURSES - 1);
      strings = Array.from({ length: COURSES }, (_, i) => ({ y: top + i * gap, amp: 0, t: 0, len: W * (0.55 + 0.45 * (i / (COURSES - 1))) }));
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const s of strings) {
        const x0 = W - s.len, x1 = W, energy = Math.abs(s.amp);
        ctx.strokeStyle = energy > 0.3 ? brass : line;
        ctx.globalAlpha = energy > 0.3 ? Math.min(0.9, 0.35 + energy / 10) : 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 6) {
          const u = (x - x0) / (x1 - x0);
          const y = s.y + s.amp * Math.sin(Math.PI * u) * Math.sin(s.t * 0.9 + u * 3);
          x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.7; ctx.fillStyle = brass;
        ctx.fillRect(x0, s.y - 1.5, 3, 3);
        if (energy > 0.05) { s.amp *= 0.955; s.t += 1.4; alive = true; } else s.amp = 0;
      }
      ctx.globalAlpha = 1;
      raf = alive ? requestAnimationFrame(draw) : null;
    };
    const hero = cv.closest('.hero');
    hero.addEventListener('pointermove', (e) => {
      if (reduce) return;
      const r = cv.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (last) for (const s of strings) {
        if (p.x < W - s.len) continue;
        if ((s.y - last.y) * (s.y - p.y) <= 0 && last.y !== p.y) { s.amp = 7 * Math.sign(p.y - last.y || 1); s.t = 0; }
      }
      if (!raf) raf = requestAnimationFrame(draw);
      last = p;
    });
    hero.addEventListener('pointerleave', () => { last = null; });
    new ResizeObserver(resize).observe(cv);
  }

  // Su sayfası: yüzeyde yavaşça açılan halkalar. Dokununca yeni halka.
  const rv = $('ripple');
  if (rv) {
    const ctx = rv.getContext('2d');
    const aqua = css('--aqua', '#8fb9b2'), brass = css('--brass', '#d6a24a');
    let W = 0, H = 0, rings = [], tick = 0;
    const add = (x, y, gold) => rings.push({ x, y, r: 0, a: 0.55, gold });
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = rv.clientWidth; H = rv.clientHeight;
      rv.width = W * dpr; rv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) drawStatic();
    };
    const ring = (g) => {
      ctx.strokeStyle = g.gold ? brass : aqua;
      ctx.globalAlpha = Math.max(g.a, 0);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    };
    const drawStatic = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 1; i <= 7; i++) ring({ x: W / 2, y: H * 0.55, r: i * W * 0.07, a: 0.6 - i * 0.07, gold: i === 1 });
      ctx.globalAlpha = 1;
    };
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      if (tick++ % 150 === 0) add(W * (0.3 + Math.random() * 0.4), H * (0.4 + Math.random() * 0.3), false);
      rings = rings.filter((g) => g.a > 0);
      for (const g of rings) { ring(g); g.r += 0.45; g.a -= 0.0022; }
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    };
    rv.parentElement.addEventListener('pointerdown', (e) => {
      if (reduce) return;
      const r = rv.getBoundingClientRect();
      add(e.clientX - r.left, e.clientY - r.top, true);
    });
    new ResizeObserver(resize).observe(rv);
    resize();
    if (!reduce) { add(W / 2, H * 0.55, true); loop(); }
  }
})();
