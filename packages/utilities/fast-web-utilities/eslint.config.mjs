import { defineConfig, globalIgnores } from "eslint/config";
import fastDnaConfig from "@ni/eslint-config-fast-dna";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([globalIgnores([
    "**/node_modules",
    "**/dist",
    "**/coverage",
    "**/*.spec.ts",
    "**/karma.conf.cjs",
]), {
    extends: [fastDnaConfig, prettierConfig],
}]);
