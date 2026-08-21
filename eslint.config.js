const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const fastDnaConfig = require("@ni/eslint-config-fast-dna");
const prettierConfig = require("eslint-config-prettier");

module.exports = defineConfig([{
    extends: [fastDnaConfig, prettierConfig],
}, globalIgnores([
    "**/*.spec.ts",
    "**/node_modules",
    "**/dist",
    "**/coverage",
    "**/karma.conf.cjs",
])]);
