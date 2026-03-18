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
  wireSocialLinks(cfg.profile?.links || {});
  renderSkills(cfg.skills);
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
   SOCIAL LINKS
   Sets hrefs from config and hides any button whose link is absent.
   ════════════════════════════════════════════════════════════ */
function wireSocialLinks(links) {
  const map = {
    'link-github':   links.github,
    'link-telegram': links.telegram,
    'link-email':    links.email,
    'link-linkedin': links.linkedin,
  };
  Object.entries(map).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (href) {
      el.href = href;
    } else {
      el.style.display = 'none'; /* hide pill when link not configured */
    }
  });
}


/* ════════════════════════════════════════════════════════════
   SKILLS
   Reads cfg.skills — an array of category objects:
   [
     {
       "title": "Core technologies",
       "primary": true,          ← optional, makes tags accent-coloured
       "icon": "star",           ← optional, one of the icon keys below
       "items": ["Unity","C#","Unreal Engine","C++"]
     },
     ...
   ]
   ════════════════════════════════════════════════════════════ */

const SKILL_ICONS = {
  star:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  grid:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  radio:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
  code:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  wrench:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  cpu:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>`,
  layers:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  bolt:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  box:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
};

function renderSkills(skills) {
  const section = document.getElementById('skills-section');
  const grid    = document.getElementById('skills-grid');
  if (!grid || !Array.isArray(skills) || skills.length === 0) return;

  skills.forEach(category => {
    if (!Array.isArray(category.items) || category.items.length === 0) return;

    const group = document.createElement('div');
    group.className = 'skill-group';

    /* ── Icon + title ── */
    const titleEl = document.createElement('div');
    titleEl.className = 'skill-group-title';

    const iconKey = category.icon || 'star';
    titleEl.innerHTML = SKILL_ICONS[iconKey] || SKILL_ICONS.star;
    titleEl.appendChild(document.createTextNode(' ' + (category.title || '')));
    group.appendChild(titleEl);

    /* ── Tags ── */
    const tagsEl = document.createElement('div');
    tagsEl.className = 'skill-tags';

    category.items.forEach(item => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag' + (category.primary ? ' skill-tag--primary' : '');
      tag.textContent = item;
      tagsEl.appendChild(tag);
    });

    group.appendChild(tagsEl);
    grid.appendChild(group);
  });

  section.style.visibility = 'visible';
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

  /* ── Tag filter bar from cfg.tagFilters (top-level config key) ── */
  const tagFilters = (window.__cfg?.tagFilters) || [];

  if (tagFilters.length && section) {
    const existing = document.getElementById('tag-filter-bar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.id = 'tag-filter-bar';
    bar.className = 'tag-filter-bar';

    /* "All" button */
    const allBtn = makeFilterBtn('all', 'Все / All', true);
    bar.appendChild(allBtn);

    tagFilters.forEach(({ id, label }) => {
      bar.appendChild(makeFilterBtn(id, label, false));
    });

    grid.parentNode.insertBefore(bar, grid);

    let active = 'all';
    bar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      const tag = btn.dataset.tag;
      if (tag === active) return;
      active = tag;
      bar.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tag === tag)
      );
      filterCards(grid, tag);
    });
  }

  /* ── Render cards ── */
  grid.innerHTML = '';
  projects.forEach((p, i) => grid.appendChild(buildCard(p, i)));
}

function makeFilterBtn(tag, label, isActive) {
  const btn = document.createElement('button');
  btn.className = `filter-btn${isActive ? ' active' : ''}`;
  btn.dataset.tag = tag;
  btn.textContent = tag === 'all' ? 'Все' : label;
  return btn;
}

/* ── Card builder ── */
function buildCard(p, index) {
  const preset = p.preset || 'no-links';

  /* All cards are now <div> — clicking navigates to detail page */
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.preset = preset;
  const allCardTags = [...(p.tags || []), ...(p.subtags || [])];
  card.dataset.tags = allCardTags.join(',');
  card.style.animationDelay = `${0.05 + index * 0.05}s`;

  /* Navigate to detail page on card click */
  card.style.cursor = 'pointer';
  card.addEventListener('click', e => {
    /* Don't navigate if clicking a link button */
    if (e.target.closest('.project-link-footer')) return;
    navigateToProject(index);
  });

  card.appendChild(buildThumbnail(p));

  /* "Подробнее" badge */
  const arrow = document.createElement('span');
  arrow.className = 'project-arrow';
  arrow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg><span class="t" data-ru="Подробнее" data-en="Details">Подробнее</span>`;
  card.appendChild(arrow);

  card.appendChild(buildInfo(p));

  /* Link buttons — shown for all presets that have links */
  const hasLinks = p.github || p.url || p.page || p.play;
  if (hasLinks) card.appendChild(buildLinksBar(p));

  return card;
}

/* ── Tag filter ── */
function filterCards(grid, tag) {
  const cards = [...grid.querySelectorAll('.project-card')];

  const willShow = cards.map(card => {
    const tags = card.dataset.tags?.split(',').filter(Boolean) ?? [];
    return tag === 'all' || tags.includes(tag);
  });

  /* Cancel stale animations */
  cards.forEach(card => card.getAnimations().forEach(a => a.cancel()));

  /* Phase 1 — fade OUT cards being hidden (they still occupy space) */
  const hiding = cards.filter((_, i) => !willShow[i]);
  const showing = cards.filter((_, i) => willShow[i]);

  const FADE_OUT = 160;  /* ms */
  const FADE_IN  = 220;  /* ms */

  if (hiding.length) {
    hiding.forEach(card => {
      card.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: FADE_OUT, easing: 'ease', fill: 'forwards' });
    });
  }

  /* Phase 2 — after hiding cards fade out, remove them from flow and fade in the rest */
  setTimeout(() => {
    /* Cancel forwards-fill so display:none takes over cleanly */
    hiding.forEach(card => {
      card.getAnimations().forEach(a => a.cancel());
      card.style.display = 'none';
    });

    /* Make sure shown cards are visible */
    showing.forEach(card => {
      card.style.display = 'flex';
    });

    /* Fade in shown cards with a gentle stagger */
    showing.forEach((card, i) => {
      card.animate(
        [{ opacity: 0, transform: 'translateY(8px)' },
         { opacity: 1, transform: 'none' }],
        { duration: FADE_IN,
          delay: i * 25,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'none' }
      );
    });
  }, hiding.length ? FADE_OUT : 0);
}

/* ── Smooth page transition to detail ── */
function navigateToProject(index) {
  let overlay = document.getElementById('page-transition');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition';
    overlay.className = 'page-transition';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
  /* Store that we came from projects so Back returns there */
  sessionStorage.setItem('returnSection', 'projects');
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

  /* Role badge — shown if roleRu / roleEn are set */
  if (p.roleRu || p.roleEn) {
    const role = document.createElement('p');
    role.className   = 'project-role t';
    role.textContent = p.roleRu || '';
    role.dataset.ru  = p.roleRu || '';
    role.dataset.en  = p.roleEn || '';
    info.appendChild(role);
  }

  const desc = document.createElement('p');
  desc.className   = 't';
  desc.textContent = p.descRu || '';
  desc.dataset.ru  = p.descRu || '';
  desc.dataset.en  = p.descEn || '';
  info.appendChild(desc);

  if (Array.isArray(p.tags) && p.tags.length) {
    const tagWrap = document.createElement('div');
    tagWrap.className = 'project-tags';

    p.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'project-tag project-tag--main';
      span.textContent = t;
      tagWrap.appendChild(span);
    });

    if (Array.isArray(p.subtags) && p.subtags.length) {
      p.subtags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'project-tag project-tag--sub';
        span.textContent = t;
        tagWrap.appendChild(span);
      });
    }

    info.appendChild(tagWrap);
  }

  return info;
}

/* ── Links bar — rendered for any card that has at least one link ── */
function buildLinksBar(p) {
  const bar = document.createElement('div');
  bar.className = 'project-link-footer';

  const buttons = [
    { href: p.github, labelRu: 'GitHub',                          labelEn: 'GitHub',               icon: SVG_GITHUB_SMALL, cls: '' },
    { href: p.url,    labelRu: p.urlLabelRu  || 'Открыть',        labelEn: p.urlLabelEn  || 'Open', icon: SVG_LINK,         cls: '' },
    { href: p.page,   labelRu: p.pageLabelRu || 'Страница',       labelEn: p.pageLabelEn || 'Page', icon: SVG_LINK,         cls: '' },
    { href: p.play,   labelRu: p.playLabelRu || 'Играть',         labelEn: p.playLabelEn || 'Play', icon: SVG_PLAY,         cls: 'project-link-btn--play' },
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
      highlights:     profile.highlightsRu || [],
      'footer-text':  `© ${new Date().getFullYear()} ${nameRu}\u00a0-\u00a0 Сделано с ☕ и вниманием к деталям`,
      pageTitle:      `${nameRu} - Портфолио`,
    });

    Object.assign(i18n.en, {
      firstName:      firstEn,
      lastName:       restEn.join(' '),
      tagline:        taglineEn || i18n.en.tagline,
      bio:            bioEn     || i18n.en.bio,
      highlights:     profile.highlightsEn || [],
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
  set('footer-text', t['footer-text']);

  /* Bio supports HTML tags (<br> etc.) */
  const bioEl = document.getElementById('bio');
  if (bioEl) bioEl.innerHTML = t.bio || '';

  /* Highlights */
  const hlEl = document.getElementById('hero-highlights');
  if (hlEl && Array.isArray(t.highlights) && t.highlights.length) {
    hlEl.innerHTML = t.highlights
      .map(h => `<li><span class="hl-bullet" aria-hidden="true">▸</span>${h}</li>`)
      .join('');
    hlEl.style.display = '';
  } else if (hlEl) {
    hlEl.style.display = 'none';
  }

  document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + currentLang);
  });
  document.querySelectorAll('.project-info h3[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + currentLang);
  });
}
