/**
 * A policy for use with the standard trustedTypes platform API.
 * @public
 */
export type TrustedTypesPolicy = {
    /**
     * Creates trusted HTML.
     * @param html - The HTML to clear as trustworthy.
     */
    createHTML(html: string): string;
};

/**
 * Enables working with trusted types.
 * @public
 */
export type TrustedTypes = {
    /**
     * Creates a trusted types policy.
     * @param name - The policy name.
     * @param rules - The policy rules implementation.
     */
    createPolicy(name: string, rules: TrustedTypesPolicy): TrustedTypesPolicy;
};

/**
 * The FAST global.
 * @internal
 */
export interface FASTGlobal {
    /**
     * The list of loaded versions.
     */
    readonly versions: string[];

    /**
     * Gets a kernel value.
     * @param id - The id to get the value for.
     * @param initialize - Creates the initial value for the id if not already existing.
     */
    getById<T>(id: string | number): T | null;
    getById<T>(id: string | number, initialize: () => T): T;
}

/**
 * The platform global type.
 * @public
 */
export type Global = typeof globalThis & {
    /**
     * Enables working with trusted types.
     */
    trustedTypes: TrustedTypes;

    /**
     * The FAST global.
     * @internal
     */
    readonly FAST: FASTGlobal;
};

declare const global: any;

/**
 * A reference to globalThis, with support
 * for browsers that don't yet support the spec.
 * @public
 */
export const $global: Global = (function () {
    if (typeof globalThis !== "undefined") {
        // We're running in a modern environment.
        return globalThis;
    }

    if (typeof global !== "undefined") {
        // We're running in NodeJS
        return global;
    }

    if (typeof self !== "undefined") {
        // We're running in a worker.
        return self;
    }

    if (typeof window !== "undefined") {
        // We're running in the browser's main thread.
        return window;
    }

    try {
        // Hopefully we never get here...
        // Not all environments allow eval and Function. Use only as a last resort:
        // eslint-disable-next-line no-new-func
        return new Function("return this")();
    } catch {
        // If all fails, give up and create an object.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return {};
    }
})();

// API-only Polyfill for trustedTypes
if ($global.trustedTypes === void 0) {
    $global.trustedTypes = { createPolicy: (n: string, r: TrustedTypesPolicy) => r };
}

// API-only shims for server-side rendering (SSR) environments where the DOM is
// unavailable. Custom element classes extend `HTMLElement` and register
// themselves via `customElements` during module evaluation, so these globals
// must exist for modules to load without throwing. The shims are intentionally
// minimal no-ops; real rendering happens on the client after hydration.
if (typeof (($global as any).HTMLElement) === "undefined") {
    ($global as any).HTMLElement = class HTMLElement {};
}

// Minimal stubs for DOM classes referenced via `instanceof`/`extends` during
// module evaluation. These only need to exist as constructors so that
// `instanceof` checks return false and class extension succeeds server-side.
for (const name of ["Node", "Element", "ShadowRoot", "Event", "CustomEvent"]) {
    if (typeof (($global as any)[name]) === "undefined") {
        ($global as any)[name] = class {};
    }
}

// Observer classes are sometimes constructed at module-evaluation time. Provide
// inert stubs server-side; observation only matters on the client. Note we do
// NOT shim `window`/`document` because doing so flips `typeof window`-style SSR
// feature detection in other libraries (React, etc.). Those reads stay guarded.
for (const name of ["MutationObserver", "ResizeObserver", "IntersectionObserver"]) {
    if (typeof (($global as any)[name]) === "undefined") {
        ($global as any)[name] = class {
            public observe(): void {
                /* no-op */
            }

            public unobserve(): void {
                /* no-op */
            }

            public disconnect(): void {
                /* no-op */
            }

            public takeRecords(): unknown[] {
                return [];
            }
        };
    }
}

if (typeof (($global as any).CSSStyleSheet) === "undefined") {
    ($global as any).CSSStyleSheet = class CSSStyleSheet {
        public replace(): Promise<void> {
            return Promise.resolve();
        }
        public replaceSync(): void {
            /* no-op */
        }
    };
}

if (typeof (($global as any).CSS) === "undefined") {
    ($global as any).CSS = {
        supports: () => false,
        escape: (value: string) => String(value),
    };
}

if (typeof (($global as any).customElements) === "undefined") {
    const definitionsByName = new Map<string, Function>();
    const namesByConstructor = new Map<Function, string>();
    ($global as any).customElements = {
        define(name: string, constructor: Function): void {
            if (!definitionsByName.has(name)) {
                definitionsByName.set(name, constructor);
                namesByConstructor.set(constructor, name);
            }
        },
        get(name: string): Function | undefined {
            return definitionsByName.get(name);
        },
        getName(constructor: Function): string | null {
            return namesByConstructor.get(constructor) ?? null;
        },
        whenDefined(): Promise<void> {
            return Promise.resolve();
        },
        upgrade(): void {
            /* no-op */
        },
    };
}

const propConfig = {
    configurable: false,
    enumerable: false,
    writable: false,
};

if ($global.FAST === void 0) {
    Reflect.defineProperty($global, "FAST", {
        value: Object.create(null),
        ...propConfig,
    });
}

/**
 * The FAST global.
 * @internal
 */
export const FAST = $global.FAST;

if (FAST.getById === void 0) {
    const storage = Object.create(null);

    Reflect.defineProperty(FAST, "getById", {
        value<T>(id: string | number, initialize?: () => T): T | null {
            let found = storage[id];

            if (found === void 0) {
                found = initialize ? (storage[id] = initialize()) : null;
            }

            return found;
        },
        ...propConfig,
    });
}

/**
 * Core services shared across FAST instances.
 * @internal
 */
export const enum KernelServiceId {
    updateQueue = 1,
    observable = 2,
    contextEvent = 3,
    elementRegistry = 4,
}

/**
 * A readonly, empty array.
 * @remarks
 * Typically returned by APIs that return arrays when there are
 * no actual items to return.
 * @internal
 */
export const emptyArray = Object.freeze([]);

/**
 * Creates a function capable of locating metadata associated with a type.
 * @returns A metadata locator function.
 * @internal
 */
export function createMetadataLocator<TMetadata>(): (target: {}) => TMetadata[] {
    const metadataLookup = new WeakMap<any, TMetadata[]>();

    return function (target: {}): TMetadata[] {
        let metadata = metadataLookup.get(target);

        if (metadata === void 0) {
            let currentTarget = Reflect.getPrototypeOf(target);

            while (metadata === void 0 && currentTarget !== null) {
                metadata = metadataLookup.get(currentTarget);
                currentTarget = Reflect.getPrototypeOf(currentTarget);
            }

            metadata = metadata === void 0 ? [] : metadata.slice(0);

            metadataLookup.set(target, metadata);
        }

        return metadata;
    };
}
