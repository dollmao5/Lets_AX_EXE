/**
 * 몰입도(ENRICHMENT) 블록 복원 유틸리티 — 클립 단위로 이전 상태로 되돌립니다.
 *
 * 사용법:
 *   node scripts/remove-enrichment.mjs --clips ch02-clip02,ch03-clip01b   # 지정 클립만 복원
 *   node scripts/remove-enrichment.mjs --all-clips                        # 블록 있는 전 클립 복원
 *   node scripts/remove-enrichment.mjs --wrapup                           # Wrap-up 보드(도입 훅 탭) 복원
 *   node scripts/remove-enrichment.mjs --dry-run --all-clips              # 실제 저장 없이 대상만 표시
 *
 * 동작: <!-- [ENRICHMENT ...] --> ~ <!-- [ENRICHMENT END] --> (HTML) 및
 *       /* [ENRICHMENT ...] *​/ ~ /* [ENRICHMENT END] *​/ (CSS/JS) 구간을 제거합니다.
 * 클립은 admin API(임시 포트 4599)로 재저장되어 md/txt/metadata가 함께 재생성됩니다.
 * 주의: 실행 중인 4071 서버는 건드리지 않습니다.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4599;
const BASE = `http://127.0.0.1:${PORT}`;

const HTML_RANGE = /<!-- \[ENRICHMENT[\s\S]*?\[ENRICHMENT END\] -->\r?\n?/g;
const BLOCK_RANGE = /[ \t]*\/\* \[ENRICHMENT[\s\S]*?\[ENRICHMENT END\] \*\/\r?\n?/g;

/* 몰입도 적용 대상 클립 (2026-07-25 기준) */
const ENRICHED_CLIPS = [
  "ch01-clip01", "ch01-clip02", "ch01-clip03", "ch01-clip04",
  "ch02-clip02", "ch02-clip03b", "ch02-clip04",
  "ch03-clip01", "ch03-clip01b", "ch04-clip01",
  "ch05-clip01"
];

function log(m) { process.stdout.write(`[remove-enrichment] ${m}\n`); }

function stripRanges(text) {
  const before = text;
  text = text.replace(HTML_RANGE, "").replace(BLOCK_RANGE, "");
  return { text, changed: text !== before };
}

async function api(pathName, options = {}, token = "") {
  const res = await fetch(`${BASE}${pathName}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("server.js 기동 대기 시간 초과");
}

async function restoreClips(keys, dryRun) {
  const db = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "users.json"), "utf8"));
  const root = db.users.find((u) => u.accountId === "root" && u.isAdmin);
  if (!root) throw new Error("root 관리자 계정 없음");

  const server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR, env: { ...process.env, PORT: String(PORT) }, stdio: "pipe"
  });
  const cleanup = () => { if (!server.killed) server.kill("SIGTERM"); };
  process.on("exit", cleanup);

  try {
    await waitForHealth();
    const login = await api("/api/login", { method: "POST", body: { accountId: "root", password: root.password } });
    const token = login.sessionToken;

    for (const key of keys) {
      const current = await api(`/api/admin/clip-source/${key}`, {}, token);
      const { text, changed } = stripRanges(current.source.contentHtml);
      if (!changed) { log(`건너뜀 (블록 없음): ${key}`); continue; }
      if (dryRun) { log(`[dry-run] 복원 대상: ${key}`); continue; }
      await api(`/api/admin/clip-source/${key}`, { method: "POST", body: { contentHtml: text } }, token);
      log(`복원 완료: ${key} (md/txt/metadata 재생성 포함)`);
    }
  } finally {
    cleanup();
  }
}

function restoreWrapup(dryRun) {
  const p = path.join(ROOT_DIR, "public", "wrapup.html");
  const src = fs.readFileSync(p, "utf8");
  const { text, changed } = stripRanges(src);
  if (!changed) { log("건너뜀: wrapup.html에 ENRICHMENT 블록 없음"); return; }
  if (dryRun) { log("[dry-run] 복원 대상: public/wrapup.html"); return; }
  fs.writeFileSync(p, text);
  log("복원 완료: public/wrapup.html (도입 훅 버튼·오버레이 제거)");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const doWrapup = args.includes("--wrapup");
  const allClips = args.includes("--all-clips");
  const clipsArg = args.find((a) => a.startsWith("--clips"));
  let keys = [];
  if (allClips) keys = ENRICHED_CLIPS;
  else if (clipsArg) {
    const val = clipsArg.includes("=") ? clipsArg.split("=")[1] : args[args.indexOf(clipsArg) + 1];
    keys = (val || "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!keys.length && !doWrapup) {
    log("대상이 없습니다. --clips <키,...> / --all-clips / --wrapup 중 하나를 지정하세요.");
    process.exit(1);
  }
  if (keys.length) await restoreClips(keys, dryRun);
  if (doWrapup) restoreWrapup(dryRun);
  log("완료");
}

main().catch((e) => { console.error(`[remove-enrichment] 오류: ${e.message}`); process.exit(1); });
