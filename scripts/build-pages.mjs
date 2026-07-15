import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const OUT_DIR = path.join(ROOT_DIR, "dist-pages");
const REQUESTED_PORT = Number(process.env.AX_STATIC_BUILD_PORT || 4173);
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split("/")[1] || "Lets_AX_EXE";
const BASE_PATH = normalizeBasePath(
  readArgValue("--base-path") || process.env.PAGES_BASE_PATH || `/${REPO_NAME}`
);

function log(message) {
  process.stdout.write(`[build:pages] ${message}\n`);
}

function normalizeBasePath(input) {
  const raw = String(input || "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function readArgValue(flagName) {
  const args = process.argv.slice(2);
  const exact = args.find((item) => item.startsWith(`${flagName}=`));
  if (exact) return exact.slice(flagName.length + 1);
  const index = args.indexOf(flagName);
  if (index >= 0) return args[index + 1] || "";
  return "";
}

function ensureOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status})`);
  }
}

function prefixSiteRootPaths(value) {
  const input = String(value || "");
  if (!BASE_PATH) return input;
  return input
    .replace(
      /(^|["'(=\s])\/(assets|course-files|practice-files)\//g,
      (_match, prefix, segment) => `${prefix}${BASE_PATH}/${segment}/`
    )
    .replace(
      /url\((['"]?)\/(assets|course-files|practice-files)\//g,
      (_match, quote, segment) => `url(${quote}${BASE_PATH}/${segment}/`
    );
}

function rewritePayloadForStatic(value) {
  if (Array.isArray(value)) {
    return value.map((item) => rewritePayloadForStatic(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rewritePayloadForStatic(item)])
    );
  }
  if (typeof value === "string") {
    return prefixSiteRootPaths(value);
  }
  return value;
}

function collectRuntimePaths(value, output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRuntimePaths(item, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectRuntimePaths(item, output));
    return output;
  }

  if (typeof value !== "string") {
    return output;
  }

  const text = String(value || "");
  const matches = text.match(/\/(?:course-files|practice-files)\/[^"'`\s<>)]+/g) || [];
  matches.forEach((match) => output.add(match));
  return output;
}

function filenameFromContentDisposition(headerValue) {
  const raw = String(headerValue || "");
  if (!raw) return "";
  const utf8Match = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = raw.match(/filename="([^"]+)"/i) || raw.match(/filename=([^;]+)/i);
  return plainMatch?.[1] ? plainMatch[1].trim() : "";
}

function safeOutPathFromRoute(routePath) {
  const normalized = String(routePath || "").replace(/^\/+/, "");
  const target = path.resolve(OUT_DIR, normalized);
  if (!target.startsWith(OUT_DIR)) {
    throw new Error(`Refusing to write outside output dir: ${routePath}`);
  }
  return target;
}

async function waitForHealth(baseUrl, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for local build server");
}

async function findAvailablePort(startPort) {
  const tryPort = (port) =>
    new Promise((resolve) => {
      const tester = net.createServer();
      tester.unref();
      tester.on("error", () => resolve(false));
      tester.listen(port, "127.0.0.1", () => {
        const address = tester.address();
        const chosen = typeof address === "object" && address ? address.port : port;
        tester.close(() => resolve(chosen));
      });
    });

  const preferred = Number(startPort);
  if (Number.isFinite(preferred) && preferred > 0) {
    const matched = await tryPort(preferred);
    if (matched) return matched;
  }

  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.unref();
    tester.on("error", reject);
    tester.listen(0, "127.0.0.1", () => {
      const address = tester.address();
      const chosen = typeof address === "object" && address ? address.port : 0;
      tester.close(() => resolve(chosen));
    });
  });
}

async function fetchJson(baseUrl, routePath) {
  const response = await fetch(`${baseUrl}${routePath}`);
  ensureOk(response, routePath);
  return response.json();
}

function buildStaticConfig(downloadFilenames) {
  return {
    mode: "static",
    basePath: BASE_PATH,
    courseCode: "AXCAMP",
    courseName: "AXCAMP",
    downloadFilenames
  };
}

async function writeStaticEntryFiles(staticConfig) {
  const sourceHtml = await fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
  const indexHtml = sourceHtml
    .replace('href="/styles.css', 'href="./styles.css')
    .replace(
      '<script src="/app.js',
      '<script src="./static-config.js"></script>\n    <script src="./app.js'
    );

  await fs.writeFile(path.join(OUT_DIR, "index.html"), indexHtml, "utf8");
  await fs.writeFile(path.join(OUT_DIR, "404.html"), indexHtml, "utf8");
  await fs.writeFile(path.join(OUT_DIR, ".nojekyll"), "", "utf8");
  await fs.writeFile(
    path.join(OUT_DIR, "static-config.js"),
    `window.__AX_STATIC_CONFIG__ = ${JSON.stringify(staticConfig, null, 2)};\n`,
    "utf8"
  );
}

async function downloadRuntimeFile(baseUrl, routePath) {
  const response = await fetch(`${baseUrl}${routePath}`);
  ensureOk(response, routePath);
  const targetPath = safeOutPathFromRoute(routePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
  return {
    routePath,
    targetPath,
    fileName:
      filenameFromContentDisposition(response.headers.get("content-disposition")) ||
      path.basename(targetPath)
  };
}

async function main() {
  log(`base path = ${BASE_PATH || "/"}`);
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.cp(PUBLIC_DIR, OUT_DIR, { recursive: true });
  const buildPort = await findAvailablePort(REQUESTED_PORT);
  log(`build port = ${buildPort}`);

  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(buildPort)
    },
    stdio: "pipe"
  });

  serverProcess.stdout.on("data", (chunk) => {
    const text = String(chunk || "").trim();
    if (text) log(text);
  });
  serverProcess.stderr.on("data", (chunk) => {
    const text = String(chunk || "").trim();
    if (text) log(text);
  });

  const cleanup = () => {
    if (!serverProcess.killed) {
      serverProcess.kill("SIGTERM");
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(1);
  });

  const baseUrl = `http://127.0.0.1:${buildPort}`;
  await waitForHealth(baseUrl);

  try {
    const chaptersData = await fetchJson(baseUrl, "/api/chapters");
    const clipKeys = [];
    for (const chapter of chaptersData.chapters || []) {
      for (const clip of chapter.clips || []) {
        if (clip?.clipKey) clipKeys.push(clip.clipKey);
      }
    }

    const clipPayloads = new Map();
    const runtimeFileRoutes = new Set();
    const downloadFilenames = {};

    let snapshotCount = 0;
    for (const clipKey of clipKeys) {
      const clipData = await fetchJson(baseUrl, `/api/clips/${encodeURIComponent(clipKey)}`);
      clipPayloads.set(clipKey, clipData);
      collectRuntimePaths(clipData, runtimeFileRoutes);
      snapshotCount++;
    }
    log(`Successfully snapshotted ${snapshotCount} clips.`);

    let copyCount = 0;
    for (const routePath of runtimeFileRoutes) {
      try {
        const fileInfo = await downloadRuntimeFile(baseUrl, routePath);
        if (routePath.startsWith("/practice-files/")) {
          downloadFilenames[routePath] = fileInfo.fileName;
        }
        copyCount++;
      } catch (error) {
        log(`warning: failed to copy ${routePath} - ${error.message}`);
      }
    }
    log(`Successfully copied ${copyCount} runtime assets.`);

    const staticConfig = buildStaticConfig(downloadFilenames);
    await writeStaticEntryFiles(staticConfig);

    const staticChapters = rewritePayloadForStatic(chaptersData);
    await fs.mkdir(path.join(OUT_DIR, "data", "clips"), { recursive: true });
    await fs.writeFile(
      path.join(OUT_DIR, "data", "chapters.json"),
      JSON.stringify(staticChapters, null, 2),
      "utf8"
    );

    for (const [clipKey, payload] of clipPayloads) {
      const staticPayload = rewritePayloadForStatic(payload);
      await fs.writeFile(
        path.join(OUT_DIR, "data", "clips", `${clipKey}.json`),
        JSON.stringify(staticPayload, null, 2),
        "utf8"
      );
    }

    log(`done -> ${path.relative(ROOT_DIR, OUT_DIR)}`);
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
