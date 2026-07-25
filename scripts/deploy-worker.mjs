/**
 * [Wrapup 외부접속] Cloudflare Worker 배포 스크립트
 *
 * 사용법: node scripts/deploy-worker.mjs
 *
 * wrangler 없이 Cloudflare REST API로 cloudflare/worker.js를 배포한다.
 * 모든 자격증명은 저장소 루트의 gitignore 보호 파일에서 읽는다 (코드/출력에 노출 금지):
 *   - cloudflare*.txt            : Account ID + Workers API 토큰(cfut_...)
 *   - Github_Fine-grained*.txt   : Wrapup_DATA용 GitHub PAT (github_pat_...)
 *   - Google AI Studio*.txt      : Gemini API 키 (AIza... 또는 AQ....)
 *   - AXCAMP_instructor_key*.txt : 강사 비밀코드 (없으면 자동 생성해 파일로 저장)
 *
 * 절차: ① 스크립트 업로드 → ② 시크릿 3종 설정 → ③ workers.dev 서브도메인 활성화
 * 재배포 시에도 안전: keep_bindings로 기존 시크릿 유지 + 매번 최신 값으로 재설정.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_NAME = "axcamp-wrapup";
const WORKER_SOURCE = path.join(ROOT_DIR, "cloudflare", "worker.js");

function log(message) {
  process.stdout.write(`[deploy-worker] ${message}\n`);
}

function findFile(pattern) {
  return fs.readdirSync(ROOT_DIR).find((f) => pattern.test(f)) || "";
}

function readMatch(file, regex, label) {
  if (!file) throw new Error(`${label} 파일을 찾을 수 없습니다.`);
  const raw = fs.readFileSync(path.join(ROOT_DIR, file), "utf8");
  const match = raw.match(regex);
  if (!match) throw new Error(`${label} 값을 ${file} 안에서 찾을 수 없습니다.`);
  return match[0];
}

function loadCredentials() {
  const cfFile = findFile(/^cloudflare.*\.txt$/i);
  if (!cfFile) throw new Error("cloudflare*.txt 파일을 찾을 수 없습니다.");
  const cfRaw = fs.readFileSync(path.join(ROOT_DIR, cfFile), "utf8");
  const accountId = (cfRaw.match(/[0-9a-f]{32}/) || [])[0];
  const cfToken = (cfRaw.match(/cfut_[A-Za-z0-9_-]+/) || [])[0];
  if (!accountId || !cfToken) throw new Error(`Account ID 또는 API 토큰을 ${cfFile}에서 찾을 수 없습니다.`);

  const githubToken = readMatch(
    findFile(/^Github_Fine-grained.*\.txt$/i),
    /github_pat_[A-Za-z0-9_]+/,
    "GitHub PAT"
  );
  const geminiKey = readMatch(
    findFile(/^Google AI Studio.*\.txt$/i),
    /(AIza[0-9A-Za-z_\-]{30,}|AQ\.[0-9A-Za-z_\-.]{20,})/,
    "Gemini API 키"
  );

  // 강사 비밀코드: 파일이 없으면 생성해 저장 (gitignore *_key_*.txt 패턴에 걸리는 이름 사용)
  // 형식: "...: 코드" 한 줄 — 콜론 뒤 값을 코드로 쓴다 (임의 문자열 허용)
  let codeFile = findFile(/^AXCAMP_instructor_key.*\.txt$/i);
  let instructorCode = "";
  if (codeFile) {
    const raw = fs.readFileSync(path.join(ROOT_DIR, codeFile), "utf8");
    instructorCode = (raw.match(/:\s*(\S+)/) || [])[1] || raw.trim().split(/\s+/).pop() || "";
  }
  if (!instructorCode) {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 혼동 문자(I,L,O,0,1) 제외
    instructorCode = "AX-" + Array.from(crypto.randomBytes(6))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    codeFile = codeFile || `AXCAMP_instructor_key_${stamp}.txt`;
    fs.writeFileSync(
      path.join(ROOT_DIR, codeFile),
      `강사 비밀코드 (Wrap-up 보드 강사 로그인용): ${instructorCode}\n`,
      "utf8"
    );
    log(`강사 비밀코드를 새로 생성해 ${codeFile} 파일에 저장했습니다.`);
  }

  // 관리자 비밀코드: 파일이 있으면 사용 (형식 동일 "...: 코드"), 없으면 미설정으로 둔다
  let adminCode = "";
  const adminFile = findFile(/^AXCAMP_admin_key.*\.txt$/i);
  if (adminFile) {
    const raw = fs.readFileSync(path.join(ROOT_DIR, adminFile), "utf8");
    adminCode = (raw.match(/:\s*(\S+)/) || [])[1] || raw.trim().split(/\s+/).pop() || "";
  }
  if (!adminCode) {
    log("주의: 관리자 코드 파일(AXCAMP_admin_key*.txt)이 없어 ADMIN_CODE를 건너뜁니다 — 공개 사이트 관리자 모드와 원격 본문 편집이 전부 비활성 상태가 됩니다.");
  }

  // 공개 레포(Lets_AX_EXE) 편집용 PAT: 전용 파일(Github*exe*.txt)을 우선하고,
  // 없으면 Lets_AX_EXE_*Token* 파일(범용 토큰)을 대체로 사용한다.
  let publicRepoToken = "";
  const pubCandidates = [/^Github.*exe.*\.txt$/i, /^Lets_AX_EXE.*Token.*\.txt$/i];
  const files = fs.readdirSync(ROOT_DIR);
  for (const pattern of pubCandidates) {
    const pubFile = files.find((f) => pattern.test(f));
    if (pubFile) {
      publicRepoToken = (fs.readFileSync(path.join(ROOT_DIR, pubFile), "utf8").match(/github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+/) || [])[0] || "";
      if (publicRepoToken) {
        log(`공개 레포 편집용 PAT: ${pubFile} 사용`);
        break;
      }
    }
  }

  return { accountId, cfToken, githubToken, geminiKey, instructorCode, adminCode, publicRepoToken };
}

async function cfApi(cred, apiPath, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cred.accountId}${apiPath}`, {
    ...options,
    headers: { Authorization: `Bearer ${cred.cfToken}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const errors = JSON.stringify(data?.errors || `HTTP ${response.status}`);
    throw new Error(`${apiPath} 실패: ${errors}`);
  }
  return data.result;
}

async function main() {
  const cred = loadCredentials();
  const source = fs.readFileSync(WORKER_SOURCE, "utf8");
  log(`worker.js ${source.length.toLocaleString()}자 업로드 준비 (계정 ${cred.accountId.slice(0, 6)}...)`);

  // ① 스크립트 업로드 (module worker, 기존 시크릿 유지)
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-01-01",
    keep_bindings: ["secret_text"]
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([source], { type: "application/javascript+module" }), "worker.js");
  await cfApi(cred, `/workers/scripts/${SCRIPT_NAME}`, { method: "PUT", body: form });
  log("① 스크립트 업로드 완료");

  // ② 시크릿 설정 (값은 출력하지 않는다)
  const secrets = [
    ["WRAPUP_GITHUB_TOKEN", cred.githubToken],
    ["GEMINI_API_KEY", cred.geminiKey],
    ["INSTRUCTOR_CODE", cred.instructorCode]
  ];
  if (cred.adminCode) secrets.push(["ADMIN_CODE", cred.adminCode]);
  if (cred.publicRepoToken) secrets.push(["PUBLIC_REPO_TOKEN", cred.publicRepoToken]);
  else log("주의: 공개 레포 편집용 PAT 파일(Github*exe*.txt)이 없어 PUBLIC_REPO_TOKEN을 건너뜁니다 — 원격 본문 편집이 비활성 상태가 됩니다.");
  for (const [name, text] of secrets) {
    await cfApi(cred, `/workers/scripts/${SCRIPT_NAME}/secrets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text, type: "secret_text" })
    });
    log(`② 시크릿 설정: ${name}`);
  }

  // ③ workers.dev 서브도메인 활성화
  await cfApi(cred, `/workers/scripts/${SCRIPT_NAME}/subdomain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true, previews_enabled: false })
  });
  const sub = await cfApi(cred, "/workers/subdomain");
  const url = `https://${SCRIPT_NAME}.${sub.subdomain}.workers.dev`;
  log(`③ 서브도메인 활성화 완료`);
  log(`배포 완료 → ${url}`);
}

main().catch((error) => {
  console.error(`[deploy-worker] 오류: ${error.message}`);
  process.exit(1);
});
