# Руководство разработчика

## Подготовка

1. Установите Node.js 24 LTS. Файл `.nvmrc` рекомендует 24.22.0. Допустимый диапазон — от 24.12.0 до следующей major-версии.
2. Установите pnpm: `npm install --global pnpm@10.34.7`.
3. В корне выполните `pnpm install`.
4. Для первого запуска выполните `pnpm dev:ui`. Откройте школу на
   <http://localhost:3000/school>, Studio на <http://localhost:3001/> или Admin на
   <http://localhost:3003/>. Backend и PostgreSQL для этого режима не нужны.

Версия менеджера закреплена в `packageManager`. Не нужно устанавливать Next.js, Turbo или TypeScript глобально.

В workspace разрешены установочные скрипты только `esbuild` и `sharp`: они нужны для существующего тестового/сборочного окружения. Новые разрешения добавляются после проверки пакета.

## Варианты запуска

Все команды выполняются из корня репозитория. Не запускайте несколько вариантов одновременно,
если они используют одинаковые порты.

### Вся пользовательская часть без backend

```sh
pnpm dev:ui
```

Команда одновременно запускает Web, Studio и Admin в loopback-only UI Preview. Это основной способ
локально посмотреть интерфейсы без аккаунтов, секретов, API и базы данных:

| Приложение | URL                            |
| ---------- | ------------------------------ |
| Школа      | <http://localhost:3000/school> |
| Studio     | <http://localhost:3001/>       |
| Admin      | <http://localhost:3003/>       |

Preview работает только в development при Host `localhost`, `127.0.0.1` или `::1`. Подробнее:
[UI Preview](ui-preview.md).

### Одно frontend-приложение

```sh
pnpm dev:web       # Web: http://localhost:3000
pnpm dev:studio    # Studio: http://localhost:3001
pnpm dev:admin     # Admin: http://localhost:3003
```

`pnpm dev` остаётся коротким псевдонимом для `pnpm dev:studio`. Web и Admin по умолчанию используют
локальный UI Preview. Для проверки настоящей авторизации запустите нужное приложение с
`UI_PREVIEW=false`; в этом случае должен быть доступен API:

```sh
UI_PREVIEW=false pnpm dev:web
UI_PREVIEW=false pnpm dev:admin
```

### Полный стек с API и PostgreSQL

Сначала выполните подготовку базы, миграции и создание restricted runtime role по
[руководству API](../apps/api/README.md). Затем используйте отдельные терминалы:

```sh
# Терминал 1
pnpm dev:api

# Терминал 2
UI_PREVIEW=false pnpm dev:web

# Терминал 3, если нужен staff-интерфейс
UI_PREVIEW=false pnpm dev:admin

# Терминал 4, если нужна Studio
pnpm dev:studio
```

Порты полного стека: Web `3000`, Studio `3001`, API `3002`, Admin `3003`, PostgreSQL `5433`.
Swagger доступен на <http://127.0.0.1:3002/api/docs>.

### Остановка

Нажмите `Ctrl+C` в каждом терминале с `pnpm dev:*` или `pnpm dev:ui`. Если запускали PostgreSQL
через compose, остановите контейнер без удаления данных:

```sh
POSTGRES_PASSWORD='<тот же локальный пароль>' docker compose -f apps/api/compose.yaml down
```

Команда не удаляет volume. Не добавляйте флаг `--volumes`, если не хотите удалить локальную базу.

## Где менять код

Код пользовательского приложения находится в `apps/web/src`, код Studio — в `apps/studio/src`.
Приложения не импортируют внутренние файлы друг друга. Команды предпочтительно выполнять из корня:

```sh
pnpm dev:web
pnpm dev:studio
pnpm build:web
pnpm build:studio
pnpm --filter @traffic-laws/studio test
pnpm typecheck
```

На чистой установке сначала выполните `pnpm typecheck`: он создаёт `next-env.d.ts` и типы маршрутов через `next typegen`.

## Проверка перед коммитом

```sh
pnpm check
git diff --check
git status --short
```

Проверки идут последовательно, чтобы генерация типов и сборка не записывали `.next` одновременно. `pnpm test` не требует браузера; он собирает настоящий R3F scene graph в Node.

`pnpm format` форматирует новые конфигурации, скрипты репозитория и документацию. Существующие исходники Studio намеренно исключены в `.prettierignore` только ради отдельного, проверяемого архитектурного переноса. Убирать исключение стоит отдельным коммитом форматирования.

## Проверка геометрии

```sh
STUDIO_ASSET_REPORT=1 STUDIO_ASSET_PREVIEW=1 pnpm --filter @traffic-laws/studio test --run src/components/scene/scene.test.tsx
```

Команда выводит число мешей/треугольников и создаёт технические PNG в `/private/tmp`. Путь сохранён из исходного скрипта и рассчитан на macOS. Эти PNG не измеряют WebGL FPS и не заменяют проверку освещения в браузере.

При визуальной проверке откройте Studio, проверьте шесть автомобилей, фокус/свободную камеру, переключение слоёв, Asset Preview и сигналы. Сравнивайте при одинаковом ракурсе, качестве и размере окна.

## Зависимости

```sh
pnpm --filter @traffic-laws/studio add package-name
pnpm --filter @traffic-laws/studio add -D package-name
pnpm add -Dw package-name
```

Последняя команда предназначена для инструментов всего репозитория. Не добавляйте библиотеки приложения только в корень: строгая структура pnpm должна выявлять такие ошибки.

Фиксируйте `pnpm-lock.yaml` в Git. Для CI и воспроизводимой установки используйте `pnpm install --frozen-lockfile`. Точные используемые версии смотрите через `pnpm list -r --depth 0`.

Не смешивайте архитектурные миграции и обновления React/Three.js/Next.js. Для обновления проверяйте peerDependencies, release notes, тесты и WebGL-поведение.

## Сборка и кеш

`pnpm build` независимо собирает оба приложения. Studio сохраняет статический сайт в
`apps/studio/out/`; его можно раздавать обычным статическим сервером, но `next start` с этим экспортом
несовместим. Web использует стандартную Next.js production-сборку в `apps/web/.next/`. У каждого
приложения также свой внутренний `.next`, поэтому параллельные dev-процессы не делят build state.

Turbo кеширует `.next` без внутреннего кеша и `out`; изменение общих конфигураций сбрасывает задачи. Для принудительной перепроверки: `pnpm exec turbo run build --force`. Генерация типов не кешируется, чтобы команда работала и после удаления `.next`.

Старые npm-зависимости и сборочные артефакты после миграции сохранены вне репозитория в `/private/tmp/traffic-laws-phase1.2GBG41`. Они не нужны для новой установки и не должны попадать в Git.

## Чего пока не делать

Архитектурный этап Фазы 3 завершён. Фаза 4 реализует Scene Engine и редактор; расширение ассетов продолжается отдельно. Фаза 5 не начата. Не создавайте backend, админку, билеты, мобильное приложение и контент других стран.

## Общая библиотека 3D

Начните с [README assets-3d](../packages/assets-3d/README.md): там описаны добавление автомобиля, регистрация, материалы, размеры, Preview Studio и Web-проверка.

`pnpm --filter @traffic-laws/assets-3d test` проверяет реестр и измерения. `pnpm audit:imports` проверяет границы пакетов. Каталог доступен в панели Studio: **Бібліотека 3D**. Независимая dev-проверка: `http://localhost:3000/dev/assets-3d`.

[Отчёт Фазы 3](phase-3-audit.md) фиксирует исходный бюджет и границы браузерной проверки. Новые модели не должны увеличивать бюджет существующей сцены без отдельного решения.

## Сцены и редактор

Запустите `pnpm dev:studio`. Режимы **Сцени / Редактор / Бібліотека 3D / Перегляд** находятся
вверху панели. Добавляйте модели через **+ Додати**, меняйте координаты/поворот/масштаб в
инспекторе или перемещайте gizmo. **Зберегти сцену** создаёт локальный снимок, **Export JSON** —
переносную копию. Несохранённый черновик автоматически восстанавливается после обновления, если
localStorage доступен. Повреждённые файлы не заменяют текущую сцену.

`packages/scene-engine` содержит JSON-схему v1, runtime validation, исходный городской пресет
и независимый renderer. Логика Composer находится в Studio, отдельного общего пакета пока нет.
Установка `pnpm install` связывает новый workspace без смены внешних зависимостей.

```sh
pnpm --filter @traffic-laws/scene-engine test
pnpm --filter @traffic-laws/studio test
pnpm audit:imports
pnpm check
```

`pnpm dev:web` → http://localhost:3000/dev/scene-engine проверяет тот же пресет без Studio.
В production маршрут отвечает 404 и не включает редактор/Three.js. Детальный формат, ограничения
и добавление новых сцен: [README движка](../packages/scene-engine/README.md),
[отчёт Фазы 4](phase-4-audit.md). Не начинайте Phase 5 без нового задания.

## Backend (Phase 6)

`apps/api` runs independently on 3002; Web 3000 and Studio 3001 remain unchanged. Follow the
[API startup and operations guide](../apps/api/README.md) to generate local credentials, start
PostgreSQL on loopback 5433, apply migrations, provision the restricted runtime role, bootstrap an
admin and seed protected drafts. Never use the database owner as the HTTP service identity.

```sh
pnpm dev:api
pnpm build:api
pnpm --filter @traffic-laws/api test
pnpm test:api:integration
pnpm check
```

The integration command requires Docker and creates/removes only its own disposable database. It
verifies authentication, access restrictions, exact revisions, private attempts, migration integrity
and backup/restore. Ordinary `pnpm test` does not start Docker and explicitly skips those DB tests.
Run both before handing off backend behavior/schema changes. For a manual Chrome inspection during
the disposable run, use `pnpm --filter @traffic-laws/api test:integration --browser`, open the printed
Swagger URL, then press Enter in that terminal to finish recovery checks and cleanup.

Use Swagger `/api/docs` to register a test student, login and authorize requests. Real development
seeds have no publishable tickets; public scenario lists remain empty. Successful attempt flows
are exercised only against isolated synthetic fixtures. Publishing is disabled for every role.
OpenAPI output, environment variables, migrations, safe administrator bootstrap and manual recovery
commands are documented in the API guide.

For dependency security, run both `pnpm audit --prod` and `pnpm audit`. The Phase 6 runtime graph
has no reported advisory; the full audit still reports the existing unpatched `braces` lint-tool
issue. See [the Phase 6 audit](phase-6-audit.md). Vitest is pinned to stable 4.1.11 throughout the
workspace to address test-tool advisories; Vite remains 7.3.7.

## Admin (Phase 7)

For frontend-only review without accounts, PostgreSQL or API, use the guarded
[UI Preview mode](ui-preview.md):

```sh
pnpm dev:ui
```

Start PostgreSQL and the API with the [API guide](../apps/api/README.md), including the restricted
runtime role, administrator bootstrap and optional development seed. In a second terminal run:

```sh
pnpm dev:admin
```

Open `http://localhost:3003`, sign in with the bootstrapped administrator credentials, then open
Scenarios. The Admin server uses `API_INTERNAL_URL=http://127.0.0.1:3002` by default; set it to the
internal API origin if deployed separately. Serve Admin over HTTPS in production for Secure cookies.
The UI uses real protected API records; public demos are never presented as published content.
See [Phase 7 audit](phase-7-audit.md) for workflow and known limits.
