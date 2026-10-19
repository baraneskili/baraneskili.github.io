(() => {
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;

  // Sayfalar arası geçişte her sayfa en üstten açılsın (#bağlantı yoksa).
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => { if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' }); };
  toTop(); addEventListener('pageshow', toTop);

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

  // Ana sayfa: kanun telleri. Her nota üç telden (bir "koro"); imleç geçince titreşir ve, ses açıksa, kısık bir kanun sesi çıkar.
  const cv = $('strings');
  if (cv) {
    const ctx = cv.getContext('2d');
    const COURSES = 26, TRIPLE = [-2.4, 0, 2.4];
    const brass = css('--brass', '#d6a24a'), line = css('--line', '#3a2c25');
    let W = 0, H = 0, strings = [], last = null, raf = null;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const top = H * 0.08, gap = (H * 0.86) / (COURSES - 1);
      strings = Array.from({ length: COURSES }, (_, i) => ({ i, y: top + i * gap, amp: 0, t: 0, len: W * (0.55 + 0.45 * (i / (COURSES - 1))), at: 0 }));
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const s of strings) {
        const x0 = W - s.len, x1 = W, energy = Math.abs(s.amp);
        ctx.strokeStyle = energy > 0.3 ? brass : line;
        ctx.lineWidth = 0.8;
        TRIPLE.forEach((off, k) => {
          ctx.globalAlpha = energy > 0.3 ? Math.min(0.85, 0.3 + energy / 10) : 0.5;
          ctx.beginPath();
          for (let x = x0; x <= x1; x += 6) {
            const u = (x - x0) / (x1 - x0);
            const y = s.y + off + s.amp * Math.sin(Math.PI * u) * Math.sin(s.t * (0.86 + k * 0.05) + u * 3);
            x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 0.7; ctx.fillStyle = brass;
        ctx.fillRect(x0, s.y - 4, 3, 8);
        if (energy > 0.05) { s.amp *= 0.955; s.t += 1.4; alive = true; } else s.amp = 0;
      }
      ctx.globalAlpha = 1;
      raf = alive ? requestAnimationFrame(draw) : null;
    };

    // Ses: gerçek kanun kaydından (Barış Bozkurt, Freesound, CC0) kesilmiş 26 nota, Hicaz dizisinde (A dügah; dik kürdi, nim hicaz).
    // Notalar tek bir dosyada 1,8 sn arayla; alttaki uzun teller pes.
    let ac = null, master = null, soundOn = false, sprite = null;
    const loadSprite = () => fetch('assets/kanun-hicaz.mp3').then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((d) => { sprite = d; }).catch(() => {});
    const play = (i) => {
      if (!soundOn || !ac || !sprite) return;
      const s = strings[i], now = ac.currentTime;
      if (now - s.at < 0.09) return; s.at = now;
      const n = COURSES - 1 - i;
      // Üçlü tel: aynı nota üç kez, çok az akort farkı ve birkaç ms arayla.
      [[0, 1], [0.006, 1.0035], [0.011, 0.9968]].forEach(([dt, rate], k) => {
        const src = ac.createBufferSource(); src.buffer = sprite; src.playbackRate.value = rate;
        const g = ac.createGain(); g.gain.value = k ? 0.5 : 0.8;
        src.connect(g).connect(master); src.start(now + dt, n * 1.8, 1.7);
      });
    };
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn ghost strings-sound'; btn.setAttribute('aria-pressed', 'false');
    const label = () => { btn.innerHTML = soundOn ? '<span data-l="tr">♪ Sesi kapat</span><span data-l="en">♪ Mute</span>' : '<span data-l="tr">♪ Telleri duy</span><span data-l="en">♪ Hear the strings</span>'; };
    label();
    let muted = false;
    const enable = () => {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination); loadSprite(); }
      ac.resume(); soundOn = !muted; btn.setAttribute('aria-pressed', soundOn); label();
    };
    // Tarayıcılar sesi ilk dokunuştan önce açmaz: sayfada herhangi bir yere ilk tıklamada ses açılır.
    addEventListener('pointerdown', (e) => { if (!ac && e.target !== btn) enable(); }, { once: false, passive: true });
    btn.addEventListener('click', () => { if (ac && soundOn) { muted = true; soundOn = false; btn.setAttribute('aria-pressed', 'false'); label(); } else { muted = false; enable(); } });
    const hero = cv.closest('.hero');
    (hero.querySelector('.ctas') || hero).appendChild(btn);
    hero.addEventListener('pointermove', (e) => {
      if (reduce) return;
      const r = cv.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (last) for (const s of strings) {
        if (p.x < W - s.len) continue;
        if ((s.y - last.y) * (s.y - p.y) <= 0 && last.y !== p.y) { s.amp = 7 * Math.sign(p.y - last.y || 1); s.t = 0; play(s.i); }
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
