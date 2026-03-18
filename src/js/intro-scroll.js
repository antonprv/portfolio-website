/* ============================================================
   intro-scroll.js
   Section 0: snap-hero   — profile centred
   Section 1: snap-split  — skills left / hero right
   Section 2: projects    — body unlocked, snap-container removed

   While sections 0-1 are active:
     • body has class "snap-active" → overflow:hidden
     • .snap-container is position:fixed, covers everything
   When going to section 2:
     • snap-container gets class "is-leaving" → slides up + fades
     • after animation: snap-container hidden, body overflow restored
   Back from projects (scroll up at top):
     • snap-container restored instantly, section 1 shown
============================================================ */
(function () {
  'use strict';

  /* ── Mobile guard ── */
  if (window.matchMedia('(max-width: 900px)').matches) return;

  const body          = document.body;
  const snapContainer = document.getElementById('snap-container');
  const snapHero      = document.getElementById('snap-hero');
  const snapSplit     = document.getElementById('snap-split');
  const sectionProj   = document.getElementById('section-projects');
  const navDots       = document.querySelectorAll('.section-nav__dot');

  if (!snapContainer || !snapHero || !snapSplit) return;

  /* ── State ── */
  let current        = 0;       // 0 = hero, 1 = split, 2 = projects
  let transitioning  = false;
  let projMode       = false;   // true when projects visible
  let wheelAccum     = 0;
  let lastWheelTime  = 0;
  const WHEEL_THR    = 50;
  const ANIM_DUR     = 700;     // ms, matches CSS 0.7s
  const EASE         = 'cubic-bezier(0.77, 0, 0.18, 1)';

  /* ── Init ── */
  body.classList.add('snap-active');

  /* Position both sections absolutely inside the container */
  snapHero.style.cssText  += '; transition: transform 0.7s ' + EASE;
  snapSplit.style.cssText += '; transition: transform 0.7s ' + EASE;
  snapHero.style.transform  = 'translateY(0)';
  snapSplit.style.transform = 'translateY(100%)';

  /* ── Sync split hero from section 0 ── */
  function syncSplitHero() {
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

    const av = snapHero.querySelector('.avatar');
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

  /* ── Update nav dots ── */
  function updateDots(idx) {
    navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  /* ── Go to section ── */
  function goTo(idx, instant) {
    if (transitioning) return;
    if (idx === current && !instant) return;
    transitioning = true;
    current = idx;
    updateDots(idx);

    const t = instant ? '0s' : '0.7s ' + EASE;

    if (idx === 2) {
      /* ── Enter projects ── */
      projMode = true;
      snapContainer.style.transition = 'transform 0.7s ' + EASE + ', opacity 0.5s ease';
      snapContainer.classList.add('is-leaving');
      setTimeout(() => {
        snapContainer.style.display = 'none';
        body.classList.remove('snap-active');
        transitioning = false;
      }, ANIM_DUR);

    } else {
      /* ── Snap section 0 or 1 ── */
      if (projMode) {
        /* Come back from projects */
        projMode = false;
        snapContainer.style.display = '';
        snapContainer.style.transition = 'none';
        snapContainer.classList.remove('is-leaving');
        /* Force reflow */
        snapContainer.getBoundingClientRect();
        body.classList.add('snap-active');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      snapHero.style.transition  = 'transform ' + t;
      snapSplit.style.transition = 'transform ' + t;

      if (idx === 0) {
        snapHero.style.transform  = 'translateY(0)';
        snapSplit.style.transform = 'translateY(100%)';
        snapSplit.classList.remove('is-active');
      } else {
        snapHero.style.transform  = 'translateY(-100%)';
        snapSplit.style.transform = 'translateY(0)';
        syncSplitHero();
        setTimeout(() => snapSplit.classList.add('is-active'), 150);
      }

      setTimeout(() => { transitioning = false; }, ANIM_DUR);
    }
  }

  /* ── Wheel on snap-container ── */
  snapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelTime > 350) wheelAccum = 0;
    lastWheelTime = now;
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) < WHEEL_THR) return;
    const dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    const next = current + dir;
    if (next >= 0 && next <= 2) goTo(next);
  }, { passive: false });

  /* ── Wheel on page (projects) — return to section 1 at top ── */
  document.addEventListener('wheel', (e) => {
    if (!projMode) return;
    if (e.deltaY < -40 && window.scrollY === 0) goTo(1);
  }, { passive: true });

  /* ── Touch ── */
  let ty0 = 0;
  snapContainer.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
  snapContainer.addEventListener('touchend', e => {
    const d = ty0 - e.changedTouches[0].clientY;
    if (Math.abs(d) < 40) return;
    const next = current + (d > 0 ? 1 : -1);
    if (next >= 0 && next <= 2) goTo(next);
  }, { passive: true });

  /* ── Keyboard ── */
  document.addEventListener('keydown', e => {
    if (['ArrowDown','PageDown'].includes(e.key) && current < 2) { e.preventDefault(); goTo(current + 1); }
    if (['ArrowUp','PageUp'].includes(e.key)   && current > 0) { e.preventDefault(); goTo(current - 1); }
  });

  /* ── Nav dots ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Sync split hero once config loads ── */
  const si = setInterval(() => {
    const fn = document.getElementById('first-name');
    if (fn && fn.textContent.trim()) { syncSplitHero(); clearInterval(si); }
  }, 80);

})();
