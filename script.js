/* ==========================================================================
   MADDAZXD — GLOBAL SCRIPT
   Every module null-checks its own elements so it runs safely on any page.
   ========================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ------------------------------------------------------------------ *
   * 0. THEME / LANGUAGE — persisted across pages via localStorage
   * ------------------------------------------------------------------ */
  function storageGet(key, fallback){
    try{ const v = window.localStorage.getItem(key); return v === null ? fallback : v; }
    catch(e){ return fallback; }
  }
  function storageSet(key, value){
    try{ window.localStorage.setItem(key, value); } catch(e){ /* storage unavailable — ignore */ }
  }

  const state = {
    theme: storageGet('mz_theme', 'light'),
    lang: storageGet('mz_lang', 'id')
  };

  function applyTheme(t){
    state.theme = t;
    storageSet('mz_theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.querySelectorAll('.theme-toggle .icon-sun').forEach(el => el.style.display = t === 'dark' ? 'block' : 'none');
    document.querySelectorAll('.theme-toggle .icon-moon').forEach(el => el.style.display = t === 'dark' ? 'none' : 'block');
  }

  function applyLang(l){
    state.lang = l;
    storageSet('mz_lang', l);
    document.querySelectorAll('[data-lang]').forEach(el => {
      el.classList.toggle('is-active', el.getAttribute('data-lang') === l);
    });
    document.querySelectorAll('.lang-btn').forEach(el => { el.textContent = l === 'id' ? 'EN' : 'ID'; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    applyLang(state.lang);

    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
    });
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.addEventListener('click', () => applyLang(state.lang === 'id' ? 'en' : 'id'));
    });
  });

  /* ------------------------------------------------------------------ *
   * 2. CUSTOM MORPHING / MAGNETIC CURSOR
   * ------------------------------------------------------------------ */
  if (!isTouch){
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = window.innerWidth/2, my = window.innerHeight/2;
    let rx = mx, ry = my;
    let cursorRAF = null;

    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    function loopCursor(){
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      cursorRAF = requestAnimationFrame(loopCursor);
    }
    cursorRAF = requestAnimationFrame(loopCursor);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden){
        if (cursorRAF) cancelAnimationFrame(cursorRAF);
        cursorRAF = null;
      } else if (!cursorRAF){
        cursorRAF = requestAnimationFrame(loopCursor);
      }
    });

    document.addEventListener('mouseover', e => {
      const link = e.target.closest('a, button, .icon-btn, .bento-item, .masonry figure');
      const text = e.target.closest('h1, h2, h3, p, .t-hero, .t-h1, .t-h2');
      ring.classList.toggle('is-link', !!link);
      ring.classList.toggle('is-text', !!text && !link);
    });

    // magnetic buttons
    document.querySelectorAll('.btn, .icon-btn').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const relX = e.clientX - r.left - r.width/2;
        const relY = e.clientY - r.top - r.height/2;
        el.style.transform = `translate(${relX*0.28}px, ${relY*0.28}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. FLUID CANVAS BACKGROUND — slow moving gradient blobs
   * ------------------------------------------------------------------ */
  const canvas = document.getElementById('bg-canvas');
  if (canvas && canvas.getContext){
    const ctx = canvas.getContext('2d');
    let w, h, dpr = Math.min(window.devicePixelRatio || 1, 1.4);

    function resize(){
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    const isDark = () => document.documentElement.classList.contains('dark');
    const blobs = [
      { x:.2, y:.3, r:.42, c:[139,122,99],  s:0.00011, a:0 },
      { x:.8, y:.25,r:.38, c:[62,64,70],    s:0.00014, a:2 },
      { x:.5, y:.85,r:.46, c:[167,152,121], s:0.00009, a:4 }
    ];

    let canvasRAF = null;

    function draw(t){
      ctx.clearRect(0,0,w,h);
      const bgc = isDark() ? '20,21,26' : '245,243,238';
      ctx.fillStyle = `rgb(${bgc})`;
      ctx.fillRect(0,0,w,h);

      blobs.forEach(b => {
        const bx = (b.x + Math.sin(t*b.s + b.a)*0.06) * w;
        const by = (b.y + Math.cos(t*b.s*0.8 + b.a)*0.06) * h;
        const r = b.r * Math.max(w,h);
        const grad = ctx.createRadialGradient(bx,by,0,bx,by,r);
        const alpha = isDark() ? 0.12 : 0.07;
        grad.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${alpha})`);
        grad.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx,by,r,0,Math.PI*2);
        ctx.fill();
      });

      if (!reduceMotion && !document.hidden) canvasRAF = requestAnimationFrame(draw);
    }
    canvasRAF = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !canvasRAF && !reduceMotion){
        canvasRAF = requestAnimationFrame(draw);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. NAV — scroll state + mobile burger
   * ------------------------------------------------------------------ */
  const nav = document.querySelector('.site-nav');
  if (nav){
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });
  }
  const burger = document.querySelector('.nav-burger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav){
    const setOpen = (open) => {
      mobileNav.classList.toggle('is-open', open);
      if (nav) nav.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setOpen(!mobileNav.classList.contains('is-open')));
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  }

  /* ------------------------------------------------------------------ *
   * 5. (Initial preloader logic now lives as an inline <script> directly
   *    inside index.html — see that file. This keeps it working even in
   *    restrictive preview environments that block external script files,
   *    and avoids double-handling the same element from two places.)
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   * 6. SCROLL REVEALS — .reveal fade-up, .mask type reveal, stagger
   * ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll('.reveal, .mask, .lattice-path, .tl-item');
  if (revealEls.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el, i) => {
      el.style.setProperty('--i', i % 8);
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. TIMELINE PROGRESS LINE (about.html)
   * ------------------------------------------------------------------ */
  const timeline = document.querySelector('.timeline');
  if (timeline){
    const progress = timeline.querySelector('.tl-progress');
    const updateProgress = () => {
      const r = timeline.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.7;
      const visible = Math.min(Math.max(viewportCenter - r.top, 0), r.height);
      if (progress) progress.style.height = visible + 'px';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive:true });
    window.addEventListener('resize', updateProgress);
  }

  /* ------------------------------------------------------------------ *
   * 8. 3D TILT — cards react to mouse position
   * ------------------------------------------------------------------ */
  if (!isTouch){
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px*10}deg) rotateX(${-py*10}deg) scale(1.015)`;
        el.style.setProperty('--mx', `${(px+0.5)*100}%`);
        el.style.setProperty('--my', `${(py+0.5)*100}%`);
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) scale(1)';
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 8b. PROJECT DETAIL MODAL (portfolio.html) — click a card to expand it
   * ------------------------------------------------------------------ */
  const projectCards = document.querySelectorAll('.bento-item[data-project]');
  const projectModal = document.querySelector('.project-modal');
  if (projectCards.length && projectModal){
    const modalBody = projectModal.querySelector('.project-modal-body');
    const modalClose = projectModal.querySelector('.project-modal-close');

    function openModal(card){
      const detail = card.querySelector('.b-detail');
      if (!detail || !modalBody) return;
      modalBody.innerHTML = detail.innerHTML;
      // re-apply the active language to the freshly cloned content
      modalBody.querySelectorAll('[data-lang]').forEach(el => {
        el.classList.toggle('is-active', el.getAttribute('data-lang') === state.lang);
      });
      projectModal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      modalBody.scrollTop = 0;
    }
    function closeModal(){
      projectModal.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    projectCards.forEach(card => {
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => openModal(card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openModal(card); }
      });
    });
    if (modalClose) modalClose.addEventListener('click', closeModal);
    projectModal.addEventListener('click', e => { if (e.target === projectModal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  /* ------------------------------------------------------------------ *
   * 9. TOAST NOTIFICATIONS
   * ------------------------------------------------------------------ */
  function toast(msg){
    let stack = document.querySelector('.toast-stack');
    if (!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="dot"></span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 420);
    }, 3200);
  }
  window.MZtoast = toast;

  /* ------------------------------------------------------------------ *
   * 10. CONTACT FORM — floating labels + validation + FormSubmit
   * ------------------------------------------------------------------ */
  const form = document.querySelector('.contact-form');
  if (form){
    form.querySelectorAll('.field input, .field textarea').forEach(input => {
      const field = input.closest('.field');
      const sync = () => field.classList.toggle('has-value', input.value.trim().length > 0);
      input.addEventListener('focus', () => field.classList.add('is-active'));
      input.addEventListener('blur', () => { field.classList.remove('is-active'); sync(); });
      sync();
    });

    form.addEventListener('submit', e => {
      let ok = true;
      form.querySelectorAll('[data-required]').forEach(input => {
        const field = input.closest('.field');
        const err = field.querySelector('.err');
        let message = '';
        const val = input.value.trim();
        if (!val){
          message = state.lang === 'id' ? 'Kolom ini wajib diisi.' : 'This field is required.';
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){
          message = state.lang === 'id' ? 'Masukkan alamat email yang valid.' : 'Enter a valid email address.';
        }
        if (message){ ok = false; }
        if (err) err.textContent = message;
      });
      if (!ok){
        e.preventDefault();
        toast(state.lang === 'id' ? 'Mohon lengkapi formulir dengan benar.' : 'Please complete the form correctly.');
      } else {
        toast(state.lang === 'id' ? 'Pesan terkirim. Terima kasih!' : 'Message sent. Thank you!');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 11. LOCAL TIME WIDGET — Asia/Jakarta (WIB)
   * ------------------------------------------------------------------ */
  const clockEl = document.querySelector('.time-widget .clock');
  if (clockEl){
    function tick(){
      const now = new Date();
      const opts = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:false };
      clockEl.textContent = new Intl.DateTimeFormat('en-GB', opts).format(now);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ *
   * 12. MASONRY LIGHTBOX (gallery.html)
   * ------------------------------------------------------------------ */
  const figures = document.querySelectorAll('.masonry figure[data-full]');
  const lightbox = document.querySelector('.lightbox');
  if (figures.length && lightbox){
    const lbImg = lightbox.querySelector('img');
    const lbCap = lightbox.querySelector('.lightbox-cap');
    figures.forEach(fig => {
      fig.addEventListener('click', () => {
        lbImg.src = fig.getAttribute('data-full');
        lbImg.alt = fig.querySelector('img')?.alt || '';
        lbCap.textContent = fig.querySelector('figcaption')?.textContent || '';
        lightbox.classList.add('is-open');
      });
    });
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target.closest('.lightbox-close')) lightbox.classList.remove('is-open');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('is-open'); });
  }

  /* ------------------------------------------------------------------ *
   * 13. HERO TYPEWRITER (index.html)
   * ------------------------------------------------------------------ */
  const typeEl = document.querySelector('.hero-type .type-text');
  if (typeEl){
    const linesId = ["Menjembatani Etika Ekonomi Syariah dengan Logika Teknologi Modern."];
    const linesEn = ["Bridging the Ethics of Sharia Economics with the Logic of Advanced Technology."];
    let li = 0, ci = 0, deleting = false;
    function type(){
      const lines = state.lang === 'id' ? linesId : linesEn;
      const full = lines[li % lines.length];
      ci += deleting ? -1 : 1;
      typeEl.textContent = full.slice(0, ci);
      let delay = deleting ? 22 : 42;
      if (!deleting && ci === full.length){ delay = 1800; deleting = true; }
      else if (deleting && ci === 0){ deleting = false; li++; delay = 400; }
      setTimeout(type, delay);
    }
    type();
  }

  /* ------------------------------------------------------------------ *
   * 14. COUNTERS — animate numbers when in view
   * ------------------------------------------------------------------ */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length){
    const cio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-count'));
        const suffix = el.getAttribute('data-suffix') || '';
        let cur = 0;
        const step = target / 40;
        const run = () => {
          cur += step;
          if (cur >= target){ el.textContent = target + suffix; return; }
          el.textContent = Math.floor(cur) + suffix;
          requestAnimationFrame(run);
        };
        run();
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => cio.observe(el));
  }

})();
