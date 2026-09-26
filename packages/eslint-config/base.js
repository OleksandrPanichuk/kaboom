import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import turboPlugin from "eslint-plugin-turbo";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * Type-aware rules are enabled via `projectService`, so each consuming package
 * must sit next to a tsconfig.json that includes the linted files.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Standalone config files that sit outside the package tsconfig.
          allowDefaultProject: ["*.config.ts", "*.config.js"],
        },
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      turbo: turboPlugin,
      prettier: prettierPlugin,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",

      // Formatting is owned by Prettier, surfaced as an ESLint error so
      // `eslint --fix` and format-on-save both repair it.
      "prettier/prettier": "error",

      // Imports: deterministic order, and drop the ones nobody uses.
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Superseded by the unused-imports variants above.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // Accessibility modifiers are mandatory on class members.
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "explicit",
          overrides: {
            // `public constructor(private readonly x: T)` is noisy; the
            // parameter properties still require their own modifier.
            constructors: "no-public",
          },
        },
      ],
      "@typescript-eslint/parameter-properties": [
        "error",
        { prefer: "parameter-property" },
      ],

      // Consistency.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Async correctness — the payoff for type-aware linting.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      // Fires on `static` helpers passed as callbacks, which are safe when the
      // method never references `this`. Too noisy to be worth the rare catch.
      "@typescript-eslint/unbound-method": "off",
      // `String(err)` behind an `instanceof Error` guard is the correct idiom
      // for an unknown catch value, but the rule cannot see the narrowing.
      "@typescript-eslint/no-base-to-string": "off",

      // Naming.
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        // Readonly class fields may hold constants (SLEEP_DURATION_MS).
        {
          selector: "classProperty",
          modifiers: ["readonly"],
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // PascalCase permitted for React components / factories.
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        {
          selector: "objectLiteralProperty",
          format: null,
        },
        {
          selector: "typeProperty",
          format: null,
        },
        {
          selector: ["objectLiteralMethod", "typeMethod"],
          modifiers: ["requiresQuotes"],
          format: null,
        },
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],
    },
  },

  // CLI entrypoints and scripts legitimately write to stdout.
  {
    files: [
      "**/*.config.{ts,js}",
      "**/scripts/**",
      "**/db/migrate.ts",
      "**/seeders/**",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // Entities pair a schema-derived interface with a static-only class, so the
  // type stays generated from the table while statics live under one name.
  // The class is never instantiated.
  {
    files: ["**/*.entity.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },

  // Config files and scripts run outside the app's tsconfig.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/explicit-member-accessibility": "off",
    },
  },

  // Must stay last: turns off every stylistic rule Prettier already owns.
  eslintConfigPrettier,

  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**", "drizzle/**"],
  },
];
