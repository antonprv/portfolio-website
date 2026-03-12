# Personal Portfolio

I've decided to make this repo public in case anyone would be curious or would like to make something similar.

---

## Stack

Pure HTML · CSS · Vanilla JS.

## Structure

```
portfolio/
├── src/
│   ├── index.html          # Markup & entry point
│   ├── css/
│   │   ├── variables.css   # Design tokens & global reset
│   │   ├── animations.css  # Keyframes & scroll-reveal
│   │   ├── layout.css      # Header, hero, avatar, links, footer
│   │   └── projects.css    # Project grid & cards
│   ├── js/
│   │   ├── i18n.js         # RU / EN translation strings
│   │   ├── lang.js         # Language-switcher logic
│   │   └── scroll.js       # Intersection Observer reveal
│   ├── images/
│   │   ├── profile/        # Profile photo
│   │   └── projects/       # Project screenshots
│   └── fonts/              # Custom fonts
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions deploy workflow
└── README.md
```

## Customisation

| What | Where |
|---|---|
| Name, bio, tagline | `src/index.html` → hero section + `src/js/i18n.js` |
| Social links | `src/index.html` → `<nav class="links">` |
| Projects | `src/index.html` → `.grid` section |
| Colours | `src/css/variables.css` → `:root` |
| Translations | `src/js/i18n.js` |

### Adding your photo

1. Place your photo in `src/images/profile/`
2. In `src/index.html`, update the image path:
   ```html
   <img src="images/profile/photo.jpg" alt="Your Name" class="avatar" />
   ```

---

## 🚀 Deployment

This project uses **GitHub Actions** to automatically deploy to GitHub Pages.

### Setup Instructions:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: Select `gh-pages` (created after first workflow run)
4. Push changes to `main` branch — deployment happens automatically

### Manual Trigger:

Go to **Actions** → **Deploy to GitHub Pages** → **Run workflow**

---

*Made with ☕ and attention to detail.*
