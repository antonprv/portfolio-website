/* ============================================================
   config-loader.js - Loads config.json and bootstraps the site.

   Script load order (index.html):
     theme.js → config-loader.js → i18n.js → lang.js → scroll.js

   Steps:
     1. Fetch config.json
     2. Apply accent colours as CSS custom properties
     3. Inject custom font via @font-face (optional)
     4. Set profile photo (with emoji fallback)
     5. Render all project cards
     6. Patch i18n strings from profile data
   ============================================================ */

(async function bootstrap() {

  /* ── 1. Fetch config ── */
  let cfg;
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cfg = await res.json();
  } catch (err) {
    console.error('[config-loader] Failed to load config.json:', err);
    return;
  }

  window.__cfg = cfg;

  applyAccentColors(cfg.theme);
  if (cfg.font?.path) injectFont(cfg.font);
  applyProfilePhoto(cfg.profile);
  renderProjects(cfg.projects);
  patchI18n(cfg.profile);

})();


/* ════════════════════════════════════════════════════════════
   ACCENT COLORS
   ════════════════════════════════════════════════════════════ */
function applyAccentColors({ accentDark, accentLight } = {}) {
  const root = document.documentElement.style;
  if (accentDark) {
    root.setProperty('--accent-dark',  accentDark);
    root.setProperty('--border-dark',  hexToRgba(accentDark,  0.18));
    root.setProperty('--glow-dark',    hexToRgba(accentDark,  0.12));
  }
  if (accentLight) {
    root.setProperty('--accent-light', accentLight);
    root.setProperty('--border-light', hexToRgba(accentLight, 0.25));
    root.setProperty('--glow-light',   hexToRgba(accentLight, 0.15));
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


/* ════════════════════════════════════════════════════════════
   CUSTOM FONT
   ════════════════════════════════════════════════════════════ */
function injectFont({ path, family, fallback }) {
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${family}';
      src: url('${path}') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
  document.body.style.fontFamily = `'${family}', ${fallback || 'sans-serif'}`;
}


/* ════════════════════════════════════════════════════════════
   PROFILE PHOTO
   ════════════════════════════════════════════════════════════ */
function applyProfilePhoto({ photo, nameRu } = {}) {
  const img         = document.querySelector('.avatar');
  const placeholder = document.querySelector('.avatar-placeholder');
  if (!img) return;

  img.alt = nameRu || '';
  img.src = photo || '';

  img.onerror = () => {
    img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  };
  img.onload = () => {
    img.style.display = '';
    if (placeholder) placeholder.style.display = 'none';
  };
}


/* ════════════════════════════════════════════════════════════
   PROJECT CARDS
   ════════════════════════════════════════════════════════════

   Four presets - choose via "preset" in config.json:

   "no-links"   - Display-only card. No hover lift, nothing clickable.
                  Use for NDA / unreleased / private projects.

   "link"       - The entire card is one clickable link.
                  Set "url" to any destination (itch.io, Steam, etc.).

   "github"     - Same as "link" but specifically for a GitHub repo.
                  Set "github" to the repo URL.
                  Shows the GitHub icon on the ↗ badge.

   "links-bar"  - Card is not clickable itself.
                  A button strip appears at the bottom.
                  Any combination of "github", "page", "play" is valid;
                  omit a key to hide that button.
   ════════════════════════════════════════════════════════════ */

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid || !Array.isArray(projects)) return;
  grid.innerHTML = '';
  projects.forEach((p, i) => grid.appendChild(buildCard(p, i)));
}

/* ── Card builder ── */
function buildCard(p, index) {
  const preset = p.preset || 'no-links';

  /* Root element: <a> for single-link presets, <div> otherwise */
  const isSingleLink = preset === 'link' || preset === 'github';
  const el = document.createElement(isSingleLink ? 'a' : 'div');
  el.className = 'project-card';
  el.dataset.preset = preset;
  el.style.animationDelay = `${0.05 + index * 0.05}s`;

  if (isSingleLink) {
    el.href   = preset === 'github' ? (p.github || '#') : (p.url || '#');
    el.target = '_blank';
    el.rel    = 'noopener';
  }

  el.appendChild(buildThumbnail(p));

  /* Arrow badge - only for single-link presets */
  if (isSingleLink) {
    const arrow = document.createElement('span');
    arrow.className      = 'project-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = preset === 'github' ? SVG_GITHUB_SMALL : '↗';
    el.appendChild(arrow);
  }

  el.appendChild(buildInfo(p));

  if (preset === 'links-bar') {
    el.appendChild(buildLinksBar(p));
  }

  return el;
}

/* ── Thumbnail ── */
function buildThumbnail(p) {
  const wrapper = document.createElement('div');
  wrapper.className = 'project-image-wrapper';

  const img = document.createElement('img');
  img.src       = p.image || '';
  img.alt       = p.nameRu || '';
  img.className = 'project-image';

  const thumb = document.createElement('div');
  thumb.className   = `project-thumb ${p.color || 'c1'}`;
  thumb.textContent = p.emoji || '🎮';
  thumb.style.display = 'none';

  img.onerror = () => { img.style.display = 'none'; thumb.style.display = 'flex'; };

  wrapper.appendChild(img);
  wrapper.appendChild(thumb);
  return wrapper;
}

/* ── Info block ── */
function buildInfo(p) {
  const info = document.createElement('div');
  info.className = 'project-info';

  const h3 = document.createElement('h3');
  h3.textContent = p.nameRu || '';
  h3.dataset.ru  = p.nameRu || '';
  h3.dataset.en  = p.nameEn || '';
  info.appendChild(h3);

  const desc = document.createElement('p');
  desc.className   = 't';
  desc.textContent = p.descRu || '';
  desc.dataset.ru  = p.descRu || '';
  desc.dataset.en  = p.descEn || '';
  info.appendChild(desc);

  if (Array.isArray(p.tags) && p.tags.length) {
    const tag = document.createElement('span');
    tag.className   = 'project-tag';
    tag.textContent = p.tags.join(' · ');
    info.appendChild(tag);
  }

  return info;
}

/* ── Links bar (preset "links-bar") ── */
function buildLinksBar(p) {
  const bar = document.createElement('div');
  bar.className = 'project-link-footer';

  const buttons = [
    { key: 'github', href: p.github, labelRu: 'GitHub',   labelEn: 'GitHub',   icon: SVG_GITHUB_SMALL, cls: '' },
    { key: 'page',   href: p.page,   labelRu: 'Страница', labelEn: 'Page',      icon: SVG_LINK,         cls: '' },
    { key: 'play',   href: p.play,   labelRu: 'Играть',   labelEn: 'Play',      icon: SVG_PLAY,         cls: 'project-link-btn--play' },
  ];

  buttons.forEach(({ key, href, labelRu, labelEn, icon, cls }) => {
    if (!href) return; /* skip buttons without a URL */

    const btn = document.createElement('a');
    btn.href      = href;
    btn.target    = '_blank';
    btn.rel       = 'noopener';
    btn.className = `project-link-btn${cls ? ' ' + cls : ''}`;

    const label = document.createElement('span');
    label.className   = 't';
    label.dataset.ru  = labelRu;
    label.dataset.en  = labelEn;
    label.textContent = labelRu;

    btn.innerHTML = icon;
    btn.appendChild(label);
    bar.appendChild(btn);
  });

  return bar;
}


/* ════════════════════════════════════════════════════════════
   INLINE SVG ICONS
   ════════════════════════════════════════════════════════════ */
const SVG_GITHUB_SMALL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0C17.3 5.37 18.26 5.68 18.26 5.68c.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .31.21.67.8.56C20.2 21.4 23.5 17.1 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>`;

const SVG_PLAY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;

const SVG_LINK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;


/* ════════════════════════════════════════════════════════════
   PATCH i18n + initial render
   ════════════════════════════════════════════════════════════ */
function patchI18n(profile) {
  const attempt = () => {
    if (typeof i18n === 'undefined') { requestAnimationFrame(attempt); return; }

    const { nameRu, nameEn, taglineRu, taglineEn, bioRu, bioEn } = profile;
    const [firstRu, ...restRu] = (nameRu || '').split(' ');
    const [firstEn, ...restEn] = (nameEn || '').split(' ');

    Object.assign(i18n.ru, {
      firstName:      firstRu,
      lastName:       restRu.join(' '),
      tagline:        taglineRu || i18n.ru.tagline,
      bio:            bioRu     || i18n.ru.bio,
      'footer-text':  `© ${new Date().getFullYear()} ${nameRu}\u00a0·\u00a0 Сделано с ☕ и вниманием к деталям`,
      pageTitle:      `${nameRu} - Портфолио`,
    });

    Object.assign(i18n.en, {
      firstName:      firstEn,
      lastName:       restEn.join(' '),
      tagline:        taglineEn || i18n.en.tagline,
      bio:            bioEn     || i18n.en.bio,
      'footer-text':  `© ${new Date().getFullYear()} ${nameEn}\u00a0·\u00a0 Made with ☕ and attention to detail`,
      pageTitle:      `${nameEn} - Portfolio`,
    });

    applyCurrentLang();
  };
  attempt();
}

function applyCurrentLang() {
  if (typeof currentLang === 'undefined' || typeof i18n === 'undefined') return;
  const t = i18n[currentLang];
  if (!t) return;

  document.documentElement.lang = t.htmlLang;
  document.title                = t.pageTitle;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('first-name',  t.firstName);
  set('last-name',   t.lastName);
  set('tagline',     t.tagline);
  set('bio',         t.bio);
  set('footer-text', t['footer-text']);

  document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + currentLang);
  });
  document.querySelectorAll('.project-info h3[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + currentLang);
  });
}
