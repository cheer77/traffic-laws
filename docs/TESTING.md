# Testing

## Documentation-only changes

Run:

```sh
pnpm format:check
git diff --check
```

Also validate relative Markdown links and referenced repository paths. Browser automation is not
required for documentation-only work.

## Standard repository check

```sh
pnpm check
```

This runs import-boundary validation, ESLint, unit/security tests, strict TypeScript checks,
production builds and Prettier verification. Use focused package checks during iteration.

## Backend and schema changes

```sh
pnpm test:api:integration
```

The integration script owns a disposable Docker PostgreSQL database and recovery checks. Never point
it at a developer or production database. Admin/API end-to-end coverage is available through:

```sh
pnpm test:admin:integration
```

Because it includes browser automation, run it only with explicit permission.

## Official PDF importer

Provision its isolated local Python environment when needed, then run:

```sh
TRAFFIC_PDF_PYTHON=.venv-official-tickets/bin/python pnpm test:official-pdf
```

The tests cover the supported PDF layout and deterministic extraction. They do not establish answer,
legal, reuse-rights or reconstruction correctness. See [`official-ticket-pipeline.md`](official-ticket-pipeline.md).

## 3D changes

Run the affected `assets-3d`, Scene Engine and Studio tests plus import boundaries. For vehicle/scene
geometry reports use the documented commands in [`VEHICLE_MODELS.md`](VEHICLE_MODELS.md) and package
READMEs. Compare triangle, mesh/draw-call, resource and frame-time budgets when relevant.

Browser/WebGL visual checks are required only when they materially verify changed behavior and the
owner authorizes the expensive tooling. Record exactly which browser, viewport, GPU/context and flow
were checked; do not infer mobile/GPU/production coverage from unit tests.

## Manual acceptance

The owner performs the final manual acceptance before commit. For content or 3D work this includes
Ukrainian copy, source provenance, 2D/3D parity, scene controls and honest review labels. Use
`scene-review` for structured reconstruction review.

## Reporting

At handoff list checks run, checks skipped and remaining limitations. Historical test counts are
evidence for their original change only and are not current repository guarantees.
