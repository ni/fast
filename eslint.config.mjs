import { defineConfig, globalIgnores } from "eslint/config";
import fastDnaConfig from "@ni/eslint-config-fast-dna";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([{
    extends: [fastDnaConfig, prettierConfig],
}, globalIgnores([
    "**/*.spec.ts",
    "**/node_modules",
    "**/dist",
    "**/coverage",
    "**/karma.conf.cjs",
])]);
