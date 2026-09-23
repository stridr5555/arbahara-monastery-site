import { build } from "vite";
import { readFile, writeFile, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
await build({
  build: {
    ssr: "src/server.tsx",
    outDir: ".local/ssr",
    emptyOutDir: true,
    manifest: false,
  },
});
const { render, pageMeta } = await import(
  pathToFileURL(resolve(".local/ssr/server.mjs"))
);
const template = await readFile("dist/index.html", "utf8");
const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
for (const [path, meta] of Object.entries(pageMeta)) {
  let html = template
    .replace("<!--app-html-->", render(path))
    .replace(/<title>.*?<\/title>/, `<title>${escape(meta.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escape(meta.description)}" />`,
    );
  const canonical = `https://www.haramonastery.org${path === "/" ? "" : path}`;
  html = html.replace(
    "</head>",
    `<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${escape(meta.title)}"/><meta property="og:description" content="${escape(meta.description)}"/><meta property="og:url" content="${canonical}"/><meta property="og:type" content="website"/><meta property="og:image" content="https://www.haramonastery.org/assets/property/land-01.webp"/>${path === "/members" ? '<meta name="robots" content="noindex,nofollow"/>' : ""}</head>`,
  );
  await writeFile(`dist/${path === "/" ? "index" : path.slice(1)}.html`, html);
}
for (const directory of [
  "images",
  "property",
  "docs",
  "store",
  "audio/processed",
  "videos",
])
  await cp(`assets/${directory}`, `dist/assets/${directory}`, {
    recursive: true,
  });
await cp("admin-recordings.html", "dist/admin-recordings.html");
await cp("styles.css", "dist/styles.css");
await cp("scripts", "dist/scripts", {
  recursive: true,
  filter: (p) => !p.endsWith(".mjs"),
});
await cp("public", "dist", { recursive: true });
const urls = Object.keys(pageMeta)
  .filter((p) => !["/members", "/store-success"].includes(p))
  .map(
    (p) =>
      `<url><loc>https://www.haramonastery.org${p === "/" ? "" : p}</loc></url>`,
  )
  .join("");
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
);
console.log(
  `Prerendered ${Object.keys(pageMeta).length} public and portal entry pages; preserved existing assets and upload tools.`,
);
