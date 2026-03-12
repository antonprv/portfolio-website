/* ============================================================
   lang.js - Language switcher logic
   ============================================================ */

let currentLang = 'ru';

/** IDs whose textContent maps directly to i18n keys */
const KEYED_IDS = [
  'tagline',
  'bio',
  'projects-title',
  'projects-sub',
  'footer-text',
];

/** IDs for first/last name */
const NAME_IDS = ['first-name', 'last-name'];

/** Map name IDs to i18n keys */
const NAME_ID_TO_KEY = {
  'first-name': 'firstName',
  'last-name': 'lastName',
};

/**
 * Switch the UI language with a smooth fade transition.
 * @param {string} lang - 'ru' | 'en'
 */
function setLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;

  // Update toggle buttons
  document.getElementById('btn-ru').classList.toggle('active', lang === 'ru');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');

  // Fade everything out
  const translatables = document.querySelectorAll('.t');
  translatables.forEach(el => el.classList.add('fading'));

  setTimeout(() => {
    // Update <html lang> and <title>
    document.documentElement.lang = i18n[lang].htmlLang;
    document.title               = i18n[lang].pageTitle;

    // Update keyed elements
    KEYED_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = i18n[lang][id];
    });

    // Update first/last name
    NAME_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = i18n[lang][NAME_ID_TO_KEY[id]];
    });

    // Update inline data-ru / data-en attributes
    document.querySelectorAll('[data-ru]').forEach(el => {
      el.textContent = el.getAttribute('data-' + lang);
    });

    // Update avatar alt text
    const avatar = document.querySelector('.avatar');
    if (avatar) {
      avatar.alt = lang === 'ru' ? i18n.ru.firstName + ' ' + i18n.ru.lastName : i18n.en.firstName + ' ' + i18n.en.lastName;
    }

    // Fade back in
    translatables.forEach(el => el.classList.remove('fading'));
  }, 180);
}
