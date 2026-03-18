/* ============================================================
   intro-scroll.js
   0 = stage (hero centred)
   1 = stage (hero right + skills left)
   2 = projects
============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(max-width: 900px)').matches) return;

  const snapStage   = document.getElementById('snap-stage');
  const snapProj    = document.getElementById('snap-projects');
  const stageHero   = document.getElementById('stage-hero');
  const stageSkills = document.getElementById('stage-skills');
  const heroBio     = document.getElementById('bio');
  const projScroll  = document.getElementById('projects-scroll');
  const sbThumb     = document.getElementById('scrollbar-thumb');
  const sbTrack     = document.getElementById('custom-scrollbar');
  const navDots     = document.querySelectorAll('.section-nav__dot');

  if (!snapStage || !snapProj || !stageHero || !stageSkills) return;

  let current      = 0;
  let transitioning = false;
  const DUR        = 480;
  const EASE       = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EASE_SNAP  = 'cubic-bezier(0.77, 0, 0.18, 1)';
  let wheelAccum   = 0, lastWheel = 0;
  const WHEEL_THR  = 40;

  const s = (el, p) => Object.assign(el.style, p);

  /* ── Init positions ── */
  s(snapStage, { position:'absolute', inset:'0', transform:'translateY(0)' });
  s(snapProj,  { position:'absolute', inset:'0', transform:'translateY(100%)' });

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
  if (heroBio) s(heroBio, { opacity:'1' });

  /* ── Pointer events: only visible section is interactive ── */
  function setVisible(section) {
    [snapStage, snapProj].forEach(el => el.classList.remove('is-visible'));
    section.classList.add('is-visible');
  }
  setVisible(snapStage);

  /* ── Nav dots ── */
  function updateDots(i) {
    navDots.forEach((d, j) => d.classList.toggle('is-active', i === j));
  }

  /* ── 0 → 1: hero slides right, bio fades, skills slide in ── */
  function animateToSplit() {
    if (heroBio) s(heroBio, { transition:`opacity ${Math.round(DUR*0.35)}ms ease`, opacity:'0' });

    s(stageHero, {
      transition:`left ${DUR}ms ${EASE}, width ${DUR}ms ${EASE}`,
      left:'50%', width:'50%'
    });
    s(stageSkills, {
      transition:`transform ${DUR}ms ${EASE}, opacity ${Math.round(DUR*0.7)}ms ${EASE}`,
      transform:'translateX(0)', opacity:'1'
    });
    setTimeout(() => { stageSkills.style.borderRight = '1px solid var(--border)'; }, DUR * 0.5);
    setTimeout(() => { transitioning = false; }, DUR + 40);
  }

  /* ── 1 → 0: hero back to centre, bio fades in, skills slide out ── */
  function animateToHero() {
    s(stageSkills, {
      transition:`transform ${DUR}ms ${EASE}, opacity ${Math.round(DUR*0.4)}ms ease`,
      transform:'translateX(-100%)', opacity:'0'
    });
    s(stageHero, {
      transition:`left ${DUR}ms ${EASE}, width ${DUR}ms ${EASE}`,
      left:'0', width:'100%'
    });
    setTimeout(() => {
      if (heroBio) s(heroBio, { transition:`opacity ${Math.round(DUR*0.5)}ms ease`, opacity:'1' });
      stageSkills.style.borderRight = '1px solid transparent';
    }, Math.round(DUR * 0.5));
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

    // Update pointer events
    setVisible(idx < 2 ? snapStage : snapProj);

    const dur = instant ? '0s' : `${DUR}ms ${EASE_SNAP}`;

    /* 0 ↔ 1: continuity, no page flip */
    if ((prev === 0 && idx === 1) || (prev === 1 && idx === 0)) {
      if (instant) {
        if (idx === 1) {
          s(stageHero,   { transition:'none', left:'50%', width:'50%' });
          s(stageSkills, { transition:'none', transform:'translateX(0)', opacity:'1', borderRight:'1px solid var(--border)' });
          if (heroBio) s(heroBio, { opacity:'0' });
        } else {
          s(stageHero,   { transition:'none', left:'0', width:'100%' });
          s(stageSkills, { transition:'none', transform:'translateX(-100%)', opacity:'0', borderRight:'1px solid transparent' });
          if (heroBio) s(heroBio, { opacity:'1' });
        }
        transitioning = false;
      } else {
        idx === 1 ? animateToSplit() : animateToHero();
      }
      return;
    }

    /* Stage ↔ Projects */
    if (idx === 2 && projScroll) {
      projScroll.scrollTop = 0;
      updateScrollbar();
    }

    s(snapStage, { transition:`transform ${dur}`, transform: idx < 2 ? 'translateY(0)' : 'translateY(-100%)' });
    s(snapProj,  { transition:`transform ${dur}`, transform: idx < 2 ? 'translateY(100%)' : 'translateY(0)' });

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
    setTimeout(updateScrollbar, 300);
    new ResizeObserver(updateScrollbar).observe(projScroll);
  }

  /* ── Wheel ── */
  document.addEventListener('wheel', e => {
    if (current === 2 && projScroll) {
      const atTop = projScroll.scrollTop <= 0;
      if (e.deltaY < 0 && atTop) { e.preventDefault(); goTo(1); return; }
      projScroll.scrollTop += e.deltaY;
      e.preventDefault();
      updateScrollbar();
      return;
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
    if (['ArrowDown','PageDown'].includes(e.key) && current < 2) { e.preventDefault(); goTo(current+1); }
    if (['ArrowUp','PageUp'].includes(e.key)   && current > 0) { e.preventDefault(); goTo(current-1); }
  });

  /* ── Nav dots ── */
  navDots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Init ── */
  goTo(0, true);

})();
