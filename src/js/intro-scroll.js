/* ============================================================
   intro-scroll.js
   Section 0 (stage, hero centred):   profile view
   Section 1 (stage, split):          hero right + skills left
   Section 2:                         projects

   STAGE is a SINGLE snap-section. Hero and skills are absolute
   panels inside it. JS animates them individually — no page flip
   between 0↔1, creating a true continuity effect:
     • Hero slides from centre → right half
     • Bio fades out
     • Skills slide in from off-screen left
     • Divider line fades in between panels
   Reverse is the mirror.
============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(max-width: 900px)').matches) return;

  const snapStage  = document.getElementById('snap-stage');
  const snapProj   = document.getElementById('snap-projects');
  const stageHero  = document.getElementById('stage-hero');
  const stageSkills= document.getElementById('stage-skills');
  const heroBio    = document.getElementById('bio');
  const projScroll = document.getElementById('projects-scroll');
  const sbThumb    = document.getElementById('scrollbar-thumb');
  const sbTrack    = document.getElementById('custom-scrollbar');
  const navDots    = document.querySelectorAll('.section-nav__dot');

  if (!snapStage || !snapProj || !stageHero || !stageSkills) return;

  /* ── State ──
     current: 0 = hero centred, 1 = split, 2 = projects */
  let current      = 0;
  let transitioning = false;
  const DUR        = 480;   // ms
  const EASE       = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EASE_SNAP  = 'cubic-bezier(0.77, 0, 0.18, 1)';
  let wheelAccum   = 0, lastWheel = 0;
  const WHEEL_THR  = 40;

  /* ── Helper ── */
  function s(el, props) { Object.assign(el.style, props); }
  function t(ms, ease) { return `${ms}ms ${ease||EASE}`; }

  /* ── Initial positions ── */
  // stage: visible (is-current set by applyStates)
  s(stageHero,   { position:'absolute', inset:'0', zIndex:'2', display:'flex', alignItems:'center', justifyContent:'center', padding:'5rem 2rem 4rem' });
  s(stageSkills, { position:'absolute', top:'0', left:'0', width:'50%', height:'100%', zIndex:'1', transform:'translateX(-100%)', opacity:'0' });
  s(snapProj,    { position:'absolute', inset:'0', transform:'translateY(100%)' });

  /* ── Section states ── */
  function applyStates(idx, instant) {
    const dur = instant ? '0s' : t(DUR, EASE_SNAP);
    s(snapStage, { transition:`transform ${dur}`, transform: idx < 2 ? 'translateY(0)' : 'translateY(-100%)' });
    s(snapProj,  { transition:`transform ${dur}`, transform: idx < 2 ? 'translateY(100%)' : 'translateY(0)' });
    navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  /* ── Animate 0 → 1: hero right, bio out, skills in ── */
  function animateToSplit() {
    const vw = window.innerWidth;

    // Hero: from centre-full → right half
    // Currently left=0, width=100% → left=50%, width=50%
    s(stageHero, { transition:'none', left:'0', width:'100%', top:'0', height:'100%' });
    if (heroBio) s(heroBio, { transition:'none', opacity:'1' });
    stageSkills.getBoundingClientRect(); // reflow

    s(stageHero, {
      transition: `left ${t(DUR)}, width ${t(DUR)}`,
      left: '50%',
      width: '50%'
    });
    if (heroBio) s(heroBio, {
      transition: `opacity ${t(Math.round(DUR * 0.5))}`,
      opacity: '0'
    });

    // Skills: slide in from left
    s(stageSkills, {
      transition: `transform ${t(DUR)}, opacity ${t(Math.round(DUR * 0.7))}`,
      transform: 'translateX(0)',
      opacity: '1'
    });

    // Divider border
    setTimeout(() => {
      s(stageSkills, { borderRight: `1px solid var(--border)` });
    }, DUR * 0.3);

    setTimeout(() => { transitioning = false; }, DUR + 30);
  }

  /* ── Animate 1 → 0: hero back to centre, bio in, skills out ── */
  function animateToHero() {
    s(stageHero, {
      transition: `left ${t(DUR)}, width ${t(DUR)}`,
      left: '0',
      width: '100%'
    });
    if (heroBio) s(heroBio, {
      transition: `opacity ${t(Math.round(DUR * 0.5))} ${Math.round(DUR * 0.3)}ms`,
      opacity: '1'
    });

    s(stageSkills, {
      transition: `transform ${t(DUR)}, opacity ${t(Math.round(DUR * 0.4))}`,
      transform: 'translateX(-100%)',
      opacity: '0'
    });

    setTimeout(() => {
      s(stageSkills, { borderRight: '1px solid transparent' });
    }, DUR + 30);

    setTimeout(() => { transitioning = false; }, DUR + 30);
  }

  /* ── Navigate ── */
  function goTo(idx, instant) {
    if (transitioning && !instant) return;
    if (idx < 0 || idx > 2) return;

    const prev = current;
    current = idx;
    transitioning = true;

    navDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));

    /* Transition between stage states (0↔1) */
    if ((prev === 0 && idx === 1) || (prev === 1 && idx === 0)) {
      if (instant) {
        if (idx === 1) {
          s(stageHero,   { transition:'none', left:'50%', width:'50%' });
          s(stageSkills, { transition:'none', transform:'translateX(0)', opacity:'1' });
          if (heroBio) s(heroBio, { opacity:'0' });
        } else {
          s(stageHero,   { transition:'none', left:'0', width:'100%' });
          s(stageSkills, { transition:'none', transform:'translateX(-100%)', opacity:'0' });
          if (heroBio) s(heroBio, { opacity:'1' });
        }
        transitioning = false;
      } else {
        if (idx === 1) animateToSplit();
        else           animateToHero();
      }
      applyStates(idx < 2 ? 0 : 2, instant); // keep stage visible
      return;
    }

    /* Stage ↔ projects flip */
    applyStates(idx, instant);

    if (idx === 2 && projScroll) { projScroll.scrollTop = 0; setTimeout(updateScrollbar, 100); }

    // Reset split state when going to projects
    if (idx === 2 && prev === 1) {
      /* Keep split state visible as stage slides away */
    }
    // When returning from projects to stage, restore correct state
    if (idx < 2 && prev === 2) {
      // current stage state is whatever it was (0 or 1)
      // just ensure stage is visible
    }

    setTimeout(() => { transitioning = false; }, instant ? 0 : DUR + 30);
  }

  /* ── Custom scrollbar ── */
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
    let drag = false, dy0 = 0, st0 = 0;
    sbThumb.addEventListener('mousedown', e => { drag=true; dy0=e.clientY; st0=projScroll.scrollTop; document.body.style.userSelect='none'; e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!drag) return; projScroll.scrollTop = st0 + (e.clientY - dy0) * (projScroll.scrollHeight / sbTrack.clientHeight); });
    document.addEventListener('mouseup',   () => { drag=false; document.body.style.userSelect=''; });
    sbTrack.addEventListener('click', e => {
      if (e.target === sbThumb) return;
      const r = (e.clientY - sbTrack.getBoundingClientRect().top) / sbTrack.clientHeight;
      projScroll.scrollTop = r * (projScroll.scrollHeight - projScroll.clientHeight);
    });
    setTimeout(updateScrollbar, 300);
    new ResizeObserver(updateScrollbar).observe(projScroll);
  }

  /* ── Wheel ── */
  document.addEventListener('wheel', e => {
    if (current === 2 && projScroll) {
      const atTop    = projScroll.scrollTop <= 0;
      const atBottom = projScroll.scrollTop + projScroll.clientHeight >= projScroll.scrollHeight - 2;
      if (!atTop && !atBottom) { projScroll.scrollTop += e.deltaY; e.preventDefault(); updateScrollbar(); return; }
      if (e.deltaY > 0 && !atBottom) { projScroll.scrollTop += e.deltaY; e.preventDefault(); updateScrollbar(); return; }
      if (e.deltaY < 0 && !atTop)    { projScroll.scrollTop += e.deltaY; e.preventDefault(); updateScrollbar(); return; }
      if (e.deltaY < 0 && atTop)     { e.preventDefault(); goTo(current === 2 ? 1 : 0); return; }
    }

    e.preventDefault();
    const now = Date.now();
    if (now - lastWheel > 350) wheelAccum = 0;
    lastWheel = now;
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
      if (d < 0 && projScroll.scrollTop <= 0) { goTo(1); return; }
      if (d > 0 && projScroll.scrollTop + projScroll.clientHeight < projScroll.scrollHeight - 2) return;
    }
    goTo(current + (d > 0 ? 1 : -1));
  }, { passive: true });

  /* ── Keyboard ── */
  document.addEventListener('keydown', e => {
    if (['ArrowDown','PageDown'].includes(e.key) && current < 2) { e.preventDefault(); goTo(current + 1); }
    if (['ArrowUp','PageUp'].includes(e.key)   && current > 0) { e.preventDefault(); goTo(current - 1); }
  });

  /* ── Nav dots — dot 0 = hero, dot 1 = split, dot 2 = projects ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Init ── */
  applyStates(0, true);
  s(stageHero, { transition:'none', left:'0', width:'100%', top:'0', height:'100%' });
  if (heroBio) s(heroBio, { opacity:'1' });

  /* Sync skills visibility once config loads */
  const si = setInterval(() => {
    const fn = document.getElementById('first-name');
    if (fn && fn.textContent.trim()) { clearInterval(si); }
  }, 80);

})();
