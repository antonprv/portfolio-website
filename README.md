# Personal Portfolio

I've decided to make this repo public in case anyone would be curious or would like to make something similar.
It currently has mock data, and will be updated in the future.

The site is [currently live](https://antonprv.github.io/portfolio-website/).

---

## Stack

Pure HTML · CSS · Vanilla JS.

## Structure

```
portfolio/
├── config.json             # Single config file - edit this to customise everything
├── index.html              # Markup shell (content is injected from config.json)
├── css/
│   ├── variables.css       # Design tokens & global reset
│   ├── animations.css      # Keyframes & scroll-reveal
│   ├── layout.css          # Header, hero, avatar, links, footer
│   └── projects.css        # Project grid & cards
├── js/
│   ├── config-loader.js    # Reads config.json and renders the page
│   ├── theme.js            # Light / dark theme toggle
│   ├── i18n.js             # RU / EN translation strings
│   ├── lang.js             # Language-switcher logic
│   └── scroll.js           # Intersection Observer reveal
├── images/
│   ├── profile/            # Profile photo
│   └── projects/           # Project screenshots (16:9, ~640×360 px)
├── fonts/                  # Custom fonts (.woff2)
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions deploy workflow
```

## Customisation

Everything is controlled from `config.json` - you shouldn't need to touch any other file.

| What | Where in config.json |
|---|---|
| Accent colours (light & dark theme) | `theme.accentDark` / `theme.accentLight` |
| Custom font | `font.path`, `font.family`, `font.fallback` |
| Profile photo | `profile.photo` |
| Name, tagline, bio | `profile.nameRu/En`, `profile.taglineRu/En`, `profile.bioRu/En` |
| Social links | `profile.links` |
| Projects | `projects` array |

### Project card presets

Each project entry has a `"preset"` field that controls its behaviour:

| Preset | Behaviour |
|---|---|
| `"no-links"` | Display only - nothing is clickable. Use for NDA / private work. |
| `"link"` | The whole card opens a custom URL. Set `"url"`. |
| `"github"` | The whole card opens a GitHub repo. Set `"github"`. |
| `"links-bar"` | Button strip at the bottom. Any of `"github"`, `"page"`, `"play"` are optional. |

### Adding your photo

1. Place your photo in `images/profile/`
2. Update the path in `config.json`:
   ```json
   "profile": {
     "photo": "images/profile/photo.jpg"
   }
   ```

---

## 🚀 Deployment

This project uses **GitHub Actions** to automatically deploy to GitHub Pages.

> **Local development:** `config.json` is loaded via `fetch()`, so use a local server
> rather than opening `index.html` directly from disk.
> Run `npx serve .` or use the VS Code **Live Server** extension.

---

*Made with ☕ and attention to detail.*
