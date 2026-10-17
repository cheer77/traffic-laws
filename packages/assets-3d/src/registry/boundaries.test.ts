import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import manifest from "../../package.json";
it("has no imports of Studio, UI, Zustand, or another application's internals", () => {
  const forbidden = /zustand|@\/|apps\/|@traffic-laws\/(studio|web)/;
  const root = new URL("../", import.meta.url);
  const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
    (file) => /\.tsx?$/.test(file) && !file.includes(".test."),
  );
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(new URL(file, root), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        expect(node.moduleSpecifier.text).not.toMatch(forbidden);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        expect(node.arguments).toHaveLength(1);
        const argument = node.arguments[0];
        expect(ts.isStringLiteral(argument)).toBe(true);
        if (ts.isStringLiteral(argument)) expect(argument.text).not.toMatch(forbidden);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })).not.toContain(
    "zustand",
  );
});
