/* ============================================================
   intro-scroll.js
   0 = stage hero    (#hero)
   1 = stage split   (#skills)
   2 = projects      (#projects)

   Hash navigation:
   - URL hash updates on every section change
   - On page load, reads hash and jumps to correct section
   - Shareable links: index.html#hero / #skills / #projects
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
  const DUR         = 600;
  const EASE        = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  const EASE_SNAP   = 'cubic-bezier(0.4, 0, 0.2, 1)';
  let wheelAccum    = 0, lastWheel = 0;
  const WHEEL_THR   = 60;
  const POST_LOCK   = 900;
  let wheelLocked   = false;
  let wheelLockTimer = null;

  /* ── Hash ── */
  const HASH = ['#hero', '#skills', '#projects'];
  function updateHash(idx) {
    history.replaceState(null, '', HASH[idx] || '#hero');
  }

  function lockWheel() {
    wheelLocked = true;
    clearTimeout(wheelLockTimer);
    wheelLockTimer = setTimeout(() => { wheelLocked = false; wheelAccum = 0; }, POST_LOCK);
  }

  const s = (el, p) => { if (el) Object.assign(el.style, p); };

  /* ── Bio height ── */
  let bioHeight = 0;
  let hlHeight  = 0;
  const heroHL  = document.getElementById('hero-highlights');
  function measureBio() {
    if (!heroBio) return;
    heroBio.style.maxHeight = '';
    heroBio.style.margin    = '';
    bioHeight = heroBio.scrollHeight;
    if (heroHL) {
      heroHL.style.maxHeight = '';
      heroHL.style.margin    = '';
      hlHeight = heroHL.scrollHeight;
    }
  }
  setTimeout(measureBio, 200);

  /* ── Init positions ── */
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
  s(heroTop,    { transform:'translateY(0)' });
  s(heroBottom, { transform:'translateY(0)' });
  if (heroBio) s(heroBio, { opacity:'1', maxHeight:'', marginTop:'', marginBottom:'' });

  snapProj.style.transform = 'translateY(100%)';
  snapProj.classList.remove('is-active');

  /* ── Dots ── */
  function updateDots(i) {
    navDots.forEach((d, j) => d.classList.toggle('is-active', i === j));
  }

  /* ── 0 → 1 ── */
  function animateToSplit() {
    if (!bioHeight) measureBio();
    const half = Math.round(DUR * 0.5);
    const sq   = Math.round(DUR * 0.35);

    if (heroBio) s(heroBio, { transition:`opacity ${Math.round(DUR*0.35)}ms ease`, opacity:'0' });
    if (heroHL)  s(heroHL,  { transition:`opacity ${Math.round(DUR*0.35)}ms ease`, opacity:'0' });
    s(stageHero,   { transition:`left ${DUR}ms ${EASE}, width ${DUR}ms ${EASE}`, left:'50%', width:'50%' });
    s(stageSkills, { transition:`transform ${DUR}ms ${EASE}, opacity ${Math.round(DUR*0.7)}ms ${EASE}`, transform:'translateX(0)', opacity:'1' });

    setTimeout(() => {
      if (heroBio) s(heroBio, { maxHeight:'0', marginTop:'0', marginBottom:'0' });
      if (heroHL)  s(heroHL,  { maxHeight:'0', marginTop:'0', marginBottom:'0' });
      s(heroTop,    { transition:`transform ${half}ms ${EASE}`, transform:'translateY(12px)' });
      s(heroBottom, { transition:`transform ${half}ms ${EASE}`, transform:'translateY(-12px)' });
    }, sq);
    setTimeout(() => { stageSkills.style.borderRight = '1px solid var(--border)'; }, DUR * 0.5);
    setTimeout(() => { transitioning = false; }, DUR + 40);
  }

  /* ── 1 → 0 ── */
  function animateToHero() {
    const half = Math.round(DUR * 0.5);
    s(heroTop,    { transition:`transform ${half}ms ${EASE}`, transform:'translateY(0)' });
    s(heroBottom, { transition:`transform ${half}ms ${EASE}`, transform:'translateY(0)' });
    if (heroBio) s(heroBio, { transition:`max-height ${half}ms ease, margin ${half}ms ease`, maxHeight: bioHeight + 'px', marginTop:'', marginBottom:'' });
    if (heroHL)  s(heroHL,  { transition:`max-height ${half}ms ease, margin ${half}ms ease`, maxHeight: hlHeight  + 'px', marginTop:'', marginBottom:'' });

    setTimeout(() => {
      s(stageHero,   { transition:`left ${DUR}ms ${EASE}, width ${DUR}ms ${EASE}`, left:'0', width:'100%' });
      s(stageSkills, { transition:`transform ${DUR}ms ${EASE}, opacity ${half}ms ease`, transform:'translateX(-100%)', opacity:'0' });
      if (heroBio) s(heroBio, { transition:`opacity ${half}ms ease`, opacity:'1' });
      if (heroHL)  s(heroHL,  { transition:`opacity ${half}ms ease`, opacity:'1' });
      stageSkills.style.borderRight = '1px solid transparent';
    }, Math.round(half * 0.3));
    setTimeout(() => { transitioning = false; }, DUR + 40);
  }

  /* ── Navigate ── */
  function goTo(idx, instant) {
    if (transitioning && !instant) return;
    if (idx < 0 || idx > 2) return;

    const prev = current;
    current = idx;
    transitioning = true;
    updateDots(idx);
    if (!instant) updateHash(idx);

    const dur = instant ? '0s' : `${DUR}ms ${EASE_SNAP}`;

    /* 0 ↔ 1: continuity */
    if ((prev === 0 && idx === 1) || (prev === 1 && idx === 0)) {
      if (instant) {
        if (idx === 1) {
          s(stageHero,   { transition:'none', left:'50%', width:'50%' });
          s(stageSkills, { transition:'none', transform:'translateX(0)', opacity:'1', borderRight:'1px solid var(--border)' });
          if (heroBio) s(heroBio, { opacity:'0', maxHeight:'0', marginTop:'0', marginBottom:'0' });
          if (heroHL)  s(heroHL,  { opacity:'0', maxHeight:'0', marginTop:'0', marginBottom:'0' });
          s(heroTop,    { transition:'none', transform:'translateY(12px)' });
          s(heroBottom, { transition:'none', transform:'translateY(-12px)' });
        } else {
          s(stageHero,   { transition:'none', left:'0', width:'100%' });
          s(stageSkills, { transition:'none', transform:'translateX(-100%)', opacity:'0', borderRight:'1px solid transparent' });
          if (heroBio) s(heroBio, { opacity:'1', maxHeight:'', marginTop:'', marginBottom:'' });
          if (heroHL)  s(heroHL,  { opacity:'1', maxHeight:'', marginTop:'', marginBottom:'' });
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

    function positionScrollbarTrack() {
      const projectsSection = projScroll.querySelector('.projects-section');
      const footer          = projScroll.querySelector('footer');
      if (!projectsSection) return;
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
    setTimeout(() => { positionScrollbarTrack(); updateScrollbar(); }, 800);
    new ResizeObserver(() => { positionScrollbarTrack(); updateScrollbar(); }).observe(projScroll);
  }

  /* ── Wheel ── */
  document.addEventListener('wheel', e => {
    e.preventDefault();

    if (current === 2 && projScroll) {
      if (wheelLocked) return;
      const atTop = projScroll.scrollTop <= 0;
      if (e.deltaY < 0 && atTop) {
        const now = Date.now();
        if (now - lastWheel > 350) wheelAccum = 0;
        lastWheel = now;
        wheelAccum += e.deltaY;
        if (Math.abs(wheelAccum) >= WHEEL_THR) {
          wheelAccum = 0;
          goTo(1); lockWheel();
        }
        return;
      }
      projScroll.scrollTop += e.deltaY;
      updateScrollbar();
      return;
    }

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

  /* ── Init: read hash and jump to correct section ── */
  const hashMap = { '#hero': 0, '#skills': 1, '#projects': 2 };
  const initHash = window.location.hash.toLowerCase();
  const initIdx  = hashMap[initHash] ?? 0;
  goTo(initIdx, true);
  lockWheel();

})();
