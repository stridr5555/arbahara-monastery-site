import { useEffect, useSyncExternalStore } from "react";
import { createTranslator, type Language } from "../lib/translation";
const preference = "haramonastery-lang";
const eventName = "arbahara-language";
let chosenLanguage: Language = "en";
function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(preference);
    return stored === "am" || stored === "en" ? stored : chosenLanguage;
  } catch {
    return chosenLanguage;
  }
}
function subscribeLanguage(notify: () => void) {
  window.addEventListener(eventName, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(eventName, notify);
    window.removeEventListener("storage", notify);
  };
}
export function useLanguage() {
  return useSyncExternalStore(
    subscribeLanguage,
    readLanguage,
    () => "en" as const,
  );
}
export function LanguageSwitcher() {
  const language = useLanguage();
  function choose(lang: Language) {
    chosenLanguage = lang;
    try {
      localStorage.setItem(preference, lang);
    } catch {}
    window.dispatchEvent(new Event(eventName));
    if (lang === "en" && window.location.pathname === "/am")
      window.location.assign("/");
  }
  return (
    <div
      className="site-language-switcher"
      data-no-translate
      aria-label="Language / ቋንቋ"
    >
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        onClick={() => choose("en")}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        lang="am"
        aria-pressed={language === "am"}
        onClick={() => choose("am")}
      >
        አማርኛ
      </button>
    </div>
  );
}
export function TranslationController() {
  useEffect(() => {
    let language: Language = "en";
    let translate = createTranslator({});
    let loaded = false,
      alive = true,
      frame = 0;
    const originalTitle = document.title;
    const originals = new WeakMap<
      Text,
      { source: string; translated: string }
    >();
    const attributeOriginals = new WeakMap<
      Element,
      Record<string, { source: string; translated: string }>
    >();
    const translated = (s: string) => translate(s, language);
    const excluded = (element: Element | null, attribute = false) => {
      if (!element) return true;
      // The nearest language annotation wins: an English paragraph inside an
      // Amharic welcome page must still participate in the language switch.
      const localized = element.closest("[lang]");
      return (
        !!element.closest(
          attribute
            ? "script,style,code,pre,[data-no-translate]"
            : "script,style,code,pre,textarea,[data-no-translate]",
        ) ||
        !!(
          localized?.getAttribute("lang") === "am" &&
          localized !== document.documentElement
        )
      );
    };
    const observer = new MutationObserver(() => {
      // Dynamic sections may update continuously. Coalesce, but never postpone
      // the translation indefinitely by cancelling each preceding frame.
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          apply();
        });
    });
    function apply() {
      if (!alive) return;
      observer.disconnect();
      const root = document.getElementById("root");
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current: Node | null;
      while ((current = walker.nextNode())) {
        const node = current as Text;
        if (excluded(node.parentElement)) continue;
        let record = originals.get(node);
        if (
          !record ||
          (node.data !== record.translated && node.data !== record.source)
        ) {
          record = { source: node.data, translated: node.data };
          originals.set(node, record);
        }
        const value = translated(record.source);
        if (node.data !== value) node.data = value;
        record.translated = value;
      }
      for (const el of root.querySelectorAll(
        "[aria-label],[placeholder],[alt],[title]",
      )) {
        if (excluded(el, true)) continue;
        let records = attributeOriginals.get(el) || {};
        for (const attribute of ["aria-label", "placeholder", "alt", "title"]) {
          const value = el.getAttribute(attribute);
          if (value === null) continue;
          let record = records[attribute];
          if (
            !record ||
            (value !== record.translated && value !== record.source)
          )
            record = records[attribute] = { source: value, translated: value };
          const output = translated(record.source);
          if (output !== value) el.setAttribute(attribute, output);
          record.translated = output;
        }
        attributeOriginals.set(el, records);
      }
      document.documentElement.lang = language;
      document.documentElement.dataset.language = language;
      document.title = translated(originalTitle);
      window.dispatchEvent(new Event("arbahara-layout-change"));
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["aria-label", "placeholder", "alt", "title"],
      });
    }
    async function sync() {
      language = readLanguage();
      if (language === "am" && !loaded) {
        const catalog = (await import("../i18n/am.json")).default;
        translate = createTranslator(catalog);
        loaded = true;
        // A user can switch back while the lazy catalog is loading.
        language = readLanguage();
      }
      if (alive) apply();
    }
    void sync();
    const unsubscribe = subscribeLanguage(sync);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
    };
  }, []);
  return null;
}
