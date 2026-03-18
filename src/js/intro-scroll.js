/* ============================================================
   intro-scroll.js  — snap navigation between 3 sections
   Section 0: #snap-hero     (profile centred)
   Section 1: #snap-split    (skills left / hero right)
   Section 2: #section-projects  (normal page scroll)
   ============================================================ */
(function () {
  'use strict';

  const snapContainer = document.getElementById('snap-container');
  const snapHero      = document.getElementById('snap-hero');
  const snapSplit     = document.getElementById('snap-split');
  const sectionProj   = document.getElementById('section-projects');
  const navDots       = document.querySelectorAll('.section-nav__dot');

  if (!snapContainer || !snapHero || !snapSplit) return;

  /* ── State ── */
  let currentSection = 0;
  let isTransitioning = false;
  let projVisible = false;
  let wheelAccum = 0;
  let lastWheelTime = 0;
  const WHEEL_THRESHOLD = 50;
  let touchStartY = 0;

  /* ── Initial layout: position sections absolutely ── */
  snapContainer.style.overflow    = 'hidden';
  snapContainer.style.scrollSnapType = 'none';

  function positionSections() {
    [snapHero, snapSplit].forEach(el => {
      el.style.position = 'absolute';
      el.style.top      = '0';
      el.style.left     = '0';
      el.style.width    = '100%';
      el.style.height   = '100%';
    });
    snapHero.style.transform  = 'translateY(0)';
    snapSplit.style.transform = 'translateY(100vh)';
  }
  positionSections();

  /* ── Sync split hero content from section 1 ── */
  function syncSplitHero() {
    const copy = (fromId, toId) => {
      const from = document.getElementById(fromId);
      const to   = document.getElementById(toId);
      if (!from || !to) return;
      to.innerHTML = from.innerHTML;
      ['ru','en'].forEach(lang => {
        if (from.dataset[lang]) to.dataset[lang] = from.dataset[lang];
      });
    };
    copy('first-name', 'first-name-split');
    copy('last-name',  'last-name-split');
    copy('tagline',    'tagline-split');

    const avatarMain  = snapHero.querySelector('.avatar');
    const avatarSplit = document.getElementById('avatar-split');
    if (avatarMain && avatarSplit) {
      avatarSplit.src = avatarMain.src;
      avatarSplit.alt = avatarMain.alt;
      if (avatarMain.style.display === 'none') {
        avatarSplit.style.display = 'none';
        const ph = avatarSplit.nextElementSibling;
        if (ph) ph.style.display = 'flex';
      }
    }

    ['github','telegram','email','linkedin'].forEach(id => {
      const main  = document.getElementById('link-' + id);
      const split = document.getElementById('link-' + id + '-split');
      if (!main || !split) return;
      split.href = main.href;
      split.style.display = main.style.display || '';
    });
  }

  /* ── Navigate ── */
  const EASE = 'cubic-bezier(0.77, 0, 0.18, 1)';
  const DUR  = '0.7s';

  function goTo(index, smooth) {
    if (isTransitioning) return;
    if (smooth === undefined) smooth = true;
    isTransitioning = true;
    currentSection  = index;

    navDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));

    const t = smooth ? DUR : '0s';

    if (index < 2) {
      /* Show snap container if hidden */
      if (projVisible) {
        projVisible = false;
        snapContainer.style.transition = `transform ${t} ${EASE}, opacity 0.4s ease`;
        snapContainer.style.transform  = 'translateY(0)';
        snapContainer.style.opacity    = '1';
        snapContainer.style.pointerEvents = '';
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      snapHero.style.transition  = `transform ${t} ${EASE}`;
      snapSplit.style.transition = `transform ${t} ${EASE}`;

      if (index === 0) {
        snapHero.style.transform  = 'translateY(0)';
        snapSplit.style.transform = 'translateY(100vh)';
        snapSplit.classList.remove('is-active');
      } else {
        snapHero.style.transform  = 'translateY(-100vh)';
        snapSplit.style.transform = 'translateY(0)';
        syncSplitHero();
        setTimeout(() => snapSplit.classList.add('is-active'), 200);
      }

    } else {
      /* Slide snap container up → reveal projects */
      projVisible = true;
      snapContainer.style.transition = `transform ${t} ${EASE}, opacity 0.5s ease`;
      snapContainer.style.transform  = 'translateY(-100vh)';
      snapContainer.style.opacity    = '0';
      snapContainer.style.pointerEvents = 'none';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    setTimeout(() => { isTransitioning = false; }, 750);
  }

  /* ── Wheel ── */
  snapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelTime > 350) wheelAccum = 0;
    lastWheelTime = now;
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
    const dir  = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    const next = currentSection + dir;
    if (next >= 0 && next <= 2) goTo(next);
  }, { passive: false });

  /* Scroll back to section 2 from projects when at top */
  document.addEventListener('wheel', (e) => {
    if (!projVisible) return;
    if (e.deltaY < -40 && window.scrollY === 0) goTo(1);
  }, { passive: true });

  /* ── Touch ── */
  snapContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  snapContainer.addEventListener('touchend', (e) => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 40) return;
    const next = currentSection + (delta > 0 ? 1 : -1);
    if (next >= 0 && next <= 2) goTo(next);
  }, { passive: true });

  /* ── Keyboard ── */
  document.addEventListener('keydown', (e) => {
    if (['ArrowDown','PageDown'].includes(e.key)) {
      if (currentSection < 2) { e.preventDefault(); goTo(currentSection + 1); }
    }
    if (['ArrowUp','PageUp'].includes(e.key)) {
      if (currentSection > 0) { e.preventDefault(); goTo(currentSection - 1); }
    }
  });

  /* ── Nav dot clicks ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Sync split hero once config loads ── */
  const syncInterval = setInterval(() => {
    const fn = document.getElementById('first-name');
    if (fn && fn.textContent.trim()) { syncSplitHero(); clearInterval(syncInterval); }
  }, 80);

  /* ── Mobile: disable everything ── */
  if (window.matchMedia('(max-width: 900px)').matches) {
    snapContainer.style.cssText = '';
    snapHero.style.cssText  = '';
    snapSplit.style.cssText = '';
  }

})();
