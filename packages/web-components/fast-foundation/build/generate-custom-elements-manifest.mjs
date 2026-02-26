/**
 * Build script for generating the Custom Elements Manifest (CEM).
 *
 * The manifest (dist/custom-elements.json) describes every public fast-foundation
 * class – its superclass, @attr-decorated attributes, properties, and JSDoc
 * summary – in the machine-readable CEM 1.0 format:
 *   https://github.com/webcomponents/custom-elements-manifest
 *
 * fast-foundation classes are base classes; they are registered under framework-
 * specific tag names by consuming packages (e.g. @ni/nimble-components). Their
 * CEM entries therefore won't have tagName or customElement:true, but they DO
 * carry attribute and property declarations that consumers inherit.
 *
 * When @ni/nimble-components' CEM analyzer runs with the `dependencies` option
 * pointing at this package, it will resolve inherited attributes automatically.
 *
 * Usage:
 *   node build/generate-custom-elements-manifest.mjs
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { create, ts } from "@custom-elements-manifest/analyzer";
import { attrDecoratorPlugin } from "./cem-plugin-fast-element.mjs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const packageDir = path.resolve(import.meta.dirname, "..");
const srcDir = path.resolve(packageDir, "src");
const outDir = path.resolve(packageDir, "dist");
const outFile = path.resolve(outDir, "custom-elements.json");

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * Directory names skipped during source discovery. These directories contain
 * infrastructure code that has no component API surface.
 */
const EXCLUDED_DIRS = new Set([
    "__test__",       // test setup utilities
    "design-token",   // design token infrastructure (not component API)
    "design-system",  // element registration helpers (not component API)
    "di",             // dependency injection container
    "test-utilities", // test helpers
]);

/**
 * File name suffixes that are excluded even inside included directories.
 * Checked via String.prototype.endsWith().
 */
const EXCLUDED_SUFFIXES = [
    ".spec.ts",       // test files co-located with their subjects
    ".template.ts",   // HTML template helpers (internal rendering detail)
];

/**
 * Exact file names excluded regardless of directory.
 */
const EXCLUDED_FILES = new Set([
    "index.ts",           // barrel re-exports
    "index-rollup.ts",    // rollup-specific barrel
    "interfaces.ts",      // pure type declarations, no runtime surface
]);

// ---------------------------------------------------------------------------
// Source file discovery
// ---------------------------------------------------------------------------

/**
 * Recursively collects TypeScript source files under `dir`, applying the
 * exclusion rules above.
 *
 * @param {string} dir  Absolute path to search.
 * @returns {string[]}  Absolute paths to matched .ts files.
 */
function collectSourceFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!EXCLUDED_DIRS.has(entry.name)) {
                results.push(...collectSourceFiles(path.join(dir, entry.name)));
            }
        } else if (
            entry.isFile() &&
            entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".d.ts") &&
            !EXCLUDED_FILES.has(entry.name) &&
            !EXCLUDED_SUFFIXES.some(suffix => entry.name.endsWith(suffix))
        ) {
            results.push(path.join(dir, entry.name));
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const absolutePaths = collectSourceFiles(srcDir);

console.log(`Analyzing ${absolutePaths.length} source files…`);

/**
 * The CEM analyzer uses its own bundled TypeScript instance (exported as `ts`)
 * to avoid version-mismatch issues. Source files are created with
 * setParentNodes=true so that plugins can traverse parent nodes.
 */
const modules = absolutePaths.map(absolute => {
    const relativePath = path.relative(packageDir, absolute).replaceAll("\\", "/");
    const source = fs.readFileSync(absolute, "utf8");
    return ts.createSourceFile(relativePath, source, ts.ScriptTarget.ES2015, /* setParentNodes */ true);
});

const manifest = create({
    modules,
    plugins: [
        attrDecoratorPlugin(),
    ],
});

// ---------------------------------------------------------------------------
// Post-processing: remove empty modules and sort
// ---------------------------------------------------------------------------

manifest.modules = manifest.modules
    .filter(m => (m.declarations?.length ?? 0) > 0 || (m.exports?.length ?? 0) > 0)
    .sort((a, b) => a.path.localeCompare(b.path));

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");

const classCount = manifest.modules
    .flatMap(m => m.declarations ?? [])
    .filter(d => d.kind === "class").length;

const attrCount = manifest.modules
    .flatMap(m => m.declarations ?? [])
    .filter(d => d.kind === "class")
    .reduce((sum, d) => sum + (d.attributes?.length ?? 0), 0);

console.log(`Written: ${path.relative(packageDir, outFile)}`);
console.log(`Classes documented: ${classCount} (${attrCount} attributes total)`);
