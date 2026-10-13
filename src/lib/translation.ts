export type Language = "en" | "am";
// The interface language must not silently change the Gregorian calendar.
export const languageLocale = (language: Language) =>
  language === "am" ? "am-ET-u-ca-gregory" : "en-US";
export const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
const escapePattern = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Exact UI text and known static template wrappers only. Interpolated values
 * are preserved verbatim; no network request or arbitrary substring replacement. */
export function createTranslator(catalog: Record<string, string>) {
  const templates = Object.entries(catalog)
    .filter(([source]) => /\{\d+\}/.test(source))
    .map(([source, output]) => {
      const tokens = source.match(/\{\d+\}/g)!;
      return {
        pattern: new RegExp(
          "^" +
            source
              .split(/\{\d+\}/)
              .map(escapePattern)
              .join("(.+?)") +
            "$",
        ),
        tokens,
        output,
      };
    });
  return (text: string, language: Language) => {
    if (language !== "am") return text;
    const source = normalizeText(text);
    let output: string | undefined = Object.hasOwn(catalog, source)
      ? catalog[source]
      : undefined;
    if (!output) {
      for (const template of templates) {
        const match = source.match(template.pattern);
        if (!match) continue;
        output = template.output.replace(
          /\{\d+\}/g,
          (token) => match[template.tokens.indexOf(token) + 1] ?? token,
        );
        break;
      }
    }
    return output
      ? (text.match(/^\s+/)?.[0] || "") +
          output +
          (text.match(/\s+$/)?.[0] || "")
      : text;
  };
}
