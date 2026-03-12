# 📘 Руководство по обновлению контента портфолио

Этот документ описывает, где и как обновлять информацию в портфолио.

---

## 📁 Структура папок

```
Portfolio/
├── index.html           # Главная страница (разметка и тексты)
├── css/
│   ├── variables.css    # 🎨 Цвета сайта (акцентный цвет здесь)
│   ├── layout.css       # 📝 Шрифты и общие стили
│   ├── projects.css     # Стили проектов
│   └── animations.css   # Анимации
├── js/                  # Скрипты (язык, прокрутка)
├── images/
│   ├── profile/         # 📷 Фото профиля
│   └── projects/        # 🖼️ Изображения проектов
└── fonts/               # 🔤 Кастомные шрифты
```

---

## 🎨 1. Смена акцентного цвета

**Файл:** `css/variables.css`

Найдите секцию `:root` и измените значение `--accent`:

```css
:root {
  /* ─── ОСНОВНОЙ АКЦЕНТНЫЙ ЦВЕТ (HEX) ─── */
  --accent: #c8a96e;  /* ← Вставьте ваш HEX-код здесь */

  /* Остальные цвета обновятся автоматически */
  --border: rgba(200, 169, 110, 0.18);
  --glow: rgba(200, 169, 110, 0.12);
}
```

> 💡 **Совет:** После изменения `--accent` цвета границ и свечения обновятся автоматически, так как используют эту переменную.

---

## 📷 2. Фото профиля

**Папка:** `images/profile/`

1. Положите ваше фото в папку `images/profile/`
2. Назовите файл `photo.jpg` (или измените имя в `index.html`)
3. Поддерживаемые форматы: `.jpg`, `.png`, `.webp`, `.svg`

**Файл:** `index.html` (строка ~48)

```html
<div class="avatar-wrap">
  <img src="images/profile/photo.jpg" alt="Иван Иванов" class="avatar" />
  <!-- Если фото нет, раскомментируйте строку ниже: -->
  <!-- <div class="avatar-placeholder">🧑‍💻</div> -->
</div>
```

> 💡 **Рекомендация:** Используйте квадратное изображение (например, 400×400 px).

---

## 🖼️ 3. Изображения проектов

**Папка:** `images/projects/`

1. Положите скриншоты проектов в папку `images/projects/`
2. Назовите файлы: `project-1.jpg`, `project-2.jpg`, и т.д.
3. Поддерживаемые форматы: `.jpg`, `.png`, `.webp`

**Файл:** `index.html` (секция проектов, строки ~110-180)

```html
<a class="project-card" href="https://github.com/username/project-1">
  <img src="images/projects/project-1.jpg" alt="Project Alpha" class="project-image" />
  <!-- ... остальной контент ... -->
</a>
```

> 💡 **Рекомендация:** Используйте изображения с соотношением сторон 16:9 (например, 640×360 px).

---

## 🔤 4. Кастомный шрифт

**Папка:** `fonts/`

1. Положите файл шрифта в папку `fonts/`
2. Переименуйте файл в `custom.woff2` (или измените имя в CSS)

**Файл:** `css/layout.css` (строки ~6-18)

```css
@font-face {
  font-family: 'CustomFont';
  src: url('../fonts/custom.woff2') format('woff2'),
       url('../fonts/custom.woff') format('woff'),
       url('../fonts/custom.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

**Поддерживаемые форматы:** `.woff2` (рекомендуется), `.woff`, `.ttf`, `.otf`

> ⚠️ **Важно:** Если файла шрифта нет в папке `fonts/`, сайт будет использовать шрифты по умолчанию (Google Fonts: Playfair Display + Raleway).

---

## ✏️ 5. Обновление текстов и информации о себе

**Файл:** `index.html`

### Личная информация (строки ~48-70)

```html
<p class="tagline t" id="tagline">Senior Unity разработчик</p>
<h1>Иван <span>Иванов</span></h1>

<p class="bio t" id="bio">
  Senior Unity разработчик. Создаю PC и мобильные игры...
</p>
```

### Социальные ссылки (строки ~52-70)

```html
<nav class="links" aria-label="Social links">
  <a class="link-pill" href="https://github.com/username" target="_blank" rel="noopener">
    <!-- иконка -->
    GitHub
  </a>
  <a class="link-pill" href="https://t.me/username" target="_blank" rel="noopener">
    <!-- иконка -->
    Telegram
  </a>
  <a class="link-pill" href="mailto:ivan@example.com">
    <!-- иконка -->
    Email
  </a>
  <a class="link-pill" href="https://linkedin.com/in/username" target="_blank" rel="noopener">
    <!-- иконка -->
    LinkedIn
  </a>
</nav>
```

---

## 📝 6. Обновление описаний проектов

**Файл:** `index.html` (секция проектов, строки ~110-190)

Каждый проект имеет следующую структуру:

```html
<a class="project-card" href="https://github.com/username/project-1" target="_blank" rel="noopener">
  <img src="images/projects/project-1.jpg" alt="Project Alpha" class="project-image" />
  <span class="project-arrow" aria-hidden="true">↗</span>
  <div class="project-info">
    <h3>Project Alpha</h3>
    <p class="t"
       data-ru="PC-игра с открытым миром и процедурной генерацией уровней на Unity 6."
       data-en="Open-world PC game with procedural level generation built in Unity 6.">
      PC-игра с открытым миром и процедурной генерацией уровней на Unity 6.
    </p>
    <span class="project-tag">Unity · C# · PC</span>
  </div>
</a>
```

### Что менять:

| Поле | Описание |
|------|----------|
| `href` | Ссылка на проект (GitHub, демо и т.д.) |
| `src` | Путь к изображению проекта |
| `alt` | Текстовое описание изображения |
| `<h3>` | Название проекта |
| `data-ru` | Описание на русском |
| `data-en` | Описание на английском |
| Текст внутри `<p>` | Описание на русском (должно совпадать с `data-ru`) |
| `.project-tag` | Теги технологий |

### Добавление нового проекта:

Скопируйте блок `<a class="project-card">...</a>` и вставьте его перед закрывающим тегом `</div>` (перед закрывающим тегом `.grid`).

---

## 🌐 7. Переводы (двуязычность)

Сайт поддерживает русский и английский языки.

### Как работает переключение:

1. Тексты с классом `.t` автоматически переключаются
2. Русский текст находится внутри тега
3. Английский текст — в атрибуте `data-en`

**Пример:**
```html
<p class="t"
   data-ru="Привет, мир!"
   data-en="Hello, world!">
  Привет, мир!
</p>
```

### Обновление переводов:

- **Русский:** Измените текст внутри тега или атрибут `data-ru`
- **Английский:** Измените атрибут `data-en`

---

## 📄 8. Footer (подвал сайта)

**Файл:** `index.html` (строка ~195)

```html
<footer>
  <p class="t" id="footer-text">© 2025 Иван Иванов &nbsp;·&nbsp; Сделано с ☕ и вниманием к деталям</p>
</footer>
```

---

## ✅ Чек-лист после обновления

- [ ] Изменил(а) акцентный цвет в `css/variables.css`
- [ ] Добавил(а) фото профиля в `images/profile/`
- [ ] Добавил(а) изображения проектов в `images/projects/`
- [ ] Обновил(а) личную информацию в `index.html`
- [ ] Обновил(а) ссылки на соцсети в `index.html`
- [ ] Обновил(а) описания проектов в `index.html`
- [ ] Проверил(а) переводы (RU/EN)
- [ ] (Опционально) Добавил(а) кастомный шрифт в `fonts/`

---

## 🚀 Развёртывание

После внесения изменений:

1. Сохраните все файлы
2. Закоммитьте изменения в Git:
   ```bash
   git add .
   git commit -m "Обновление портфолио"
   git push
   ```
3. Если используете GitHub Pages / Netlify / Vercel — сайт обновится автоматически

---

## ❓ Вопросы

Если что-то непонятно, проверьте:
- Комментарии в коде (они помечены эмодзи 🎨 📷 🖼️ 🔤 ✏️)
- Структуру папок выше
- Примеры в этом руководстве
