import fs from "node:fs/promises";
import { translationSources } from "./translation-sources.mjs";
const existing = JSON.parse(
  await fs.readFile("src/i18n/am.json", "utf8").catch(() => "{}"),
);
const missing = (await translationSources()).filter((t) => !existing[t]);
if (process.argv.includes("--check")) {
  if (missing.length) {
    console.error(
      `Missing ${missing.length} Amharic interface translations. Run npm run translations with the existing key securely supplied.\n${missing.slice(0, 12).join("\n")}`,
    );
    process.exit(1);
  }
  console.log("Amharic catalog covers all extracted interface text.");
  process.exit(0);
}
if (missing.length && !process.env.GOOGLE_TRANSLATE_API_KEY)
  throw new Error(
    "Provide GOOGLE_TRANSLATE_API_KEY securely to update the static translation catalog.",
  );
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([a-f0-9]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
for (let i = 0; i < missing.length; i += 50) {
  const q = missing.slice(i, i + 50);
  const r = await fetch(
    "https://translation.googleapis.com/language/translate/v2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_TRANSLATE_API_KEY,
      },
      body: JSON.stringify({ q, source: "en", target: "am", format: "text" }),
    },
  );
  const j = await r.json();
  if (!r.ok || j.data?.translations?.length !== q.length)
    throw new Error(`Translation batch failed (${r.status}).`);
  q.forEach((text, n) => {
    const output = decode(j.data.translations[n].translatedText);
    const tokens = text.match(/\{\d+\}/g) || [];
    if (tokens.some((t) => !output.includes(t)))
      throw new Error(
        "Translation changed an interpolation token; review the static catalog.",
      );
    existing[text] = output;
  });
  console.log(
    `Translated static website text: ${Math.min(i + 50, missing.length)}/${missing.length}`,
  );
}
Object.assign(existing, {
  Arbahara: "አርባሐራ",
  "Monastery of Abuna Hara Dengeel": "የአቡነ ሐራ ድንግል ገዳም",
  "Monastery of": "ገዳመ",
  "Abuna Hara Dengeel": "አቡነ ሐራ ድንግል",
  "Previous hero image": "ያለፈው የመነሻ ገጽ ምስል",
  "Next hero image": "ቀጣዩ የመነሻ ገጽ ምስል",
  "Pause hero slideshow": "የምስል ቅያሪውን ለአፍታ አቁም",
  "Play hero slideshow": "የምስል ቅያሪውን ቀጥል",
  "Icon of Christ": "የክርስቶስ ሥዕል",
  "Sacred portrait": "ቅዱስ ሥዕል",
  "Belong & serve": "አባል ይሁኑ፣ ያገልግሉ",
  "Make an offering": "ልገሳ ያበርክቱ",
  "Giving history": "የልገሳ መዝገብ",
  "My membership": "የእኔ አባልነት",
  "My tickets": "የእኔ ቲኬቶች",
  Membership: "አባልነት",
  "01 · Receive": "01 · እምነትን ይቀበሉ",
  "02 · Belong": "02 · በአንድነት ይኑሩ",
  "03 · Pass on": "03 · ለትውልድ ያስተላልፉ",
  "Ethiopian Orthodox Tewahedo Church": "የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን",
  "In the name of the Father, and of the Son, and of the Holy Spirit, one God.":
    "በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ።",
  "Member login": "የአባላት መግቢያ",
  "Member portal": "የአባላት መግቢያ",
  Give: "ይለግሱ",
  "Our monastery": "ገዳማችን",
  "Faith & learning": "እምነትና ትምህርት",
  Archive: "ማኅደር",
  Visit: "ጉብኝት",
  "Sign out": "ውጣ",
  Faith: "እምነት",
  Community: "ማኅበረሰብ",
  "Land & vision": "መሬቱና ራእዩ",
  Calendar: "የቀን መቁጠሪያ",
  "The land": "መሬቱ",
  "The residence": "መኖሪያ ቤቱ",
  "The garage": "ጋራዡ",
  "The lake": "ሐይቁ",
  "The entrance": "መግቢያው",
  Mahiber: "ማኅበር",
  Ziker: "ዝክር",
  "Arbahara Teleconference Mahiber": "የአርባሐራ ቴሌኮንፈረንስ ማኅበር",
  "Arbahara Medhanialem Ziker": "የአርባሐራ መድኃኔዓለም ዝክር",
  "Rooted here.": "እዚህ ሥር ሰደን።",
  "For generations.": "ለትውልዶች።",
  Closer: "አቅርብ",
  Wider: "አርቅ",
  "Select a place or press Play tour": "ቦታ ይምረጡ ወይም ጉብኝቱን ያስጀምሩ",
  "Play tour": "ጉብኝቱን ያስጀምሩ",
  "Pause tour": "ጉብኝቱን ለአፍታ ያቁሙ",
  "Replay tour": "ጉብኝቱን እንደገና ያስጀምሩ",
  "Overhead reference · used to trace the pond, drive and building positions.":
    "ከላይ የተነሳ ፎቶ · የኩሬውን፣ የመኪና መንገዱንና የሕንፃዎቹን ቦታ ለማመሳከር ያገለገለ።",
  "Oblique reference · the real buildings and wooded setting.":
    "ከጎን በአየር የተነሳ ፎቶ · እውነተኛዎቹን ሕንፃዎችና በደን የተሸፈነውን አካባቢ ያሳያል።",
  "View Realtor listing": "የRealtor ንብረት ዝርዝርን ይመልከቱ",
});
await fs.mkdir("src/i18n", { recursive: true });
await fs.writeFile(
  "src/i18n/am.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(existing).sort(([a], [b]) => a.localeCompare(b)),
    ),
    null,
    2,
  ) + "\n",
);
console.log(
  `Amharic catalog ready: ${Object.keys(existing).length} entries. Only source-code literals were sent for translation.`,
);
