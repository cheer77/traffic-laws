# РУХ / Traffic Laws

Образовательная платформа ПДД Украины: онлайн-школа, 3D Studio, staff Admin и отдельный API.
Репозиторий организован как pnpm Workspaces + Turborepo.

## Запуск

Нужен Node.js 24 LTS. Рекомендуемая версия указана в `.nvmrc`; проверено также на установленном Node.js 24.12.0.

```sh
nvm install
nvm use
npm install --global pnpm@10.34.7
pnpm install
pnpm dev:ui
```

Если Node.js уже установлен без nvm, первые две команды не нужны. `pnpm dev:ui` запускает безопасный
локальный UI Preview без аккаунтов, API и PostgreSQL:

- онлайн-школа: <http://localhost:3000/school>;
- Studio: <http://localhost:3001/>;
- Admin: <http://localhost:3003/>.

Остановите процессы сочетанием `Ctrl+C` в терминале, где запущена команда. Studio требует WebGL 2
и аппаратного ускорения. Полный запуск с API, базой данных и настоящей авторизацией описан в
[руководстве разработчика](docs/development-guide.md#варианты-запуска).

## Команды из корня

| Команда              | Назначение                                                       |
| -------------------- | ---------------------------------------------------------------- |
| `pnpm dev:ui`        | Web, Studio и Admin в локальном UI Preview                       |
| `pnpm dev:web`       | Только Web на порту 3000                                         |
| `pnpm dev:studio`    | Только Studio на порту 3001                                      |
| `pnpm dev:api`       | Только NestJS API на порту 3002; требуется PostgreSQL            |
| `pnpm dev:admin`     | Только Admin на порту 3003                                       |
| `pnpm dev`           | Псевдоним `pnpm dev:studio`                                      |
| `pnpm build`         | Production-сборка всех приложений                                |
| `pnpm typecheck`     | Генерация типов маршрутов и строгая проверка TypeScript          |
| `pnpm lint`          | ESLint для всего monorepo                                        |
| `pnpm test`          | Автоматические тесты без disposable PostgreSQL integration suite |
| `pnpm format:check`  | Проверка форматирования                                          |
| `pnpm audit:imports` | Проверка архитектурных границ и импортов                         |
| `pnpm check`         | Импорты, lint, тесты, типы, сборки и форматирование              |

Studio экспортируется в `apps/studio/out/`; Web и Admin используют собственные Next.js production-сборки,
а API собирается как отдельное NestJS-приложение.

## Структура

- `apps/web/` — пользовательская онлайн-школа.
- `apps/studio/` — 3D Asset Library и Scene Studio.
- `apps/admin/` — staff-интерфейс управления контентом.
- `apps/api/` — NestJS API и PostgreSQL persistence.
- `packages/assets-3d/` — общие модели, ресурсы и реестр.
- `packages/scene-engine/` — формат и renderer сцен.
- `tooling/` — общие конфигурации TypeScript и ESLint.
- `scripts/` — проверки репозитория.
- `docs/` — архитектура, руководство разработчика и отчёты.

Зависимости управляются pnpm, фиксируются в `pnpm-lock.yaml`. В CI используйте `pnpm install --frozen-lockfile`. Не создавайте второй lockfile через npm install.

## Документация

- [Архитектура](docs/architecture.md)
- [Руководство разработчика](docs/development-guide.md)
- [Структура папок](docs/folder-structure.md)
- [Аудит и отчёт Фазы 1](docs/phase-1-audit.md)

Первый рынок — Украина. Другие страны предусмотрены как будущая граница контента, но их правила и приложения сейчас не создаются.
