import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default || traverseModule;
const attributes = new Set(["aria-label", "placeholder", "alt", "title"]);
export const normalize = (text) => text.replace(/\s+/g, " ").trim();

// Read public interface literals only. Never inspect runtime records, env files,
// spreadsheets, API responses or uploaded/member content.
export async function translationSources(directory = "src") {
  const texts = new Set();
  function add(text) {
    const value = normalize(text);
    if (
      value.length < 2 ||
      value.length > 15000 ||
      !/[A-Za-z]/.test(value) ||
      /https?:|^\/|@|^#|^[\w.-]+\/(?:[\w.-]+)/i.test(value) ||
      value.includes("=>") ||
      value.includes("process.env") ||
      value.includes("import.meta")
    )
      return;
    texts.add(value);
  }
  async function scan(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name === "i18n") continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (/\.tsx?$/.test(file)) {
        const ast = parse(await fs.readFile(file, "utf8"), {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });
        traverse(ast, {
          JSXText(p) {
            add(p.node.value);
          },
          StringLiteral(p) {
            const parent = p.parent;
            if (parent.type === "JSXAttribute") {
              if (
                attributes.has(parent.name.name) ||
                parent.name.name === "title"
              )
                add(p.node.value);
              return;
            }
            if (
              [
                "ImportDeclaration",
                "ExportNamedDeclaration",
                "ExportAllDeclaration",
                "TSLiteralType",
              ].includes(parent.type)
            )
              return;
            if (
              (parent.type === "ObjectProperty" ||
                parent.type === "ObjectMethod") &&
              parent.key === p.node &&
              !parent.computed
            )
              return;
            // Skip CSS selectors, identifiers, protocol values and other code.
            if (
              !/\s|^[A-Z][a-z]/.test(p.node.value) ||
              /^[a-z\d]+[-_.:][a-z\d_.:-]+$/i.test(p.node.value)
            )
              return;
            add(p.node.value);
          },
          TemplateLiteral(p) {
            // Interpolation values remain untouched; translate only the wrapper.
            // Ignore styling/URLs and templates consisting only of record data.
            const literal = p.node.quasis
              .map((q) => q.value.cooked || "")
              .join("");
            if (
              !/[A-Z][a-z]+[^\n]*[ .·:]/.test(literal) ||
              p.findParent(
                (a) => a.isJSXAttribute() && !attributes.has(a.node.name.name),
              )
            )
              return;
            add(
              p.node.quasis
                .map(
                  (q, i) =>
                    (q.value.cooked || "") +
                    (i < p.node.expressions.length ? `{${i}}` : ""),
                )
                .join(""),
            );
          },
        });
      }
    }
  }
  await scan(directory);
  if (directory === "src") {
    // A narrow allowlist of public, static error messages. Never read runtime
    // records, provider responses, env files or private integration helpers.
    for (const file of [
      "achActions",
      "achRecords",
      "bankActions",
      "bankRecords",
      "finance",
    "spouses",
      "households",
      "familyBilling",
      "members",
    ]) {
      const ast = parse(await fs.readFile(`convex/${file}.ts`, "utf8"), {
        sourceType: "module",
        plugins: ["typescript"],
      });
      traverse(ast, {
        NewExpression(p) {
          if (
            p.node.callee.type === "Identifier" &&
            p.node.callee.name === "ConvexError"
          )
            for (const arg of p.node.arguments)
              if (arg.type === "StringLiteral") add(arg.value);
        },
      });
    }
  }
  // Labels that browsers format dynamically are handled with Intl in React.
  return [...texts].sort();
}
