import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 1. Cấm dùng kiểu 'any'
      "@typescript-eslint/no-explicit-any": "error",

      // 2. Kiểm soát biến không dùng (cho phép biến bắt đầu bằng '_')
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // 3. Bắt buộc dùng cú pháp 'import type' cho kiểu dữ liệu
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],

      // 4. Các quy tắc chất lượng code khi dev
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react/self-closing-comp": "error",
    },
  },
  {
    files: ["{app,components,hooks,services,lib}/**/*.{ts,tsx}"],
    ignores: ["lib/api/http.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Use a service backed by lib/api/http.ts." },
      ],
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "axios", message: "Axios belongs only in lib/api/http.ts." }] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='fetch']",
          message: "Use the shared HTTP transport through a service.",
        },
      ],
    },
  },
  {
    files: ["{app,hooks,lib}/**/*.{ts,tsx}"],
    ignores: ["lib/api/http.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "axios", message: "Axios belongs only in lib/api/http.ts." }],
          patterns: [
            {
              group: ["@/lib/api/**", "**/lib/api/**"],
              message: "Use a domain service instead of importing the HTTP transport directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}", "app/page.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "axios", message: "Axios belongs only in lib/api/http.ts." }],
          patterns: [
            {
              group: ["@/services/**", "@/lib/api/**", "**/services/**", "**/lib/api/**"],
              message: "UI consumes hooks, not HTTP/services directly.",
            },
          ],
        },
      ],
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
