# Dependency security decisions

## Next ESLint globbing replacement — 2026-10-18

**Decision: remediate by replacing the affected development dependency. No risk exception or
advisory suppression is used.** The version-specific replacement and compatibility patch are in
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) and
[`patches/@next__eslint-plugin-next@16.4.1.patch`](../patches/@next__eslint-plugin-next@16.4.1.patch).

### Investigation and exposure

[GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
remains a high-severity advisory against `braces <=3.0.3`: deeply nested input can exhaust recursive
AST walkers and terminate the process. The [upstream issue](https://github.com/micromatch/braces/issues/70)
includes a maintainer dispute about the threat model; the published advisory has not been withdrawn.
The initial full registry audit reproduced one advisory, with no patched version and no muted records.

Registry metadata checked on the decision date:

| Package                    | Latest stable | Finding                                                                   |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| `braces`                   | 3.0.3         | No published patched release                                              |
| `micromatch`               | 4.0.8         | Still depends on `braces ^3.0.3`                                          |
| `fast-glob`                | 3.3.3         | Still depends on `micromatch ^4.0.8`                                      |
| `@next/eslint-plugin-next` | 16.4.2        | Still pins `fast-glob 3.3.1`; updating would not remediate                |
| `tinyglobby`               | 0.2.17        | Stable replacement already present through ESLint/TypeScript/Vite tooling |

These findings can be refreshed with `pnpm view <package>@latest version dependencies --json`.
The installed vulnerable path was
`eslint-config-next@16.4.1 → @next/eslint-plugin-next@16.4.1 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`.

Inspection of the installed Next plugin found exactly one `fast-glob` import:
[`get-root-dirs`](https://github.com/vercel/next.js/blob/v16.4.1/packages/eslint-plugin-next/src/utils/get-root-dirs.ts).
It calls `globSync(pattern, {onlyDirectories: true})` only for a configured `settings.next.rootDir`.
The repository's [shared Next configuration](../tooling/eslint/next.mjs) does not set this option:
Web/Studio lint within each application's working directory, using the plugin's `context.cwd`
fallback. Root and package lint patterns are static, version-controlled configuration. No environment,
HTTP, student content, imported scenario, or source-file text supplies a glob to this consumer.
Arbitrary CLI/configuration changes by someone running local tooling are a different trust boundary;
an untrusted ESLint JavaScript configuration can already execute code.

**Assessment:** no attacker-controlled pattern path was found in the current workflow, and this was
not a production API dependency. This exposure finding does not invalidate the advisory and was not
used to accept the vulnerable dependency.

### Exact remediation and compatibility boundary

The scoped pnpm alias replaces only `@next/eslint-plugin-next@16.4.1`'s `fast-glob` with the official
`tinyglobby@0.2.17` package. `braces`, `micromatch`, and the original `fast-glob` package are removed
from the resolved lockfile. Other consumers are not globally redirected. Next.js and its lint rules,
React, Three.js, NestJS, Prisma, and all direct framework versions stay unchanged in this security fix.

`tinyglobby` exports the required CommonJS `globSync`, uses `fdir@6.5.0` and `picomatch@4.0.7`, supports
Node 24, is MIT licensed, and has no installation lifecycle script. All three versions were already
locked in the repository. No new lifecycle-script permission was granted. The install retains the
existing esbuild/sharp allowlist and blocks unrelated dependency install scripts.

A direct alias is **not** sufficient. The official
[migration guide](https://superchupu.dev/tinyglobby/migration) requires `expandDirectories: false`
when replacing fast-glob. The minimal patch adds precisely this option to the one Next consumer,
preventing a literal application root from recursively expanding into its descendants. pnpm records
and checks the patch hash in the lockfile; the patch does not change Next rule implementations.

Compatibility tests compare directory identities after path normalization, because tinyglobby may
return a trailing slash that Next's subsequent `path.join` operations ignore. Literal roots, single-level
wildcards, nested brace alternatives, extglobs, arrays, missing roots, explicit hidden directories,
backslash normalization, and the actual navigation lint rule are covered. This is not a claim of
complete equivalence between both glob libraries: for example, a terminal `apps/**` can additionally
include the base directory in tinyglobby. Current configuration does not use recursive root globs;
introducing them requires explicit directory-discovery tests and review. Native Windows execution
was not performed; the existing backslash-normalization branch was tested on macOS.

### Verification and maintenance

[`glob-compatibility.test.ts`](../tooling/eslint/glob-compatibility.test.ts) adds eight tests, run by
`pnpm test:security`, `pnpm test`, and `pnpm check`. They resolve the dependency through the installed
Next plugin, verify the pinned replacement and absence of vulnerable lockfile entries, preserve
default root discovery, and exercise the real `no-html-link-for-pages` rule with invalid and valid
navigation. The advisory-shaped inputs at nesting depths 3500, 4000, and 4500 execute through the
actual consumer in a separate process with a 10-second timeout and 128 MB heap limit; they complete
without stack exhaustion. This is a focused regression check, not a guarantee that arbitrary
untrusted glob expressions are safe.

Both full `pnpm audit` and `pnpm audit --prod` report **zero advisories**, with empty muted lists.
`pnpm why braces` returns no dependency path. A frozen offline install succeeds with the same lockfile
SHA-256 before and after installation. Full application acceptance evidence is in the
[current audit](AUDIT.md) and [testing guide](TESTING.md).

On dependency updates, rerun both audits and the security regression suite. Review this decision
when upgrading the Next lint plugin or tinyglobby, changing `settings.next.rootDir`, adding another
globbing consumer, accepting external patterns, or receiving a new relevant advisory. The exact
plugin version in the override/patch and regression assertion deliberately requires review on upgrade.
Prefer removing the alias and patch once an official compatible Next dependency chain eliminates
the advisory; verify the same compatibility tests and full repository checks before removal.
Do not broadly alias fast-glob for other consumers or assume its streaming/other APIs are compatible.
