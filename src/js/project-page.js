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

  /* ── Short desc — hidden on detail page, only shown on card ── */
  /* (descRu/descEn are for the card grid, detailsRu/En are for this page) */

  /* ── Action buttons ── */
  const actions = buildActions(p, lang);
  if (actions.children.length) header.appendChild(actions);

  /* ── Gallery ── */
  const shots = buildScreenshots(p);

  /* ── Long description — rendered AFTER gallery, no reveal class ── */
  const body = el('div', 'project-detail-body');
  body.dataset.ru          = p.detailsRu || '';
  body.dataset.en          = p.detailsEn || '';
  body.dataset.htmlTranslate = 'true';
  body.innerHTML = parseLinks(details());

  /* Ensure all links open in new tab */
  body.querySelectorAll('a[href]').forEach(a => {
    if (!a.target) a.target = '_blank';
    if (!a.rel)    a.rel    = 'noopener noreferrer';
  });

  /* ── Assemble: back → header → gallery → long description ── */
  const detail = el('div', 'project-detail');
  detail.appendChild(back);
  detail.appendChild(header);
  if (shots) detail.appendChild(shots);
  if (body.innerHTML.trim()) detail.appendChild(body);

  root.appendChild(detail);

  /* ── Scroll reveal for header/gallery ── */
  requestAnimationFrame(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
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
  /*
   * Portrait gallery: shows 1 or 2 vertical screenshots side-by-side,
   * depending on available container width. Switches responsively via ResizeObserver.
   *
   * THUMB STRIP:
   *   - pair mode  → vertical column on the LEFT, rows of 2 thumbs each
   *   - single mode → horizontal row BELOW the featured area, 1 thumb each
   *
   * All thumb elements are created fresh from `shots` here and never reused
   * from the DOM to avoid stale click-handler accumulation.
   */

  let pairMode = null; /* null = not yet decided */
  let activeIdx = 0;

  /* ── Featured slots ── */
  const pair  = el('div', 'gallery-featured-pair');
  const slot0 = el('div', 'gallery-featured-slot');
  const slot1 = el('div', 'gallery-featured-slot');
  pair.appendChild(slot0);
  pair.appendChild(slot1);

  const btnPrev = el('button', 'gallery-nav gallery-nav--prev');
  btnPrev.setAttribute('aria-label', 'Previous');
  btnPrev.innerHTML = SVG_CHEVRON_LEFT;
  const btnNext = el('button', 'gallery-nav gallery-nav--next');
  btnNext.setAttribute('aria-label', 'Next');
  btnNext.innerHTML = SVG_CHEVRON_RIGHT;
  pair.appendChild(btnPrev);
  pair.appendChild(btnNext);

  gallery.appendChild(pair);

  /* ── Build a fresh thumb element from a shot (no click yet) ── */
  function makeThumb(shot) {
    const item  = normalizeMedia(shot);
    const thumb = el('div', 'gallery-thumb');

    if (item.type === 'embed' || item.type === 'video') {
      if (item.poster) {
        const img = document.createElement('img');
        img.src = item.poster; img.alt = '';
        thumb.appendChild(img);
      } else {
        thumb.classList.add('gallery-thumb--video-fallback');
      }
      const playIcon = el('div', 'gallery-thumb-play');
      playIcon.innerHTML = item.type === 'embed' ? SVG_EMBED_THUMB : SVG_PLAY_THUMB;
      thumb.appendChild(playIcon);
    } else {
      const img = document.createElement('img');
      img.src = item.src; img.alt = ''; img.loading = 'lazy';
      thumb.appendChild(img);
    }
    return thumb;
  }

  /* ── Render featured slots ── */
  function renderPair(startIdx, instant) {
    activeIdx = startIdx;

    renderSlotContent(slot0, normalizeMedia(shots[startIdx]), instant);

    const hasSecond = pairMode && startIdx + 1 < shots.length;
    if (hasSecond) {
      slot1.classList.remove('slot-empty');
      renderSlotContent(slot1, normalizeMedia(shots[startIdx + 1]), instant);
    } else {
      slot1.innerHTML = '';
      slot1.classList.add('slot-empty');
    }

    /* Highlight active thumb(s) */
    thumbStrip.querySelectorAll('.gallery-thumb').forEach((t, i) => {
      const active = pairMode
        ? (i === startIdx || i === startIdx + 1)
        : (i === startIdx);
      t.classList.toggle('active', active);
    });

    /* Highlight active row (pair mode) */
    thumbStrip.querySelectorAll('.gallery-thumb-row').forEach((row, ri) => {
      row.classList.toggle('active', ri * 2 === startIdx);
    });

    /* Scroll active row/thumb into view */
    const activeThumb = thumbStrip.querySelector('.gallery-thumb.active');
    if (activeThumb) activeThumb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ── Build thumb strip in PAIR mode (vertical column, rows of 2) ── */
  function buildThumbsPaired() {
    thumbStrip.innerHTML = '';
    thumbStrip.className = 'gallery-thumbs gallery-thumbs--portrait';
    /* Reset any single-mode inline styles */
    thumbStrip.style.cssText = '';

    for (let i = 0; i < shots.length; i += 2) {
      const row       = el('div', 'gallery-thumb-row');
      const pairStart = i;

      const tA = makeThumb(shots[i]);
      tA.addEventListener('click', () => renderPair(pairStart));
      row.appendChild(tA);

      if (i + 1 < shots.length) {
        const tB = makeThumb(shots[i + 1]);
        tB.addEventListener('click', () => renderPair(pairStart));
        row.appendChild(tB);
      }

      thumbStrip.appendChild(row);
    }
  }

  /* ── Build thumb strip in SINGLE mode (horizontal row below) ── */
  function buildThumbsSingle() {
    thumbStrip.innerHTML = '';
    thumbStrip.className = 'gallery-thumbs gallery-thumbs--single';
    thumbStrip.style.cssText = '';

    for (let i = 0; i < shots.length; i++) {
      const idx   = i;
      const thumb = makeThumb(shots[i]);
      thumb.addEventListener('click', () => renderPair(idx));
      thumbStrip.appendChild(thumb);
    }
  }

  /* ── Switch layout ── */
  function applyLayout(wide) {
    if (wide === pairMode) return; /* nothing changed */
    pairMode = wide;

    if (wide) {
      /* Pair mode: strip on the LEFT (gallery is row), two slots visible */
      gallery.style.flexDirection = '';
      /* Move thumbStrip to be first child */
      if (gallery.firstChild !== thumbStrip) gallery.insertBefore(thumbStrip, gallery.firstChild);
      buildThumbsPaired();
    } else {
      /* Single mode: strip BELOW (gallery is column) */
      gallery.style.flexDirection = 'column';
      /* Move thumbStrip to be last child (after pair) */
      gallery.appendChild(thumbStrip);
      buildThumbsSingle();
    }

    /* Snap active index to valid position for new step size */
    const snapped = wide
      ? (activeIdx % 2 === 0 ? activeIdx : Math.max(0, activeIdx - 1))
      : activeIdx;
    renderPair(Math.max(0, snapped), true);
  }

  /* ── Measure available width and choose layout ── */
  const MIN_PAIR_WIDTH = 680; /* px — minimum gallery width to show 2 portrait slots */

  function measureAndApply() {
    applyLayout(gallery.getBoundingClientRect().width >= MIN_PAIR_WIDTH);
  }

  /* ── Arrow navigation ── */
  btnPrev.addEventListener('click', () => {
    const step = pairMode ? 2 : 1;
    if (activeIdx - step >= 0) renderPair(activeIdx - step);
  });
  btnNext.addEventListener('click', () => {
    const step = pairMode ? 2 : 1;
    if (activeIdx + step < shots.length) renderPair(activeIdx + step);
  });

  /* ── Keyboard navigation ── */
  gallery.addEventListener('keydown', e => {
    const step = pairMode ? 2 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (activeIdx + step < shots.length) renderPair(activeIdx + step);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (activeIdx - step >= 0) renderPair(activeIdx - step);
    }
  });

  /* ── Initial layout (measure after first paint) ── */
  requestAnimationFrame(() => {
    measureAndApply();
    new ResizeObserver(measureAndApply).observe(gallery);
  });
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

  /* ── Portrait detection: if images are vertical, switch to portrait gallery ── */
  if (hasMultiple) {
    detectPortrait(shots).then(isPortrait => {
      if (!isPortrait) return;
      gallery.classList.add('gallery-portrait');
      featured.remove();      /* remove standard featured slot */
      thumbStrip.innerHTML = ''; /* clear standard thumbs — portrait gallery rebuilds them */
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

/* ════════════════════════════════════════════════════════════
   LINK PARSER
   Converts markdown-style links in HTML strings:
     (текст)[https://url]  →  <a href="https://url" target="_blank" rel="noopener noreferrer">текст</a>
   Plain <a href="..."> tags in the HTML are left intact and
   get target/rel patched after innerHTML is set.
   ════════════════════════════════════════════════════════════ */
function parseLinks(html) {
  if (!html) return '';
  /* Match (label)[url] — supports multi-word labels and any URL */
  return html.replace(
    /\(([^)]+)\)\[([^\]]+)\]/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
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
