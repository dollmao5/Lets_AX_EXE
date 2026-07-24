/**
 * [원격 관리자] 편집 큐 적용 스크립트 — GitHub Actions(apply-edits.yml)에서 실행
 *
 * .edit-queue/*.json (Worker가 커밋한 원격 관리자 편집 요청)을 읽어,
 * 임시 포트로 server.js를 띄우고 실제 관리자 API(clip-source/sidebar-source)를 호출해
 * 적용한다 — md/txt/metadata 재생성과 visible/canonical 매핑이 로컬 편집과 100% 동일.
 * 적용 후 콘텐츠 변경을 커밋하고 큐 파일을 삭제한다 (push는 워크플로 단계에서 수행).
 *
 * 로컬 서버 상태(data/)는 CI에서 항상 비어 있으므로 첫 가입(root)이 자동 관리자가 된다.
 */

import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE_DIR = path.join(ROOT_DIR, ".edit-queue");
const PORT = Number(process.env.APPLY_PORT || 4577);
const BASE = `http://127.0.0.1:${PORT}`;

function log(message) {
  process.stdout.write(`[apply-edits] ${message}\n`);
}

function listQueue() {
  if (!fs.existsSync(QUEUE_DIR)) return [];
  return fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort() // 파일명 앞의 타임스탬프 순서 = 요청 순서
    .map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8")) }));
}

async function waitForHealth(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server.js 기동 대기 시간 초과");
}

async function api(pathName, options = {}, token = "") {
  const response = await fetch(`${BASE}${pathName}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-session-token": token } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

async function main() {
  const queue = listQueue();
  if (!queue.length) {
    log("적용할 편집 큐가 없습니다 — 종료");
    return;
  }
  log(`편집 큐 ${queue.length}건 발견`);

  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe"
  });
  const cleanup = () => {
    if (!serverProcess.killed) serverProcess.kill("SIGTERM");
  };
  process.on("exit", cleanup);

  try {
    await waitForHealth();
    // 서버가 부팅 시 root 계정을 자동 생성한다 (CI의 data/는 비어 있으므로 기본 비밀번호 root)
    let token = "";
    try {
      const login = await api("/api/login", {
        method: "POST",
        body: { accountId: "root", password: "root" }
      });
      token = login.sessionToken;
    } catch {
      const signup = await api("/api/signup", {
        method: "POST",
        body: {
          accountId: "root",
          password: crypto.randomBytes(12).toString("hex"),
          teamName: "CI",
          displayName: "Remote Edit Apply"
        }
      });
      token = signup.sessionToken;
    }
    if (!token) throw new Error("관리자 세션 토큰을 얻지 못했습니다.");

    let applied = 0;
    const failed = [];
    for (const item of queue) {
      const endpoint =
        item.type === "clip-source"
          ? `/api/admin/clip-source/${encodeURIComponent(item.clipKey)}`
          : item.type === "sidebar-source"
            ? `/api/admin/sidebar-source/${encodeURIComponent(item.clipKey)}`
            : null;
      if (!endpoint) {
        log(`건너뜀 (알 수 없는 유형): ${item.file}`);
        failed.push(item.file);
        continue;
      }
      try {
        await api(endpoint, { method: "POST", body: item.payload }, token);
        applied++;
        log(`적용 완료: ${item.type} ${item.clipKey}`);
      } catch (error) {
        // 실패한 요청은 큐에 남기지 않고 로그로만 남긴다 (반복 실패 루프 방지)
        log(`적용 실패: ${item.file} — ${error.message}`);
        failed.push(item.file);
      }
    }

    cleanup();

    // 커밋: 콘텐츠 변경 + 큐 파일 제거 (성공/실패 모두 제거해 재실행 루프를 막는다)
    execFileSync("git", ["config", "user.name", "AXCAMP Remote Edit"], { cwd: ROOT_DIR });
    execFileSync("git", ["config", "user.email", "remote-edit@axcamp.local"], { cwd: ROOT_DIR });
    execFileSync("git", ["add", "content"], { cwd: ROOT_DIR });
    execFileSync("git", ["rm", "-r", "--ignore-unmatch", ".edit-queue"], { cwd: ROOT_DIR });
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT_DIR }).toString().trim();
    if (!status) {
      log("커밋할 변경이 없습니다 — 종료");
      return;
    }
    const summary = failed.length
      ? `content: apply ${applied} remote edit(s), ${failed.length} failed`
      : `content: apply ${applied} remote edit(s)`;
    execFileSync("git", ["commit", "-m", `${summary}\n\nvia .edit-queue (public-site admin editor)`], { cwd: ROOT_DIR });
    log(`커밋 완료: ${summary}`);
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(`[apply-edits] 오류: ${error.message}`);
  process.exit(1);
});
