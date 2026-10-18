# Ez-HealthCare Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.5-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
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
Local verification: `npm run test:unit` (20 web tests). API config delivery:
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

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.x
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

```bash
npm run dev
```

When using the API on port 3000, start the dashboard with
`npm run dev -- --port 3001` and open [http://localhost:3001](http://localhost:3001).

### Authentication with Docker and seed data

Keep the API repository at `../api`, then run:

```bash
docker compose -f compose.auth.yml up -d --build
npm run test:auth
docker compose -f compose.auth.yml --profile test run --rm browser-tests
```

This builds the API and dashboard, starts an isolated PostgreSQL database,
applies migrations, and seeds the demo accounts using the API seed's
`--auth-only` mode. Clinical catalog seeding is outside this auth test stack.
Database data is retained in the
`ez-healthcare-auth_auth_postgres` volume. The stack uses local test credentials;
do not deploy this Compose file publicly.

- Dashboard: [localhost:3001](http://localhost:3001)
- API / Swagger: [localhost:3000/api/docs](http://localhost:3000/api/docs)
- Test OTP inbox: [localhost:8025](http://localhost:8025)

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

Delivery A is navigation/UI only. Staff shells use the existing teal/lavender,
white-card style; their functional pages explicitly state they are not connected.
The patient screenshot-based dashboard remains intact with demo clinical cards.
No clinical HTTP endpoints or backend business permissions are changed. Before
real mutations, align API guards with the newly agreed nurse/reception and
admin-only-management policy; workspace gates do not replace API authorization.

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

For a local dashboard, set `API_URL=http://localhost:3000/api` (or the existing
`NEXT_PUBLIC_API_URL`) and `APP_ORIGIN=http://localhost:3001`. In Docker the API URL
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
| `npm run dev`          | Starts the development server with Turbopack on port 3000 |
| `npm run build`        | Compiles and builds the production bundle                 |
| `npm run start`        | Runs the production server locally                        |
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
