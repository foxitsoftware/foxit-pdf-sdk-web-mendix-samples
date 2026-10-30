"use strict";

/**
 * macOS without the optional `fsevents` package falls back to one `fs.watch`
 * per file. `rollup-plugin-livereload` watches the project root, including
 * `node_modules` (tens of thousands of files), which exceeds the open-files
 * limit and throws `EMFILE: too many open files, watch`.
 * The same filter runs on Windows. Source files outside node_modules are still watched,
 * so `npm run dev` rebuilds on both platforms. Windows does not hit EMFILE, but it
 * also no longer walks node_modules.
 */
const Module = require("module");

function isHeavyDir(normalized, dirName) {
    return (
        normalized === dirName ||
        normalized.startsWith(`${dirName}/`) ||
        normalized.endsWith(`/${dirName}`) ||
        normalized.includes(`/${dirName}/`)
    );
}

function skipHeavyDirs(watchPath) {
    const normalized = String(watchPath).replace(/\\/g, "/");
    return isHeavyDir(normalized, "node_modules") || isHeavyDir(normalized, ".git");
}

function patchWatch(chokidar) {
    if (!chokidar || typeof chokidar.watch !== "function" || chokidar.watch.__skipHeavyDirs) {
        return;
    }
    const originalWatch = chokidar.watch.bind(chokidar);
    function watch(paths, options = {}) {
        const prev = options.ignored;
        const ignored =
            prev == null ? skipHeavyDirs : Array.isArray(prev) ? prev.concat(skipHeavyDirs) : [prev, skipHeavyDirs];
        return originalWatch(paths, { ...options, ignored });
    }
    watch.__skipHeavyDirs = true;
    chokidar.watch = watch;
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    const exported = originalRequire.apply(this, arguments);
    if (id === "chokidar") {
        patchWatch(exported);
    }
    return exported;
};

try {
    patchWatch(require("chokidar"));
} catch (error) {
    if (error && error.code !== "MODULE_NOT_FOUND") {
        throw error;
    }
}

module.exports = { skipHeavyDirs };
