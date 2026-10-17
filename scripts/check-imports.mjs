import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.join(root, "apps");
const applicationDirectories = fs
  .readdirSync(appsRoot, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && fs.existsSync(path.join(appsRoot, entry.name, "package.json")),
  )
  .map((entry) => path.join(appsRoot, entry.name));
const packagesRoot = path.join(root, "packages");
const packageDirectories = fs
  .readdirSync(packagesRoot, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && fs.existsSync(path.join(packagesRoot, entry.name, "package.json")),
  )
  .map((entry) => path.join(packagesRoot, entry.name));
const workspaceDirectories = [...applicationDirectories, ...packageDirectories];
const issues = [];
const workspaceGraph = new Map();

function collectTypeScriptFiles(directory, files) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collectTypeScriptFiles(filename, files);
    else if (/\.tsx?$/.test(filename)) files.push(filename);
  }
}

for (const applicationDirectory of workspaceDirectories) {
  const applicationName = path.basename(applicationDirectory);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(applicationDirectory, "package.json"), "utf8"),
  );
  const declared = new Set(
    Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }),
  );
  workspaceGraph.set(applicationDirectory, new Set());
  const configFile = ts.readConfigFile(
    path.join(applicationDirectory, "tsconfig.json"),
    ts.sys.readFile,
  );
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  }
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, applicationDirectory);
  if (config.errors.length) {
    throw new Error(
      config.errors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
        .join("\n"),
    );
  }

  const files = [];
  collectTypeScriptFiles(path.join(applicationDirectory, "src"), files);
  collectTypeScriptFiles(path.join(applicationDirectory, "scripts"), files);
  const graph = new Map();
  const used = new Set();

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
      ) {
        imports.push(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        imports.push(node.arguments[0].text);
      }
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
        if (!resolved) {
          issues.push(
            `Unresolved: ${applicationName}/${path.relative(applicationDirectory, filename)} -> ${specifier}`,
          );
          continue;
        }
        const owningApplication = workspaceDirectories.find((directory) =>
          resolved.resolvedFileName.startsWith(`${directory}${path.sep}`),
        );
        if (owningApplication && owningApplication !== applicationDirectory) {
          issues.push(
            `Cross-application import: ${applicationName}/${path.relative(applicationDirectory, filename)} -> ${specifier}`,
          );
        }
        edges.push(resolved.resolvedFileName);
      } else {
        const packageName = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0];
        used.add(packageName);
        const workspace = workspaceDirectories.find(
          (directory) =>
            JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8")).name ===
            packageName,
        );
        if (workspace) {
          workspaceGraph.get(applicationDirectory).add(workspace);
          if (applicationDirectories.includes(workspace))
            issues.push(`Forbidden application dependency: ${filename} -> ${specifier}`);
          const targetManifest = JSON.parse(
            fs.readFileSync(path.join(workspace, "package.json"), "utf8"),
          );
          const subpath =
            specifier === packageName ? "." : "." + specifier.slice(packageName.length);
          if (!targetManifest.exports?.[subpath])
            issues.push(`Non-public workspace import: ${filename} -> ${specifier}`);
        }
        if (!declared.has(packageName)) {
          issues.push(
            `Undeclared dependency: ${packageName} (${applicationName}/${path.relative(applicationDirectory, filename)})`,
          );
        }
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
        `Import cycle: ${[...stack.slice(stack.indexOf(filename)), filename]
          .map((entry) => `${applicationName}/${path.relative(applicationDirectory, entry)}`)
          .join(" -> ")}`,
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

  const unusedRuntimeDependencies = Object.keys(manifest.dependencies ?? {}).filter(
    (name) => !used.has(name) && name !== "react-dom",
  );
  console.log(
    `${applicationName}: checked ${files.length} TypeScript files; runtime dependencies without a detected use: ${unusedRuntimeDependencies.length ? unusedRuntimeDependencies.join(", ") : "none"}.`,
  );
}

const visitedWorkspaces = new Set();
const activeWorkspaces = new Set();
function walkWorkspace(directory, stack) {
  if (activeWorkspaces.has(directory)) {
    issues.push(
      `Workspace dependency cycle: ${[...stack.slice(stack.indexOf(directory)), directory].map((entry) => path.basename(entry)).join(" -> ")}`,
    );
    return;
  }
  if (visitedWorkspaces.has(directory)) return;
  activeWorkspaces.add(directory);
  for (const dependency of workspaceGraph.get(directory) ?? [])
    walkWorkspace(dependency, [...stack, directory]);
  activeWorkspaces.delete(directory);
  visitedWorkspaces.add(directory);
}
for (const directory of workspaceDirectories) walkWorkspace(directory, []);
const rulePackage = path.join(packagesRoot, "country-rules");
if ([...(workspaceGraph.get(rulePackage) ?? [])].length)
  issues.push("country-rules must remain independent from scene, UI, and asset packages.");

if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("No import cycles, undeclared dependencies, or cross-application imports found.");
}
