/**
 * [Wrapup 외부접속] AXCAMP Round Wrap-up API — Cloudflare Worker
 *
 * GitHub Pages 정적 사이트(https://dollmao5.github.io/Lets_AX_EXE)에서
 * Round 1~3 토론 제출·요약·보드를 쓸 수 있게 하는 무료 서버리스 백엔드.
 *
 * - 저장소: GitHub 프라이빗 레포(Lets_AX_Wrapup_DATA)에 로컬 서버(data/wrapup/)와
 *   동일한 구조로 저장한다: config.json, {차수}/{round}/{팀}조_{이름}.json, summary.json
 *   → 강사 로컬 PC의 기존 pull/push 동기화(server.js handleWrapupSync)와 그대로 호환.
 * - API 경로·응답 형태는 server.js의 wrapup 엔드포인트와 동일하게 유지한다.
 * - Gemini 요약 생성은 Worker에서 직접 호출하지 않는다: Cloudflare 엣지 발신은
 *   Google 무료 등급의 지역 차단("User location is not supported")에 걸린다.
 *   대신 강사 인증된 브라우저가 ai-config로 키를 받아 Gemini를 직접 호출하고,
 *   완성된 요약을 save-summary로 저장한다 (보드 wrapup.html이 이 흐름을 구현).
 *
 * 시크릿(wrangler 또는 scripts/deploy-worker.mjs로 설정, 코드에 절대 넣지 않는다):
 *   WRAPUP_GITHUB_TOKEN  — Lets_AX_Wrapup_DATA contents 읽기/쓰기 Fine-grained PAT
 *   GEMINI_API_KEY       — Google AI Studio 키
 *   INSTRUCTOR_CODE      — 강사·관리자 기능용 비밀코드 (보드에서 입력)
 * 선택 변수: WRAPUP_REPO(기본 dollmao5/Lets_AX_Wrapup_DATA), GEMINI_MODEL(기본 gemini-3.5-flash)
 */

const DEFAULT_REPO = "dollmao5/Lets_AX_Wrapup_DATA";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const WRAPUP_ROUNDS = new Set(["round1", "round2", "round3"]);

/* ---------- 공통 유틸 (server.js와 동일 규칙) ---------- */

function normalizeWs(input) {
  return String(input == null ? "" : input).replace(/\s+/g, " ").trim();
}

function wrapupSafeSegment(input) {
  // 경로 조작 방지: 한글·영문·숫자·-·_·차수 표기만 허용
  return normalizeWs(input).replace(/[^0-9A-Za-z가-힣\-_]/g, "_").slice(0, 40);
}

function kstDateStamp() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}

function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64decodeUtf8(b64) {
  const bin = atob(String(b64 || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ---------- CORS ---------- */

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    origin === "https://dollmao5.github.io" ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-wrapup-instructor, x-session-token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (allowed) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request) }
  });
}

/* ---------- GitHub Contents API ---------- */

function ghRepo(env) {
  return normalizeWs(env.WRAPUP_REPO) || DEFAULT_REPO;
}

function ghPath(parts) {
  return parts
    .filter(Boolean)
    .map((p) => p.split("/").map(encodeURIComponent).join("/"))
    .join("/");
}

async function ghFetch(env, apiPath, options = {}) {
  return fetch(`https://api.github.com/repos/${ghRepo(env)}/${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.WRAPUP_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "axcamp-wrapup-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
}

// 파일 읽기: { json, sha } 또는 null(없음). JSON 파싱 실패도 null.
async function ghReadJson(env, filePath) {
  const res = await ghFetch(env, `contents/${ghPath([filePath])}?ref=main`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub 읽기 실패 (${res.status})`);
  const data = await res.json();
  try {
    return { json: JSON.parse(b64decodeUtf8(data.content)), sha: data.sha };
  } catch {
    return null;
  }
}

// 디렉터리 목록: 항목 배열 또는 [](없음)
async function ghListDir(env, dirPath) {
  const suffix = dirPath ? `contents/${ghPath([dirPath])}?ref=main` : "contents?ref=main";
  const res = await ghFetch(env, suffix);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub 목록 실패 (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// 파일 쓰기(생성/갱신). 동시 커밋 충돌(409/422)은 sha 재조회 후 최대 3회 재시도.
async function ghWriteJson(env, filePath, obj, message, knownSha) {
  const content = b64encodeUtf8(JSON.stringify(obj, null, 2));
  let sha = knownSha;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (sha === undefined) {
      const existing = await ghFetch(env, `contents/${ghPath([filePath])}?ref=main`);
      sha = existing.ok ? (await existing.json()).sha : null;
    }
    const body = { message, content, branch: "main" };
    if (sha) body.sha = sha;
    const res = await ghFetch(env, `contents/${ghPath([filePath])}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    if (res.ok) return res.json();
    if ((res.status === 409 || res.status === 422) && attempt < 3) {
      sha = undefined; // 다른 제출과 커밋이 겹침 — sha 다시 읽고 재시도
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub 저장 실패 (${res.status}) ${detail.slice(0, 120)}`);
  }
}

async function ghDeleteFile(env, filePath, message) {
  const existing = await ghFetch(env, `contents/${ghPath([filePath])}?ref=main`);
  if (existing.status === 404) return false;
  if (!existing.ok) throw new Error(`GitHub 조회 실패 (${existing.status})`);
  const { sha } = await existing.json();
  const res = await ghFetch(env, `contents/${ghPath([filePath])}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: "main" })
  });
  if (!res.ok) throw new Error(`GitHub 삭제 실패 (${res.status})`);
  return true;
}

/* ---------- 차수 설정 ---------- */

async function readConfig(env) {
  const found = await ghReadJson(env, "config.json");
  const fallbackCohort = `${kstDateStamp()}차수`;
  if (!found) {
    return { config: { currentCohort: fallbackCohort, teamCount: 6, sessionCode: "" }, sha: null };
  }
  const c = found.json || {};
  return {
    config: {
      currentCohort: wrapupSafeSegment(c.currentCohort) || fallbackCohort,
      teamCount: Math.min(Math.max(parseInt(c.teamCount, 10) || 6, 1), 20),
      sessionCode: normalizeWs(c.sessionCode || "")
    },
    sha: found.sha
  };
}

/* ---------- 제출 파일명 파싱 (status는 파일명만으로 집계 — 하위요청 절약) ---------- */

function parseSubmissionFilename(name) {
  const m = /^(\d+)조_(.+)\.json$/.exec(name);
  if (!m) return null;
  return { team: parseInt(m[1], 10), name: m[2].replace(/_/g, " ") };
}

/* ---------- 강사·관리자 인증 (관리자 코드도 동일 권한으로 통과) ---------- */

function authRole(request, env) {
  const given = normalizeWs(request.headers.get("x-wrapup-instructor") || "");
  if (!given) return "";
  const adminCode = normalizeWs(env.ADMIN_CODE || "");
  if (adminCode && given === adminCode) return "admin";
  const instructorCode = normalizeWs(env.INSTRUCTOR_CODE || "");
  if (instructorCode && given === instructorCode) return "instructor";
  return "";
}

function isInstructor(request, env) {
  return Boolean(authRole(request, env));
}

function requireInstructor(request, env) {
  if (isInstructor(request, env)) return null;
  return json(request, 403, { ok: false, error: "강사 인증이 필요합니다. 강사 코드로 로그인해 주세요." });
}

/* ---------- Gemini 설정 (호출은 강사 브라우저가 담당 — 파일 상단 설명 참고) ---------- */

function geminiModel(env) {
  return normalizeWs(env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
}

/* ---------- 핸들러 ---------- */

async function handleConfig(request, env) {
  const { config } = await readConfig(env);
  return json(request, 200, {
    ok: true,
    cohort: config.currentCohort,
    teamCount: config.teamCount,
    codeRequired: Boolean(config.sessionCode)
  });
}

async function handleSubmit(request, env) {
  const payload = await request.json().catch(() => ({}));
  const { config } = await readConfig(env);

  const round = normalizeWs(payload.round).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  const team = parseInt(payload.team, 10);
  if (!(team >= 1 && team <= config.teamCount)) {
    return json(request, 400, { ok: false, error: `팀은 1~${config.teamCount}팀 중에서 선택해 주세요.` });
  }
  const name = normalizeWs(payload.name);
  if (name.length < 2 || name.length > 20) {
    return json(request, 400, { ok: false, error: "이름은 2~20자로 입력해 주세요." });
  }
  const markdown = String(payload.markdown || "");
  if (!markdown.trim()) {
    return json(request, 400, { ok: false, error: "제출할 작성 내용이 비어 있습니다. Canvas를 작성한 뒤 제출해 주세요." });
  }
  if (markdown.length > 200000) {
    return json(request, 400, { ok: false, error: "제출 내용이 너무 큽니다." });
  }
  // 차수 코드 게이트: 강사가 코드를 설정한 경우에만 검사
  if (config.sessionCode) {
    const given = normalizeWs(payload.code || "");
    if (given.toLowerCase() !== config.sessionCode.toLowerCase()) {
      return json(request, 401, {
        ok: false,
        codeRequired: true,
        error: "차수 코드가 필요합니다. 강사가 안내한 코드를 입력해 주세요."
      });
    }
  }

  const id = `${team}조_${wrapupSafeSegment(name)}`;
  const filePath = `${config.currentCohort}/${round}/${id}.json`;
  const existing = await ghReadJson(env, filePath);
  const now = new Date().toISOString();
  const record = {
    id,
    team,
    name,
    round,
    cohort: config.currentCohort,
    markdown,
    submittedAt: (existing && existing.json && existing.json.submittedAt) || now,
    updatedAt: now
  };
  await ghWriteJson(env, filePath, record, `wrapup submit ${id} (${round})`, existing ? existing.sha : null);

  /* [팀 대표 파일] 기록 담당이 ☑ 팀 대표(합의본) 체크로 제출하면 팀 단위로도 저장 (서버와 동일 동작) */
  const teamRep = payload.teamRep === true || payload.teamRep === "true";
  if (teamRep) {
    const repPath = `${config.currentCohort}/${round}/teamfile/${team}.json`;
    const repExisting = await ghReadJson(env, repPath);
    const repRecord = { team, round, cohort: config.currentCohort, name, markdown, updatedAt: now };
    await ghWriteJson(env, repPath, repRecord, `wrapup teamfile ${team} (${round})`, repExisting ? repExisting.sha : null);
  }

  return json(request, 200, {
    ok: true,
    id,
    cohort: config.currentCohort,
    team,
    name,
    updatedAt: now,
    teamRep,
    resubmitted: Boolean(existing)
  });
}

async function handleStatus(request, env, url) {
  const { config } = await readConfig(env);
  const round = normalizeWs(url.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const entries = await ghListDir(env, `${config.currentCohort}/${round}`);
  const items = entries
    .filter((e) => e.type === "file")
    .map((e) => parseSubmissionFilename(e.name))
    .filter(Boolean);
  const teams = [];
  for (let t = 1; t <= config.teamCount; t++) {
    const members = items.filter((s) => s.team === t);
    teams.push({ team: t, count: members.length, names: members.map((s) => s.name) });
  }
  /* [팀 대표 파일] 팀 대표(합의본) 제출 여부 — 강사 확인용 */
  let teamReps = [];
  try {
    const repEntries = await ghListDir(env, `${config.currentCohort}/${round}/teamfile`);
    teamReps = repEntries
      .filter((e) => e.type === "file" && e.name.endsWith(".json"))
      .map((e) => parseInt(e.name, 10))
      .filter((n) => n >= 1)
      .sort((a, b) => a - b);
  } catch (e) { teamReps = []; }
  return json(request, 200, {
    ok: true,
    cohort: config.currentCohort,
    round,
    teamCount: config.teamCount,
    total: items.length,
    teams,
    teamReps
  });
}

/* [팀 대표 파일] 팀 합의본 조회 — 교육생이 다음 실습에서 조 번호로 불러와 사용 */
async function handleTeamFile(request, env, url) {
  const { config } = await readConfig(env);
  const round = normalizeWs(url.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const team = parseInt(url.searchParams.get("team"), 10);
  if (!(team >= 1 && team <= config.teamCount)) {
    return json(request, 400, { ok: false, error: `팀은 1~${config.teamCount}팀 중에서 선택해 주세요.` });
  }
  const found = await ghReadJson(env, `${config.currentCohort}/${round}/teamfile/${team}.json`);
  if (!found || !found.json) {
    return json(request, 200, {
      ok: false,
      notFound: true,
      error: "아직 이 팀의 팀 대표(합의본) 제출이 없습니다. 기록 담당이 제출 시 ☑ 팀 대표 체크를 했는지 확인해 주세요."
    });
  }
  return json(request, 200, { ok: true, record: found.json });
}

async function handleCohorts(request, env) {
  const { config } = await readConfig(env);
  const entries = await ghListDir(env, "");
  const cohorts = entries.filter((e) => e.type === "dir").map((e) => e.name).sort();
  return json(request, 200, { ok: true, current: config.currentCohort, cohorts });
}

async function handleSummaryGet(request, env, url) {
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(url.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(url.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const found = await ghReadJson(env, `${cohort}/${round}/summary.json`);
  if (!found) {
    return json(request, 404, { ok: false, error: "아직 생성된 요약이 없습니다. 강사가 '요약 생성'을 실행하면 표시됩니다." });
  }
  return json(request, 200, found.json);
}

async function handleAdminConfig(request, env) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const payload = await request.json().catch(() => ({}));
  const { config, sha } = await readConfig(env);
  const next = {
    currentCohort: payload.cohort !== undefined
      ? (wrapupSafeSegment(payload.cohort) || config.currentCohort)
      : config.currentCohort,
    teamCount: payload.teamCount !== undefined
      ? Math.min(Math.max(parseInt(payload.teamCount, 10) || config.teamCount, 1), 20)
      : config.teamCount,
    sessionCode: payload.sessionCode !== undefined
      ? normalizeWs(payload.sessionCode).slice(0, 40)
      : config.sessionCode
  };
  await ghWriteJson(env, "config.json", next, "wrapup config update", sha);
  return json(request, 200, {
    ok: true,
    cohort: next.currentCohort,
    teamCount: next.teamCount,
    codeRequired: Boolean(next.sessionCode)
  });
}

async function handleAdminList(request, env, url) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(url.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(url.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const entries = await ghListDir(env, `${cohort}/${round}`);
  const submissions = [];
  for (const e of entries) {
    if (e.type !== "file" || !parseSubmissionFilename(e.name)) continue;
    const found = await ghReadJson(env, `${cohort}/${round}/${e.name}`);
    if (found && found.json && found.json.id) submissions.push(found.json);
  }
  submissions.sort((a, b) => (a.team - b.team) || String(a.name).localeCompare(String(b.name), "ko"));
  return json(request, 200, { ok: true, cohort, round, submissions });
}

async function handleAdminDelete(request, env) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const payload = await request.json().catch(() => ({}));
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  const id = wrapupSafeSegment(payload.id || "");
  if (!WRAPUP_ROUNDS.has(round) || !id) {
    return json(request, 400, { ok: false, error: "round와 id가 필요합니다." });
  }
  const deleted = await ghDeleteFile(env, `${cohort}/${round}/${id}.json`, `wrapup delete ${id} (${round})`);
  if (!deleted) {
    return json(request, 404, { ok: false, error: "해당 제출물을 찾을 수 없습니다." });
  }
  return json(request, 200, { ok: true, deleted: id });
}

// 강사 인증된 브라우저에 Gemini 키·모델을 전달한다 (요약 호출은 브라우저가 수행).
// 키는 공개 코드/저장소에 남지 않고, 강사 코드를 아는 사람에게만 HTTPS로 전달된다.
function handleAiConfig(request, env) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const key = normalizeWs(env.GEMINI_API_KEY || "");
  if (!key) {
    return json(request, 400, { ok: false, error: "Gemini API 키가 설정되지 않았습니다. Worker 시크릿을 확인해 주세요." });
  }
  return json(request, 200, { ok: true, key, model: geminiModel(env) });
}

// 브라우저가 완성한 요약(summary.json 전체)을 저장한다.
async function handleSaveSummary(request, env) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const payload = await request.json().catch(() => ({}));
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  const summary = payload.summary;
  if (!summary || typeof summary !== "object" || !Array.isArray(summary.teams)) {
    return json(request, 400, { ok: false, error: "summary 본문(teams 배열 포함)이 필요합니다." });
  }
  const record = {
    ...summary,
    ok: true,
    round,
    cohort,
    generatedAt: new Date().toISOString()
  };
  await ghWriteJson(env, `${cohort}/${round}/summary.json`, record, `wrapup summary save (${round})`);
  return json(request, 200, record);
}

/* ---------- [Wrapup 5단계] 개인별 2차 캔버스 (server.js와 동일한 결정형 병합) ----------
   원칙: AI 호출 없이 개인 제출 원문(우선·전문 보존)과 팀 요약(참고)을 고정 템플릿으로 합친다.
   생성·저장(POST)은 강사 전용이며 서브요청 한도(50/요청) 때문에 팀 단위로 호출한다.
   조회(GET)는 저장본이 없거나 구버전이면 즉석 병합으로 항상 응답한다 (저장하지 않음). */

const WRAPUP_ROUND_SEQ = ["round1", "round2", "round3"];

const WRAPUP_ROUND_LABELS = {
  round1: "Round 1 · AI 시대, 우리 팀의 현실과 리더의 고민 (As-Is 진단)",
  round2: "Round 2 · AI에게 어디까지 맡기고 리더는 어디서 책임질 것인가 (책임경계 재설계)",
  round3: "Round 3 · AI로 팀의 성과와 성장을 어떻게 함께 높일 것인가 (30일 시범 운영 설계)"
};

// 팀 요약 마크다운을 '합의(핵심 논점·발표 포인트)'와 '팀 내 관점 차이'로 분리 (server.js 동일)
function splitWrapupTeamSummary(summaryMd) {
  const text = String(summaryMd || "").trim();
  if (!text) return { consensus: "", diff: "" };
  const marker = text.search(/#{2,4}\s*팀 내 관점 차이[^\n]*/);
  if (marker === -1) return { consensus: text, diff: "" };
  return {
    consensus: text.slice(0, marker).trim(),
    diff: text.slice(marker).replace(/^#{2,4}\s*팀 내 관점 차이[^\n]*\n?/, "").trim()
  };
}

function buildCanvas2Markdown(round, submission, teamEntry, summaryMeta) {
  const label = WRAPUP_ROUND_LABELS[round];
  const { consensus, diff } = splitWrapupTeamSummary(teamEntry && teamEntry.summary);
  const pendingNote = "_(팀 합의 요약이 아직 생성되지 않았습니다 — 강사가 Wrap-up 보드에서 '요약 생성'을 실행하면 반영됩니다.)_";
  return [
    `# ${label} · 2차 캔버스 — ${submission.name} (${submission.team}팀)`,
    "",
    "> **문서 구성 안내** — ① 나의 결론(개인 작성 원문·우선) ② 팀 공통 합의(참고) ③ 팀 내 관점 차이 순서입니다.",
    "> 직군·직무·근속·경험에 따른 개인 작성 내용이 우선이며, 팀 합의는 참고 계층입니다.",
    `> 원본 제출: ${submission.updatedAt || "-"} · 팀 요약 기준: ${(summaryMeta && summaryMeta.generatedAt) || "미생성"}`,
    "",
    "## 🙋 나의 결론 (직무·경험 기반 · 우선)",
    "",
    String(submission.markdown || "").trim(),
    "",
    "## 🤝 팀 공통 합의 (참고)",
    "",
    consensus || pendingNote,
    "",
    "## ⚠️ 팀 내 관점 차이 (내 입장과 대비해 확인)",
    "",
    diff || (consensus ? "_(요약에서 뚜렷한 이견이 정리되지 않았습니다.)_" : pendingNote),
    "",
    "## ▶️ 다음 Round 준비 메모",
    "",
    "- (다음 실습에서 이어서 작성)",
    ""
  ].join("\n");
}

function buildCanvas2Record(cohort, round, submission, summary) {
  const teamEntry =
    (summary && Array.isArray(summary.teams) && summary.teams.find((t) => t.team === submission.team)) || null;
  return {
    id: submission.id,
    team: submission.team,
    name: submission.name,
    round,
    cohort,
    markdown: buildCanvas2Markdown(round, submission, teamEntry, summary),
    method: "template",
    sourceUpdatedAt: submission.updatedAt || null,
    summaryGeneratedAt: (summary && summary.generatedAt) || null,
    generatedAt: new Date().toISOString()
  };
}

// 저장본이 최신이면 그대로, 아니면 즉석 병합 (저장하지 않음). 제출물 없으면 null.
async function getWrapupCanvas2(env, cohort, round, team, name) {
  const id = `${team}조_${wrapupSafeSegment(name)}`;
  const submissionFound = await ghReadJson(env, `${cohort}/${round}/${id}.json`);
  const submission = submissionFound && submissionFound.json;
  if (!submission || !submission.id) return null;
  const summaryFound = await ghReadJson(env, `${cohort}/${round}/summary.json`);
  const summary = summaryFound && summaryFound.json;
  const storedFound = await ghReadJson(env, `${cohort}/${round}/canvas2/${id}.json`);
  const stored = storedFound && storedFound.json;
  const fresh = stored &&
    stored.sourceUpdatedAt === (submission.updatedAt || null) &&
    stored.summaryGeneratedAt === ((summary && summary.generatedAt) || null);
  if (fresh) return { record: stored, stored: true };
  return { record: buildCanvas2Record(cohort, round, submission, summary), stored: false };
}

async function handleCanvas2Get(request, env, url) {
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(url.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(url.searchParams.get("round")).toLowerCase();
  const team = parseInt(url.searchParams.get("team"), 10);
  const name = normalizeWs(url.searchParams.get("name"));
  if (!WRAPUP_ROUNDS.has(round) || !(team >= 1) || name.length < 2) {
    return json(request, 400, { ok: false, error: "round, team, name 파라미터가 필요합니다." });
  }
  const result = await getWrapupCanvas2(env, cohort, round, team, name);
  if (!result) {
    return json(request, 404, { ok: false, error: "해당 라운드의 제출물이 없습니다. 먼저 Team Canvas를 제출해 주세요." });
  }
  return json(request, 200, { ok: true, stored: result.stored, canvas2: result.record });
}

// R1~3 2차 캔버스를 한 사람 기준으로 통합 — CH04 NotebookLM 업로드용 (자동 목차 포함)
async function handleCanvas2Bundle(request, env, url) {
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(url.searchParams.get("cohort")) || config.currentCohort;
  const team = parseInt(url.searchParams.get("team"), 10);
  const name = normalizeWs(url.searchParams.get("name"));
  if (!(team >= 1) || name.length < 2) {
    return json(request, 400, { ok: false, error: "team, name 파라미터가 필요합니다." });
  }
  const parts = [];
  const included = {};
  for (const round of WRAPUP_ROUND_SEQ) {
    const result = await getWrapupCanvas2(env, cohort, round, team, name);
    included[round] = Boolean(result);
    if (result) parts.push(result.record.markdown.trim());
  }
  if (parts.length === 0) {
    return json(request, 404, { ok: false, error: "제출된 라운드가 없습니다. Round 1~3 Team Canvas를 먼저 제출해 주세요." });
  }
  const toc = WRAPUP_ROUND_SEQ.map((round) =>
    included[round] ? `- ${WRAPUP_ROUND_LABELS[round]}` : `- ${WRAPUP_ROUND_LABELS[round]} — (미제출)`
  ).join("\n");
  const markdown = [
    `# Round 1~3 팀 토론 2차 캔버스 통합본 — ${name} (${team}팀)`,
    "",
    "> CH04 NotebookLM 실습의 '필수 3. Round 1~3 Team Canvas' 소스로 업로드하는 개인화 파일입니다.",
    "> 각 라운드는 ① 나의 결론(우선) ② 팀 공통 합의(참고) ③ 팀 내 관점 차이로 구성됩니다.",
    "",
    "## 목차",
    "",
    toc,
    "",
    "---",
    "",
    parts.join("\n\n---\n\n"),
    ""
  ].join("\n");
  const filename = `CH04_R1-3_팀토론2차캔버스_${wrapupSafeSegment(name)}.md`;
  return json(request, 200, { ok: true, cohort, team, name, included, filename, markdown });
}

// 강사 전용: 지정한 팀의 2차 캔버스를 일괄 생성·저장. team 필수(서브요청 한도).
// 보드 UI가 1팀부터 teamCount팀까지 순차 호출한다. 결정형이라 재실행 안전.
async function handleCanvas2Generate(request, env) {
  const deny = requireInstructor(request, env);
  if (deny) return deny;
  const payload = await request.json().catch(() => ({}));
  const { config } = await readConfig(env);
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  const team = parseInt(payload.team, 10);
  if (!WRAPUP_ROUNDS.has(round)) {
    return json(request, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  if (!(team >= 1 && team <= config.teamCount)) {
    return json(request, 400, { ok: false, error: "team 파라미터가 필요합니다 (Worker는 팀 단위로 생성합니다)." });
  }
  const entries = await ghListDir(env, `${cohort}/${round}`);
  const summaryFound = await ghReadJson(env, `${cohort}/${round}/summary.json`);
  const summary = summaryFound && summaryFound.json;
  // 기존 canvas2 파일 sha를 목록 한 번으로 확보 — 개별 sha 조회를 아껴 서브요청 한도를 지킨다
  const storedEntries = await ghListDir(env, `${cohort}/${round}/canvas2`);
  const storedSha = new Map(storedEntries.filter((e) => e.type === "file").map((e) => [e.name, e.sha]));
  const generated = [];
  for (const e of entries) {
    const parsed = e.type === "file" ? parseSubmissionFilename(e.name) : null;
    if (!parsed || parsed.team !== team) continue;
    const found = await ghReadJson(env, `${cohort}/${round}/${e.name}`);
    const submission = found && found.json;
    if (!submission || !submission.id) continue;
    const record = buildCanvas2Record(cohort, round, submission, summary);
    const fileName = `${record.id}.json`;
    await ghWriteJson(
      env,
      `${cohort}/${round}/canvas2/${fileName}`,
      record,
      `wrapup canvas2 ${record.id} (${round})`,
      storedSha.has(fileName) ? storedSha.get(fileName) : null
    );
    generated.push({ id: record.id, team: record.team, name: record.name });
  }
  if (generated.length === 0) {
    return json(request, 404, { ok: false, error: `${team}팀에 제출물이 없습니다.` });
  }
  return json(request, 200, {
    ok: true,
    cohort,
    round,
    team,
    count: generated.length,
    summaryUsed: Boolean(summary),
    generated
  });
}

/* ---------- [원격 관리자] 본문·사이드바 편집 큐 ----------
   관리자 코드 인증 시 편집 내용을 공개 레포(Lets_AX_EXE)의 .edit-queue/에 커밋한다.
   → GitHub Actions(apply-edits.yml)가 server.js 로직 그대로 적용(md/txt/metadata 재생성 포함)
   → 적용 커밋 후 Pages 재배포까지 자동. 시크릿 PUBLIC_REPO_TOKEN 필요 (contents RW). */

const PUBLIC_REPO = "dollmao5/Lets_AX_EXE";

async function publicRepoCommit(env, filePath, obj, message) {
  const token = normalizeWs(env.PUBLIC_REPO_TOKEN || "");
  if (!token) {
    throw new Error("PUBLIC_REPO_TOKEN 시크릿이 없습니다. 공개 레포용 PAT를 발급해 배포 스크립트로 등록해 주세요.");
  }
  const content = b64encodeUtf8(JSON.stringify(obj, null, 2));
  // 새 파일 생성 전제(큐 파일은 타임스탬프로 고유). 만약 같은 밀리초 충돌(409/422)이면
  // 접미사를 붙여 다시 시도한다 — 조용히 덮어쓰지 않고 두 편집을 모두 보존한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const target = attempt === 0 ? filePath : filePath.replace(/\.json$/, `-${attempt}.json`);
    const res = await fetch(`https://api.github.com/repos/${PUBLIC_REPO}/contents/${ghPath([target])}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "axcamp-wrapup-worker",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ message, content, branch: "main" })
    });
    if (res.ok) return res.json();
    if ((res.status === 409 || res.status === 422) && attempt < 2) continue;
    const detail = await res.text().catch(() => "");
    throw new Error(`편집 큐 저장 실패 (${res.status}) ${detail.slice(0, 120)}`);
  }
}

async function handleAdminEditQueue(request, env, url) {
  if (authRole(request, env) !== "admin") {
    return json(request, 403, { ok: false, error: "관리자 코드 인증이 필요합니다." });
  }
  const parts = url.pathname.split("/").filter(Boolean); // api, admin, clip-source|sidebar-source, key
  const type = parts[2];
  const clipKey = normalizeWs(decodeURIComponent(parts[3] || "")).toLowerCase();
  if (!clipKey || !/^[a-z0-9\-_]+$/.test(clipKey)) {
    return json(request, 400, { ok: false, error: "클립 키가 올바르지 않습니다." });
  }
  const payload = await request.json().catch(() => ({}));

  if (type === "clip-source") {
    const contentHtml = String(payload.contentHtml || "");
    if (!contentHtml.trim()) {
      return json(request, 400, { ok: false, error: "contentHtml이 비어 있습니다." });
    }
    if (contentHtml.length > 2000000) {
      return json(request, 400, { ok: false, error: "본문이 너무 큽니다." });
    }
  } else if (type === "sidebar-source") {
    if (!normalizeWs(payload.chapterTitle || "") || !normalizeWs(payload.clipTitle || "")) {
      return json(request, 400, { ok: false, error: "챕터 제목과 클립 제목이 필요합니다." });
    }
  } else {
    return json(request, 404, { ok: false, error: "알 수 없는 편집 유형입니다." });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const queuePath = `.edit-queue/${stamp}-${type}-${clipKey}.json`;
  await publicRepoCommit(
    env,
    queuePath,
    { type, clipKey, payload, requestedAt: new Date().toISOString() },
    `edit-queue: ${type} ${clipKey}`
  );
  return json(request, 200, {
    ok: true,
    queued: true,
    savedAt: new Date().toISOString(),
    clip: { clipKey },
    metadata: {},
    message: "편집이 접수되었습니다. 약 3~4분 후 공개 사이트에 반영됩니다."
  });
}

function handleInstructorVerify(request, env) {
  const role = authRole(request, env);
  if (!role) {
    return json(request, 403, { ok: false, error: "코드가 올바르지 않습니다." });
  }
  return json(request, 200, { ok: true, role });
}

/* ---------- 엔트리 ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      // 핸들러는 반드시 await 한다 — `return handler(...)`로 반환하면 async reject가
      // 이 try/catch를 건너뛰고 Cloudflare 런타임 예외(1101)로 새어 나간다.
      if (request.method === "GET" && (p === "/" || p === "/api/health")) {
        return json(request, 200, { ok: true, service: "axcamp-wrapup", time: new Date().toISOString() });
      }
      if (request.method === "GET" && p === "/api/wrapup/config") return await handleConfig(request, env);
      if (request.method === "POST" && p === "/api/wrapup/submit") return await handleSubmit(request, env);
      if (request.method === "GET" && p === "/api/wrapup/team-file") return await handleTeamFile(request, env, url);
      if (request.method === "GET" && p === "/api/wrapup/status") return await handleStatus(request, env, url);
      if (request.method === "GET" && p === "/api/wrapup/cohorts") return await handleCohorts(request, env);
      if (request.method === "GET" && p === "/api/wrapup/summary") return await handleSummaryGet(request, env, url);
      if (request.method === "GET" && p === "/api/wrapup/canvas2") return await handleCanvas2Get(request, env, url);
      if (request.method === "GET" && p === "/api/wrapup/canvas2-bundle") return await handleCanvas2Bundle(request, env, url);
      if (request.method === "POST" && p === "/api/admin/wrapup/canvas2") return await handleCanvas2Generate(request, env);
      if (request.method === "POST" && p === "/api/wrapup/instructor-verify") return handleInstructorVerify(request, env);
      if (request.method === "POST" && p === "/api/admin/wrapup/config") return await handleAdminConfig(request, env);
      if (request.method === "GET" && p === "/api/admin/wrapup/list") return await handleAdminList(request, env, url);
      if (request.method === "POST" && p === "/api/admin/wrapup/delete") return await handleAdminDelete(request, env);
      if (request.method === "POST" && (p.startsWith("/api/admin/clip-source/") || p.startsWith("/api/admin/sidebar-source/"))) {
        return await handleAdminEditQueue(request, env, url);
      }
      if (request.method === "POST" && p === "/api/admin/wrapup/ai-config") return handleAiConfig(request, env);
      if (request.method === "POST" && p === "/api/admin/wrapup/save-summary") return await handleSaveSummary(request, env);
      return json(request, 404, { ok: false, error: "알 수 없는 경로입니다." });
    } catch (error) {
      return json(request, 500, { ok: false, error: String((error && error.message) || error).slice(0, 300) });
    }
  }
};
