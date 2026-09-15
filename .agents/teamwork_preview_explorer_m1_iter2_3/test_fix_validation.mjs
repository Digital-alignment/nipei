import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fork } from "node:child_process";

// Let's test getLockKey and retryWithBackoff
function getLockKey(filePath) {
  const resolved = path.normalize(path.resolve(filePath));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

console.log("Testing getLockKey across variations:");
const variations = [
  "Clientes/Nipeihu.md",
  "Clientes/nipeihu.md",
  "nipeihu",
  "Clientes/NIPEHU.MD",
  "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment\\Clientes\\Nipeihu.md",
];
const keys = variations.map(v => getLockKey(path.resolve("C:\\Users\\ondig\\Desktop\\DA\\digitalalignment", v)));
console.log("Unique keys count:", new Set(keys).size);
console.log("Sample key:", keys[0]);
