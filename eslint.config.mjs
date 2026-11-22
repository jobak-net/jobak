import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Architecture boundaries — docs/frontend/ARCHITECTURE.md and
 * docs/frontend/DATA_FETCHING.md.
 */
const NO_BACKEND = {
  group: ["@/backend", "@/backend/*"],
  message: "Frontend code reaches the backend over HTTP only (serverFetch / clientFetch). See docs/frontend/DATA_FETCHING.md.",
};
const NO_FRONTEND = {
  group: ["@/frontend", "@/frontend/*"],
  message: "The backend and src/shared must not import frontend code. Put what both sides need in src/shared/.",
};
const MODULE_ENTRY_ONLY = {
  regex: "^@/frontend/modules/[^/]+/(?!server$).+",
  message:
    "Import another module through its public entry: @/frontend/modules/<name> (or /server for loaders and guards). Inside a module, use relative imports.",
};
const NO_MODULES = {
  group: ["@/frontend/modules", "@/frontend/modules/*"],
  message: "frontend/shared must not depend on a feature module.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Pages, layouts and frontend modules.
    files: ["src/app/**/*.{ts,tsx}", "src/frontend/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_BACKEND, MODULE_ENTRY_ONLY] }],
    },
  },
  {
    files: ["src/frontend/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_BACKEND, NO_MODULES] }],
    },
  },
  {
    files: ["src/backend/**/*.ts", "src/app/api/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_FRONTEND] }],
    },
  },
  {
    // src/shared imports nothing from either side (src/shared/README.md).
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_FRONTEND, NO_BACKEND] }],
    },
  },
]);

export default eslintConfig;
