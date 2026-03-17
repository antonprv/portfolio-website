/* ============================================================
   project-page.js — Renders the individual project detail page.
   Reads ?id=N from the URL, fetches config.json, finds the
   project by index, and renders the full detail view.
   ============================================================ */

(async function init() {

  /* ── Load config ── */
  let cfg;
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cfg = await res.json();
  } catch (e) {
    document.getElementById('project-root').innerHTML =
      '<p style="padding:4rem 2rem;color:var(--muted)">Failed to load config.json</p>';
    return;
  }

  window.__cfg = cfg;
  applyAccentColors(cfg.theme);
  applyNoise(cfg.noise);
  if (cfg.font?.path || cfg.font?.files?.length) injectFont(cfg.font);

  /* ── Find project by index ── */
  const idx     = Number(new URLSearchParams(location.search).get('id') ?? -1);
  const project = cfg.projects?.[idx];

  if (!project) {
    document.getElementById('project-root').innerHTML =
      '<p style="padding:4rem 2rem;color:var(--muted)">Project not found. <a href="index.html" style="color:var(--accent)">← Back</a></p>';
    return;
  }

  /* ── Determine current language ── */
  const lang = () => (typeof currentLang !== 'undefined' ? currentLang : 'ru');

  /* ── Fade in: remove the transition overlay that was set by navigateToProject ── */
  const overlay = document.getElementById('page-transition');
  if (overlay) {
    /* Small delay so the page has painted before fading in */
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.classList.remove('active');
      /* Clean up inline transition style after animation */
      setTimeout(() => { overlay.style.transition = ''; }, 350);
    });
  }

  /* ── Fix black screen on browser Back (bfcache restores active overlay) ── */
  window.addEventListener('pageshow', () => {
    const ov = document.getElementById('page-transition');
    if (ov) ov.classList.remove('active');
  });

  /* ── Render ── */
  renderPage(project, lang, cfg.profile);

  /* ── Lightbox ── */
  initLightbox();

  /* ── Patch page title / html lang once i18n loads ── */
  const waitI18n = () => {
    if (typeof i18n === 'undefined') { requestAnimationFrame(waitI18n); return; }
    const l = lang();
    document.documentElement.lang = i18n[l]?.htmlLang || l;
    document.title = (project[`name${cap(l)}`] || project.nameRu) + ' — ' +
                     (i18n[l]?.firstName || '') + ' ' + (i18n[l]?.lastName || '');
  };
  waitI18n();

})();

/* ════════════════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════════════════ */
function renderPage(p, lang, profile) {
  const root = document.getElementById('project-root');

  const name    = () => p[`name${cap(lang())}`]  || p.nameRu  || '';
  const desc    = () => p[`desc${cap(lang())}`]  || p.descRu  || '';
  const details = () => p[`details${cap(lang())}`] || p.detailsRu || '';

  /* ── Back button ── */
  const back = el('a', 'back-btn');
  back.href = 'index.html';
  back.innerHTML = `${SVG_ARROW_LEFT} <span class="t" data-ru="Назад" data-en="Back">Назад</span>`;
  back.addEventListener('click', e => {
    e.preventDefault();
    navigateBack();
  });

  /* ── Header ── */
  const header = el('div', 'project-detail-header reveal');

  const meta = el('div', 'project-detail-meta');
  if (p.emoji) {
    const emo = el('span', 'project-detail-emoji');
    emo.textContent = p.emoji;
    meta.appendChild(emo);
  }

  /* Tags */
  if (Array.isArray(p.tags) && p.tags.length) {
    const tagsWrap = el('div', 'project-detail-tags');
    p.tags.forEach(tag => {
      const t = el('span', 'project-tag');
      t.textContent = tag;
      tagsWrap.appendChild(t);
    });
    meta.appendChild(tagsWrap);
  }
  header.appendChild(meta);

  const title = el('h1', 't');
  title.dataset.ru = p.nameRu || '';
  title.dataset.en = p.nameEn || '';
  title.textContent = name();
  header.appendChild(title);

  const shortDesc = el('p', 'project-detail-desc t');
  shortDesc.dataset.ru = p.descRu || '';
  shortDesc.dataset.en = p.descEn || '';
  shortDesc.textContent = desc();
  header.appendChild(shortDesc);

  /* ── Action buttons ── */
  const actions = buildActions(p, lang);
  if (actions.children.length) header.appendChild(actions);

  /* ── Gallery (replaces standalone hero image) ── */
  const shots = buildScreenshots(p);

  /* ── Long description ── */
  const body = el('div', 'project-detail-body t reveal');
  body.dataset.ru = p.detailsRu || '';
  body.dataset.en = p.detailsEn || '';
  body.textContent = details() || '';

  /* ── Assemble: back → header → gallery → description ── */
  const detail = el('div', 'project-detail');
  detail.appendChild(back);
  detail.appendChild(header);
  if (shots) detail.appendChild(shots);
  if (body.textContent.trim()) detail.appendChild(body);

  root.appendChild(detail);

  /* ── Scroll reveal ── */
  requestAnimationFrame(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    root.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  });
}

/* ── Action buttons ── */
function buildActions(p, lang) {
  const wrap = el('div', 'project-detail-actions');

  const btns = [
    { href: p.github,  labelRu: 'GitHub',   labelEn: 'GitHub',   icon: SVG_GITHUB, cls: '' },
    { href: p.page,    labelRu: 'Страница', labelEn: 'Page',     icon: SVG_LINK,   cls: '' },
    { href: p.url,     labelRu: 'Открыть',  labelEn: 'Open',     icon: SVG_LINK,   cls: '' },
    { href: p.play,    labelRu: 'Играть',   labelEn: 'Play',     icon: SVG_PLAY,   cls: 'detail-btn--play' },
  ];

  btns.forEach(({ href, labelRu, labelEn, icon, cls }) => {
    if (!href) return;
    const a = el('a', `detail-btn${cls ? ' ' + cls : ''}`);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = icon;
    const span = el('span', 't');
    span.dataset.ru = labelRu;
    span.dataset.en = labelEn;
    span.textContent = labelRu;
    a.appendChild(span);
    wrap.appendChild(a);
  });

  if (p.preset === 'no-links') {
    const notice = el('div', 'nda-notice');
    notice.innerHTML = `🔒 <span class="t" data-ru="Проект под NDA — ссылки недоступны" data-en="Project is under NDA — links unavailable">Проект под NDA — ссылки недоступны</span>`;
    wrap.appendChild(notice);
  }

  return wrap;
}

/* ── Hero image ── */
/* buildHeroImage removed — gallery is used instead */

/* ── Detect whether screenshots are portrait (vertical) ──
   Loads the first image, resolves true if height > width. */
function detectPortrait(shots) {
  const firstImage = shots.find(s => {
    if (typeof s === 'string') return !/\.(mp4|webm|ogg|mov)$/i.test(s);
    return (s.type === 'image') || (!s.type && (s.src || s.url || '') && !/\.(mp4|webm|ogg|mov)$/i.test(s.src || s.url || ''));
  });
  if (!firstImage) return Promise.resolve(false);
  const src = typeof firstImage === 'string' ? firstImage : (firstImage.src || firstImage.url || '');
  if (!src) return Promise.resolve(false);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img.naturalHeight > img.naturalWidth * 1.1);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/* ── Render a single image into a slot element ── */
function renderSlotContent(slot, item, instant) {
  const build = () => {
    slot.innerHTML = '';
    if (item.type === 'embed') {
      slot.style.cursor = 'default';
      const wrap = el('div', 'gallery-embed-wrap');
      const iframe = document.createElement('iframe');
      iframe.src = item.src;
      iframe.allow = 'clipboard-write; autoplay; fullscreen';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('frameborder', '0');
      iframe.className = 'gallery-embed';
      wrap.appendChild(iframe);
      slot.appendChild(wrap);
    } else if (item.type === 'video') {
      slot.style.cursor = 'default';
      const video = document.createElement('video');
      video.src = item.src;
      video.poster = item.poster || '';
      video.controls = true;
      video.className = 'gallery-video';
      video.setAttribute('playsinline', '');
      slot.appendChild(video);
    } else if (item.type === '_fallback') {
      slot.style.cursor = 'default';
      const tile = el('div', `project-detail-hero-fallback ${item.color}`);
      tile.textContent = item.emoji;
      tile.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:4rem;';
      slot.appendChild(tile);
    } else {
      slot.style.cursor = 'zoom-in';
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.caption || '';
      img.loading = 'eager';
      img.addEventListener('click', () => openLightbox(item.src, 'image'));
      slot.appendChild(img);
      const zoom = el('div', 'gallery-zoom-hint');
      zoom.textContent = '⤢';
      slot.appendChild(zoom);
    }
    if (item.captionRu || item.captionEn) {
      const cap = el('div', 'gallery-caption t');
      cap.dataset.ru = item.captionRu || item.captionEn;
      cap.dataset.en = item.captionEn || item.captionRu;
      cap.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en')
        ? (item.captionEn || item.captionRu)
        : (item.captionRu || item.captionEn);
      slot.appendChild(cap);
    }
    slot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease', fill: 'none' });
  };
  if (instant) { build(); return; }
  slot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease', fill: 'forwards' })
    .onfinish = () => { slot.getAnimations().forEach(a => a.cancel()); build(); };
}

/* ── Build portrait (2-up) gallery ── */
function buildPortraitGallery(gallery, shots, thumbStrip) {
  /* Pair container replaces the single .gallery-featured */
  const pair = el('div', 'gallery-featured-pair');

  const slot0 = el('div', 'gallery-featured-slot');
  const slot1 = el('div', 'gallery-featured-slot');
  pair.appendChild(slot0);
  pair.appendChild(slot1);

  /* Nav arrows live inside the pair */
  const btnPrev = el('button', 'gallery-nav gallery-nav--prev');
  btnPrev.setAttribute('aria-label', 'Previous');
  btnPrev.innerHTML = SVG_CHEVRON_LEFT;
  const btnNext = el('button', 'gallery-nav gallery-nav--next');
  btnNext.setAttribute('aria-label', 'Next');
  btnNext.innerHTML = SVG_CHEVRON_RIGHT;
  pair.appendChild(btnPrev);
  pair.appendChild(btnNext);

  gallery.appendChild(pair);

  /* activeIdx = index of the LEFT slot */
  let activeIdx = 0;

  function renderPair(startIdx, instant) {
    activeIdx = startIdx;

    const itemA = normalizeMedia(shots[startIdx]);
    const itemB = startIdx + 1 < shots.length ? normalizeMedia(shots[startIdx + 1]) : null;

    renderSlotContent(slot0, itemA, instant);
    if (itemB) {
      slot1.classList.remove('slot-empty');
      renderSlotContent(slot1, itemB, instant);
    } else {
      slot1.innerHTML = '';
      slot1.classList.add('slot-empty');
    }

    /* Highlight active pair in thumbs (both) */
    thumbStrip.querySelectorAll('.gallery-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === startIdx || i === startIdx + 1);
    });
  }

  /* Clicking thumbs: snap to the pair that contains that thumb */
  thumbStrip.querySelectorAll('.gallery-thumb').forEach((t, i) => {
    t.addEventListener('click', () => {
      /* Snap to even index so we always show a left-aligned pair */
      const pairStart = i % 2 === 0 ? i : i - 1;
      renderPair(pairStart);
    });
  });

  /* Arrows advance by 2 */
  btnPrev.addEventListener('click', () => {
    const next = activeIdx - 2;
    renderPair(Math.max(0, next % 2 === 0 ? next : next - 1));
  });
  btnNext.addEventListener('click', () => {
    const next = activeIdx + 2;
    renderPair(next < shots.length ? next : activeIdx);
  });

  /* Keyboard */
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const next = activeIdx + 2;
      if (next < shots.length) renderPair(next);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const next = activeIdx - 2;
      if (next >= 0) renderPair(next);
    }
  });

  renderPair(0, true);
}

/* ── Screenshots grid ── */
function buildScreenshots(p) {
  let shots = p.screenshots;
  /* No screenshots — render a single emoji/color tile as the gallery */
  if (!Array.isArray(shots) || !shots.length) {
    shots = [{
      type:    '_fallback',
      emoji:   p.emoji  || '🎮',
      color:   p.color  || 'c1',
      image:   p.image  || '',
    }];
  }

  const hasMultiple = shots.length > 1;
  const gallery     = el('div', `project-gallery reveal${hasMultiple ? '' : ' gallery-single'}`);

  /* Thumbs go FIRST (left column), featured second (right) */
  const thumbStrip = el('div', 'gallery-thumbs');
  if (hasMultiple) thumbStrip.style.display = '';
  else             thumbStrip.style.display = 'none';
  const featured   = el('div', 'gallery-featured');

  /* Prev / Next arrow buttons — only when multiple items */
  const btnPrev = el('button', 'gallery-nav gallery-nav--prev');
  btnPrev.setAttribute('aria-label', 'Previous');
  btnPrev.innerHTML = SVG_CHEVRON_LEFT;
  const btnNext = el('button', 'gallery-nav gallery-nav--next');
  btnNext.setAttribute('aria-label', 'Next');
  btnNext.innerHTML = SVG_CHEVRON_RIGHT;

  if (hasMultiple) {
    featured.appendChild(btnPrev);
    featured.appendChild(btnNext);
  }

  gallery.appendChild(thumbStrip);
  gallery.appendChild(featured);

  let activeIdx = 0;
  let isTransitioning = false;

  function renderFeatured(idx, instant) {
    if (isTransitioning && !instant) return;
    activeIdx = idx;

    /* Pause video / stop embed audio before switching */
    const prevVideo = featured.querySelector('video');
    if (prevVideo) prevVideo.pause();
    const prevIframe = featured.querySelector('iframe');
    if (prevIframe) { prevIframe.src = prevIframe.src; } /* reload stops audio */

    const item = normalizeMedia(shots[idx]);

    const buildContent = () => {
      featured.innerHTML = '';

      if (item.type === 'embed') {
        /* Responsive iframe embed (Rutube, YouTube, Vimeo, etc.) */
        const wrap = el('div', 'gallery-embed-wrap');
        const iframe = document.createElement('iframe');
        iframe.src   = item.src;
        iframe.allow = 'clipboard-write; autoplay; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('webkitallowfullscreen', '');
        iframe.setAttribute('mozallowfullscreen', '');
        iframe.setAttribute('frameborder', '0');
        iframe.className = 'gallery-embed';
        wrap.appendChild(iframe);
        featured.appendChild(wrap);
        /* No zoom hint for embeds */
      } else if (item.type === 'video') {
        const video = document.createElement('video');
        video.src      = item.src;
        video.poster   = item.poster || '';
        video.controls = true;
        video.className = 'gallery-video';
        video.setAttribute('playsinline', '');
        featured.appendChild(video);
      } else if (item.type === '_fallback') {
        /* No media provided — show colored emoji tile */
        const tile = el('div', `project-detail-hero-fallback ${item.color}`);
        tile.textContent = item.emoji;
        tile.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:4rem;';
        featured.appendChild(tile);
        featured.style.cursor = 'default';
      } else {
        const img = document.createElement('img');
        img.src       = item.src;
        img.alt       = item.caption || '';
        img.loading   = 'eager';
        img.className = 'gallery-featured-img';
        img.addEventListener('click', () => openLightbox(item.src, 'image'));
        featured.appendChild(img);

        const zoom = el('div', 'gallery-zoom-hint');
        zoom.textContent = '⤢';
        featured.appendChild(zoom);
      }

      /* Caption */
      if (item.captionRu || item.captionEn) {
        const cap = el('div', 'gallery-caption t');
        cap.dataset.ru = item.captionRu || item.captionEn;
        cap.dataset.en = item.captionEn || item.captionRu;
        cap.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en')
          ? (item.captionEn || item.captionRu)
          : (item.captionRu || item.captionEn);
        featured.appendChild(cap);
      }

      /* Crossfade in */
      featured.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, easing: 'ease', fill: 'none' });
    };

    if (instant) {
      buildContent();
    } else {
      isTransitioning = true;
      featured.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 150, easing: 'ease', fill: 'forwards' })
        .onfinish = () => {
          featured.getAnimations().forEach(a => a.cancel());
          buildContent();
          isTransitioning = false;
        };
    }

    /* Update thumb highlights */
    thumbStrip.querySelectorAll('.gallery-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
  }

  /* Build thumbnails */
  shots.forEach((shot, idx) => {
    const item  = normalizeMedia(shot);
    const thumb = el('div', `gallery-thumb${idx === 0 ? ' active' : ''}`);

    if (item.type === 'embed' || item.type === 'video') {
      if (item.poster) {
        const img = document.createElement('img');
        img.src = item.poster;
        img.alt = '';
        thumb.appendChild(img);
      } else {
        thumb.classList.add('gallery-thumb--video-fallback');
      }
      const playIcon = el('div', 'gallery-thumb-play');
      playIcon.innerHTML = item.type === 'embed' ? SVG_EMBED_THUMB : SVG_PLAY_THUMB;
      thumb.appendChild(playIcon);
    } else {
      const img = document.createElement('img');
      img.src     = item.src;
      img.alt     = '';
      img.loading = 'lazy';
      thumb.appendChild(img);
    }

    thumb.addEventListener('click', () => renderFeatured(idx));
    thumbStrip.appendChild(thumb);
  });

  /* Arrow button nav */
  btnPrev.addEventListener('click', () => renderFeatured((activeIdx - 1 + shots.length) % shots.length));
  btnNext.addEventListener('click', () => renderFeatured((activeIdx + 1) % shots.length));

  /* Keyboard nav */
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      renderFeatured((activeIdx + 1) % shots.length);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      renderFeatured((activeIdx - 1 + shots.length) % shots.length);
  });
  gallery.setAttribute('tabindex', '0');
  gallery.setAttribute('aria-label', 'Project gallery');

  /* ── Portrait detection: if all images are vertical and screen is wide,
     replace the standard featured slot with a side-by-side pair ── */
  if (hasMultiple) {
    detectPortrait(shots).then(isPortrait => {
      if (!isPortrait || window.innerWidth < 700) return;
      /* Switch to portrait layout */
      gallery.classList.add('gallery-portrait');
      /* Remove the standard .gallery-featured (already in DOM) */
      featured.remove();
      /* Build the pair view */
      buildPortraitGallery(gallery, shots, thumbStrip);
    });
  }

  renderFeatured(0, true);
  return gallery;
}

/* Normalize a screenshot entry to { type, src, embed, poster, captionRu, captionEn }
   Supported formats in config.json:
     "path/to/image.jpg"
     { "type": "image", "src": "...", "captionRu": "...", "captionEn": "..." }
     { "type": "video", "src": "...", "poster": "...", "captionRu": "...", "captionEn": "..." }
     { "type": "embed", "src": "https://rutube.ru/play/embed/ID/", "poster": "..." }
     { "embed": "<iframe ...></iframe>" }
   Legacy "caption" field still works as fallback for both languages. */
function normalizeMedia(item) {
  if (typeof item === 'string') {
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(item);
    return { type: isVideo ? 'video' : 'image', src: item, captionRu: '', captionEn: '' };
  }
  if (item.type === '_fallback') return item;

  const capRu = item.captionRu || item.caption || '';
  const capEn = item.captionEn || item.caption || '';

  if (item.embed) {
    const match = item.embed.match(/src=["']([^"']+)["']/);
    return {
      type:      'embed',
      src:       match ? match[1] : '',
      poster:    item.poster || '',
      captionRu: capRu,
      captionEn: capEn,
    };
  }

  const rawSrc = item.src || item.url || '';
  const type = item.type || (/\.(mp4|webm|ogg|mov)$/i.test(rawSrc) ? 'video' : 'image');

  return {
    type,
    src:       rawSrc,
    poster:    item.poster || '',
    captionRu: capRu,
    captionEn: capEn,
  };
}

/* ── Lightbox (image zoom only — videos play inline) ── */
function initLightbox() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const close = document.getElementById('lightbox-close');

  const closeLb = () => { lb.classList.remove('open'); lbImg.src = ''; };
  close.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

  window.openLightbox = (src, type) => {
    if (type === 'image') {
      lbImg.src = src;
      lb.classList.add('open');
    }
  };
}

/* ── Navigation back with transition ── */
function navigateBack() {
  const overlay = document.getElementById('page-transition');
  overlay.classList.add('active');
  setTimeout(() => { window.location.href = 'index.html'; }, 350);
}


/* ════════════════════════════════════════════════════════════
   SHARED HELPERS (same as config-loader.js, duplicated so
   project-page.js works standalone without importing)
   ════════════════════════════════════════════════════════════ */
function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function cap(str) { return str ? str[0].toUpperCase() + str.slice(1) : ''; }

function applyAccentColors({ accentDark, accentLight } = {}) {
  const root = document.documentElement.style;
  if (accentDark)  root.setProperty('--accent-dark',  accentDark);
  if (accentLight) root.setProperty('--accent-light', accentLight);
  const dark  = accentDark  || getComputedStyle(document.documentElement).getPropertyValue('--accent-dark').trim();
  const light = accentLight || getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim();
  if (dark) {
    root.setProperty('--border-dark',       hexToRgba(dark, 0.18));
    root.setProperty('--glow-dark',         hexToRgba(dark, 0.12));
    root.setProperty('--gradient-top-dark', hexToRgba(dark, 0.15));
    root.setProperty('--gradient-bot-dark', hexToRgba(dark, 0.08));
  }
  if (light) {
    root.setProperty('--border-light',       hexToRgba(light, 0.25));
    root.setProperty('--glow-light',         hexToRgba(light, 0.15));
    root.setProperty('--gradient-top-light', hexToRgba(light, 0.18));
    root.setProperty('--gradient-bot-light', hexToRgba(light, 0.10));
  }
}

function applyNoise({ frequency = 0.75, octaves = 8 } = {}) {
  const svg = [
    `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>`,
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/></filter>`,
    `<rect width='100%' height='100%' filter='url(#n)' opacity='0.04'/>`,
    `</svg>`,
  ].join('');
  document.documentElement.style.setProperty('--noise-svg', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}

function injectFont(fontCfg) {
  const { family, fallback } = fontCfg;
  const files = Array.isArray(fontCfg.files)
    ? fontCfg.files
    : [{ path: fontCfg.path, weight: fontCfg.weight, variable: fontCfg.variable }];
  const rules = files.map(f => {
    const isVar = f.variable !== undefined ? Boolean(f.variable) : /variable|-vf/i.test(f.path);
    const fw = f.weight !== undefined ? String(f.weight) : (isVar ? '100 900' : 'normal');
    const fmt = isVar ? 'woff2-variations' : 'woff2';
    return `@font-face{font-family:'${family}';src:url('${f.path}') format('${fmt}');font-weight:${fw};font-style:normal;font-display:swap;}`;
  }).join('\n');
  const style = document.createElement('style');
  style.textContent = rules;
  document.head.appendChild(style);
  document.body.style.fontFamily = `'${family}', ${fallback || 'sans-serif'}`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── SVG icons ── */
const SVG_CHEVRON_LEFT  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
const SVG_CHEVRON_RIGHT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`;
const SVG_EMBED_THUMB = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="9,8 16,10 9,12" fill="white" stroke="none"/></svg>`;
const SVG_PLAY_THUMB = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true"><polygon points="6,4 20,12 6,20"/></svg>`;
const SVG_ARROW_LEFT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`;
const SVG_GITHUB     = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0C17.3 5.37 18.26 5.68 18.26 5.68c.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .31.21.67.8.56C20.2 21.4 23.5 17.1 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>`;
const SVG_PLAY       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>`;
const SVG_LINK       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
