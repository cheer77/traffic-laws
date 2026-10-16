# Структура папок

```text
traffic-laws/
├── apps/
│   └── studio/
│       ├── src/
│       │   ├── app/                 # Next.js: страница, layout, CSS
│       │   ├── components/
│       │   │   ├── debug/           # Панели и диагностика
│       │   │   ├── layout/          # Интерфейс Studio
│       │   │   ├── scene/           # Все 3D-компоненты
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
│   └── README.md                   # Будущие общие модули
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

Тесты остаются рядом с проверяемым кодом. Модели и ресурсы не переносились в новые пакеты: приложение перемещено целиком, поэтому относительные импорты сохранились.

Генерируемые `node_modules`, `.next`, `out`, `next-env.d.ts` и кеш TypeScript не входят в Git. `pnpm-lock.yaml` — единственный lockfile репозитория. Старый `package-lock.json` доступен в Git-истории и в резервной папке миграции.

Каталоги `apps/web`, `apps/admin` и `apps/api` не созданы.
