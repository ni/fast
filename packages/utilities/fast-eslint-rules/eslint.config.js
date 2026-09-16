import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import _import from "eslint-plugin-import";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";

export default defineConfig([js.configs.recommended, ...tseslint.configs.recommended, {
    plugins: {
        import: fixupPluginRules(_import),
    },

    rules: {
        "no-unused-vars": "off",
        "no-extra-boolean-cast": "off",
        "no-empty-function": "off",

        "@typescript-eslint/no-empty-function": ["error", {
            allow: ["asyncMethods", "methods"],
        }],

        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/typedef": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "max-len": ["error", 140],
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                '': 'never', // Fixes "eslint/config" subpath rule
                jsx: 'never',
                tsx: 'never'
            }
        ],
        "import/order": "error",

        "sort-imports": ["error", {
            ignoreCase: true,
            ignoreDeclarationSort: true,
        }],

        "comma-dangle": "off",

        "@typescript-eslint/no-empty-interface": ["error", {
            allowSingleExtends: true,
        }],

        "@typescript-eslint/camelcase": "off",

        "@typescript-eslint/naming-convention": ["error", {
            selector: "default",
            format: ["UPPER_CASE", "camelCase", "PascalCase"],
            leadingUnderscore: "allow",
        }, {
            selector: "property",
            format: null,
        }, {
            selector: "variable",
            format: null,
        }, {
            selector: "interface",
            format: ["PascalCase"],

            custom: {
                regex: "^I[A-Z]",
                match: false,
            },
        }],

        "@typescript-eslint/no-inferrable-types": "off",
        "no-prototype-builtins": "off",
        "no-fallthrough": "off",
        "no-unexpected-multiline": "off",

        "@typescript-eslint/no-unused-vars": ["warn", {
            args: "none",
        }],

        "@typescript-eslint/no-explicit-any": "off",
    },
}, {
    files: ["**/*.js"],

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals["shared-node-browser"],
        },
    },

    rules: {
        "@typescript-eslint/no-var-requires": "off",
    },
}, {
    files: ["**/*.spec.*"],

    rules: {
        "@typescript-eslint/no-unused-expressions": "off",
    },
}]);
