# Ez-HealthCare Dashboard — Source of Truth

Last updated: 2026-10-18

This file is the canonical implementation plan and status tracker for `dashboard/`.
Read it before making changes and update it in the same change that completes or
changes a task. Do not mark work complete without the evidence listed under
Definition of Done.

## Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete and verified
- `[!]` Blocked — add the blocker immediately below the task

## Product scope

### Maintenance — Docker frontend dependency lock (2026-10-18)

- [x] Fix clean Linux `npm ci` failure: missing `@emnapi/core` and
      `@emnapi/runtime` 1.11.3. Generate the lockfile using npm in an isolated
      `node:24-alpine` container; keep existing package versions and dependencies.
- [x] Verify Docker clean install/production build and rerun frontend unit tests.

Windows npm 11.6.2 reported no changes; Linux npm 11.19.1 added the missing
resolution entries and normalized peer metadata. No runtime source changes.
Docker `npm ci`, Next.js production compile/TypeScript/page generation and 20/20
frontend unit tests pass. The local dashboard stays running, not replaced by Docker.
Install audit reports 9 advisories (8 high, 1 critical); remediation remains a
separate upgrade task. No `npm audit fix --force` or package version upgrade.

### Current delivery — A: Four role workspaces

Confirmed scope: PATIENT, NURSE (reception + screening), DOCTOR, ADMIN. Admin is
management-only in the UI. No clinical mutations/data integration in delivery A.
RECEPTIONIST remains an explicit legacy alias of NURSE for workspace entry only;
LAB_TECHNICIAN/EMERGENCY_STAFF are unsupported, with logout and no workspace access.
One policy table owns menus and the server section allowlist. Every page and the
entry verify live API identity; cross-workspace requests are denied, including RSC.
W1–W3 complete: 20/20 unit tests and 4/4 production fixture/browser test groups
pass, including 196 HTML/RSC access checks and seven browser identities. Lint,
TypeScript, production build, changed-file formatting and diff checks pass.
Staff desktop/mobile screenshots were inspected; separate nurse Figma-frame
pixel matching is not claimed. Backend clinical permissions have NOT been changed:
align them before connecting real workflows. Fixture tests do not replace real
JWT/database integration; Docker/seed reruns remain deferred.

### Previous delivery — Backend ApiConfigService (2026-10-17)

Goal: one typed/validated configuration service for backend consumers; no direct
env access in business services. See implementation-plan tasks E1–E4.
`../api/src/config/` owns env loading/parsing/validation; auth/JWT/OTP/cookies,
visit signatures, bootstrap and database consume `ApiConfigService`. CLI/seed
uses the same database reader outside Nest without needing JWT/mail settings.
Complete and locally verified: backend 205/205 tests (9 suites), lint, full noEmit
TypeScript, production build, formatting/diff checks and compiled CLI config smoke
(production mode, no database connection). Runtime env access is confined to the
config boundary; business consumers only inject/use ApiConfigService.
No new dependency, real `.env` edit, migration or database seed. Docker reruns
remain deferred under A6 by user direction.

### Previous delivery — Shared constants cleanup (2026-10-17)

Goal: define reusable constants once per application and import them in consumers.
See implementation-plan tasks C1–C4. Frontend: `lib/constants/`; backend:
`../api/src/common/constants/`, grouped by domain, with no shared-package dependency.
Auth/API configuration, navigation, theme/catalog/chart/report data, clinical
department codes, visit tables and seed fixtures are extracted. Runtime env/secrets,
request state, JSX/CSS presentation and historical migrations are not centralized.
Current status: complete and locally verified. Web 18/18 tests; API 194/194 tests
(8 suites). Both repos pass lint/build and changed-file formatting; web noEmit
TypeScript and diff whitespace checks pass. No dependency or business-rule changes.
Docker seed/browser verification remains deferred under A6 by user direction.

### Previous delivery — API/component refactor (2026-10-17)

See implementation-plan tasks A1–A6. Centralize Axios, move requests/data handling
to services, move client async orchestration to custom hooks, preserve server-side
authorization and existing UI. Pure presentation state remains in components.
Local checks are the active verification scope per user direction; Docker engine
returns HTTP 500, so seeded integration/browser reruns remain explicitly pending.

### Previous patient UI delivery — Role dashboards (2026-10-15)

Previously delivered slice: build the patient dashboard from the directly
attached Figma screenshot. See the patient delivery checklist in
`IMPLEMENTATION_PLAN.md`. Patient identity is real; clinical demo cards are
explicitly labelled and no clinical mutations are implemented. Delivery A above
adds role-specific staff navigation shells, not connected business workspaces.

See `IMPLEMENTATION_PLAN.md` for the current implementation tasks and evidence.
The user has superseded the earlier shared-dashboard deferral: this delivery
targets PATIENT, NURSE, DOCTOR and ADMIN, with role-specific navigation and
server-side workspace access checks. Clinical workflows are deferred to a later
delivery; reception is combined with NURSE, other staff workspaces remain backlog. The broader
journey checklist below is retained as backlog, not this delivery's scope.

Build the Vietnamese MedRoute/Ez-HealthCare web experience represented by the
connected Figma project:

- Figma file: `UI-UX-Medical-App`
- File key: `xxGLe9v3m0AZUdtYSIhpui`
- Starting node: `0:1` (`Page 1`)
- Reference URL: <https://www.figma.com/design/xxGLe9v3m0AZUdtYSIhpui/UI-UX-Medical-App?node-id=0-1>

Business backlog after delivery A (not current implementation scope):

1. Patient authentication, queue registration, pre-exam declaration, live visit
   progress, notifications, completion summary, and medical records.
2. Receptionist patient search, record verification, intake creation, queue
   management, and ticket assignment.
3. Responsive patient views, accessible interaction, privacy-safe presentation,
   and integration with the existing API.

Out of scope until explicitly added here:

- Expanding doctor clinical mutations beyond the approved navigation/workspace shell.
- A new admin analytics product beyond the existing static prototype.
- UI-library dependencies other than Ant Design unless a documented gap requires
  one.
- Other new dependencies when the platform, CSS, or an installed dependency is
  enough.
- Speculative component abstractions before a pattern is reused.

## Authority and decisions

When sources disagree, use this order:

1. This file for scope, priority, and completion status.
2. Figma for visual layout, copy, component states, and user flow.
3. `ĐẶC TẢ USE CASE.md` and the API project for domain behavior and contracts.
4. Existing dashboard code for reusable implementation patterns.

Confirmed decisions:

- The active delivery is the four-role navigation/workspace scope documented above.
- Ant Design 6 is the standard component library. Use its accessible primitives,
  `ConfigProvider` tokens, and Vietnamese locale before creating custom controls.
- Tailwind remains available for layout and one-off composition; do not duplicate
  an Ant Design component in utility CSS.
- The primary screen action must be visually dominant; secondary actions remain
  quiet.
- Patient screens use one consistent journey model:
  `Đăng ký → Lấy số → Chờ khám → Đang khám → Hoàn tất`.
- Status colors have one meaning everywhere: green = complete, blue/teal = active,
  amber = attention, red = error or urgent. Status must never rely on color alone.
- Patient mobile usability is required, especially ticket number, room, waiting
  time, directions, and notifications.
- Existing code should be reused only when it matches the target. Dead or orphaned
  scaffolding should be removed instead of wrapped in more abstractions.
- Authentication follows the existing API contract instead of introducing another
  generic login endpoint:
  - patients use email OTP via `/auth/patient/request-otp` and
    `/auth/patient/verify-otp`;
  - receptionists and other staff use email/password via `/auth/staff/login`;
  - authenticated identity and role come from `/auth/me`.

## Current baseline

Observed on 2026-10-15 after auth integration:

- [x] Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind CSS 4, and Ant Design 6
      are installed; the MedRoute theme and Vietnamese locale are configured.
- [x] `/` renders the responsive login screen with Ez-HealthCare metadata.
- [x] `/dashboard` requires a verified session and displays the actual identity.
- [x] Frontend and API lint and TypeScript validation pass.
- [x] Clean Linux installs with `npm ci` succeed for both Docker images.
- [x] Frontend production build and API build pass, locally and in Docker.
- [x] Orphaned Refine/Axios auth scaffolding and client quick-login passwords are
      removed. Existing unused doctor UI types are retained without those dependencies.
- [ ] Production dependency advisories are resolved.
  - The previous audit's Next.js/transitive dependency upgrade tasks remain outside
    this auth delivery; do not treat this stack as production release approval.
- [ ] Whole-repository `npm run format:check` passes.
  - Auth files are formatted; unrelated existing files still need formatting.
- [ ] Dashboard statistics and charts come from the API.
  - These values remain demonstration data; authentication and identity are real.

## Authentication integration goal

### Goal

Deliver a real end-to-end login flow from the Figma screen to the existing API,
restore the authenticated user with `/auth/me`, and protect `/dashboard` without
placing long-lived credentials or refresh tokens in browser storage. All seven
roles use the dashboard entry and display their real identity. Patients now
enter a separately verified workspace; other role workspaces remain pending
under the active implementation plan.
Verification must use Docker, migrations, and seeded demo accounts.

### Current status

- [x] Patient email OTP and staff email/password are connected to the real API.
- [x] All seven roles enter `/dashboard` and show their real name, email, and role.
- [x] Access/refresh tokens use HttpOnly cookies, with Secure in production and
      SameSite=Lax; no auth token is exposed to client JavaScript or localStorage.
- [x] Refresh rotation, logout revocation, remembered sessions, reload restoration,
      expiry and unauthenticated redirects are verified.
- [x] Origin-restricted CORS and mutation-origin checks are implemented.
- [x] API production `AuthService` tests pass: 7 suites / 189 tests across the repo.
- [x] Docker stack is running with a migrated PostgreSQL test database, all-role
      account seeds, API, dashboard, and Mailpit.
- [x] Live integration tests pass: 13/13, including expired access-token recovery.
- [x] Chromium Docker UI tests pass for all seven roles, desktop and 375px mobile,
      wrong credentials/OTP, offline feedback, reload restoration, and logout.

Deferred / operational notes:

- Historical auth-delivery deferral: superseded by the active four-role dashboard plan.
- The full clinical seed has an existing `triage_rules.targetDepartmentId` /
  `target_department_id` schema mismatch. The auth stack intentionally uses
  `seed.js --auth-only`; clinical seeding needs its own repair task.
- Production email requires a configured mail send service/relay, HTTPS, and
  production secrets; Mailpit is the isolated local test inbox.

## Work plan

### P0 — Restore a trustworthy baseline

- [x] Reconcile `package.json` and `package-lock.json` with imports used by retained
      source files; remove packages and source that are not part of the active product.
- [x] Restore the minimum shared auth model/storage module or remove the orphaned
      auth implementation if the API contract requires a different approach.
- [x] Remove stale generated route references and ensure only real routes are typed.
- [x] Replace remotely downloaded fonts with a local or system font strategy.
- [ ] Upgrade Next.js to a patched compatible release and clear high/critical
      production dependency advisories.
- [x] Replace starter metadata and make `/` intentionally redirect to or render the
      correct entry screen.
- [x] Remove hard-coded client-side login credentials.
- [ ] Make these commands pass from a clean checkout:
  - [x] `npm ci` (clean Docker image installs)
  - [x] `npm run lint`
  - [x] `tsc --noEmit --incremental false`
  - [ ] `npm run format:check` (unrelated formatting backlog)
  - [x] `npm run build`

### P1 — Establish the shared visual foundation

- [ ] Extract the Figma colors, typography, spacing, radii, shadows, and status
      semantics into the smallest practical Ant Design theme-token set.
- [ ] Build the responsive application shell and role-aware navigation.
- [ ] Map repeated patterns to Ant Design first: buttons, fields, forms, badges,
      steps, alerts, tables, drawers, and modals. Create a custom component only
      when composition or Figma behavior is genuinely project-specific.
- [ ] Ensure shared controls have labels, keyboard focus, disabled states, errors,
      and sufficient contrast.
- [ ] Verify representative desktop and mobile shells against Figma screenshots.

### P2 — Authentication and role entry

Status: authentication complete and verified against the seeded Docker stack and
Chromium UI tests. `/dashboard` now routes PATIENT to `/dashboard/patient`;
staff dashboards remain unchanged until their workspace delivery.

- [x] Implement the Figma login screen with validation, loading, error, remember-me,
      password visibility, and forgot-password states.
- [x] Audit and document the frontend/API authentication contract.
- [x] Remove the unused Refine/Axios auth scaffolding and hard-coded quick-login
      credentials; use the shared Axios transport through auth services/hooks.
- [x] Add an explicit patient/staff choice while preserving the Figma layout.
- [x] Implement patient email OTP request and verification against the real API.
- [x] Implement receptionist/staff email-password login against `/auth/staff/login`.
- [x] Fetch `/auth/me` after login and model the returned identity and role.
- [x] Enable environment-scoped API CORS for the dashboard origin and credentials.
- [x] Add refresh-token rotation using a Secure, HttpOnly, SameSite cookie plus
      `/auth/refresh` and `/auth/logout`.
- [x] Make “Ghi nhớ đăng nhập” control the refresh-cookie lifetime; never store the
      refresh token in `localStorage`.
- [x] Protect `/dashboard`, restore the session on reload, clear expired sessions,
      and redirect unauthenticated users to `/`.
- [x] Route authenticated roles through the dashboard entry and display their real
      name, email, and role. Patient workspace is delivered; other workspaces remain pending.
- [x] Handle validation, invalid credentials/OTP, expiry, lockout, offline, and
      server-error states without exposing sensitive data.
- [x] Replace mock-only auth tests with tests of the real `AuthService` and add E2E
      coverage for staff login, patient OTP, `/auth/me`, refresh, logout, and CORS.
- [x] Verify the complete browser flow against a running API and record the result.
- [x] Provide a reproducible Docker stack with PostgreSQL, migrations, seed accounts
      for all seven roles, and a test OTP inbox.

### P3 — Patient journey

Patient dashboard visual shell and navigation are verified from the supplied
Figma screenshot (see implementation-plan P1–P4). Clinical cards are demo data;
the real-data journey tasks below are not complete.

- [ ] Patient home: show the current ticket, room, people ahead, estimated wait, and
      one clear next action before secondary content.
- [ ] Confirm patient and visit information before issuing a queue number.
- [ ] Implement queue-number success with printable/scannable QR ticket details.
- [ ] Implement pre-examination symptom declaration and review/confirmation states.
- [ ] Implement the persistent visit journey tracker and live status updates.
- [ ] Implement actionable notifications with read/unread and relevant deep links.
- [ ] Implement examination-complete summary, instructions, and follow-up details.
- [ ] Implement medical-record history and record detail views for diagnoses,
      prescriptions, tests, and imaging.
- [ ] Verify the patient-critical flow at desktop and mobile widths.

### P4 — Receptionist journey

- [ ] Build the reception workspace around the current queue and fastest next task.
- [ ] Implement keyboard-friendly patient search with empty, loading, multiple-match,
      and no-match states.
- [ ] Implement identity and record verification with duplicate-patient warnings.
- [ ] Implement visit/intake creation with validation and safe confirmation.
- [ ] Implement reception queue management and status transitions.
- [ ] Implement successful ticket assignment with print/reissue actions.
- [ ] Mask unnecessary patient identifiers on shared screens.

### P5 — Real data and resilient states

- [ ] Replace hard-coded dashboard, queue, visit, notification, and record data with
      API-backed queries/mutations.
- [ ] Confirm API base URL and environment handling for local and deployed builds.
- [ ] Provide consistent loading, empty, offline, validation, authorization, and
      server-error states.
- [ ] Prevent duplicate submissions for intake, queue issuance, and clinical forms.
- [ ] Confirm refresh/session behavior without storing secrets in source.
- [ ] Remove demo fallbacks from production paths.

### P6 — Verification and release readiness

- [ ] Add the smallest useful automated checks for authentication, queue issuance,
      visit progression, and receptionist intake.
- [ ] Complete keyboard-only and screen-reader checks for critical flows.
- [ ] Verify text contrast, focus visibility, zoom behavior, and non-color status cues.
- [ ] Verify privacy behavior: masked identifiers, session expiry, and no sensitive
      data in logs or static bundles.
- [ ] Compare completed screens with Figma at representative viewport sizes.
- [ ] Confirm lint, types, formatting, tests, and production build pass in CI.
- [ ] Remove unreachable components, unused hooks, old mock data, and obsolete assets.
- [ ] Update `README.md` with the final routes, environment variables, and commands.

## Definition of Done

A checkbox may be changed to `[x]` only when:

1. The implementation exists in the active route, not only as an unused component.
2. Relevant empty, loading, error, disabled, and success states work.
3. The change works with keyboard navigation and does not expose sensitive data.
4. The smallest relevant automated or manual check has been run and recorded below.
5. Lint and TypeScript checks pass for the changed code.
6. The UI has been visually compared with the relevant Figma frame when applicable.

## Verification log

Add newest entries first. Keep entries short and factual.

2026-10-17 API/component refactor: 16/16 local tests pass (transport, production
auth services with HTTP fixtures, lint boundaries). Lint, TypeScript, production
build, changed-file Prettier and `git diff --check` pass. Runtime has no fetch;
Axios import/create exists only in `lib/api/http.ts`. Client components consume
hooks; server pages consume server loaders. Existing UI/role scope is unchanged.
Docker integration/UI reruns are pending because the engine returns HTTP 500;
the user chose local verification first. The 2026-10-15 results below are historical.

Patient UI delivery (2026-10-15): Docker production build, lint, TypeScript,
changed-file formatting and diff checks pass. Dedicated patient Chromium tests
pass at 1280/768/375, including preview interactions, menu routes, keyboard,
refresh/logout, staff denial via direct/RSC requests and forged JWT rejection.
Auth regression rerun: 13/13 integration checks and all 7 browser roles pass.
See `IMPLEMENTATION_PLAN.md` for screenshots and the still-pending role workspaces.

| Date       | Scope               | Evidence                      | Result                                                |
| ---------- | ------------------- | ----------------------------- | ----------------------------------------------------- |
| 2026-10-15 | Auth integration    | `npm run test:auth`           | Pass: 13/13 on seeded Docker stack                    |
| 2026-10-15 | Auth UI             | Chromium Docker tests         | Pass: all 7 roles; desktop/mobile; restore/logout     |
| 2026-10-15 | API production auth | Jest against real AuthService | Pass: 7 suites / 189 tests                            |
| 2026-10-15 | Builds              | Next build / Nest build       | Pass: local and Docker; clean npm ci                  |
| 2026-10-15 | Lint / types        | Both repos                    | Pass; no missing auth dependencies                    |
| 2026-10-15 | Clinical full seed  | Fresh Docker database         | Existing triage column mismatch; auth-only seed works |
| 2026-10-15 | Auth contract       | Source/API audit              | Blocked: endpoint, session, CORS mismatches           |
| 2026-10-15 | API baseline        | Lint, TSC, Jest               | Pass: 7 suites, 183 tests; auth tests mock-only       |
| 2026-10-15 | Figma login flow    | Lint, CDP, browser form       | Pass: 1280/375; validation; `/dashboard` route        |
| 2026-10-15 | Ant Design setup    | `GET /dashboard`              | HTTP 200; SSR styles present                          |
| 2026-10-15 | Changed code        | `npm run lint`                | Pass                                                  |
| 2026-10-15 | Baseline scan       | `npm run lint`                | Pass                                                  |
| 2026-10-15 | Development route   | `GET /dashboard`              | HTTP 200                                              |
| 2026-10-15 | Type validation     | `npx tsc --noEmit`            | Fail: missing auth module and stale role routes       |
| 2026-10-15 | Production build    | `npm run build`               | Compile pass; typecheck blocked by auth backlog       |
| 2026-10-15 | Formatting          | `npm run format:check`        | Fail: 21 files require formatting                     |

## Change log

- 2026-10-15: Delivered patient dashboard from the user-supplied Figma screenshot,
  horizontal shell and responsive cards, real identity/account logout, explicit
  demo data, navigation placeholders, server-side patient-role checks and
  refresh recovery. Other role dashboards remain unchanged. Added dedicated
  Chromium tests; fixed the login submit button's loading-state accessible name.

- 2026-10-15: Completed P2 login/auth with patient OTP, all staff roles, verified
  identity, HttpOnly cookie sessions, rotation/logout, CORS, and protected dashboard
  entry. Added all-role auth-only seeds, reproducible Docker stack, 13 integration
  checks, and Chromium UI checks. Feature permissions remain deferred as requested.
- 2026-10-15: Audited the sibling API, documented the patient/staff authentication
  contract, and expanded P2 with the concrete frontend, API, session, CORS, route
  protection, and verification work still required.
- 2026-10-15: Replaced the starter root page with the responsive Figma login,
  preserved exact SVG assets, added accessible form states, and routed valid
  submissions to `/dashboard` without inventing an authentication backend.
- 2026-10-15: Adopted Ant Design 6 as the standard UI library, added its official
  App Router registry, configured Vietnamese theme defaults, and migrated the
  dashboard export button.
- 2026-10-15: Created the source of truth from the repository scan, connected Figma
  project, and confirmed patient/receptionist scope.
