/* ============================================================
   main.js — App entry point & scroll reveal
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
});

/**
 * Observe .reveal and .project-card elements;
 * add .visible once they enter the viewport.
 */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal, .project-card');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach(el => observer.observe(el));
}
