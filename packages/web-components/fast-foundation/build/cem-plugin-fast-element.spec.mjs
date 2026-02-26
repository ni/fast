import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { create, ts } from "@custom-elements-manifest/analyzer";
import {
    attrDecoratorPlugin,
    propertyToAttributeName,
    fieldToAttribute,
} from "./cem-plugin-fast-element.mjs";

/**
 * Runs the CEM analyzer on a TypeScript source snippet with the
 * attrDecoratorPlugin and returns the first class declaration found.
 *
 * @param {string} source  TypeScript source code containing a class.
 * @returns {object | undefined}  The CEM class declaration, if found.
 */
function analyzeClass(source) {
    const sourceFile = ts.createSourceFile(
        "src/test.ts",
        source,
        ts.ScriptTarget.ES2015,
        /* setParentNodes */ true
    );
    const manifest = create({
        modules: [sourceFile],
        plugins: [attrDecoratorPlugin()],
    });
    return manifest.modules
        .flatMap(m => m.declarations ?? [])
        .find(d => d.kind === "class");
}

// ---------------------------------------------------------------------------
// propertyToAttributeName
// ---------------------------------------------------------------------------

describe("propertyToAttributeName", () => {
    it("converts camelCase to kebab-case", () => {
        assert.equal(propertyToAttributeName("camelCase"), "camel-case");
    });

    it("converts multi-word camelCase", () => {
        assert.equal(
            propertyToAttributeName("somePropertyName"),
            "some-property-name"
        );
    });

    it("returns lowercase for single-word input", () => {
        assert.equal(propertyToAttributeName("simple"), "simple");
    });

    it("handles uppercase after lowercase", () => {
        assert.equal(propertyToAttributeName("myURL"), "my-url");
    });

    it("returns empty string for empty input", () => {
        assert.equal(propertyToAttributeName(""), "");
    });
});

// ---------------------------------------------------------------------------
// fieldToAttribute
// ---------------------------------------------------------------------------

describe("fieldToAttribute", () => {
    it("creates attribute with CEM Attribute schema properties only", () => {
        const field = {
            kind: "field",
            name: "myProp",
            description: "A property",
            type: { text: "string" },
            default: "\"\"",
            static: false,
            privacy: "public",
            reflects: true,
        };
        const attr = fieldToAttribute(field);

        assert.equal(attr.fieldName, "myProp");
        assert.equal(attr.name, "myProp");
        assert.equal(attr.description, "A property");
        assert.deepEqual(attr.type, { text: "string" });
        assert.equal(attr.default, "\"\"");

        // Field-specific properties must not leak into the attribute
        assert.equal(attr.kind, undefined);
        assert.equal(attr.static, undefined);
        assert.equal(attr.privacy, undefined);
        assert.equal(attr.reflects, undefined);
    });

    it("omits undefined optional properties", () => {
        const attr = fieldToAttribute({ name: "x" });
        assert.deepEqual(Object.keys(attr), ["name", "fieldName"]);
    });
});

// ---------------------------------------------------------------------------
// attrDecoratorPlugin (integration)
// ---------------------------------------------------------------------------

describe("attrDecoratorPlugin", () => {
    it("creates kebab-case attribute for plain @attr", () => {
        const classDoc = analyzeClass(`
            export class TestEl {
                @attr myGreeting: string;
            }
        `);
        assert.ok(classDoc, "class declaration should exist");
        assert.equal(classDoc.attributes?.length, 1);
        assert.equal(classDoc.attributes[0].name, "my-greeting");
        assert.equal(classDoc.attributes[0].fieldName, "myGreeting");
    });

    it("uses explicit attribute name from @attr options", () => {
        const classDoc = analyzeClass(`
            export class TestEl {
                @attr({ attribute: "custom-name" }) myProp: string;
            }
        `);
        assert.ok(classDoc);
        assert.equal(classDoc.attributes?.[0]?.name, "custom-name");
        assert.equal(classDoc.attributes?.[0]?.fieldName, "myProp");
    });

    it("sets boolean type for mode: boolean", () => {
        const classDoc = analyzeClass(`
            export class TestEl {
                @attr({ mode: "boolean" }) active: boolean;
            }
        `);
        assert.ok(classDoc);
        assert.equal(classDoc.attributes?.[0]?.name, "active");
        assert.deepEqual(classDoc.attributes?.[0]?.type, { text: "boolean" });

        const field = classDoc.members?.find(m => m.name === "active");
        assert.ok(field);
        assert.equal(field.reflects, true);
        assert.equal(field.attribute, "active");
        assert.deepEqual(field.type, { text: "boolean" });
    });

    it("handles both explicit name and boolean mode", () => {
        const classDoc = analyzeClass(`
            export class TestEl {
                @attr({ attribute: "is-active", mode: "boolean" }) active: boolean;
            }
        `);
        assert.ok(classDoc);
        assert.equal(classDoc.attributes?.[0]?.name, "is-active");
        assert.deepEqual(classDoc.attributes?.[0]?.type, { text: "boolean" });
    });

    it("does not create attribute for non-decorated properties", () => {
        const classDoc = analyzeClass(`
            export class TestEl {
                myProp: string;
            }
        `);
        assert.ok(classDoc);
        assert.equal(classDoc.attributes?.length ?? 0, 0);
    });
});
