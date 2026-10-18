# Traffic Laws MVP audit

**Status: In progress (2026-10-18).** The first end-to-end product slice is implemented and verified,
but the complete owner-approved MVP brief is not yet finished.

## Delivered product surfaces

### Public Web and online school

- `/` is a Ukrainian responsive landing page with real navigation, product explanation, a clearly
  labelled free MVP plan, FAQ and no invented prices, testimonials or usage claims.
- `/register` and `/login` use the existing NestJS authentication API through Next.js server
  actions. The bearer token stays in an HttpOnly, SameSite Strict cookie and is never placed in
  browser storage or a client bundle. Logout revokes the API session.
- `/school` shows the authenticated student's real attempt totals, accuracy, completed revisions,
  recent attempts and currently published content.
- `/school/tickets` lists only exact published revisions. Cards use the real question, category and
  `text`/`3d` presentation metadata returned by the API. An empty database produces an honest empty
  state rather than demonstration or invented content.
- `/school/tickets/:id/:revision` keeps the answer server-side until submission. The existing API
  scores the attempt, stores it and returns the explanation and rule references. A validated scene
  snapshot is rendered lazily with the shared Scene Engine; text tickets do not load the 3D viewer.

There is no separate 2D-media schema or licensed 2D content in the repository yet. Text and 3D are
implemented; adding owner-controlled 2D media remains open.

### Admin

- `/scenarios/new` now offers ordinary Ukrainian fields for ID, category, question, two to four
  answers, the correct answer, explanation, normative references and editorial status.
- A Scene Definition v1 exported from Studio can be attached in the advanced 3D section. It is
  validated again by the shared scenario and Scene Engine boundaries. Raw Scenario JSON remains an
  advanced revision tool, not the only creation workflow.
- An active administrator can publish one exact immutable revision after entering an evidence note
  and explicit confirmation. The same screen can withdraw it. Reviewers cannot publish.
- Publication uses narrow PostgreSQL `SECURITY DEFINER` functions. `traffic_runtime` still has no
  direct INSERT or DELETE permission on `Publication`; both transitions verify the active admin and
  append an audit event. Publication does not change the immutable scenario payload.
- Owner publication is an editorial release decision. It does not relabel an unverified normative
  source as independently verified and does not claim that a deterministic engine result is legal
  advice.

Admin user listing, role/status management, visit analytics and a subscriptions placeholder are not
yet implemented. The overview therefore continues to show only data supported by current API
contracts.

### Studio and scenes

Studio remains the existing app on port 3001. Asset Library, Scene Composer, transforms, local
drafts/snapshots and portable Scene Definition v1 export remain unchanged. The MVP integration is:

1. Build and validate a scene in Studio.
2. Export its Scene Definition JSON.
3. In Admin, create a ticket and paste that export into the optional 3D section.
4. Preview the stored snapshot, review the ticket and publish its exact revision.
5. Web lists and renders that revision with the shared Scene Engine.

Studio storage is still localStorage plus portable JSON. It is not represented as server-side or
multi-user scene storage, and anonymous production access control for Studio remains open.

## Content and publication rules

The development seed still imports the three Ukrainian examples as `in_review` only. Nothing is
published automatically. Publication requires at least one known rule reference with an official
source, structural validation, an active admin session, explicit confirmation and an audit record.

The owner-approved policy supersedes the former product requirement for a separate external legal
specialist. The distinction between editorial publication and normative verification is preserved:
an official-source research record can remain `unverified` after owner publication, and the UI does
not present it as an independently verified legal claim.

## Running the current slice

Follow `apps/api/README.md` to create PostgreSQL owner/runtime credentials, apply both migrations,
provision the restricted role, bootstrap the administrator and seed the in-review examples. Then run:

```sh
pnpm dev:api
pnpm dev:web
pnpm dev:studio
pnpm dev:admin
```

Open Web at `http://localhost:3000`, Studio at `http://localhost:3001`, API at
`http://localhost:3002` and Admin at `http://localhost:3003`.

## Verification completed

- Web typecheck, one existing Web unit test and production build passed.
- Scenario package: 18 tests passed, including the separation between owner publication and
  independent rule verification.
- Admin: 8 unit/security tests, typecheck and production build passed.
- Disposable PostgreSQL/Admin integration: 26 API tests and 8 Chrome tests passed. It covers fresh
  and repeated migrations, restricted-role publication, unauthorized publication, withdrawal,
  immutable revisions, server-side scoring, private progress, OpenAPI, TLS startup, backup/restore,
  recovered authentication and the Admin creation/review UI.
- The repository-wide `pnpm check` is run separately after documentation is formatted.

No mobile-device, GPU-specific, production deployment or external legal verification is claimed.

## Remaining MVP work

1. Add a governed 2D-media contract, storage path and at least one owner-approved 2D ticket.
2. Add real privacy-preserving landing/product event analytics and Admin reporting.
3. Add protected Admin user listing and only then any approved role/status operations.
4. Add a truthful inactive subscriptions area; do not add billing before plans/provider approval.
5. Protect a deployed Studio or add minimal authenticated server scene storage if collaboration is
   required for the MVP environment.
6. Add Web browser E2E for registration → school → ticket → attempt → progress and perform explicit
   mobile viewport acceptance.
7. Select, owner-review and publish a small real content set; seeded drafts are not that set.
