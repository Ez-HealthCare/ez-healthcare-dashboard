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
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Linting & Code Formatting**: [ESLint 9](https://eslint.org/) (Flat Config) & [Prettier](https://prettier.io/)
- **Git Hooks & Quality Gates**:
  - [Husky](https://typicode.github.io/husky/): Automates pre-commit and pre-push validation.
  - [lint-staged](https://github.com/lint-staged/lint-staged): Runs ESLint and Prettier on staged files.

---

## 📂 Project Structure

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

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

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
