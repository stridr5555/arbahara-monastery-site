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

  const applyTextTranslations = (lang, translatedTexts) => {
    modules.forEach((el, idx) => {
      el.textContent = translatedTexts?.[idx] ?? originalTexts[idx] ?? el.textContent;
    });
    altElements.forEach((el, idx) => {
      const altText = translatedTexts?.[idx] ?? originalAlts[idx] ?? el.getAttribute('alt');
      if (altText) {
        el.setAttribute('alt', altText);
      }
    });
  };

  const applyAltTranslations = (translations) => {
    altElements.forEach((el, idx) => {
      const altText = translations?.[idx] ?? originalAlts[idx];
      if (altText) el.setAttribute('alt', altText);
    });
  };

  const fetchTranslations = async (items) => {
    if (!items.length) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(translationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: items, target: targetLang }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error('Translation request failed');
      const data = await response.json();
      return data?.data?.translations?.map((t) => t.translatedText) ?? [];
    } catch (error) {
      console.error('Translation error', error);
      return items;
    }
  };

  const setLanguage = async (lang) => {
    highlightButtons(lang);
    if (lang === defaultLang) {
      applyTextTranslations(lang, null);
      applyAltTranslations(null);
      localStorage.setItem(storageKey, lang);
      return;
    }

    if (cache.has(lang)) {
      const { texts, alts } = cache.get(lang);
      applyTextTranslations(lang, texts);
      applyAltTranslations(alts);
      localStorage.setItem(storageKey, lang);
      return;
    }

    const [textTranslations, altTranslations] = await Promise.all([
      fetchTranslations(originalTexts),
      fetchTranslations(originalAlts),
    ]);

    cache.set(lang, { texts: textTranslations, alts: altTranslations });
    applyTextTranslations(lang, textTranslations);
    applyAltTranslations(altTranslations);
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
