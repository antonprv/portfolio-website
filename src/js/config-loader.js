/* ============================================================
   config-loader.js - Loads config.json and bootstraps the site.

   Script load order (index.html):
     theme.js → config-loader.js → i18n.js → lang.js → scroll.js

   Steps:
     1. Fetch config.json
     2. Apply accent colours as CSS custom properties
     3. Apply noise texture parameters
     4. Inject custom font via @font-face (optional)
     5. Set profile photo (with emoji fallback)
     6. Render all project cards
     7. Patch i18n strings from profile data
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
  applyNoise(cfg.noise);
  if (cfg.font?.path || cfg.font?.files?.length) injectFont(cfg.font);
  applyProfilePhoto(cfg.profile);
  renderProjects(cfg.projects);
  patchI18n(cfg.profile);

})();


/* ════════════════════════════════════════════════════════════
   ACCENT COLORS
   ════════════════════════════════════════════════════════════ */
function applyAccentColors({ accentDark, accentLight } = {}) {
  const root = document.documentElement.style;

  /* Set the base accent vars */
  if (accentDark)  root.setProperty('--accent-dark',  accentDark);
  if (accentLight) root.setProperty('--accent-light', accentLight);

  /* Derive all dependent vars explicitly in JS so color-mix() in CSS
     doesn't need to resolve them (avoids browser inconsistencies with
     color-mix + CSS custom properties on inline styles). */
  const dark  = accentDark  || getComputedStyle(document.documentElement).getPropertyValue('--accent-dark').trim();
  const light = accentLight || getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim();

  if (dark) {
    root.setProperty('--border-dark',        hexToRgba(dark, 0.18));
    root.setProperty('--glow-dark',          hexToRgba(dark, 0.12));
    root.setProperty('--gradient-top-dark',  hexToRgba(dark, 0.15));
    root.setProperty('--gradient-bot-dark',  hexToRgba(dark, 0.08));
  }
  if (light) {
    root.setProperty('--border-light',        hexToRgba(light, 0.25));
    root.setProperty('--glow-light',          hexToRgba(light, 0.15));
    root.setProperty('--gradient-top-light',  hexToRgba(light, 0.18));
    root.setProperty('--gradient-bot-light',  hexToRgba(light, 0.10));
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



/* ════════════════════════════════════════════════════════════
   NOISE TEXTURE
   Generates the grain SVG from config values and sets it as
   --noise-svg on :root so body::after can use it.
   ════════════════════════════════════════════════════════════ */
function applyNoise({ frequency = 0.65, octaves = 1 } = {}) {
  /* type="turbulence" + feColorMatrix desaturate → dense, uniform grain
     similar to analog film/TV static. Much closer to real photographic noise
     than fractalNoise which produces visible low-frequency blobs. */
  const svg = [
    `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>`,
    `<filter id='n' color-interpolation-filters='linearRGB'>`,
    `<feTurbulence type='turbulence' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/>`,
    `<feColorMatrix type='saturate' values='0'/>`,
    `</filter>`,
    `<rect width='100%' height='100%' filter='url(#n)' opacity='0.06'/>`,
    `</svg>`,
  ].join('');

  const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  document.documentElement.style.setProperty('--noise-svg', encoded);
}

/* ════════════════════════════════════════════════════════════
   CUSTOM FONT
   ════════════════════════════════════════════════════════════

   "font" in config.json supports three setups:

   1. Variable font - one file, all weights:
      "font": { "family": "MyFont", "fallback": "sans-serif",
                "files": [{ "path": "fonts/MyFont.woff2", "variable": true }] }

   2. Static files - one file per weight:
      "font": { "family": "MyFont", "fallback": "sans-serif",
                "files": [
                  { "path": "fonts/MyFont-Regular.woff2", "weight": 400 },
                  { "path": "fonts/MyFont-Bold.woff2",    "weight": 700 }
                ] }

   3. Legacy shorthand (single file, backward-compatible):
      "font": { "family": "MyFont", "fallback": "sans-serif",
                "path": "fonts/MyFont.woff2", "variable": true }

   Per-file fields:
     path      - relative path to the .woff2 file (required)
     weight    - number or "min max" string, e.g. 400 or "100 900"
                 omit to auto-detect (variable) or default to "normal"
     variable  - true/false; omit to auto-detect from filename
   ════════════════════════════════════════════════════════════ */

function injectFont(fontCfg) {
  const { family, fallback } = fontCfg;

  /* Normalise to an array of file descriptors */
  const files = Array.isArray(fontCfg.files)
    ? fontCfg.files
    : [{ path: fontCfg.path, weight: fontCfg.weight, variable: fontCfg.variable }];

  const styleRules = files.map(file => buildFontFace(family, file)).join('\n');

  const style = document.createElement('style');
  style.textContent = styleRules;
  document.head.appendChild(style);

  document.body.style.fontFamily = `'${family}', ${fallback || 'sans-serif'}`;
}

/* Named weight aliases - use these in config.json "weight" field.
   Numbers also work if you prefer. */
const FONT_WEIGHT_NAMES = {
  thin:        100,
  hairline:    100,
  extralight:  200,
  'extra-light': 200,
  ultralight:  200,
  light:       300,
  regular:     400,
  normal:      400,
  book:        400,
  medium:      500,
  semibold:    600,
  'semi-bold': 600,
  demibold:    600,
  bold:        700,
  extrabold:   800,
  'extra-bold': 800,
  ultrabold:   800,
  black:       900,
  heavy:       900,
  ultrablack:  950,
};

/**
 * Resolve a weight value from config to a valid CSS font-weight string.
 * Accepts: named string ("bold"), number (700), range string ("100 900"),
 *          or two-word range ("thin black" → "100 900").
 * Returns null if weight is undefined, or logs a warning and falls back
 * to "normal" if the value can't be recognised.
 */
function resolveWeight(weight, filePath) {
  if (weight === undefined) return null;

  const raw   = String(weight).trim().toLowerCase();
  const label = filePath ? `"${filePath}"` : 'font file';

  /* Already a numeric range: "100 900" */
  if (/^\d+\s+\d+$/.test(raw)) return raw;

  /* Two named values: "light bold" → "300 700" */
  const parts = raw.split(/\s+/);
  if (parts.length === 2) {
    const a = FONT_WEIGHT_NAMES[parts[0]] ?? (isNumericWeight(parts[0]) ? Number(parts[0]) : null);
    const b = FONT_WEIGHT_NAMES[parts[1]] ?? (isNumericWeight(parts[1]) ? Number(parts[1]) : null);

    if (a !== null && b !== null) return `${a} ${b}`;

    const bad = [parts[0], parts[1]].filter(p => !FONT_WEIGHT_NAMES[p] && !isNumericWeight(p));
    console.warn(
      `[config-loader] Unknown font weight name(s) ${bad.map(p => `"${p}"`).join(', ')} ` +
      `in ${label}. Falling back to "normal".\n` +
      `Supported names: ${Object.keys(FONT_WEIGHT_NAMES).join(', ')}`
    );
    return 'normal';
  }

  /* Single named value: "bold" → "700" */
  if (FONT_WEIGHT_NAMES[raw] !== undefined) return String(FONT_WEIGHT_NAMES[raw]);

  /* Plain number */
  if (isNumericWeight(raw)) return raw;

  /* Nothing matched - warn and fall back */
  console.warn(
    `[config-loader] Unknown font weight "${weight}" in ${label}. Falling back to "normal".\n` +
    `Supported names: ${Object.keys(FONT_WEIGHT_NAMES).join(', ')}\n` +
    `Or use a number (100–900) or a range like "300 700".`
  );
  return 'normal';
}

/** True if the string is a plain CSS font-weight number (100–900). */
function isNumericWeight(str) {
  const n = Number(str);
  return /^\d+$/.test(str) && n >= 1 && n <= 1000;
}

/**
 * Build a single @font-face rule for one file descriptor.
 * @param {string} family
 * @param {{ path: string, weight?: number|string, variable?: boolean }} file
 */
function buildFontFace(family, { path, weight, variable }) {
  /* Detect variable font if not explicitly set */
  const isVariable = variable !== undefined
    ? Boolean(variable)
    : /variable|-vf|[\s_\-]var[\s_.\-]|VF\./i.test(path);

  /* Resolve font-weight:
       named / numeric value → resolveWeight()
       variable font         → full range "100 900"
       static font           → "normal"             */
  const resolved  = resolveWeight(weight, path);
  const fontWeight = resolved ?? (isVariable ? '100 900' : 'normal');

  const format = isVariable ? 'woff2-variations' : 'woff2';

  return `
  @font-face {
    font-family: '${family}';
    src: url('${path}') format('${format}');
    font-weight: ${fontWeight};
    font-style: normal;
    font-display: swap;
  }`;
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
  const section = document.querySelector('.projects-section');
  const grid    = document.getElementById('projects-grid');
  if (!grid || !Array.isArray(projects)) return;

  /* ── Collect all unique tags ── */
  const allTags = [...new Set(projects.flatMap(p => p.tags || []))];

  /* ── Render tag filter bar ── */
  if (allTags.length && section) {
    const existing = document.getElementById('tag-filter-bar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.id = 'tag-filter-bar';
    bar.className = 'tag-filter-bar';

    /* "All" button */
    const allBtn = makeFilterBtn('all', true);
    bar.appendChild(allBtn);

    allTags.forEach(tag => {
      bar.appendChild(makeFilterBtn(tag, false));
    });

    /* Insert before the grid */
    grid.parentNode.insertBefore(bar, grid);

    /* Filter logic */
    let active = 'all';
    bar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      const tag = btn.dataset.tag;
      if (tag === active) return;
      active = tag;
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.tag === tag));
      grid.querySelectorAll('.project-card').forEach(card => {
        const show = tag === 'all' || card.dataset.tags?.split(',').includes(tag);
        card.style.transition = 'opacity .25s, transform .25s';
        card.style.opacity    = show ? '' : '0.2';
        card.style.transform  = show ? '' : 'scale(0.97)';
        card.style.pointerEvents = show ? '' : 'none';
      });
    });
  }

  /* ── Render cards ── */
  grid.innerHTML = '';
  projects.forEach((p, i) => grid.appendChild(buildCard(p, i)));
}

function makeFilterBtn(tag, isActive) {
  const btn = document.createElement('button');
  btn.className = `filter-btn${isActive ? ' active' : ''}`;
  btn.dataset.tag = tag;
  btn.textContent = tag === 'all' ? 'Все' : tag;
  return btn;
}

/* ── Card builder ── */
function buildCard(p, index) {
  const preset = p.preset || 'no-links';

  /* All cards are now <div> — clicking navigates to detail page */
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.preset = preset;
  card.dataset.tags   = (p.tags || []).join(',');
  card.style.animationDelay = `${0.05 + index * 0.05}s`;

  /* Navigate to detail page on card click */
  card.style.cursor = 'pointer';
  card.addEventListener('click', e => {
    /* Don't navigate if clicking a link button */
    if (e.target.closest('.project-link-footer')) return;
    navigateToProject(index);
  });

  card.appendChild(buildThumbnail(p));

  /* ↗ badge — always shown (indicates detail page) */
  const arrow = document.createElement('span');
  arrow.className = 'project-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  card.appendChild(arrow);

  card.appendChild(buildInfo(p));

  /* Link buttons — shown for all presets that have links */
  const hasLinks = p.github || p.url || p.page || p.play;
  if (hasLinks) card.appendChild(buildLinksBar(p));

  return card;
}

/* ── Smooth page transition to detail ── */
function navigateToProject(index) {
  /* Inject overlay into page */
  let overlay = document.getElementById('page-transition');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition';
    overlay.className = 'page-transition';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
  setTimeout(() => {
    window.location.href = `project.html?id=${index}`;
  }, 320);
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
    tag.textContent = p.tags.join(' - ');
    info.appendChild(tag);
  }

  return info;
}

/* ── Links bar — rendered for any card that has at least one link ── */
function buildLinksBar(p) {
  const bar = document.createElement('div');
  bar.className = 'project-link-footer';

  const buttons = [
    { href: p.github, labelRu: 'GitHub',   labelEn: 'GitHub',  icon: SVG_GITHUB_SMALL, cls: '' },
    { href: p.url,    labelRu: 'Открыть',  labelEn: 'Open',    icon: SVG_LINK,         cls: '' },
    { href: p.page,   labelRu: 'Страница', labelEn: 'Page',    icon: SVG_LINK,         cls: '' },
    { href: p.play,   labelRu: 'Играть',   labelEn: 'Play',    icon: SVG_PLAY,         cls: 'project-link-btn--play' },
  ];

  buttons.forEach(({ href, labelRu, labelEn, icon, cls }) => {
    if (!href) return;

    const btn = document.createElement('a');
    btn.href      = href;
    btn.target    = '_blank';
    btn.rel       = 'noopener';
    btn.className = `project-link-btn${cls ? ' ' + cls : ''}`;
    /* Stop click from bubbling to card's navigate handler */
    btn.addEventListener('click', e => e.stopPropagation());

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
      'footer-text':  `© ${new Date().getFullYear()} ${nameRu}\u00a0-\u00a0 Сделано с ☕ и вниманием к деталям`,
      pageTitle:      `${nameRu} - Портфолио`,
    });

    Object.assign(i18n.en, {
      firstName:      firstEn,
      lastName:       restEn.join(' '),
      tagline:        taglineEn || i18n.en.tagline,
      bio:            bioEn     || i18n.en.bio,
      'footer-text':  `© ${new Date().getFullYear()} ${nameEn}\u00a0-\u00a0 Made with ☕ and attention to detail`,
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
