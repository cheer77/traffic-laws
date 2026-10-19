# UI Preview

UI Preview is a local-only frontend development mode for Web, Admin and Studio. It does not require
PostgreSQL or the NestJS API, never reads or writes production data, and labels every demonstration
metric as test data.

UI Preview is the default for local development. Run the applications normally, or start all three
frontend applications from the repository root:

```sh
pnpm dev:ui
```

Then open:

- Landing: <http://localhost:3000/>
- Online School: <http://localhost:3000/school>
- Studio: <http://localhost:3001/>
- Admin: <http://localhost:3003/>

Preview data is served only when `NODE_ENV=development` and the incoming host is exactly `localhost`,
`127.0.0.1` or `::1`. Production builds reject the mode regardless of environment variables. Web
and Admin retain their normal cookie/API authentication paths when the preview gate is closed.
Studio already has no API authentication boundary; the mode only adds an explicit local test-data
badge.

To test the real login flow locally, explicitly disable Preview for that command:

```sh
UI_PREVIEW=false pnpm dev:web
UI_PREVIEW=false pnpm dev:admin
```

Web uses the single trainer at `/school`: five local authored scenarios, session-only answers and
progress, and synchronized interactive SVG 2D / WebGL 3D representations. The diagram is explicitly
labelled as a learning illustration, not an official exam image. There are no separate ticket routes
or alternate school previews. Admin mutations still return a clearly labelled simulated success and
never call the API. When Preview is disabled, Web retains authentication and withholds the unverified
trainer examples even after login; publishing a reviewed production content set is outside this task.
See [unified school details](local-trainer.md).

The command uses an ignored `.next-ui-preview` directory per application, keeping Preview build
state separate from ordinary development. Ports 3000, 3001 and 3003 must still be available.
