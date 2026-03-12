# 👤 Personal Portfolio — Ivan Ivanov

> Senior Unity Developer · PC & Mobile Games · Industrial Simulations

Live site: **[username.github.io](https://username.github.io)**

---

## Stack

Pure HTML · CSS · Vanilla JS — no build tools, no dependencies, deploys instantly to GitHub Pages.

## Structure

```
portfolio/
├── index.html          # Markup & entry point
├── css/
│   ├── variables.css   # Design tokens & global reset
│   ├── animations.css  # Keyframes & scroll-reveal
│   ├── layout.css      # Header, hero, avatar, links, footer
│   └── projects.css    # Project grid & cards
├── js/
│   ├── i18n.js         # RU / EN translation strings
│   ├── lang.js         # Language-switcher logic
│   └── scroll.js       # Intersection Observer reveal
└── photo.jpg           # Your profile photo (add manually)
```

## Customisation

| What | Where |
|---|---|
| Name, bio, tagline | `index.html` → hero section + `js/i18n.js` |
| Social links | `index.html` → `<nav class="links">` |
| Projects | `index.html` → `.grid` section |
| Colours | `css/variables.css` → `:root` |
| Translations | `js/i18n.js` |

### Adding your photo

1. Drop `photo.jpg` next to `index.html`
2. In `index.html`, replace:
   ```html
   <div class="avatar-placeholder">🧑‍💻</div>
   ```
   with:
   ```html
   <img src="photo.jpg" alt="Ivan Ivanov" class="avatar" />
   ```

## Deploy to GitHub Pages

1. Push this folder to a repo named `<your-username>.github.io`
2. Go to **Settings → Pages → Source**: branch `main`, folder `/` (root)
3. Your site will be live at `https://<your-username>.github.io`

---

*Made with ☕ and attention to detail.*
