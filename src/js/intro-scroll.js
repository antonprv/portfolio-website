/* ============================================================
   intro-scroll.js
   0 = stage hero centred (bio visible)
   1 = stage split (hero right, skills left, bio hidden)
   2 = projects

   Transition 0→1 animation sequence:
   1. Hero + skills slide horizontally (hero right, skills left)
   2. Bio fades out simultaneously
   3. hero-top slides DOWN, hero-bottom slides UP — squeezing
      together into the centre of the right panel
============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(max-width: 900px)').matches) return;

  const snapContainer = document.getElementById('snap-container');
  const snapStage     = document.getElementById('snap-stage');
  const snapProj      = document.getElementById('snap-projects');
  const stageHero     = document.getElementById('stage-hero');
  const stageSkills   = document.getElementById('stage-skills');
  const heroBio       = document.getElementById('bio');
  const heroTop       = document.getElementById('hero-top');
  const heroBottom    = document.getElementById('hero-bottom');
  const projScroll    = document.getElementById('projects-scroll');
  const sbThumb       = document.getElementById('scrollbar-thumb');
  const sbTrack       = document.getElementById('custom-scrollbar');
  const navDots       = document.querySelectorAll('.section-nav__dot');

  if (!snapContainer || !snapStage || !snapProj || !stageHero || !stageSkills) return;

  let current       = 0;
  let transitioning = false;
  const DUR         = 600;                              // slightly longer = smoother
  const EASE        = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // ease-out-quad — natural deceleration
  const EASE_SNAP   = 'cubic-bezier(0.4, 0, 0.2, 1)';         // material standard — not too snappy
  let wheelAccum    = 0, lastWheel = 0;
  const WHEEL_THR   = 60;   // higher threshold = less accidental triggers

  /* Inertia / overscroll guard:
     After a section transition fires, ignore all wheel events for
     POST_LOCK ms. This prevents trackpad momentum from immediately
     triggering the next section. */
  const POST_LOCK   = 900;  // ms to lock after each transition
  let wheelLocked   = false;
  let wheelLockTimer = null;

  function lockWheel() {
    wheelLocked = true;
    clearTimeout(wheelLockTimer);
    wheelLockTimer = setTimeout(() => { wheelLocked = false; wheelAccum = 0; }, POST_LOCK);
  }

  const s = (el, p) => { if (el) Object.assign(el.style, p); };

  /* ── Measure bio height once for collapse animation ── */
  let bioHeight = 0;
  function measureBio() {
    if (!heroBio) return;
    heroBio.style.maxHeight = '';
    heroBio.style.margin = '';
    bioHeight = heroBio.scrollHeight;
  }
  setTimeout(measureBio, 200);

  /* ── Init ── */
  s(snapStage, { position:'absolute', inset:'0' });
  s(stageHero, {
    position:'absolute', inset:'0',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:'2', padding:'5rem 2rem 4rem',
    left:'0', width:'100%'
  });
  s(stageSkills, {
    position:'absolute', top:'0', left:'0', width:'50%', height:'100%',
    display:'flex', alignItems:'center',
    zIndex:'1', transform:'translateX(-100%)', opacity:'0',
    borderRight:'1px solid transparent'
  });
  /* Reset top/bottom */
  s(heroTop,    { transform:'translateY(0)' });
  s(heroBottom, { transform:'translateY(0)' });
  if (heroBio) {
    s(heroBio, { opacity:'1', maxHeight:'', marginTop:'', marginBottom:'' });
  }

  snapProj.style.transform = 'translateY(100%)';
  snapProj.classList.remove('is-active');

  /* ── Nav dots ── */
  function updateDots(i) {
    navDots.forEach((d, j) => d.classList.toggle('is-active', i === j));
  }

  /* ── 0 → 1: continuity animation ── */
  function animateToSplit() {
    if (!bioHeight) measureBio();

    const half   = Math.round(DUR * 0.5);
    const full   = DUR;
    const sq     = Math.round(DUR * 0.35); // squeeze delay

    /* Step 1 (immediate): hero panel slides right, skills slide in, bio fades */
    s(stageHero,   { transition:`left ${full}ms ${EASE}, width ${full}ms ${EASE}`, left:'50%', width:'50%' });
    s(stageSkills, { transition:`transform ${full}ms ${EASE}, opacity ${half}ms ${EASE}`, transform:'translateX(0)', opacity:'1' });
    if (heroBio) {
      s(heroBio, { transition:`opacity ${half}ms ease, max-height ${half}ms ease ${sq}ms, margin ${half}ms ease ${sq}ms`,
                   opacity:'0' });
    }

    /* Step 2 (after bio starts collapsing): collapse height, squeeze top/bottom together */
    setTimeout(() => {
      if (heroBio) {
        s(heroBio, { maxHeight:'0', marginTop:'0', marginBottom:'0' });
      }
      /* top slides down slightly, bottom slides up slightly — meeting in centre */
      s(heroTop,    { transition:`transform ${half}ms ${EASE}`, transform:'translateY(12px)' });
      s(heroBottom, { transition:`transform ${half}ms ${EASE}`, transform:'translateY(-12px)' });
    }, sq);

    /* Divider */
    setTimeout(() => { stageSkills.style.borderRight = '1px solid var(--border)'; }, half);

    setTimeout(() => { transitioning = false; }, full + 40);
  }

  /* ── 1 → 0: reverse ── */
  function animateToHero() {
    const half = Math.round(DUR * 0.5);
    const full = DUR;

    /* Expand bio, reset squeeze */
    s(heroTop,    { transition:`transform ${half}ms ${EASE}`, transform:'translateY(0)' });
    s(heroBottom, { transition:`transform ${half}ms ${EASE}`, transform:'translateY(0)' });
    if (heroBio) {
      s(heroBio, {
        transition:`max-height ${half}ms ease, margin ${half}ms ease`,
        maxHeight: bioHeight + 'px',
        marginTop:'', marginBottom:''
      });
    }

    /* Hero slides left back to centre, skills slide out */
    setTimeout(() => {
      s(stageHero,   { transition:`left ${full}ms ${EASE}, width ${full}ms ${EASE}`, left:'0', width:'100%' });
      s(stageSkills, { transition:`transform ${full}ms ${EASE}, opacity ${half}ms ease`, transform:'translateX(-100%)', opacity:'0' });
      if (heroBio) s(heroBio, { transition:`opacity ${half}ms ease`, opacity:'1' });
      stageSkills.style.borderRight = '1px solid transparent';
    }, Math.round(half * 0.3));

    setTimeout(() => { transitioning = false; }, full + 40);
  }

  /* ── Navigate ── */
  function goTo(idx, instant) {
    if (transitioning && !instant) return;
    if (idx < 0 || idx > 2) return;

    const prev = current;
    current = idx;
    transitioning = true;
    updateDots(idx);

    const dur = instant ? '0s' : `${DUR}ms ${EASE_SNAP}`;

    /* 0 ↔ 1: continuity */
    if ((prev === 0 && idx === 1) || (prev === 1 && idx === 0)) {
      if (instant) {
        if (idx === 1) {
          s(stageHero,   { transition:'none', left:'50%', width:'50%' });
          s(stageSkills, { transition:'none', transform:'translateX(0)', opacity:'1', borderRight:'1px solid var(--border)' });
          if (heroBio) s(heroBio, { opacity:'0', maxHeight:'0', marginTop:'0', marginBottom:'0' });
          s(heroTop,    { transition:'none', transform:'translateY(12px)' });
          s(heroBottom, { transition:'none', transform:'translateY(-12px)' });
        } else {
          s(stageHero,   { transition:'none', left:'0', width:'100%' });
          s(stageSkills, { transition:'none', transform:'translateX(-100%)', opacity:'0', borderRight:'1px solid transparent' });
          if (heroBio) s(heroBio, { opacity:'1', maxHeight:'', marginTop:'', marginBottom:'' });
          s(heroTop,    { transition:'none', transform:'translateY(0)' });
          s(heroBottom, { transition:'none', transform:'translateY(0)' });
        }
        transitioning = false;
      } else {
        if (!instant) lockWheel();
        idx === 1 ? animateToSplit() : animateToHero();
      }
      return;
    }

    /* Stage ↔ Projects */
    if (!instant) lockWheel();
    if (idx === 2) {
      /* Reset scroll BEFORE animation */
      if (projScroll) { projScroll.scrollTop = 0; updateScrollbar(); }

      snapProj.classList.add('is-active');
      s(snapProj, { transition:'none', transform:'translateY(100%)' });
      snapProj.getBoundingClientRect();

      s(snapProj,      { transition:`transform ${dur}`, transform:'translateY(0)' });
      s(snapContainer, { transition:`transform ${dur}`, transform:'translateY(-100%)' });

    } else {
      s(snapProj,      { transition:`transform ${dur}`, transform:'translateY(100%)' });
      s(snapContainer, { transition:`transform ${dur}`, transform:'translateY(0)' });
      setTimeout(() => { snapProj.classList.remove('is-active'); }, DUR + 40);
    }

    setTimeout(() => { transitioning = false; }, instant ? 0 : DUR + 40);
  }

  /* ── Scrollbar ── */
  function updateScrollbar() {
    if (!projScroll || !sbThumb || !sbTrack) return;
    const ratio  = projScroll.clientHeight / projScroll.scrollHeight;
    const thumbH = Math.max(40, sbTrack.clientHeight * ratio);
    const maxTop = sbTrack.clientHeight - thumbH;
    const pct    = projScroll.scrollHeight > projScroll.clientHeight
      ? projScroll.scrollTop / (projScroll.scrollHeight - projScroll.clientHeight) : 0;
    s(sbThumb, { height: thumbH + 'px', top: (maxTop * pct) + 'px' });
  }

  if (projScroll && sbThumb && sbTrack) {
    projScroll.addEventListener('scroll', updateScrollbar, { passive: true });

    /* ── Position scrollbar track to match content area ──
       top  = distance from top of #snap-projects to where grid begins
       bottom = height of footer                                         */
    function positionScrollbarTrack() {
      const projectsSection = projScroll.querySelector('.projects-section');
      const footer          = projScroll.querySelector('footer');
      if (!projectsSection) return;

      // offsetTop of .projects-section relative to projScroll
      const topPx    = projectsSection.offsetTop;
      const bottomPx = footer ? footer.offsetHeight : 0;

      snapProj.style.setProperty('--sb-top',    topPx    + 'px');
      snapProj.style.setProperty('--sb-bottom',  bottomPx + 'px');

      updateScrollbar();
    }

    let drag = false, dy0 = 0, st0 = 0;
    sbThumb.addEventListener('mousedown', e => {
      drag=true; dy0=e.clientY; st0=projScroll.scrollTop;
      document.body.style.userSelect='none'; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      projScroll.scrollTop = st0 + (e.clientY-dy0) * (projScroll.scrollHeight/sbTrack.clientHeight);
      updateScrollbar();
    });
    document.addEventListener('mouseup', () => { drag=false; document.body.style.userSelect=''; });
    sbTrack.addEventListener('click', e => {
      if (e.target === sbThumb) return;
      const r = (e.clientY - sbTrack.getBoundingClientRect().top) / sbTrack.clientHeight;
      projScroll.scrollTop = r * (projScroll.scrollHeight - projScroll.clientHeight);
      updateScrollbar();
    });
    setTimeout(updateScrollbar, 400);
    setTimeout(positionScrollbarTrack, 400);
    new ResizeObserver(() => { positionScrollbarTrack(); updateScrollbar(); }).observe(projScroll);
  }

  /* ── Wheel — with inertia / overscroll protection ── */
  document.addEventListener('wheel', e => {
    e.preventDefault();

    /* On projects section */
    if (current === 2 && projScroll) {
      if (wheelLocked) return; // absorb momentum after arriving here

      const atTop = projScroll.scrollTop <= 0;

      /* Scroll back to section 1: only on upward swipe at top, with threshold */
      if (e.deltaY < 0 && atTop) {
        const now = Date.now();
        if (now - lastWheel > 350) wheelAccum = 0;
        lastWheel = now;
        wheelAccum += e.deltaY;
        if (Math.abs(wheelAccum) >= WHEEL_THR) {
          wheelAccum = 0;
          goTo(1);
          lockWheel();
        }
        return;
      }

      /* Normal internal scroll */
      projScroll.scrollTop += e.deltaY;
      updateScrollbar();
      return;
    }

    /* On stage sections (0 and 1) */
    if (wheelLocked) return;

    const now = Date.now();
    if (now - lastWheel > 400) wheelAccum = 0;
    lastWheel = now;
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) < WHEEL_THR) return;

    const dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    lockWheel();
    goTo(current + dir);

  }, { passive: false });

  /* ── Touch ── */
  let ty0 = 0;
  document.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    const d = ty0 - e.changedTouches[0].clientY;
    if (Math.abs(d) < 40) return;
    if (current === 2 && projScroll) {
      if (d < 0 && projScroll.scrollTop <= 0) { goTo(1); return; }
      if (d > 0 && projScroll.scrollTop + projScroll.clientHeight < projScroll.scrollHeight - 2) return;
    }
    goTo(current + (d > 0 ? 1 : -1));
  }, { passive: true });

  /* ── Keyboard ── */
  document.addEventListener('keydown', e => {
    if (['ArrowDown','PageDown'].includes(e.key) && current < 2) { e.preventDefault(); goTo(current+1); }
    if (['ArrowUp','PageUp'].includes(e.key)   && current > 0) { e.preventDefault(); goTo(current-1); }
  });

  /* ── Nav dots ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Init ── */
  goTo(0, true);
  /* Lock wheel briefly on load — prevents accidental first-scroll from
     immediately jumping to section 1 if user scrolled before page loaded */
  lockWheel();

})();
