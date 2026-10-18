# Структура папок

```text
traffic-laws/
├── apps/
│   ├── api/                       # Independent NestJS/PostgreSQL backend
│   │   ├── src/                   # Auth, users, scenarios, progress, health
│   │   ├── prisma/                # Schema and versioned SQL migrations
│   │   ├── scripts/               # Build, restricted role, isolated DB/recovery runner
│   │   ├── test/                  # Integration tests and synthetic fixtures
│   │   ├── compose.yaml           # Local PostgreSQL (generated password required)
│   │   └── README.md              # API contracts and operator runbook
│   ├── admin/                     # Next.js staff dashboard and server-side API boundary
│   │   ├── src/app/               # Protected pages and server actions
│   │   ├── src/components/        # Forms and lazy 3D preview
│   │   └── src/lib/               # Typed API contracts, auth and origin checks
│   ├── web/
│   │   ├── src/app/               # Минимальная пользовательская страница
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── eslint.config.mjs
│   │   └── postcss.config.mjs
│   └── studio/
│       ├── src/
│       │   ├── app/                 # Next.js: страница, layout, CSS
│       │   ├── components/
│       │   │   ├── debug/           # Панели и диагностика
│       │   │   ├── layout/          # Интерфейс Studio
│       │   │   ├── scene/           # Сцена, камера и адаптеры моделей
│       │   │   └── ui/              # Элементы интерфейса
│       │   ├── hooks/
│       │   ├── lib/                 # Каталоги и расчёты
│       │   ├── stores/              # Zustand
│       │   └── types/               # Типы Studio
│       ├── scripts/
│       │   └── previewVehicles.ts   # Существующая проверка геометрии
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── eslint.config.mjs
│       ├── postcss.config.mjs
│       └── vitest.config.ts
├── packages/
│   ├── assets-3d/                  # Общая библиотека моделей и ресурсов
│   │   ├── src/registry/           # Реестр, измерения и проверки
│   │   ├── src/vehicles/           # Транспорт и процедурная сборка
│   │   ├── src/environment/        # Здания, озеленение, мебель
│   │   └── README.md               # Соглашения и инструкция добавления
│   ├── scene-engine/               # Scene Definition v1 и рендерер
│   ├── country-rules/              # UA нормативные ссылки
│   ├── scenarios/                  # Учебный JSON v1 и демо
│   └── README.md
├── tooling/
│   ├── typescript/base.json        # Общий strict
│   └── eslint/next.mjs              # Профиль Next.js
├── docs/
│   ├── architecture.md
│   ├── development-guide.md
│   ├── folder-structure.md
│   ├── phase-1-audit.md
│   └── ...                         # Сохранённые исторические отчёты
├── scripts/check-imports.mjs       # Аудит импортов
├── package.json                    # Корневые команды и инструменты
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── eslint.config.mjs
├── prettier.config.mjs
├── .prettierignore
├── .npmrc
├── .nvmrc
├── .gitignore
└── README.md
```

Тесты находятся рядом с кодом. Модели принадлежат `packages/assets-3d`; прежние пути Studio — адаптеры или re-export. В пакете также существуют `characters`, `signs`, `traffic-lights`, `roads` и `types`. Web содержит dev-проверку в `src/app/dev/assets-3d`, исключённую из production.

Генерируемые `node_modules`, `.next`, `out`, `next-env.d.ts` и кеш TypeScript не входят в Git. `pnpm-lock.yaml` — единственный lockfile репозитория. Старый `package-lock.json` доступен в Git-истории и в резервной папке миграции.

Каталог `apps/admin` реализуется в Phase 7; `apps/mobile` не создан и остаётся планируемой границей,
а не реализованными приложениями.

## Добавления Фазы 4

- `packages/scene-engine/src` — Scene Definition v1, validation/JSON, presets and independent R3F rendering.
- `apps/studio/src/lib/composer` — immutable instance operations, storage codec, navigation and AABB hints.
- `apps/studio/src/stores/useComposerStore.ts` — document and editor workflow state.
- `apps/studio/src/components/composer` — scene list, Inspector, local persistence and transform gizmo.
- `apps/web/src/app/dev/scene-engine` — gated development-only independent engine consumer.

`packages/scene-composer` is not created: the editor has only one current consumer. See the
[Phase 4 audit](phase-4-audit.md) for boundaries, usage and verification.

## Добавления Фазы 5

- `packages/country-rules/src` — UA-only нормативные ссылки, статусы проверки и семантическая модель дорожной ситуации.
- `packages/scenarios/src` — учебный JSON v1, проверка ссылок, жизненный цикл, два технических и три учебных черновика.
- `apps/web/src/app/dev/scenarios` — изолированный development-only просмотр сценариев.

Studio продолжает редактировать только Scene Definition. Снимок экспортированной сцены можно
передать в `validateScenario` как `sceneReference.scene`; редактор билетов не создан. См.
[аудит Фазы 5](phase-5-audit.md).

## Добавления Фазы 6

`apps/api/src` contains `config`, `common`, `database`, `auth`, `users`, `scenarios`, `progress`
and `health`. Configuration and database providers use Nest dependency injection. Application-only
operations stay in this app; no speculative shared backend package was created. `test/fixtures.ts`
is intentionally excluded from production build entrypoints. `apps/api/.generated` (Prisma),
`apps/api/dist`, `.env` and private dumps are ignored. The schema and SQL migration are committed
source, not generated runtime state. See the [API guide](../apps/api/README.md).
