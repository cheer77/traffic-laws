# РУХ / Traffic Laws

Платформа для изучения ПДД Украины: Landing и Online School, отдельная 3D Studio,
staff Admin и NestJS API. Репозиторий организован как pnpm Workspaces + Turborepo.

## Требования

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10.34.7
- PostgreSQL 17 — только для полного стека с API
- WebGL 2 и аппаратное ускорение — для 3D

```sh
nvm install
nvm use
npm install --global pnpm@10.34.7
pnpm install
```

## Быстрый запуск

Без аккаунтов, API и PostgreSQL:

```sh
pnpm dev:ui
```

- Landing: <http://localhost:3000/>
- Online School: <http://localhost:3000/school>
- Studio: <http://localhost:3001/>
- Admin: <http://localhost:3003/>

UI Preview разрешён только в development на loopback-host. Он не меняет production-пути
авторизации и не записывает preview-данные в PostgreSQL. Для проверки настоящей авторизации
запускайте Web или Admin с `UI_PREVIEW=false` и работающим API.

Полный backend setup, роли PostgreSQL, миграции и bootstrap администратора описаны в
[`apps/api/README.md`](apps/api/README.md).

## Основные команды

| Команда                       | Назначение                                                  |
| ----------------------------- | ----------------------------------------------------------- |
| `pnpm dev:ui`                 | Web, Studio и Admin в локальном UI Preview                  |
| `pnpm dev:web`                | Web на порту 3000                                           |
| `pnpm dev:studio`             | Studio на порту 3001                                        |
| `pnpm dev:api`                | API на порту 3002; требуется PostgreSQL                     |
| `pnpm dev:admin`              | Admin на порту 3003                                         |
| `pnpm check`                  | Импорты, lint, тесты, typecheck, build и форматирование     |
| `pnpm test:api:integration`   | API/PostgreSQL integration suite                            |
| `pnpm test:admin:integration` | API/Admin integration и browser suite; только с разрешением |
| `pnpm import:official`        | Локальный импорт вопросов из исходных PDF                   |
| `pnpm test:official-pdf`      | Проверка PDF importer                                       |

Полная матрица проверок: [`docs/TESTING.md`](docs/TESTING.md).

## Структура

- `apps/web` — украинские Landing и Online School.
- `apps/studio` — 3D Asset Library и Scene Studio/Composer.
- `apps/admin` — staff workflows для контента и импорта.
- `apps/api` — NestJS API и PostgreSQL persistence.
- `packages/assets-3d` — переиспользуемые 3D-ассеты и registry.
- `packages/scene-engine` — Scene Definition, validation и renderer.
- `packages/country-rules` — UA-only нормативные ссылки и bounded evaluator.
- `packages/scenarios` — вопросы, ответы, объяснения и scene bindings.
- `packages/ui-preview` — безопасные локальные preview fixtures и gate.

## Документация

- [Продукт и требования](docs/PRD.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Ближайшие задачи](docs/TASKS.md)
- [UI/UX](docs/DESIGN.md)
- [Технические решения](docs/DECISIONS.md)
- [Проверки](docs/TESTING.md)
- [Актуальный аудит](docs/AUDIT.md)
- [Импорт официальных вопросов](docs/official-ticket-pipeline.md)

Украина и украинский язык — единственный текущий рынок. Иностранные rulesets, Mobile,
монетизация и автоматическая реконструкция точных 3D-сцен из 2D не реализованы.
