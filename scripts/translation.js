(() => {
  const storageKey = 'haramonastery-lang';
  const defaultLang = 'en';
  const targetLang = 'am';
  const translationEndpoint = '/api/translate';

  const langButtons = document.querySelectorAll('[data-language-switcher] button');
  const modules = Array.from(document.querySelectorAll('[data-i18n-key]'));
  const moduleKeys = modules.map((el) => el.dataset.i18nKey);
  const originalTexts = modules.map((el) => el.textContent.trim());

  const altElements = Array.from(document.querySelectorAll('[data-i18n-alt]'));
  const altKeys = altElements.map((el) => el.dataset.i18nAlt);
  const originalAlts = altElements.map((el) => el.getAttribute('alt') || '');

  const cache = new Map();

  const highlightButtons = (lang) => {
    langButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.lang === lang);
    });
  };

  const applyTextTranslations = (translations) => {
    modules.forEach((el, idx) => {
      el.textContent = translations?.texts?.[idx] ?? originalTexts[idx] ?? el.textContent;
    });
    altElements.forEach((el, idx) => {
      const altText = translations?.alts?.[idx] ?? originalAlts[idx] ?? el.getAttribute('alt');
      if (altText) {
        el.setAttribute('alt', altText);
      }
    });
  };

  const fetchTranslations = async (items) => {
    if (!items?.length) return [];
    try {
      const response = await fetch(translationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: items, target: targetLang }),
      });
      if (!response.ok) throw new Error('Translation request failed');
      const data = await response.json();
      return data.translated ?? items;
    } catch (error) {
      console.error('Translation error', error);
      return items;
    }
  };

  const setLanguage = async (lang) => {
    highlightButtons(lang);
    if (lang === defaultLang) {
      applyTextTranslations({ texts: originalTexts, alts: originalAlts });
      localStorage.setItem(storageKey, lang);
      return;
    }

    if (cache.has(lang)) {
      applyTextTranslations(cache.get(lang));
      localStorage.setItem(storageKey, lang);
      return;
    }

    const [textTranslations, altTranslations] = await Promise.all([
      fetchTranslations(originalTexts),
      fetchTranslations(originalAlts),
    ]);

    const payload = { texts: textTranslations, alts: altTranslations };
    cache.set(lang, payload);
    applyTextTranslations(payload);
    localStorage.setItem(storageKey, lang);
  };

  langButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang;
      if (lang) setLanguage(lang);
    });
  });

  const storedLang = localStorage.getItem(storageKey) || defaultLang;
  setLanguage(storedLang);
})();
