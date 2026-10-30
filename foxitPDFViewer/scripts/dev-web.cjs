"use strict";

const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const mxScripts = path.join(root, "node_modules/@mendix/pluggable-widgets-tools/bin/mx-scripts.js");
const command = process.argv[2] || "start:web";
// Forward slashes and quotes keep NODE_OPTIONS valid on Windows when the
// project path contains spaces or backslashes. Node accepts this form on macOS too.
const preload = path.join(__dirname, "ignore-heavy-watch.cjs").replace(/\\/g, "/");
const preloadFlag = `--require "${preload.replace(/"/g, '\\"')}"`;
const existingNodeOptions = process.env.NODE_OPTIONS || "";
const nodeOptions = existingNodeOptions.includes(preload)
    ? existingNodeOptions
    : `${existingNodeOptions} ${preloadFlag}`.trim();

const child = spawn(process.execPath, [mxScripts, command], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: nodeOptions }
});

function stopChild(signal) {
    if (child.exitCode != null || child.signalCode != null) {
        return;
    }
    try {
        child.kill(signal);
    } catch (error) {
        // The watcher has already exited.
    }
}

process.on("SIGINT", () => stopChild("SIGINT"));
process.on("SIGTERM", () => stopChild("SIGTERM"));

child.on("error", error => {
    console.error(error);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal === "SIGINT") {
        process.exit(130);
        return;
    }
    if (signal === "SIGTERM") {
        process.exit(143);
        return;
    }
    process.exit(code == null ? 1 : code);
});
