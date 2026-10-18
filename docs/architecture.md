# Архитектура

## Как устроен проект

Это pnpm workspace с четырьмя независимыми приложениями: пользовательским `apps/web`, инструментальным
`apps/studio`, административным `apps/admin` и серверным `apps/api`. Turborepo запускает задачи пакетов и кеширует сборки, lint и тесты. Он не является
дополнительным сервером или приложением.

Раньше Next.js-приложение находилось в корне и использовало npm. Теперь в корне находятся только управление репозиторием, документация и общие настройки. Studio использует общую библиотеку `packages/assets-3d`; её интерфейс и состояние остались внутри приложения.

## Web

`apps/web` — минимальная основа пользовательской платформы на украинском языке. Сейчас она содержит
временную главную страницу и development-only технические проверки; пользовательских билетов,
авторизации, платежей, API и продуктовой логики пока нет.
Приложение использует App Router, строгий TypeScript и Tailwind CSS и не зависит от исходников Studio.

## Studio

- `src/app` содержит единственную страницу и layout Next.js App Router.
- `src/components/layout` — оболочка интерфейса.
- `src/components/debug` — панели Studio, инспектор и статистика.
- `src/components/scene` — сцена React Three Fiber, камера и адаптеры общих моделей.
- `src/stores/useStudioStore.ts` — Zustand: выбранный объект, слои, камера, сигналы, настройки и метрики.
- `src/lib` — каталоги объектов, параметры дороги и расчёт габаритов.
- `src/types/studio.ts` — типы транспорта, камеры, слоёв, инспектора и метрик.
- `scripts/previewVehicles.ts` внутри приложения — технический CPU-рендер для проверки геометрии.

Сцена загружается на клиенте. Все модели процедурные, надписи используют Canvas-атлас; внешние модели, HDRI и текстуры не скачиваются. Режим demand, ограничитель кадров и остановка на скрытой вкладке остаются прежними.

## Правила зависимостей

Приложение может использовать общий пакет из `packages`, когда он действительно понадобится. Общий
пакет не должен импортировать приложение. Приложения не должны напрямую импортировать внутренние
файлы друг друга. `apps/web` отвечает за пользовательский продукт, `apps/studio` — за инструменты
3D-разработки. `apps/api` отвечает за NestJS API; `apps/admin` отвечает за доступные административные процессы; `apps/mobile` остаётся возможным будущим клиентом.

`packages/assets-3d` — общий runtime-пакет без зависимости от Studio. Второй потребитель — lazy-loaded dev-проверка Web `/dev/assets-3d`; production отвечает 404 и не включает тяжёлый 3D-чанк. Метаданные экспортируются отдельно через `/registry`, рендереры — через явные публичные exports.

Алиас `@/*` каждого приложения относится только к его собственному `src/*`. Пути между
приложениями через этот алиас не добавляются. Каждая используемая внешняя библиотека объявляется в
package.json своего потребителя. `pnpm audit:imports` проверяет приложения и пакеты, включая запрет
межприложенческих импортов.

## Общие настройки

`tooling/typescript/base.json` включает `strict: true`. Web и Studio независимо расширяют базу
Next.js-настройками, JSX, собственным алиасом и путями сгенерированных типов.

`tooling/eslint/next.mjs` содержит общий профиль ESLint для Next.js. Корневой ESLint проверяет инфраструктурные скрипты, приложение — собственный код. Prettier настраивается единственным `prettier.config.mjs`.

На время архитектурной миграции прежние `src` и скрипт превью исключены из массового Prettier-форматирования: они сохранены побайтно. Их ESLint и TypeScript продолжают проверять. Форматирование старого кода можно вынести в отдельное изменение.

## География

Первая версия обучает исключительно украинским ПДД. Когда появится образовательный контент, юрисдикция должна быть явным атрибутом его набора, например `countryCode: "UA"`, а версия правил — отдельным атрибутом.

Геометрия и отображение 3D не должны определять юридическую правильность ответа. Для будущего второго рынка потребуется отдельный набор правил и контента, а не копия Studio. На Фазе 1 нет регионального runtime, иностранных правил, билетов, API или базы данных.

## Ограничения текущего этапа

Studio разделяет состояние документа (`useComposerStore`) и состояние просмотра/диагностики (`useStudioStore`). Ни один store не является состоянием образовательной платформы. Scene Definition не содержит экзаменационных ответов или UI-состояния.

Генератор `packages/assets-3d/src/vehicles/assetBuilder.ts` используется транспортом и окружением. Ресурсы кешируются на время жизни модуля; адаптеры Studio не создают их копии. Соглашения и добавление моделей описаны в [README библиотеки](../packages/assets-3d/README.md).

Путь `apps/studio/out` относится только к статическому экспорту Studio. Web и Studio используют
собственные каталоги `.next` внутри своих директорий, поэтому их сборочные состояния не смешиваются.
Авторизация и хранение серверных данных реализованы отдельно в `apps/api`; клиентские продуктовые экраны остаются будущей работой.

## Scene Engine и Composer (Фаза 4)

`packages/scene-engine` предоставляет независимые данные/валидацию/пресеты через корневой export
и R3F-рендереры через `/react`. Единственный реализованный пресет — существующий городской
перекрёсток. Studio и development-only Web `/dev/scene-engine` используют один движок.
Production Web исключает тяжёлый динамический импорт и отвечает 404 на dev-маршруте.

Composer остаётся внутри Studio: `src/lib/composer` содержит операции и codec хранения,
`src/components/composer` — UI и transform controls. Второго потребителя редактора нет, поэтому
отдельный пакет `scene-composer` пока не создан. Состояние документа сериализуется в JSON v1;
localStorage хранит черновик и локальные снимки без backend. Камера и debug-настройки остаются
параметрами просмотра. Shared engine не импортирует UI, Zustand или код приложений.

Формат, ограничения, миграции, добавление пресета и проверки: [отчёт Фазы 4](phase-4-audit.md).

## Сценарии и нормативные ссылки (Фаза 5)

`packages/scenarios` хранит вопросы, ответы, объяснения и необязательный валидированный снимок
Scene Definition. `packages/country-rules` хранит ссылки на украинские нормативные источники,
состояние их проверки и независимую от графики модель дорожной ситуации. Модель описывает полосы,
манёвры, сигналы, траектории и кандидатов на конфликт, но не вычисляет приоритет. Зависимости
направлены так: scenarios → scene-engine и country-rules;
country-rules не зависит от 3D, React или приложений. Геометрия остаётся в assets-3d, Composer —
в Studio. Сохранённый снимок сцены не меняется при последующем редактировании черновика Studio.

Web-маршрут `/dev/scenarios` показывает два технических и три учебных черновика на основе городского
пресета. Записи официального текста и учебные ответы остаются без юридической проверки. Production
возвращает 404. Локальная проверка статусов — редакционный барьер, но не защищённая публикация.
Детали схемы и порядок проверки контента: [аудит Фазы 5](phase-5-audit.md). Дальнейшая логика
описана в [проекте Traffic Rules Engine](traffic-rules-engine-design.md).

## Backend foundation (Phase 6)

`apps/api` is a standalone NestJS modular monolith on port 3002. Modules own configuration,
database access, authentication, safe user profiles, scenario revisions/reviews, learning attempts
and health. Controllers contain transport plumbing; services own use cases. There is no Next.js,
React, Studio or rendering dependency in the API runtime. Its bundle consumes shared package public
exports, preserving the existing source-export workspace convention without changing shared packages.

PostgreSQL owns users, hashed revocable sessions, immutable scenario/review/attempt/audit records and
a separate publication relation. Prisma supplies typed access and deterministic migrations; SQL adds
identity checks and append-only triggers. Authoritative educational data is one versioned JSONB
payload plus an immutable rule context snapshot. Indexed relational IDs must match the payload;
answers are never separately editable. Attempts reference exact immutable revisions.

The API reuses `@traffic-laws/scenarios` and `@traffic-laws/country-rules`; no legal algorithms are
reimplemented. Bearer credentials identify a current active account; public registration grants only
student. Staff can append drafts and review recommendations. An active administrator can explicitly
publish or withdraw one immutable revision through narrow audited database functions. Runtime DB
credentials still cannot directly insert/delete publications. Owner publication does not change
unverified rule metadata or claim independent legal verification. Invalid or unsourced material fails
if a trusted database owner inserts a release. The public question projection excludes answers,
explanations and traffic-decision claims; authoritative scoring occurs after an authenticated attempt.

The full protected legal approval workflow remains a separately scoped Backend/Admin responsibility.
Phase 5 status is unchanged. Phase 7 Admin is in progress; see [Phase 7 audit](phase-7-audit.md). Operational instructions, schemas, auth
tradeoffs, security controls and recovery limits: [API guide](../apps/api/README.md) and
[Phase 6 audit](phase-6-audit.md).

## Admin application (Phase 7)

`apps/admin` is a Next.js App Router app on port 3003. Server components and actions call the
NestJS REST API on the server; browsers receive only HttpOnly same-site session cookies. Mutation
actions require a matching Origin and Host. Each protected render asks the API for the current
profile; its role guard remains authoritative. Draft edits append immutable revisions using expected
revision concurrency. Staff listing supports API-side ID and status filters. The shared Scene Engine renderer is loaded only for snapshots. Publication
is available only to admins; no operator user-management route exists. See
[Phase 7 audit](phase-7-audit.md) and [MVP audit](mvp-audit.md).
