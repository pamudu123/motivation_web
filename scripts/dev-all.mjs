import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore", windowsHide: true,
      });
    } else child.kill("SIGTERM");
  }
  process.exit(code);
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit", windowsHide: true });
  children.add(child);
  child.on("error", (error) => {
    console.error(`Could not start ${command}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    if (!stopping) stop(code ?? 1);
  });
  return child;
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

// Start Next only after FastAPI has completed its startup checks.
start("uv", ["run", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
  fileURLToPath(new URL("../backend/", import.meta.url)));
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch("http://127.0.0.1:8000/openapi.json", {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok && (await response.json()).info?.title === "Daily Spark API") {
      ready = true;
      break;
    }
  } catch { /* The backend may still be starting. */ }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) {
  console.error("Backend did not start. Check the backend logs and backend/.env.");
  stop(1);
}
console.log("Backend ready. Starting frontend. Keep this terminal open; Ctrl+C stops both.");
start(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], root);
