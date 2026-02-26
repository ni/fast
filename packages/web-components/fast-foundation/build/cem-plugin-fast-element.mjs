/**
 * Custom Elements Manifest analyzer plugins for @ni/fast-element patterns.
 *
 * The standard CEM analyzer doesn't know about FAST's @attr decorator, so we
 * teach it here. One plugin is exported:
 *
 *   - attrDecoratorPlugin  – maps @attr-decorated properties to CEM attributes
 *
 * Note: fast-foundation components are base classes registered by consumers
 * (e.g. nimble-components). They do not declare HTMLElementTagNameMap entries,
 * so no tag-name plugin is needed here.
 */

/**
 * Returns the text of the first @attr option with the given key, if present.
 *
 * Handles both forms:
 *   @attr
 *   @attr({ attribute: "my-attr", mode: "boolean" })
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').Decorator} decorator
 * @param {string} optionKey
 * @returns {string | undefined}
 */
function getAttrOption(ts, decorator, optionKey) {
    const expr = decorator.expression;
    if (!ts.isCallExpression(expr)) return undefined;

    const [optionsArg] = expr.arguments;
    if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return undefined;

    const match = optionsArg.properties.find(
        p => ts.isPropertyAssignment(p) && p.name.getText() === optionKey
    );
    if (!match || !ts.isPropertyAssignment(match)) return undefined;

    return ts.isStringLiteral(match.initializer)
        ? match.initializer.text
        : undefined;
}

/**
 * Converts a camelCase property name to the equivalent kebab-case HTML
 * attribute name, mirroring FAST's default attribute name derivation.
 *
 * @param {string} propertyName
 * @returns {string}
 */
export function propertyToAttributeName(propertyName) {
    return propertyName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Creates a CEM Attribute entry from a CEM ClassField, keeping only the
 * properties defined by the CEM Attribute schema.
 *
 * @param {object} field  A CEM ClassField declaration object
 * @returns {object}  A CEM Attribute declaration object
 */
export function fieldToAttribute(field) {
    return Object.fromEntries(
        Object.entries({
            name: field.name,
            fieldName: field.name,
            description: field.description,
            summary: field.summary,
            type: field.type,
            default: field.default,
            deprecated: field.deprecated,
            inheritedFrom: field.inheritedFrom,
        }).filter(([, v]) => v !== undefined)
    );
}

// ---------------------------------------------------------------------------
// Plugin – @attr decorator
// ---------------------------------------------------------------------------

/**
 * Teaches the CEM analyzer about @ni/fast-element's @attr decorator.
 *
 * For each class property decorated with @attr, this plugin:
 *   1. Derives the HTML attribute name (explicit or camelCase → kebab-case).
 *   2. Creates a CEM Attribute entry and adds it to the class declaration.
 *   3. Marks the corresponding field with {reflects: true, attribute: name}.
 *   4. Overrides the field type to boolean for @attr({ mode: "boolean" }).
 *
 * @returns {import('@custom-elements-manifest/analyzer').Plugin}
 */
export function attrDecoratorPlugin() {
    return {
        name: "ni-fast-element-attr",

        analyzePhase({ ts, node, moduleDoc }) {
            if (node.kind !== ts.SyntaxKind.ClassDeclaration) return;

            const className = node.name?.getText();
            if (!className) return;

            const classDoc = moduleDoc.declarations?.find(d => d.name === className);
            if (!classDoc) return;

            for (const member of node.members ?? []) {
                if (!ts.isPropertyDeclaration(member)) continue;

                const attrDecorator = member.modifiers?.find(
                    m => ts.isDecorator(m) && (
                        // Plain @attr
                        (ts.isIdentifier(m.expression) && m.expression.text === "attr") ||
                        // @attr({ ... })
                        (ts.isCallExpression(m.expression) && ts.isIdentifier(m.expression.expression) && m.expression.expression.text === "attr")
                    )
                );
                if (!attrDecorator) continue;

                const propertyName = member.name.getText();
                const explicitName = getAttrOption(ts, attrDecorator, "attribute");
                const attributeName = explicitName ?? propertyToAttributeName(propertyName);
                const isBoolean = getAttrOption(ts, attrDecorator, "mode") === "boolean";

                // Annotate the already-created class field and create a
                // top-level attribute entry on the class
                const field = classDoc.members?.find(m => m.name === propertyName);
                if (field) {
                    field.attribute = attributeName;
                    field.reflects = true;
                    if (isBoolean) {
                        field.type = { text: "boolean" };
                    }

                    const attribute = fieldToAttribute(field);
                    attribute.name = attributeName;
                    if (isBoolean) {
                        attribute.type = { text: "boolean" };
                    }
                    classDoc.attributes = [...(classDoc.attributes ?? []), attribute];
                }
            }
        }
    };
}
