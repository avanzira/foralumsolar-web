#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const watchDirs = [
  path.join(root, "assets", "content"),
  path.join(root, "assets", "config"),
];

const pollSeconds = 1_000;
const debounceSeconds = 500;

const listJsonFiles = () => {
  const files = [];
  for (const dir of watchDirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
          files.push(full);
        }
      }
    }
  }
  return files;
};

const snapshotMtimes = () => {
  const map = new Map();
  for (const file of listJsonFiles()) {
    try {
      map.set(file, fs.statSync(file).mtimeMs);
    } catch (err) {
      // ignore transient errors
    }
  }
  return map;
};

const hasChanges = (previous) => {
  const current = snapshotMtimes();
  if (current.size !== previous.size) return [true, current];
  for (const [file, mtime] of current.entries()) {
    if (!previous.has(file) || previous.get(file) !== mtime) {
      return [true, current];
    }
  }
  return [false, current];
};

const runGenerator = () => {
  const script = path.join(root, "scripts", "generate-sitemap.mjs");
  const child = spawn(process.execPath, [script], { stdio: "inherit" });
  child.on("error", () => {});
};

const main = () => {
  console.log("Watching JSON content for sitemap updates...");
  let state = snapshotMtimes();
  setInterval(() => {
    const [changed, next] = hasChanges(state);
    if (changed) {
      state = next;
      setTimeout(() => {
        runGenerator();
        state = snapshotMtimes();
      }, debounceSeconds);
    }
  }, pollSeconds);
};

main();
