/* ============================================================
   intro-scroll.js
   Drives the intro scene scroll animation.

   The #intro-scene is 200vh tall.
   - First  100vh: hero is centred, skills hidden (progress = 0)
   - Second 100vh: hero slides right, skills slide in from left (progress = 0→1)

   We set two CSS custom properties on .intro-sticky:
     --hero-x    : 0→1  (hero panel moves from centre to right half)
     --skills-x  : 0→1  (skills panel fades/slides from off-left to visible)
   ============================================================ */

(function () {
  'use strict';

  /* Only run on wide screens — mobile uses static stacked layout */
  const MQ = window.matchMedia('(min-width: 901px)');

  const scene  = document.getElementById('intro-scene');
  const sticky = scene && scene.querySelector('.intro-sticky');

  if (!scene || !sticky) return;

  let ticking = false;

  function update() {
    ticking = false;

    if (!MQ.matches) {
      /* Reset CSS vars on mobile so static CSS takes over */
      sticky.style.removeProperty('--hero-x');
      sticky.style.removeProperty('--skills-x');
      return;
    }

    const sceneTop    = scene.getBoundingClientRect().top;
    const sceneHeight = scene.offsetHeight;   /* 200vh */
    const vh          = window.innerHeight;

    /* scrolled = how many px the scene has scrolled past the top of the viewport */
    const scrolled = -sceneTop;

    /* Phase 1: 0 → vh  (hero centred, nothing happening)
       Phase 2: vh → 2*vh (transition playing) */
    const phase2Start = vh;
    const phase2End   = sceneHeight - vh;   /* = vh when scene is 200vh */

    let progress = 0;
    if (scrolled > phase2Start) {
      progress = Math.min(1, (scrolled - phase2Start) / (phase2End - phase2Start));
    }

    /* Ease: smooth-step */
    const p = progress * progress * (3 - 2 * progress);

    sticky.style.setProperty('--hero-x',   p.toFixed(4));
    sticky.style.setProperty('--skills-x', p.toFixed(4));
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  MQ.addEventListener('change', update);

  /* Initial call */
  update();
})();
