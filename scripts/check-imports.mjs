import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const studio = path.join(root, "apps/studio");
const manifest = JSON.parse(fs.readFileSync(path.join(studio, "package.json"), "utf8"));
const declared = new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }));
const configFile = ts.readConfigFile(path.join(studio, "tsconfig.json"), ts.sys.readFile);
if (configFile.error)
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, studio);
if (config.errors.length)
  throw new Error(
    config.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("\n"),
  );
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (/\.tsx?$/.test(filename)) files.push(filename);
  }
}
collect(path.join(studio, "src"));
collect(path.join(studio, "scripts"));
const graph = new Map();
const used = new Set();
const issues = [];
for (const filename of files) {
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  const edges = [];
  for (const specifier of imports) {
    if (specifier.startsWith("node:") || specifier.endsWith(".css")) continue;
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      const resolved = ts.resolveModuleName(
        specifier,
        filename,
        config.options,
        ts.sys,
      ).resolvedModule;
      if (!resolved) issues.push(`Unresolved: ${path.relative(studio, filename)} -> ${specifier}`);
      else edges.push(resolved.resolvedFileName);
    } else {
      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      used.add(name);
      if (!declared.has(name))
        issues.push(`Undeclared dependency: ${name} (${path.relative(studio, filename)})`);
    }
  }
  graph.set(filename, edges);
}
const visited = new Set();
const active = new Set();
const stack = [];
function walk(filename) {
  if (active.has(filename)) {
    issues.push(
      `Import cycle: ${[...stack.slice(stack.indexOf(filename)), filename].map((p) => path.relative(studio, p)).join(" -> ")}`,
    );
    return;
  }
  if (visited.has(filename) || !graph.has(filename)) return;
  active.add(filename);
  stack.push(filename);
  for (const dependency of graph.get(filename)) walk(dependency);
  stack.pop();
  active.delete(filename);
  visited.add(filename);
}
for (const filename of files) walk(filename);
// react-dom is the Next.js browser renderer, not a direct application import.
const candidates = Object.keys(manifest.dependencies).filter(
  (name) => !used.has(name) && name !== "react-dom",
);
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${files.length} TypeScript files: no local import cycles or undeclared imports.`,
  );
console.log(
  "Runtime dependencies without a detected use:",
  candidates.length ? candidates.join(", ") : "none",
);
