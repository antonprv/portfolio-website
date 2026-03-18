/* ============================================================
   intro-scroll.js
   Three snap sections all inside .snap-container (position:fixed).
   Each section uses translateY to flip in/out — no opacity tricks.

   Classes:
     .is-current → translateY(0)      — visible
     .is-prev    → translateY(-100%)  — above viewport
     (neither)   → translateY(100%)   — below viewport (default)

   Section 0: #snap-hero
   Section 1: #snap-split
   Section 2: #snap-projects  (has its own internal scroll + custom scrollbar)
============================================================ */
(function () {
  'use strict';

  /* ── Mobile: do nothing, CSS handles static layout ── */
  if (window.matchMedia('(max-width: 900px)').matches) return;

  const sections   = ['snap-hero', 'snap-split', 'snap-projects'].map(id => document.getElementById(id));
  const navDots    = document.querySelectorAll('.section-nav__dot');
  const projScroll = document.getElementById('projects-scroll');
  const sbThumb    = document.getElementById('scrollbar-thumb');
  const sbTrack    = document.getElementById('custom-scrollbar');

  if (!sections[0] || !sections[1] || !sections[2]) return;

  let current      = 0;
  let transitioning = false;
  const ANIM_DUR   = 700;
  const EASE       = 'cubic-bezier(0.77, 0, 0.18, 1)';
  let wheelAccum   = 0;
  let lastWheel    = 0;
  const WHEEL_THR  = 50;

  /* ── Apply section states ── */
  function applyStates(idx, instant) {
    sections.forEach((el, i) => {
      const t = instant ? '0s' : `0.7s ${EASE}`;
      el.style.transition = `transform ${t}`;
      el.classList.remove('is-current', 'is-prev');
      if (i === idx)      el.classList.add('is-current');
      else if (i < idx)   el.classList.add('is-prev');
      // i > idx → no class → translateY(100%) via CSS default
    });
    navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  /* ── Sync split hero from section 0 ── */
  function syncSplitHero() {
    const hero0 = sections[0];
    const hero1 = sections[1];
    if (!hero0 || !hero1) return;

    const copy = (fromId, toId) => {
      const a = document.getElementById(fromId);
      const b = document.getElementById(toId);
      if (!a || !b) return;
      b.innerHTML = a.innerHTML;
      if (a.dataset.ru) { b.dataset.ru = a.dataset.ru; b.dataset.en = a.dataset.en; }
    };
    copy('first-name', 'first-name-split');
    copy('last-name',  'last-name-split');
    copy('tagline',    'tagline-split');

    const av  = hero0.querySelector('.avatar');
    const av2 = document.getElementById('avatar-split');
    if (av && av2) {
      av2.src = av.src; av2.alt = av.alt;
      if (av.style.display === 'none') {
        av2.style.display = 'none';
        const ph = av2.nextElementSibling;
        if (ph) ph.style.display = 'flex';
      }
    }
    ['github','telegram','email','linkedin'].forEach(id => {
      const a = document.getElementById('link-' + id);
      const b = document.getElementById('link-' + id + '-split');
      if (!a || !b) return;
      b.href = a.href;
      b.style.display = a.style.display || '';
    });
  }

  /* ── Navigate ── */
  function goTo(idx, instant) {
    if (transitioning && !instant) return;
    if (idx < 0 || idx > 2) return;

    transitioning = true;
    const prev = current;
    current = idx;

    applyStates(idx, instant);

    /* Trigger split panel animation */
    if (idx === 1) {
      sections[1].classList.remove('is-active');
      syncSplitHero();
      setTimeout(() => sections[1].classList.add('is-active'), 150);
    } else {
      sections[1].classList.remove('is-active');
    }

    /* Reset project scroll when entering section 2 */
    if (idx === 2 && projScroll) {
      projScroll.scrollTop = 0;
      updateScrollbar();
    }

    setTimeout(() => { transitioning = false; }, instant ? 0 : ANIM_DUR);
  }

  /* ── Custom scrollbar ── */
  function updateScrollbar() {
    if (!projScroll || !sbThumb || !sbTrack) return;
    const ratio     = projScroll.clientHeight / projScroll.scrollHeight;
    const thumbH    = Math.max(40, sbTrack.clientHeight * ratio);
    const maxTop    = sbTrack.clientHeight - thumbH;
    const scrolled  = projScroll.scrollTop / (projScroll.scrollHeight - projScroll.clientHeight);
    const thumbTop  = maxTop * scrolled;
    sbThumb.style.height = thumbH + 'px';
    sbThumb.style.top    = thumbTop + 'px';
  }

  if (projScroll) {
    projScroll.addEventListener('scroll', updateScrollbar, { passive: true });
    /* Drag scrollbar thumb */
    let dragging = false, dragStartY = 0, dragStartScrollTop = 0;
    sbThumb.addEventListener('mousedown', e => {
      dragging = true;
      dragStartY = e.clientY;
      dragStartScrollTop = projScroll.scrollTop;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dy       = e.clientY - dragStartY;
      const trackH   = sbTrack.clientHeight;
      const thumbH   = sbThumb.clientHeight;
      const ratio    = projScroll.scrollHeight / trackH;
      projScroll.scrollTop = dragStartScrollTop + dy * ratio;
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      document.body.style.userSelect = '';
    });
    /* Click on track to jump */
    sbTrack.addEventListener('click', e => {
      if (e.target === sbThumb) return;
      const rect    = sbTrack.getBoundingClientRect();
      const clickY  = e.clientY - rect.top;
      const ratio   = clickY / sbTrack.clientHeight;
      projScroll.scrollTop = ratio * (projScroll.scrollHeight - projScroll.clientHeight);
    });
    /* Init */
    setTimeout(updateScrollbar, 300);
    new ResizeObserver(updateScrollbar).observe(projScroll);
  }

  /* ── Wheel handler ── */
  document.addEventListener('wheel', e => {
    const now = Date.now();
    if (now - lastWheel > 350) wheelAccum = 0;
    lastWheel = now;

    /* On projects section, let internal scroll handle first */
    if (current === 2 && projScroll) {
      const atTop    = projScroll.scrollTop <= 0;
      const atBottom = projScroll.scrollTop + projScroll.clientHeight >= projScroll.scrollHeight - 1;

      if (e.deltaY < 0 && atTop) {
        /* Scroll up at top of projects → go to section 1 */
        e.preventDefault();
        goTo(1);
        wheelAccum = 0;
        return;
      }
      if (e.deltaY > 0 && !atBottom) {
        /* Let project scroll handle it */
        return;
      }
    }

    e.preventDefault();
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) < WHEEL_THR) return;
    const dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    goTo(current + dir);
  }, { passive: false });

  /* ── Touch ── */
  let ty0 = 0;
  document.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    const d = ty0 - e.changedTouches[0].clientY;
    if (Math.abs(d) < 40) return;

    if (current === 2 && projScroll) {
      const atTop    = projScroll.scrollTop <= 0;
      const atBottom = projScroll.scrollTop + projScroll.clientHeight >= projScroll.scrollHeight - 1;
      if (d < 0 && atTop)    { goTo(1); return; }
      if (d > 0 && !atBottom) return;
    }
    goTo(current + (d > 0 ? 1 : -1));
  }, { passive: true });

  /* ── Keyboard ── */
  document.addEventListener('keydown', e => {
    if (['ArrowDown','PageDown'].includes(e.key) && current < 2) { e.preventDefault(); goTo(current + 1); }
    if (['ArrowUp','PageUp'].includes(e.key)   && current > 0) { e.preventDefault(); goTo(current - 1); }
  });

  /* ── Nav dots ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Init ── */
  applyStates(0, true);

  /* Sync split hero once config loads */
  const si = setInterval(() => {
    const fn = document.getElementById('first-name');
    if (fn && fn.textContent.trim()) { syncSplitHero(); clearInterval(si); }
  }, 80);

})();
