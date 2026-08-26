function importAll(r: __WebpackModuleApi.RequireContext): void {
    r.keys().forEach(r);
}

// Explicitly add to browser test
importAll(import.meta.webpackContext("../", { recursive: true, regExp: /\.spec\.js$/ }));
