# Ez-HealthCare Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4.2-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Code_Style-Prettier-ff69b4?style=for-the-badge&logo=prettier&logoColor=white" alt="Prettier" />
  <img src="https://img.shields.io/badge/Git_Hooks-Husky-green?style=for-the-badge&logo=git&logoColor=white" alt="Husky" />
</p>

---

## 📖 Overview

**Ez-HealthCare Dashboard** is the administrative web portal of the **Ez-HealthCare** digital healthcare ecosystem. Designed for clinic and hospital administrators, doctors, and healthcare providers, it delivers a modern, secure, and responsive interface to manage appointments, medical records, patient interactions, and healthcare services efficiently.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict mode)
- **HTTP client**: Axios 1.20.0, configured only in `lib/api/http.ts`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Linting & Code Formatting**: [ESLint 9](https://eslint.org/) (Flat Config) & [Prettier](https://prettier.io/)
- **Git Hooks & Quality Gates**:
  - [Husky](https://typicode.github.io/husky/): Automates pre-commit and pre-push validation.
  - [lint-staged](https://github.com/lint-staged/lint-staged): Runs ESLint and Prettier on staged files.

---

## 📂 Project Structure

### Constants

Frontend constants live in `lib/constants/`, grouped by domain: `auth.ts`
(roles, cookies, endpoints, OTP/session timing), `api.ts` (transport defaults),
`routes.ts` (route paths), `workspaces.ts` (role/menu/section policy), `theme.ts`, `doctor.ts`,
`patient.ts` (icon paths), and `dashboard.ts` (prototype chart/report data).
Import directly from the relevant module; do not duplicate values in consumers.

Backend constants live in `../api/src/common/constants/`: `auth.constants.ts`,
`app.constants.ts`, `clinical.constants.ts`, `visit.constants.ts`, and
`seed.constants.ts`. Existing domain enums remain their source of truth.
Seed fixtures stay server-only. Never import backend config/seed files into the
frontend. Runtime environment values remain in server configuration, not constants.

These are one source per application, not a new cross-repo shared package.
Keep cookie/endpoint/OTP contracts compatible across both apps when changing them.
Do not extract request state, React/service instances, framework exports, or
historical migrations into constants. Component markup and CSS remain presentation.
Local verification: `npm run test:unit` (21 web tests). API config delivery:
`npm test -- --runInBand` (205 tests); see the dated delivery evidence in the plan.

### API and data-flow boundaries

Client UI → custom hook → domain service → shared Axios instance.
Server pages → server session loader → server API service → the same transport.

- `lib/api/http.ts`: the only Axios import/instance, timeouts and safe transport
  errors. Do not attach user credentials to its shared defaults.
- `services/auth.service.ts`: browser-only typed auth endpoints, localized errors,
  in-flight session deduplication and cross-tab refresh locking.
- `services/auth-proxy.server.ts`: server-only upstream URL, cookie forwarding,
  session rotation, allowlist and token stripping. Cookies are request-scoped.
- `services/auth-session.server.ts`: server session/access loader. Server pages
  keep authentication on the server instead of moving it into a browser hook.
- `hooks/use-login.ts` and `hooks/use-auth-session.ts`: login/OTP, async state,
  identity verification, recovery and logout. Components render the result.
- `lib/auth.ts` and `lib/types/clinical.ts`: shared models, not HTTP clients/hooks.
- `lib/reports.ts`: report generation/download outside the dashboard component.

Pure UI state (dialogs, active tabs, mobile navigation) and simple rendering stay
in components. There is no new query library or fake data-fetching hook for the
patient's static preview cards. Auth refresh remains explicit; there is no generic
401 retry that could replay OTP or token-rotation requests.

ESLint enforces these boundaries: no runtime `fetch`, no Axios imports outside the
transport, no HTTP imports in hooks/pages, no service imports in UI components.
Route handlers keep HTTP origin validation and response/cookie handling; their
upstream requests and data processing live in services.

Run local checks with the validated Node 24 runtime:

```bash
npm run test:unit
npm run lint
npm run build
```

`test:unit` covers the real transport and services against an isolated Node HTTP
fixture, plus lint boundary rules. It does not replace PostgreSQL/JWT integration
or browser tests. Existing integration/browser test drivers intentionally retain
native HTTP calls so they do not use the application transport as their oracle.

2026-10-17 refactor verification: local unit/static/build checks are recorded in
`IMPLEMENTATION_PLAN.md`. Docker integration/UI reruns are deferred by user choice
because Docker Desktop's Linux engine was returning HTTP 500. Earlier seeded test
results are historical, not evidence for this refactor.

```text
dashboard/
├── .husky/                  # Git hooks (pre-commit, pre-push)
├── .vscode/                 # Recommended VSCode settings & extensions
├── app/                     # Next.js App Router (Layouts, Pages, Global Styles)
│   ├── favicon.ico
│   ├── globals.css          # Global CSS with Tailwind v4 directives
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Home / Dashboard page
├── public/                  # Static assets (images, icons, fonts)
├── .lintstagedrc.json       # lint-staged configuration
├── .prettierrc.json         # Prettier formatting rules
├── .prettierignore          # Files excluded from formatting
├── eslint.config.mjs        # ESLint flat configuration
├── next.config.ts           # Next.js build and runtime configuration
├── tsconfig.json            # TypeScript compiler configuration
└── package.json             # Project dependencies and npm scripts
```

---

## Phase B clinical demo

The Docker stack now uses an isolated `phase_b_postgres` volume, applies all
migrations, and runs the full idempotent clinical seed. It does not delete or
rewrite the earlier auth/local database volumes.

```powershell
docker compose -f compose.auth.yml up -d --build
docker compose -f compose.auth.yml ps
```

- Dashboard: <http://localhost:3003>
- API / Swagger: <http://localhost:3002/api/docs>
- OTP inbox: <http://localhost:8026>

Demo scenario: patient David signs in by OTP and requests a hall number; nurse
Emily verifies identity, records complaint/vitals and assigns a consultation
room; the scheduled doctor opens that room queue, calls the number, then starts
the examination. Patient status and PostgreSQL notifications update by polling.
Reception and clinic numbers are separate daily sequences; clinic sequences are
per physical `Department` room. Number-issuing mutations require an
`Idempotency-Key`.

Run the complete patient → nurse → doctor browser scenario against the Docker
stack with a fresh OTP patient:

```powershell
docker compose -f compose.auth.yml --profile test run --rm browser-tests sh -c "npm install --no-audit --no-fund --prefix /tmp/auth-browser playwright@1.64.0 && node /work/phase-b-browser.mjs"
```

The normal API correctly rejects new numbers outside clinic hours. For a
deterministic test outside those hours, temporarily add the test override, run
the same scenario, then immediately restore the normal configuration:

```powershell
docker compose -f compose.auth.yml -f compose.phase-b-test.yml up -d --force-recreate api dashboard
docker compose -f compose.auth.yml -f compose.phase-b-test.yml --profile test run --rm browser-tests sh -c "npm install --no-audit --no-fund --prefix /tmp/auth-browser playwright@1.64.0 && node /work/phase-b-browser.mjs"
docker compose -f compose.auth.yml up -d --force-recreate api dashboard
docker compose -f compose.auth.yml exec -T api printenv QUEUE_ISSUANCE_WINDOWS
```

The last command must print `07:00-11:30,13:00-16:30`. The override changes only
the issuance window; it does not reset or replace the PostgreSQL volume.

Clinical API surface used by the dashboard:

- Patient: `POST /visits/hall-ticket`, `GET /visits/me/current`, reissue before
  assignment, and notification list/read.
- Nurse/reception: reception and expired queues, verify, intake, assign room,
  reissue and requeue.
- Doctor: assigned rooms, room queue, call and start examination.
- Admin has no implicit clinical permission; doctor room access is checked
  against `DoctorSchedule` for the current date/shift.
- The legacy triage API is authenticated and restricted to NURSE/RECEPTIONIST;
  patient self-declaration remains outside Phase B.

The exact seed accounts remain in the table below. `NURSE` is the combined
reception/nursing role; legacy `RECEPTIONIST` accounts remain compatible.

Dependency hardening on 2026-10-19 moved `next` and `eslint-config-next` together
to 16.4.2, updated the NestJS 12 packages to their latest compatible patches and
resolved the remaining runtime `source-map-js`/`proxy-addr` advisories without a
forced override or major upgrade. `npm audit --omit=dev` reports zero advisories
for both runtime trees. Full-tree findings are limited to development tooling.
The PostgreSQL 17 tmpfs integration suite and Docker auth/clinical browser gates
also pass; exact cases and evidence are recorded in `todo.md`.

## 🚀 Getting Started

### Partner quick start (PowerShell)

Hai repo phải nằm cạnh nhau với tên thư mục `api` và `dashboard`. Dùng nhánh
`repair` ở cả hai. Các bước tạo env/database bên dưới dành cho lần thiết lập đầu;
không ghi đè `.env`, reset database hoặc seed đè dữ liệu đang dùng.

```powershell
# Chạy từ thư mục cha mong muốn; bỏ qua clone nếu đã có repo.
git clone --branch repair git@github.com:Ez-HealthCare/ez-healthcare-api.git api
git clone --branch repair git@github.com:Ez-HealthCare/ez-healthcare-dashboard.git dashboard
cd dashboard
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Nếu đã có checkout: kiểm tra `git status`, chuyển sang `repair` và dùng
`git pull --ff-only` trong từng repo khi working tree sạch. Không reset/stash thay
đổi của người khác. `.env` thật không được push; mỗi người tự cấu hình từ template.

**Cách A — Docker toàn bộ, phù hợp dựng demo mới:** cần Docker Desktop đang chạy
Linux engine. Trong `dashboard/.env`, thay các placeholder `AUTH_DB_PASSWORD`,
`AUTH_JWT_ACCESS_SECRET` (ít nhất 32 ký tự) và `AUTH_SIGNATURE_SECRET` bằng giá trị
local riêng; không đưa secret vào biến `NEXT_PUBLIC_` hoặc commit file này.

```powershell
docker compose -f compose.auth.yml config --quiet
docker compose -f compose.auth.yml up -d --build
docker compose -f compose.auth.yml ps
```

API container tự chạy migration còn thiếu và full clinical seed trước
khi phục vụ. Đây là database auth-test riêng (host port 5434), không phải database
PostgreSQL local trên port 5432. Chỉ dùng stack này với dữ liệu test; nếu volume đã
tồn tại, giữ credential cũ và rà migration/seed trước khi chạy lại. Tài khoản demo
nằm ở bảng bên dưới.

- Dashboard: <http://localhost:3003>
- API/Swagger: <http://localhost:3002/api/docs>
- Mailpit, lấy OTP đúng email và thư mới nhất: <http://localhost:8026>

Chạy lại hằng ngày dùng `docker compose -f compose.auth.yml up -d`.
Dừng bằng `docker compose -f compose.auth.yml stop`, giữ nguyên volume. Không dùng
`down -v` để xử lý lỗi đăng nhập. Với OTP, chờ đủ 60 giây giữa các lần yêu cầu lại.

**Cách B — FE/BE local để phát triển:** dùng Node.js 24 đã được kiểm thử và Docker
cho DB/Mailpit. Compose dùng 3002/3003 nên không trùng API/dashboard local
3000/3001. Các lệnh migration/seed sau chỉ dành cho DB test mới/cô lập.

Trong terminal tại `dashboard`:

```powershell
docker compose -f compose.auth.yml stop api dashboard
docker compose -f compose.auth.yml up -d db mailpit
npm ci
```

Trong terminal tại `api`, cài dependency và tạo env nếu chưa có:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Sửa `api/.env`: `PORT=3000`, `DB_HOST=localhost`, `DB_PORT=5434`;
`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE` phải khớp các giá trị `AUTH_DB_*` trong
`dashboard/.env`. Đặt JWT/signature secret riêng, `DB_SYNC=false`,
`CORS_ORIGINS=http://localhost:3001`,
`OTP_DELIVERY_URL=http://localhost:8026/api/v1/send`. Frontend giữ
`API_URL=http://localhost:3000/api` và `APP_ORIGIN=http://localhost:3001`.

Khởi tạo **DB test mới** rồi chạy backend:

```powershell
npm run build
node --loader ./esm-loader.mjs dist/database/setup.js
node --loader ./esm-loader.mjs dist/database/seeds/seed.js
npm run dev
```

Terminal frontend tại `dashboard`:

```powershell
npm run dev
```

Sau lần thiết lập đầu, chỉ cần bật DB/Mailpit và `npm run dev` ở mỗi repo; không
cần chạy migration/seed mỗi lần, không cần `$env:API_URL` hay `--port` thủ công.
FE mặc định **3001**, BE đọc `.env` với `PORT=3000`. Ctrl+C trong mỗi terminal để
dừng app; từ dashboard chạy `docker compose -f compose.auth.yml stop db mailpit`
để dừng hạ tầng.

**Nếu dùng database local đã có:** giữ nguyên kết nối/credential của nó (có thể
là port 5432), không chuyển sang 5434 hoặc seed lại một cách tự động. Backup và
kiểm tra migration trước khi nâng schema. Migration chạy trên máy một thành viên
không tự áp dụng sang máy khác qua Git. Lỗi OTP `value too long ... varchar(10)`
hoặc thiếu `auth_sessions` cho thấy DB chưa có `AddAuthSessions1792050000000`;
không sửa bằng cách cắt hash, bật `DB_SYNC=true` hay đổi UI. Xem hướng dẫn kiểm tra
migration trong README backend. Đọc `todo.md` để biết phạm vi Phase B hiện tại.

### Prerequisites

- **Node.js**: 24 (validated local/Docker runtime)
- **Package Manager**: `npm` (or `pnpm` / `yarn`)

### Installation

Clone the repository and install dependencies:

```bash
git clone git@github.com:Ez-HealthCare/ez-healthcare-dashboard.git
cd ez-healthcare-dashboard
npm install
```

> **Note**: `npm install` automatically triggers the `prepare` script to set up Husky git hooks.

### Running the Development Server

Create `.env` from `.env.example` on first setup only, then configure its values.
Do not overwrite an existing `.env`. Next loads `API_URL` and `APP_ORIGIN` from
this file; no PowerShell `$env:` setup is needed. Keep secrets server-only, never
prefix them with `NEXT_PUBLIC_`. Existing `.env.local` or process env overrides
take precedence; remove stale overrides if you change `.env`.

```bash
npm run dev
```

The dashboard defaults to [http://localhost:3001](http://localhost:3001) for both
`npm run dev` and `npm start` (build first for production). The port is explicit
in `package.json` because Next cannot read its startup port from `.env`.
In `../api`, `npm run dev` (alias of `npm run start:dev`) starts the API on
port 3000 using the API repo's own `.env` and `ApiConfigService`.

Start the database configured in `../api/.env` before the local backend. On the
existing machine its container is `ezhealthcare_postgres` (`docker start
ezhealthcare_postgres`). Local OTP needs Mailpit; from this repo run
`docker compose -f compose.auth.yml up -d mailpit` if needed. The auth-test database
below is separate, on port 5434; do not silently switch the API's local DB settings.

Docker and local apps use separate host ports. Stop the existing app with Ctrl+C,
or the Compose service with `docker compose -f compose.auth.yml stop api dashboard`
when it is not needed. Never kill all Node processes; other tools may be using them.

### Authentication with Docker and seed data

Keep the API repository at `../api`.

First configure `AUTH_DB_USERNAME`, `AUTH_DB_PASSWORD`, `AUTH_DB_DATABASE`,
`AUTH_JWT_ACCESS_SECRET` and `AUTH_SIGNATURE_SECRET` in this repo's ignored `.env`.
Compose requires these values rather than embedding credentials in YAML. Keep
the original database credentials when reusing an existing volume; changing an
env value does not change PostgreSQL's existing user/password. `test:auth` reads
the same env file (or an explicit `AUTH_TEST_SECRET` override for its signing check).

```bash
docker compose -f compose.auth.yml up -d --build
npm run test:auth
docker compose -f compose.auth.yml --profile test run --rm browser-tests
```

This builds the API and dashboard, starts an isolated PostgreSQL database,
applies migrations, and seeds the demo accounts, clinical catalog and today's
doctor schedules using the full idempotent API seed.
Database data is retained in the
`ez-healthcare-phase-b_phase_b_postgres` volume. The stack uses local test credentials;
do not deploy this Compose file publicly.

- Dashboard: [localhost:3003](http://localhost:3003)
- API / Swagger: [localhost:3002/api/docs](http://localhost:3002/api/docs)
- Test OTP inbox: [localhost:8026](http://localhost:8026)

| Role                     | Seed email                         | Local test password / method        |
| ------------------------ | ---------------------------------- | ----------------------------------- |
| Bệnh nhân                | `patient.david@example.com`        | Email OTP; read the code in Mailpit |
| Lễ tân                   | `reception.clara@ezhealthcare.com` | `Reception@123456`                  |
| Điều dưỡng               | `nurse.emily@ezhealthcare.com`     | `Nurse@123456`                      |
| Bác sĩ                   | `dr.smith@ezhealthcare.com`        | `Doctor@123456`                     |
| Kỹ thuật viên xét nghiệm | `lab.tech@ezhealthcare.com`        | `Lab@123456`                        |
| Nhân viên cấp cứu        | `er.staff@ezhealthcare.com`        | `Emergency@123456`                  |
| Quản trị viên            | `admin@ezhealthcare.com`           | `Admin@123456`                      |

Choose **Bệnh nhân** for email OTP or **Nhân viên y tế** for staff email/password.
All roles enter `/dashboard`, which verifies the live API identity on the server
and redirects to the correct workspace:

| Role    | Workspace            | Menu                                                    |
| ------- | -------------------- | ------------------------------------------------------- |
| PATIENT | `/dashboard/patient` | Trang chủ, Lượt khám của tôi, Hồ sơ khám bệnh           |
| NURSE   | `/dashboard/nurse`   | Bàn làm việc, Tiếp nhận, Sàng lọc                       |
| DOCTOR  | `/dashboard/doctor`  | Bàn làm việc, Hàng đợi khám, Bàn khám                   |
| ADMIN   | `/dashboard/admin`   | Tổng quan, Tài khoản, Khoa / Phòng, Lịch trực, Cấu hình |

NURSE combines reception and nursing. Existing RECEPTIONIST accounts use the nurse
workspace as a compatibility alias; no database roles or users are migrated.
LAB_TECHNICIAN/EMERGENCY_STAFF get an unsupported-workspace notice and logout.
Admin has no clinical workspace access. Each page checks the API identity before
rendering, including direct/RSC requests; hiding menus is not the access check.
Old `/doctor`, `/nurse`, `/patient` entries redirect to their protected workspace.

Phase B replaces staff placeholders and patient demo queue cards with the live
clinical flow described above. Workspace gates remain a navigation boundary;
backend role, ownership, schedule and state checks remain authoritative.

After `npm run build`, run `npm run test:workspaces` for production HTTP/RSC
checks against a local upstream identity fixture (no JWT signing/DB/seed).
Set `WORKSPACE_BROWSER=1`, `PLAYWRIGHT_MODULE` to an installed Playwright module
(a `file:///.../index.mjs` URL for an external bundle), and optionally
`WORKSPACE_BROWSER_CHANNEL=chrome` to include headless browser checks. No browser
or dependency is downloaded by the test. Screenshots go to ignored `test-results/`.
This does not replace the still-pending seeded Docker regression.

Patient navigation also has `/dashboard/patient/visits` and
`/dashboard/patient/records`, explicitly marked as not connected to clinical data.
Every patient page verifies the API's JWT-authenticated identity on the server;
staff (including ADMIN) cannot enter this workspace. The header account button
shows the real identity and contains logout. Clinical cards are labelled demo
data, and unimplemented actions open a preview notice without writing anything.
No queue ticket is issued and no real clinical record is displayed.

See `IMPLEMENTATION_PLAN.md` for the patient delivery and the remaining four-role
dashboard plan. To run its dedicated browser checks against the seeded Docker stack:

```bash
docker compose -f compose.auth.yml --profile test run --rm --no-deps browser-tests sh -c "npm install --no-audit --no-fund --prefix /tmp/auth-browser playwright@1.64.0 && node /work/patient-browser.mjs"
```

This uses seeded patient David's OTP; wait at least 60 seconds after `test:auth`
before running it because both deliberately use the real resend restriction.
Screenshots are saved to `test-results/patient-dashboard-desktop.png` and
`test-results/patient-dashboard-mobile.png` (ignored by Git).

The browser calls the same-origin `/api/auth/*` proxy. API-issued access and
refresh cookies are HttpOnly and use SameSite=Lax (Secure in production); tokens
are never saved in localStorage or exposed by the proxy response. Access tokens
expire after 15 minutes. Refresh tokens rotate and are revoked by logout.
Without remember-me the refresh cookie lasts for the browser session, with an
8-hour server limit; remember-me persists it for up to 30 days.

For a local dashboard, configure `API_URL=http://localhost:3000/api` and
`APP_ORIGIN=http://localhost:3001` in `.env`. The legacy `NEXT_PUBLIC_API_URL`
fallback is retained, but new configuration should use server-only `API_URL`.
In Docker the API URL
is `http://api:3000/api`. API configuration is documented in `../api/.env.example`:
set a strong `JWT_ACCESS_SECRET`, exact `CORS_ORIGINS`, and `OTP_DELIVERY_URL`.
The mail endpoint uses the [Mailpit send API](https://mailpit.axllent.org/docs/usage/sending-messages/).
Production requires a mail service/relay, HTTPS, and production secrets.

`npm run test:auth` checks the running stack, including all seeded roles, OTP
delivery and lockout, cookie flags, rotation/replay, session restoration, CORS,
dashboard entry and logout. OTP resend is limited to once per minute; wait one
minute between repeated runs that use the same seeded patient email.

Stop the stack while preserving the seeded database:

```bash
docker compose -f compose.auth.yml down
```

---

## 📜 Available Scripts

| Command                | Description                                               |
| :--------------------- | :-------------------------------------------------------- |
| `npm run dev`          | Starts the development server with Turbopack on port 3001 |
| `npm run build`        | Compiles and builds the production bundle                 |
| `npm run start`        | Runs the production server locally on port 3001           |
| `npm run lint`         | Inspects code quality and potential issues using ESLint   |
| `npm run lint:fix`     | Automatically fixes autofixable ESLint issues             |
| `npm run format`       | Formats all supported files using Prettier                |
| `npm run format:check` | Verifies that all files conform to Prettier formatting    |

---

## 🛡️ Code Quality & Git Workflow

To maintain clean and reliable code, automated quality checks are enforced via Husky:

1. **Pre-commit Hook**:
   - Executes `npx lint-staged` on every commit.
   - Automatically runs `eslint --fix` and `prettier --write` on staged files (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`).
2. **Pre-push Hook**:
   - Runs `npm run lint` and `npm run build` before any push to remote.
   - Prevents code with linting or compilation errors from reaching the remote repository.

---

## 👥 Contributing

1. Create a new branch from `main`:
   - Feature: `feature/feature-name` (e.g., `feature/auth-page`)
   - Bug fix: `fix/bug-description` (e.g., `fix/navbar-mobile-toggle`)
2. Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `style: ...`
3. Push your branch and open a Pull Request (PR) to `main`.
