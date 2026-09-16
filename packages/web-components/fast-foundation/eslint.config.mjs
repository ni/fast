import { defineConfig, globalIgnores } from "eslint/config";
import fastDnaConfig from "@ni/eslint-config-fast-dna";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([globalIgnores([
    "**/node_modules",
    "**/dist",
    "**/coverage",
    "**/*.spec.*",
    "**/karma.conf.cjs",
    "eslint.config.mjs",
]), {
    extends: [fastDnaConfig, prettierConfig],

    rules: {
        "@typescript-eslint/class-name-casing": "off",

        "@typescript-eslint/naming-convention": ["error", {
            selector: "typeLike",
            format: ["UPPER_CASE", "camelCase", "PascalCase"],
            leadingUnderscore: "allow",
        }],

        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-unsafe-function-type": "off",
        "@typescript-eslint/no-wrapper-object-types": "error",
        "@typescript-eslint/ban-ts-comment": ["error", {
            "ts-expect-error": false,
        }],

        "import/extensions": ["error", "always", {
            template: "never",
            "form-associated": "never",
            options: "never",
            element: "never",
        }],

        "@typescript-eslint/no-unsafe-declaration-merging": "off",
        "@typescript-eslint/no-unused-expressions": "warn",
    },
}]);
