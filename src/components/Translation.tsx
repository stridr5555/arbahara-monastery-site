import { useEffect, useState } from "react";
const preference = "haramonastery-lang";
const eventName = "arbahara-language";
export function LanguageSwitcher() {
  const [language, setLanguage] = useState("en");
  useEffect(() => {
    const sync = () => {
      try {
        setLanguage(localStorage.getItem(preference) === "am" ? "am" : "en");
      } catch {}
    };
    sync();
    window.addEventListener(eventName, sync);
    return () => window.removeEventListener(eventName, sync);
  }, []);
  function choose(lang: string) {
    try {
      localStorage.setItem(preference, lang);
    } catch {}
    setLanguage(lang);
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
    let language = "en",
      catalog: Record<string, string> = {},
      alive = true,
      frame = 0;
    const originals = new WeakMap<
      Text,
      { source: string; translated: string }
    >();
    const attributeOriginals = new WeakMap<
      Element,
      Record<string, { source: string; translated: string }>
    >();
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const translated = (s: string) => {
      const value = catalog[normalize(s)];
      if (language !== "am" || !value) return s;
      return (
        (s.match(/^\s+/)?.[0] || "") + value + (s.match(/\s+$/)?.[0] || "")
      );
    };
    const excluded = (element: Element | null) => {
      if (!element) return true;
      const localized = element.closest('[lang="am"]');
      return (
        !!element.closest(
          "script,style,code,pre,textarea,input,[data-no-translate]",
        ) || !!(localized && localized !== document.documentElement)
      );
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
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
        if (excluded(el)) continue;
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
      window.dispatchEvent(new Event("arbahara-layout-change"));
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
    async function sync() {
      try {
        language = localStorage.getItem(preference) === "am" ? "am" : "en";
      } catch {}
      if (language === "am" && !Object.keys(catalog).length) {
        catalog = (await import("../i18n/am.json")).default;
      }
      if (alive) apply();
    }
    void sync();
    window.addEventListener(eventName, sync);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener(eventName, sync);
    };
  }, []);
  return null;
}
