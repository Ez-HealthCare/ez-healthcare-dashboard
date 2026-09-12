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

## 📖 Giới thiệu (Overview)

**Ez-HealthCare Dashboard** là hệ thống bảng điều khiển quản trị (Web Portal / Admin Dashboard) thuộc hệ sinh thái y tế số **Ez-HealthCare**. Dự án được thiết kế nhằm phục vụ quản lý lịch khám, bệnh nhân, bác sĩ, cơ sở y tế và các dịch vụ chăm sóc sức khỏe trực tuyến với giao diện hiện đại, tối ưu hiệu năng và trải nghiệm người dùng cao.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Library**: [React 19](https://react.dev/)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Linting & Formatting**: [ESLint 9](https://eslint.org/) (Flat Config) & [Prettier](https://prettier.io/)
- **Git Hooks & Quality Gate**:
  - [Husky](https://typicode.github.io/husky/): Tự động kiểm tra trước khi commit và push.
  - [lint-staged](https://github.com/lint-staged/lint-staged): Chạy ESLint và Prettier trên các file staged.

---

## 📂 Cấu trúc thư mục (Project Structure)

```text
dashboard/
├── .husky/                  # Git hooks (pre-commit, pre-push)
├── .vscode/                 # Cấu hình VSCode (format on save, linting)
├── app/                     # Next.js App Router (Layouts, Pages, Styles)
│   ├── favicon.ico
│   ├── globals.css          # Global CSS & Tailwind configuration
│   ├── layout.tsx           # Root Layout
│   └── page.tsx             # Trang chủ (Dashboard Home)
├── public/                  # Static assets (images, icons, fonts)
├── .lintstagedrc.json       # Cấu hình lint-staged
├── .prettierrc.json         # Quy chuẩn định dạng Prettier
├── .prettierignore          # Danh sách file bỏ qua khi format
├── eslint.config.mjs        # Cấu hình ESLint (Flat config)
├── next.config.ts           # Cấu hình Next.js
├── tsconfig.json            # Cấu hình TypeScript
└── package.json             # Danh sách dependencies & scripts
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Getting Started)

### 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: >= 20.x
- **Package manager**: `npm` (hoặc `pnpm` / `yarn`)

### 2. Cài đặt thư viện (Install Dependencies)

Clone repository và cài đặt các dependencies:

```bash
git clone git@github.com:Ez-HealthCare/ez-healthcare-dashboard.git
cd ez-healthcare-dashboard
npm install
```

> **Lưu ý**: Lệnh `npm install` sẽ tự động kích hoạt script `prepare` để cấu hình Husky git hooks.

### 3. Khởi chạy môi trường phát triển (Run Development)

```bash
npm run dev
```

Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## 📜 Danh sách lệnh (Scripts)

| Lệnh                   | Mô tả                                                    |
| :--------------------- | :------------------------------------------------------- |
| `npm run dev`          | Khởi động server phát triển với Turbopack trên port 3000 |
| `npm run build`        | Tạo bản build tối ưu hóa cho môi trường Production       |
| `npm run start`        | Khởi chạy server production sau khi build                |
| `npm run lint`         | Kiểm tra lỗi code bằng ESLint                            |
| `npm run lint:fix`     | Tự động sửa các lỗi cú pháp và style có thể sửa tự động  |
| `npm run format`       | Định dạng toàn bộ mã nguồn bằng Prettier                 |
| `npm run format:check` | Kiểm tra xem code đã tuân thủ định dạng Prettier chưa    |

---

## 🛡️ Tiêu chuẩn chất lượng & Quy trình Git (Git Quality Gates)

Dự án đã thiết lập hệ thống tự động kiểm tra chất lượng code nhằm đảm bảo codebase luôn sạch sẽ và ổn định:

1. **Pre-commit Hook**:
   - Khi chạy `git commit`, Husky sẽ gọi `lint-staged`.
   - Tự động chạy `eslint --fix` và `prettier --write` đối với các file được staged (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`).
2. **Pre-push Hook**:
   - Khi chạy `git push`, Husky sẽ tự động chạy:
     ```bash
     npm run lint && npm run build
     ```
   - Đảm bảo không có lỗi linting hoặc build error nào được đẩy lên remote repository.

---

## 👥 Đóng góp (Contributing)

1. Tạo nhánh mới từ `main` theo quy ước:
   - `feature/ten-tinh-nang` (ví dụ: `feature/auth-page`)
   - `fix/ten-loi` (ví dụ: `fix/navbar-responsive`)
2. Commit code rõ ràng theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `style: ...`
3. Push nhánh và mở Pull Request (PR) lên `main` để được review.
