import { defineConfig, globalIgnores } from "eslint/config";
import fastDnaConfig from "@ni/eslint-config-fast-dna";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
    globalIgnores(["**/node_modules", "**/dist", "**/coverage", "**/*.spec.*", "**/karma.conf.cjs"]),
    {
        extends: [fastDnaConfig, prettierConfig],

        rules: {
            "max-classes-per-file": "off",
            "no-case-declarations": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/ban-ts-comment": ["error", {
                "ts-expect-error": false,
            }],

            "@typescript-eslint/no-use-before-define": ["error", {
                typedefs: false,
            }],

            "@typescript-eslint/explicit-function-return-type": ["error", {
                allowExpressions: true,
            }],

            "@typescript-eslint/no-unused-expressions": "warn",
        },
    },
]);
