import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

// Resolve through the real consumer, so an unapplied patch/override fails this suite.
const require = createRequire(import.meta.url);
const configRequire = createRequire(require.resolve("eslint-config-next"));
const pluginRequire = createRequire(configRequire.resolve("@next/eslint-plugin-next"));
const rootModule = pluginRequire.resolve("./utils/get-root-dirs");
const {
  getRootDirs,
}: {
  getRootDirs(context: { cwd: string; settings: { next?: { rootDir?: unknown } } }): string[];
} = pluginRequire(rootModule);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = mkdtempSync(join(tmpdir(), "traffic-eslint-glob-"));
after(() => rmSync(fixture, { recursive: true, force: true }));
for (const directory of ["web/pages", "web/src/app", "studio/app", ".hidden", "api"]) {
  mkdirSync(join(fixture, "apps", directory), { recursive: true });
}
writeFileSync(join(fixture, "apps/readme.txt"), "not a directory");
writeFileSync(join(fixture, "apps/web/pages/guide.js"), "export default function Guide() {}");

// Next joins discovered roots with pages/src/pages/app/src/app: trailing slashes are immaterial.
const roots = (rootDir?: unknown) =>
  getRootDirs({ cwd: fixture, settings: { next: { rootDir } } })
    .map((directory) => resolve(directory))
    .sort();
const expected = (...directories: string[]) =>
  directories.map((directory) => join(fixture, "apps", directory)).sort();

test("the pinned Next consumer resolves the reviewed replacement, without braces in the lockfile", () => {
  const replacement = pluginRequire("fast-glob/package.json");
  assert.equal(replacement.name, "tinyglobby");
  assert.equal(replacement.version, "0.2.17");
  assert.equal(pluginRequire("../package.json").version, "16.4.1");
  const lockfile = readFileSync(join(repository, "pnpm-lock.yaml"), "utf8");
  assert.doesNotMatch(lockfile, /^\s+(?:braces|micromatch|fast-glob)@/m);
});

test("default and unsupported rootDir settings preserve context.cwd", () => {
  assert.deepEqual(roots(), [fixture]);
  assert.deepEqual(roots(42), [fixture]);
  assert.deepEqual(getRootDirs({ cwd: fixture, settings: {} }), [fixture]);
});

test("literal roots, including trailing separators, never expand into descendant directories", () => {
  assert.deepEqual(roots(join(fixture, "apps/web")), expected("web"));
  assert.deepEqual(roots(`${fixture}/apps/web/`), expected("web"));
  assert.deepEqual(roots(join(fixture, "apps/readme.txt")), []);
});

test("root globs preserve directory filtering, alternatives, hidden roots and missing matches", () => {
  assert.deepEqual(roots(`${fixture}/apps/*`), expected("api", "studio", "web"));
  assert.deepEqual(roots(`${fixture}/apps/{web,studio}`), expected("web", "studio"));
  assert.deepEqual(roots(`${fixture}/apps/{web,{studio,api}}`), expected("web", "studio", "api"));
  assert.deepEqual(roots(`${fixture}/apps/@(web|studio)`), expected("web", "studio"));
  assert.deepEqual(roots(`${fixture}/apps/.hidden`), expected(".hidden"));
  assert.deepEqual(roots(`${fixture}/missing/*`), []);
});

test("array settings filter non-strings and preserve Next's backslash normalization", () => {
  assert.deepEqual(
    roots([`${fixture}/apps/web`, null, 12, `${fixture}/apps/studio`.replaceAll("/", "\\")]),
    expected("web", "studio"),
  );
});

test("relative monorepo roots resolve and existing Web/Studio lint settings remain trusted", async () => {
  assert.deepEqual(roots("apps/{web,studio}"), [
    join(repository, "apps/studio"),
    join(repository, "apps/web"),
  ]);
  for (const application of ["web", "studio"]) {
    const eslint = new ESLint({ cwd: join(repository, "apps", application) });
    const config = await eslint.calculateConfigForFile("src/app/page.tsx");
    assert.equal(config.settings?.next?.rootDir, undefined);
    assert.equal(config.rules["@next/next/no-html-link-for-pages"][0], 2);
  }
});

test("Next's real navigation rule still finds pages through globbed roots and reports invalid links", async () => {
  const eslint = new ESLint({
    cwd: fixture,
    overrideConfigFile: true,
    overrideConfig: {
      files: ["**/*.jsx"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { "@next/next": configRequire("@next/eslint-plugin-next") },
      settings: { next: { rootDir: [`${fixture}/apps/{web,studio}`] } },
      rules: { "@next/next/no-html-link-for-pages": "error" },
    },
  });
  const [invalid] = await eslint.lintText('const page = <a href="/guide/">Guide</a>;', {
    filePath: "check.jsx",
  });
  assert.equal(invalid.errorCount, 1);
  assert.equal(invalid.messages[0].ruleId, "@next/next/no-html-link-for-pages");
  const [valid] = await eslint.lintText(
    'const page = <a href="https://example.org/guide/">Guide</a>;',
    { filePath: "check.jsx" },
  );
  assert.equal(valid.errorCount, 0);
});

test("advisory-shaped deeply nested patterns finish without stack exhaustion in the real consumer", () => {
  // A separate bounded process protects the test runner if this dependency regresses.
  const child = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=128",
      "-e",
      `
    const assert = require('node:assert/strict');
    const { getRootDirs } = require(process.argv[1]);
    for (const depth of [3500, 4000, 4500]) {
      const pattern = '{'.repeat(depth) + 'a,b' + '}'.repeat(depth);
      assert.deepEqual(getRootDirs({cwd: process.cwd(), settings: {next: {rootDir: pattern}}}), []);
    }
  `,
      rootModule,
    ],
    { cwd: fixture, encoding: "utf8", timeout: 10000 },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(child.status, 0, child.stderr);
});
