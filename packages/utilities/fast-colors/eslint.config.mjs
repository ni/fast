import { defineConfig, globalIgnores } from "eslint/config";
import fastDnaConfig from "@ni/eslint-config-fast-dna";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
    globalIgnores(["**/node_modules", "**/dist", "**/coverage", "**/www", "**/__test__"]),
    {
        extends: [fastDnaConfig, prettierConfig],

        rules: {
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
]);
