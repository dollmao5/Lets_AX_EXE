const http = require("http");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_FILE = path.join(DATA_DIR, "users.json");

const SOURCE_ROOT_CANDIDATES = [
  path.resolve(ROOT_DIR, "content", "axcamp"),
  path.resolve(ROOT_DIR, "..", "axcamp")
];
const SOURCE_ROOT =
  SOURCE_ROOT_CANDIDATES.find((candidate) =>
    fsSync.existsSync(path.join(candidate, "export-report.json"))
  ) || SOURCE_ROOT_CANDIDATES[0];
const CHAPTERS_DIR = path.join(SOURCE_ROOT, "chapters");
const EXPORT_REPORT_FILE = path.join(SOURCE_ROOT, "export-report.json");
const GENERATED_COURSES_DIR = path.resolve(ROOT_DIR, "content", "generated_courses");
const GENERATED_COURSE_CATALOG_FILE = path.join(GENERATED_COURSES_DIR, "catalog.json");
const DEFAULT_COURSE_CODE = "AXCAMP";
const DEFAULT_COURSE_SLUG = "axcamp";
const VISIBLE_CATALOG_OVERRIDES_FILE = "visible-catalog-overrides.json";
const PRACTICE_ROOT_REL = "[공유용] LG AX Camp For Leaders 실습자료";
const PRACTICE_FILE_MAP = {
  "all-zip": "practice_zips/LG_AX_Camp_For_Leaders_practice_all.zip",
  "ch04-zip": "practice_zips/CH04_NotebookLM_practice.zip",
  "1iKGcE5A6LldmVDV8evPlreUTT2fcfmGL": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/03_EXAONE_가상_기밀보고서.md`,
  "1xJtcpem3mt4aWAKx08SfXjR9QxtIPSsO": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/TB 26-01-03 샤오미 EV 혁신 방정식 - 자동차 산업의 시간과 비용을 재정의하다.pdf`,
  "1h2CfdVLN6Bx4SkUhQW-dL7VZAHfWTnAc": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/06_EXAONE_3단계_프롬프트.md`,
  "19wD3WR1MXFO8rBrsk0ll9XFg6qF5kSsg": `${PRACTICE_ROOT_REL}/CH03-01-Gemini_회의분석/01_가상회의_오디오파일.wav`,
  "1xFco3cSTZApWXSG5iWY04K50GMmFCO9N": `${PRACTICE_ROOT_REL}/CH03-01-Gemini_회의분석/02_회의_맥락_참고자료.md`,
  "1B-zoWWsqVynVUiRqm7lrLcoW68gWQ-86": `${PRACTICE_ROOT_REL}/CH03-01-Gemini_회의분석/07_Gemini_단일흐름_프롬프트.md`,
  "1SQgCgDVWwXBjK93LwaI3m4vRgOuMQop_": `${PRACTICE_ROOT_REL}/CH03-02-Gems_AI어시스턴트/08_Gems_시스템_인스트럭션.md`,
  "1cFef9M4qSs5lBz-v8tJrOiMRIDsdlMkK": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/WEF_Future_of_Jobs_Report_2025.pdf`,
  "1D2co02HGXX1a-WEgVLjIuIyl3gcNH61_": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/gx-global-powers-of-luxury-goods-2023.pdf`,
  "1rUUUqSBenQZAUnM-53nKHajIX9sA_azI": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/global-powers-of-luxury-goods-2026.pdf`,
  "1MzJFg7xjyU5tiaulI-DyKBUYPxkQMZMA": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/09_NotebookLM_프롬프트.md`,
  "1gvjUkRlvncW_qN2t59e_f83tW9rA2Ddr": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/lg-logo-red.png`,
  "1PH3gO05x64ANRdLktbKBl0GoZJ7XZ_9Q": `${PRACTICE_ROOT_REL}/CH06-바이브코딩_리서치앱/10_바이브코딩_리서치앱_프롬프트.md`,
  "19dEPUVL57KQJaTA8HiTqb-V2QErT--fz": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/04_가상_조직정보.md`,
  "1AoN6JCsoGFoFm-531R54u5AVFnyHMRXP": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/05_Antigravity_입력_전략보고서.md`,
  "13ss0C1KvCf8uIe3HUQEpjduTX-715AVw": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/TB 26-01-01 하이센스의 중국 신규 스마트 팩토리 가동, CAC 산업 지각변동의 신호탄이 될 것인가.pdf`,
  "1QXGAklXpqr1movIgVJl-Eq_47fLbONoJ": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/11_Antigravity_3종보고서_프롬프트.md`,
  "1Zo0XTTSV2P1IBXelGk823KZLLhyyM1hH": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/12_Antigravity_HTML_PPT_프롬프트.md`,
  "15H72UwB7f2q11RiBvA9vqavJbA6NA08P": `${PRACTICE_ROOT_REL}/CH07-Antigravity_에이전틱AI/13_Antigravity_스킬_가이드.md`
};

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 4071);
const EXCLUDED_CLIP_KEYS = new Set([
  "ch02-clip01",
  "ch02-clip02",
  "ch02-clip03",
  "ch02-clip04"
]);
const ROOT_ACCOUNT_ID = "root";
const ROOT_DEFAULT_PASSWORD = process.env.AX_ROOT_PASSWORD || "root";

const ACCOUNT_ID_REGEX = /^(?=.{2,32}$)[\p{L}\p{N}][\p{L}\p{N}_.-]*$/u;
const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};
const ADMIN_HISTORY_DIR = path.join(ROOT_DIR, ".admin-history");
const SOURCE_CONTROL_FILES = new Set([
  "content.html",
  "content.md",
  "content.txt",
  "metadata.json",
  "chapter.json"
]);
const ALLOWED_ADMIN_ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".md",
  ".mp3",
  ".wav",
  ".m4a",
  ".mp4"
]);
const MAX_ADMIN_ASSET_BYTES = 32 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 48 * 1024 * 1024;

const catalogPromises = new Map();

function normalizeWs(input) {
  return String(input || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCourseCode(input) {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function defaultCourseContext() {
  return {
    courseCode: DEFAULT_COURSE_CODE,
    slug: DEFAULT_COURSE_SLUG,
    courseName: "AXCAMP",
    sourceRoot: SOURCE_ROOT,
    launchUrl: `/?course=${encodeURIComponent(DEFAULT_COURSE_CODE)}`
  };
}

function toCourseResponse(course) {
  const safe = course || defaultCourseContext();
  return {
    courseCode: safe.courseCode || DEFAULT_COURSE_CODE,
    slug: safe.slug || DEFAULT_COURSE_SLUG,
    courseName: safe.courseName || safe.slug || DEFAULT_COURSE_SLUG,
    launchUrl: safe.launchUrl || `/?course=${encodeURIComponent(safe.courseCode || DEFAULT_COURSE_CODE)}`
  };
}

function decodeHtmlEntities(input) {
  return String(input || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, decimal) =>
      String.fromCodePoint(parseInt(decimal, 10))
    );
}

function extractClipTitleFromHtml(html, fallback = "") {
  const source = String(html || "");
  const match = source.match(
    /<h1[^>]*class=["'][^"']*clip-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i
  );

  if (!match) return normalizeWs(fallback);

  let titleHtml = match[1] || "";
  // Remove glossary tooltip body so the sidebar/title isn't polluted by definitions.
  titleHtml = titleHtml.replace(
    /<span[^>]*class=["'][^"']*glossary-tooltip[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    ""
  );

  const text = normalizeWs(
    decodeHtmlEntities(titleHtml.replace(/<[^>]+>/g, " ").trim())
  );
  return text || normalizeWs(fallback);
}

function extractClipTitleFromText(text, fallback = "") {
  const rawLines = String(text || "")
    .split(/\r?\n/)
    .map((line) => normalizeWs(line))
    .filter(Boolean);

  const skipSet = new Set(["개념", "실습", "참고", "개요", "플랫폼", "심화"]);

  for (const line of rawLines) {
    if (/^~?\d+\s*분$/.test(line)) continue;
    if (/^CH\s*\d+/i.test(line)) continue;
    if (skipSet.has(line)) continue;
    if (line.length < 2) continue;
    return line;
  }

  return normalizeWs(fallback);
}

function sanitizeClipTitleCandidate(input) {
  const title = normalizeWs(String(input || "").replace(/^#+\s*/, ""));
  if (!title) return "";
  if (title.length < 2 || title.length > 80) return "";
  if (/(학습 연결|근거 자료|이전 섹션|다음 섹션|이전 챕터 시작|다음 챕터 시작)/.test(title)) return "";
  if (/(유형:\s*|소요시간:\s*|#ch\d{2}-clip\d{2})/i.test(title)) return "";
  if (/\[본인의/.test(title)) return "";
  return title;
}

function deriveClipTitle(metadata, fallback = "") {
  const explicit = sanitizeClipTitleCandidate(
    metadata?.navTitle || metadata?.clipTitle || fallback
  );
  if (explicit) return explicit;

  const sections = Array.isArray(metadata?.sections) ? metadata.sections : [];
  for (const section of sections) {
    const fromSection = sanitizeClipTitleCandidate(section?.title || "");
    if (fromSection) return fromSection;
  }

  const fromHtml = sanitizeClipTitleCandidate(extractClipTitleFromHtml(metadata?.html || "", ""));
  if (fromHtml) return fromHtml;

  const fromText = sanitizeClipTitleCandidate(extractClipTitleFromText(metadata?.text || "", ""));
  if (fromText) return fromText;

  return normalizeWs(fallback);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, contentType, body) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runGit(args) {
  const result = await execFileAsync("git", args, {
    cwd: ROOT_DIR,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024
  });
  return {
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || "")
  };
}

function parseGitStatusPorcelain(output) {
  const lines = String(output || "").split(/\r?\n/).filter(Boolean);
  const summary = {
    branch: "",
    upstream: "",
    ahead: 0,
    behind: 0,
    tracked: [],
    untracked: []
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const match = line.match(/^##\s+(.+?)(?:\.\.\.(\S+))?(?:\s+\[(.+)\])?$/);
      if (match) {
        summary.branch = normalizeWs(match[1]);
        summary.upstream = normalizeWs(match[2] || "");
        const divergence = normalizeWs(match[3] || "");
        const aheadMatch = divergence.match(/ahead\s+(\d+)/i);
        const behindMatch = divergence.match(/behind\s+(\d+)/i);
        summary.ahead = Number(aheadMatch?.[1] || 0);
        summary.behind = Number(behindMatch?.[1] || 0);
      }
      continue;
    }

    const status = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const pathText = rawPath.includes(" -> ")
      ? rawPath.split(" -> ").pop()
      : rawPath;
    const entry = {
      status,
      path: pathText.replace(/\\/g, "/")
    };

    if (status === "??") {
      summary.untracked.push(entry);
    } else {
      summary.tracked.push(entry);
    }
  }

  return summary;
}

function isPublishableGitPath(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;
  if (
    normalized.startsWith(".admin-history/") ||
    normalized.startsWith("dist-pages/") ||
    normalized.startsWith("node_modules/") ||
    normalized.startsWith("output/")
  ) {
    return false;
  }
  if (/(^|\/)[^/]+ \(\d+\)\.[^/]+$/.test(normalized)) {
    return false;
  }

  if (
    normalized === "server.js" ||
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized === "README.md" ||
    normalized === ".gitignore"
  ) {
    return true;
  }

  return (
    normalized.startsWith("content/") ||
    normalized.startsWith("public/") ||
    normalized.startsWith("scripts/") ||
    normalized.startsWith("docs/") ||
    normalized.startsWith(".github/")
  );
}

function buildPublishableGitChanges(status) {
  const tracked = [];
  const untracked = [];
  const ignored = [];

  for (const entry of status.tracked || []) {
    if (isPublishableGitPath(entry.path)) tracked.push(entry);
    else ignored.push(entry);
  }

  for (const entry of status.untracked || []) {
    if (isPublishableGitPath(entry.path)) untracked.push(entry);
    else ignored.push(entry);
  }

  return {
    tracked,
    untracked,
    ignored,
    trackedCount: tracked.length,
    untrackedCount: untracked.length,
    ignoredCount: ignored.length
  };
}

async function getGitPublishStatus() {
  const [{ stdout: statusStdout }, { stdout: headStdout }, { stdout: headMessageStdout }] =
    await Promise.all([
      runGit(["status", "--short", "--branch"]),
      runGit(["rev-parse", "--short", "HEAD"]),
      runGit(["log", "-1", "--pretty=%s"])
    ]);

  const parsed = parseGitStatusPorcelain(statusStdout);
  return {
    branch: parsed.branch,
    upstream: parsed.upstream,
    ahead: parsed.ahead,
    behind: parsed.behind,
    head: normalizeWs(headStdout),
    headMessage: normalizeWs(headMessageStdout),
    tracked: parsed.tracked,
    untracked: parsed.untracked,
    publishable: buildPublishableGitChanges(parsed)
  };
}

function cleanAccountId(value) {
  return normalizeWs(value);
}

function cleanTeamName(value) {
  return normalizeWs(value);
}

function generateSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function maskPasswordHint(password) {
  const raw = String(password || "");
  if (!raw) return "";
  if (raw.length <= 2) return raw;
  return `${raw.slice(0, 2)}${"*".repeat(raw.length - 2)}`;
}

function makeBuilderId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

function normalizeSectionType(type) {
  const value = normalizeWs(type);
  const allowed = new Set(["개념", "실습", "플랫폼", "설정", "참고", "개요"]);
  return allowed.has(value) ? value : "개념";
}

function normalizeSidebarClipType(type, fallback = "개념") {
  const value = normalizeWs(type);
  const allowed = new Set(["개념", "실습", "플랫폼", "설정", "참고", "개요"]);
  if (allowed.has(value)) return value;
  return normalizeWs(fallback) || "개념";
}

function normalizeBlockKind(kind) {
  const value = normalizeWs(kind).toLowerCase();
  const allowed = new Set([
    "overview",
    "markdown",
    "prompt",
    "checklist",
    "resource",
    "quiz",
    "note",
    "table"
  ]);
  return allowed.has(value) ? value : "markdown";
}

function defaultBlockTitle(kind) {
  switch (normalizeBlockKind(kind)) {
    case "overview":
      return "섹션 개요";
    case "prompt":
      return "프롬프트";
    case "checklist":
      return "실습 체크리스트";
    case "resource":
      return "참고 자료";
    case "quiz":
      return "퀴즈";
    case "note":
      return "강의 노트";
    case "table":
      return "표";
    default:
      return "콘텐츠";
  }
}

function createDefaultBlock(sectionType) {
  const map = {
    개념: { kind: "overview", content: "이 섹션에서 다룰 핵심 개념을 3줄로 정리하세요." },
    실습: {
      kind: "checklist",
      content: "- 준비물\n- 실습 단계 1\n- 실습 단계 2\n- 결과 확인"
    },
    플랫폼: {
      kind: "resource",
      content: "- 공식 링크: \n- 계정 생성 방법: \n- 핵심 기능:"
    },
    설정: {
      kind: "markdown",
      content: "## 환경 설정\n1. 설치\n2. 로그인\n3. 검증"
    },
    참고: {
      kind: "resource",
      content: "- 문서 링크\n- 영상 링크\n- 샘플 파일"
    },
    개요: {
      kind: "overview",
      content: "학습 목표와 전체 흐름을 간단히 정리하세요."
    }
  };
  const picked = map[normalizeSectionType(sectionType)] || map["개념"];
  return {
    blockId: makeBuilderId("block"),
    kind: picked.kind,
    title: defaultBlockTitle(picked.kind),
    content: picked.content
  };
}

function sanitizeBuilderBlock(block, index = 1) {
  const kind = normalizeBlockKind(block?.kind || "markdown");
  return {
    blockId: normalizeWs(block?.blockId) || makeBuilderId("block"),
    kind,
    title: normalizeWs(block?.title || defaultBlockTitle(kind)) || `블록 ${index}`,
    content: String(block?.content || "").slice(0, 20000)
  };
}

function sanitizeBuilderSection(section, index = 1) {
  const sectionType = normalizeSectionType(section?.type);
  const rawBlocks = Array.isArray(section?.blocks) ? section.blocks : [];
  const blocks = rawBlocks
    .map((item, itemIndex) => sanitizeBuilderBlock(item, itemIndex + 1))
    .slice(0, 80);

  if (!blocks.length) {
    blocks.push(createDefaultBlock(sectionType));
  }

  const rawTags = Array.isArray(section?.tags) ? section.tags : [];
  const tags = rawTags.map((tag) => normalizeWs(tag)).filter(Boolean).slice(0, 20);

  return {
    sectionId: normalizeWs(section?.sectionId) || makeBuilderId("section"),
    title: normalizeWs(section?.title) || `섹션 ${index}`,
    shortTitle: normalizeWs(section?.shortTitle || ""),
    type: sectionType,
    duration: normalizeWs(section?.duration || "~10분"),
    objective: normalizeWs(section?.objective || ""),
    overview: normalizeWs(section?.overview || ""),
    tags,
    blocks
  };
}

function sanitizeBuilderChapter(chapter, index = 1) {
  const chapterIdDefault = `ch${String(index).padStart(2, "0")}`;
  const chapterCodeDefault = `CH${String(index).padStart(2, "0")}`;
  const rawSections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const sections = rawSections
    .map((item, itemIndex) => sanitizeBuilderSection(item, itemIndex + 1))
    .slice(0, 120);

  if (!sections.length) {
    sections.push(sanitizeBuilderSection({}, 1));
  }

  return {
    chapterId: normalizeWs(chapter?.chapterId || chapterIdDefault).toLowerCase(),
    code: normalizeWs(chapter?.code || chapterCodeDefault).toUpperCase(),
    title: normalizeWs(chapter?.title || `챕터 ${index}`),
    time: normalizeWs(chapter?.time || ""),
    summary: normalizeWs(chapter?.summary || ""),
    sections
  };
}

function sanitizeBuilderProject(project, index = 1, nowIso = new Date().toISOString()) {
  const rawChapters = Array.isArray(project?.chapters) ? project.chapters : [];
  const chapters = rawChapters
    .map((item, chapterIndex) => sanitizeBuilderChapter(item, chapterIndex + 1))
    .slice(0, 120);

  if (!chapters.length) {
    chapters.push(sanitizeBuilderChapter({}, 1));
  }

  return {
    projectId: normalizeWs(project?.projectId) || makeBuilderId("project"),
    name: normalizeWs(project?.name || `새 교육 과정 ${index}`),
    subtitle: normalizeWs(project?.subtitle || ""),
    audience: normalizeWs(project?.audience || ""),
    template: normalizeWs(project?.template || "blank"),
    theme: normalizeWs(project?.theme || "ax-literacy"),
    createdAt: project?.createdAt || nowIso,
    updatedAt: nowIso,
    chapters
  };
}

function ensureBuilderShape(builder, nowIso = new Date().toISOString()) {
  const source = builder && typeof builder === "object" ? builder : {};
  const rawProjects = Array.isArray(source.projects) ? source.projects : [];
  const projects = rawProjects
    .map((project, projectIndex) =>
      sanitizeBuilderProject(project, projectIndex + 1, nowIso)
    )
    .slice(0, 20);
  const requestedActiveId = normalizeWs(source.activeProjectId || "");
  const activeProjectId =
    (requestedActiveId &&
      projects.some((project) => project.projectId === requestedActiveId) &&
      requestedActiveId) ||
    projects[0]?.projectId ||
    "";

  return {
    activeProjectId,
    projects
  };
}

function createProjectFromTemplate(template, customName = "") {
  const normalizedTemplate = normalizeWs(template || "ax-camp").toLowerCase();
  const nowIso = new Date().toISOString();

  const templateMap = {
    blank: [
      { code: "CH00", title: "오리엔테이션", time: "", sectionTitle: "과정 소개", type: "개요" }
    ],
    workshop: [
      { code: "CH01", title: "핵심 개념", time: "10:00", sectionTitle: "핵심 정의", type: "개념" },
      { code: "CH02", title: "플랫폼 실습", time: "10:40", sectionTitle: "플랫폼 핸즈온", type: "플랫폼" },
      { code: "CH03", title: "업무 실습", time: "11:20", sectionTitle: "실습 과제", type: "실습" },
      { code: "CH04", title: "적용 계획", time: "12:00", sectionTitle: "실행 액션", type: "참고" }
    ],
    "ax-camp": [
      { code: "CH00", title: "오늘의 여정", time: "10:00", sectionTitle: "시간표", type: "개요" },
      { code: "CH01", title: "AI 핵심 개념", time: "10:25", sectionTitle: "핵심 개념", type: "개념" },
      { code: "CH02", title: "플랫폼 A", time: "10:35", sectionTitle: "플랫폼 체험", type: "플랫폼" },
      { code: "CH03", title: "플랫폼 B", time: "11:00", sectionTitle: "비즈니스 실습", type: "실습" },
      { code: "CH04", title: "심화 리서치", time: "13:00", sectionTitle: "리서치 워크플로", type: "실습" },
      { code: "CH05", title: "환경 설정", time: "13:45", sectionTitle: "도구 설정", type: "설정" },
      { code: "CH06", title: "바이브 코딩", time: "13:55", sectionTitle: "앱 제작", type: "실습" },
      { code: "CH07", title: "에이전틱 AI", time: "16:00", sectionTitle: "에이전트 설계", type: "개념" },
      { code: "CH08", title: "참고자료 라이브러리", time: "", sectionTitle: "자료 모음", type: "참고" },
      { code: "CH09", title: "Key Takeaways", time: "17:00", sectionTitle: "Q&A", type: "개요" }
    ]
  };

  const blueprint =
    templateMap[normalizedTemplate] ||
    templateMap["ax-camp"];

  const chapters = blueprint.map((item, index) => {
    const chapterNumberMatch = String(item.code || "").match(/(\d{1,2})/);
    const chapterNumber = chapterNumberMatch
      ? Number(chapterNumberMatch[1])
      : index;
    return sanitizeBuilderChapter(
      {
        chapterId: `ch${String(chapterNumber).padStart(2, "0")}`,
        code: item.code,
        title: item.title,
        time: item.time || "",
        summary: "",
        sections: [
          {
            sectionId: makeBuilderId("section"),
            title: item.sectionTitle,
            shortTitle: "",
            type: item.type,
            duration: "~10분",
            objective: "",
            overview: "",
            tags: [],
            blocks: [createDefaultBlock(item.type)]
          }
        ]
      },
      index + 1
    );
  });

  return sanitizeBuilderProject(
    {
      projectId: makeBuilderId("project"),
      name:
        normalizeWs(customName) ||
        (normalizedTemplate === "workshop"
          ? "워크숍형 교육 과정"
          : normalizedTemplate === "blank"
          ? "빈 템플릿 과정"
          : "AX Literacy 신규 과정"),
      subtitle: "",
      audience: "",
      template: normalizedTemplate,
      theme: "ax-literacy",
      createdAt: nowIso,
      updatedAt: nowIso,
      chapters
    },
    1,
    nowIso
  );
}

function buildBuilderExport(project) {
  const chapterEntries = [];
  const fileBlueprint = [];

  project.chapters.forEach((chapter, chapterIndex) => {
    const chapterMatch = String(chapter.code || "").match(/(\d{1,2})/);
    const chapterNum = chapterMatch
      ? Number(chapterMatch[1])
      : chapterIndex;
    const chapterId = `ch${String(chapterNum).padStart(2, "0")}`;
    const chapterNumLabel = `CH ${String(chapterNum).padStart(2, "0")}`;
    const chapterFolder = `CH${String(chapterNum).padStart(2, "0")}`;

    const clips = chapter.sections.map((section, sectionIndex) => {
      const clipIndex = String(sectionIndex + 1).padStart(2, "0");
      const clipKey = `${chapterId}-clip${clipIndex}`;
      const clipFolder = `chapters/${chapterFolder}/${clipKey}`;
      const route = `#${clipKey}`;

      const markdownLines = [
        `---`,
        `route: "${route}"`,
        `chapter: "${chapterId}"`,
        `title: "${section.title}"`,
        `---`,
        ``,
        `# ${section.title}`,
        ``,
        section.overview || "섹션 개요를 입력하세요.",
        ``
      ];

      section.blocks.forEach((block) => {
        markdownLines.push(`## ${block.title}`);
        markdownLines.push("");
        markdownLines.push(String(block.content || "").trim() || "(내용 입력)");
        markdownLines.push("");
      });

      const metadata = {
        route,
        clipTitle: section.title,
        overview: section.overview || "",
        badges: [section.duration || "", chapterNumLabel, section.type].filter(Boolean),
        sections: section.blocks.map((block, blockIdx) => ({
          index: blockIdx + 1,
          title: block.title,
          text: String(block.content || ""),
          html: ""
        })),
        prompts: section.blocks
          .filter((block) => block.kind === "prompt")
          .map((block, promptIndex) => ({
            index: promptIndex + 1,
            label: block.title,
            content: String(block.content || "")
          })),
        links: []
      };

      fileBlueprint.push(
        {
          path: `${clipFolder}/metadata.json`,
          content: JSON.stringify(metadata, null, 2)
        },
        {
          path: `${clipFolder}/content.md`,
          content: markdownLines.join("\n")
        },
        {
          path: `${clipFolder}/content.html`,
          content: `<div class="clip-header"><h1 class="clip-title">${escapeHtml(
            section.title
          )}</h1></div><div class="clip-overview">${escapeHtml(
            section.overview || ""
          )}</div>`
        },
        {
          path: `${clipFolder}/content.txt`,
          content: `${section.title}\n${section.overview || ""}`
        }
      );

      return {
        route,
        title: section.title,
        type: section.type,
        folder: clipFolder
      };
    });

    chapterEntries.push({
      chapterId,
      chapterNum: chapterNumLabel,
      title: chapter.title,
      time: chapter.time || "",
      clips
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    project: {
      projectId: project.projectId,
      name: project.name,
      subtitle: project.subtitle,
      audience: project.audience,
      template: project.template
    },
    exportReport: {
      startedAt: new Date().toISOString(),
      baseUrl: "builder://generated",
      chapters: chapterEntries
    },
    fileBlueprint
  };
}

function ensureUserShape(user, nowIso = new Date().toISOString()) {
  if (!user || typeof user !== "object") return null;

  const accountId = cleanAccountId(user.accountId || user.letsId);
  if (!ACCOUNT_ID_REGEX.test(accountId)) return null;

  user.accountId = accountId;
  user.letsId = cleanAccountId(user.letsId || accountId);
  user.displayName = normalizeWs(user.displayName || accountId);
  user.teamName = cleanTeamName(user.teamName || "미지정");
  user.password = String(user.password || accountId);
  user.createdAt = user.createdAt || nowIso;
  user.lastLoginAt = user.lastLoginAt || user.createdAt;
  user.sessionToken = normalizeWs(user.sessionToken || "");
  user.courseCode = normalizeCourseCode(user.courseCode || DEFAULT_COURSE_CODE);
  user.courseSlug = normalizeWs(user.courseSlug || DEFAULT_COURSE_SLUG).toLowerCase();
  user.isAdmin =
    Boolean(user.isAdmin) ||
    String(accountId).toLowerCase() === ROOT_ACCOUNT_ID.toLowerCase();

  if (!user.progress || !Array.isArray(user.progress.completedClipKeys)) {
    user.progress = { completedClipKeys: [] };
  }
  if (!user.axTasks || typeof user.axTasks !== "object") {
    user.axTasks = {};
  }
  if (user.axTask && !user.axTasks.legacy) {
    user.axTasks.legacy = user.axTask;
  }
  if (!user.notes || typeof user.notes !== "object") {
    user.notes = {};
  }
  user.builder = ensureBuilderShape(user.builder, nowIso);

  return user;
}

function toUserResponse(user) {
  return {
    letsId: user.letsId || user.accountId,
    accountId: user.accountId,
    teamName: user.teamName || "",
    displayName: user.displayName,
    courseCode: user.courseCode || DEFAULT_COURSE_CODE,
    courseSlug: user.courseSlug || DEFAULT_COURSE_SLUG,
    isAdmin: Boolean(user.isAdmin),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (!(await pathExists(DB_FILE))) {
    const initial = { users: [] };
    await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  const text = await fs.readFile(DB_FILE, "utf8");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.users)) {
    parsed.users = [];
  }

  const nowIso = new Date().toISOString();
  parsed.users = parsed.users
    .map((user) => ensureUserShape(user, nowIso))
    .filter(Boolean);

  return parsed;
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

async function ensureRootUser() {
  const db = await readDb();
  const now = new Date().toISOString();
  let rootUser =
    db.users.find(
      (user) => String(user.accountId).toLowerCase() === ROOT_ACCOUNT_ID
    ) || null;

  if (!rootUser) {
    rootUser = ensureUserShape(
      {
        accountId: ROOT_ACCOUNT_ID,
        letsId: ROOT_ACCOUNT_ID,
        password: ROOT_DEFAULT_PASSWORD,
        teamName: "ADMIN",
        displayName: "Root Admin",
        isAdmin: true,
        createdAt: now,
        lastLoginAt: now,
        progress: { completedClipKeys: [] },
        axTasks: {},
        notes: {}
      },
      now
    );
    db.users.push(rootUser);
  } else {
    rootUser.isAdmin = true;
    rootUser.teamName = cleanTeamName(rootUser.teamName || "ADMIN");
    if (!rootUser.password) {
      rootUser.password = ROOT_DEFAULT_PASSWORD;
    }
  }

  await writeDb(db);
}

function clipKeyFromRoute(route) {
  return String(route || "").replace(/^#/, "").trim().toLowerCase();
}

function chapterCodeFromId(chapterId) {
  return String(chapterId || "").toUpperCase();
}

function chapterIndexFromId(chapterId) {
  const match = String(chapterId || "")
    .trim()
    .toLowerCase()
    .match(/^ch(\d{2})$/);
  return match ? Number(match[1]) : null;
}

function formatChapterId(index) {
  return `ch${String(Math.max(0, Number(index) || 0)).padStart(2, "0")}`;
}

function formatChapterNum(index) {
  return `CH ${String(Math.max(0, Number(index) || 0)).padStart(2, "0")}`;
}

function clipSuffixFromKey(clipKey) {
  const match = String(clipKey || "").toLowerCase().match(/-clip\d{2}$/);
  return match ? match[0] : "";
}

function toVisibleClipKey(catalog, clipKey) {
  const normalized = normalizeWs(clipKey).toLowerCase();
  if (!normalized) return "";
  if (catalog?.visibleClipsByKey?.has(normalized)) {
    return normalized;
  }
  return catalog?.visibleClipKeyByCanonicalKey?.get(normalized) || normalized;
}

function toCanonicalClipKey(catalog, clipKey) {
  const normalized = normalizeWs(clipKey).toLowerCase();
  if (!normalized) return "";
  const clip = resolveCatalogClip(catalog, normalized);
  return clip?.canonicalClipKey || normalized;
}

function toVisibleChapterId(catalog, chapterId) {
  const normalized = normalizeWs(chapterId).toLowerCase();
  if (!normalized) return "";
  return catalog?.visibleChapterIdByCanonicalId?.get(normalized) || normalized;
}

function toCanonicalChapterId(catalog, chapterId) {
  const normalized = normalizeWs(chapterId).toLowerCase();
  if (!normalized) return "";
  return catalog?.canonicalChapterIdByVisibleId?.get(normalized) || normalized;
}

function toVisibleCompletedClipKeys(catalog, clipKeys) {
  const output = [];
  const seen = new Set();

  for (const key of Array.isArray(clipKeys) ? clipKeys : []) {
    const visibleKey = toVisibleClipKey(catalog, key);
    if (!visibleKey || seen.has(visibleKey)) continue;
    seen.add(visibleKey);
    output.push(visibleKey);
  }

  return output;
}

function resolveCatalogClip(catalog, clipKey) {
  const normalized = normalizeWs(clipKey).toLowerCase();
  if (!normalized || !catalog) return null;
  return (
    catalog.visibleClipsByKey?.get(normalized) ||
    catalog.canonicalClipsByKey?.get(normalized) ||
    catalog.clipsByKey?.get(normalized) ||
    null
  );
}

async function readJsonFileSafe(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function readFileSafe(filePath, fallback = "") {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeVisibleCatalogOverrides(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  const chapterEntries =
    input.chapters && typeof input.chapters === "object" ? Object.entries(input.chapters) : [];
  const clipEntries =
    input.clips && typeof input.clips === "object" ? Object.entries(input.clips) : [];

  return {
    chapters: Object.fromEntries(
      chapterEntries.map(([chapterId, value]) => [
        normalizeWs(chapterId).toLowerCase(),
        {
          title: normalizeWs(value?.title || ""),
          time: normalizeWs(value?.time || "")
        }
      ])
    ),
    clips: Object.fromEntries(
      clipEntries.map(([clipKey, value]) => [
        normalizeWs(clipKey).toLowerCase(),
        {
          title: normalizeWs(value?.title || ""),
          type: normalizeSidebarClipType(value?.type || "", "개념")
        }
      ])
    )
  };
}

async function readVisibleCatalogOverrides(sourceRoot) {
  const filePath = path.join(sourceRoot, VISIBLE_CATALOG_OVERRIDES_FILE);
  const payload = await readJsonFileSafe(filePath, { chapters: {}, clips: {} });
  return normalizeVisibleCatalogOverrides(payload);
}

function formatByteSize(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function sanitizeAssetFileName(input) {
  const rawBase = path.basename(String(input || "").replace(/\\/g, "/"));
  const normalized = rawBase.normalize("NFKC").trim();
  const clean = normalized
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+/, "")
    .slice(0, 140);
  return clean || "asset";
}

function classifyAssetKind(ext) {
  const normalized = String(ext || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"].includes(normalized)) {
    return "image";
  }
  if (normalized === ".pdf") return "pdf";
  if ([".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".md"].includes(normalized)) {
    return "document";
  }
  if ([".mp3", ".wav", ".m4a"].includes(normalized)) return "audio";
  if ([".mp4"].includes(normalized)) return "video";
  return "file";
}

function buildCourseFileUrl(courseCode, clipKey, relativePath) {
  const safeRelative = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return `/course-files/${encodeURIComponent(normalizeCourseCode(courseCode || DEFAULT_COURSE_CODE))}/${encodeURIComponent(clipKey)}/${safeRelative}`;
}

async function writeAdminHistorySnapshot(scope, filePaths) {
  const entries = [];
  for (const targetPath of Array.isArray(filePaths) ? filePaths : []) {
    if (!targetPath) continue;
    const absolute = path.resolve(targetPath);
    if (!(await pathExists(absolute))) continue;
    entries.push(absolute);
  }

  if (!entries.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const scopeSlug = sanitizeAssetFileName(scope || "edit");
  const snapshotRoot = path.join(ADMIN_HISTORY_DIR, `${stamp}-${scopeSlug}`);

  await fs.mkdir(snapshotRoot, { recursive: true });

  for (const absolute of entries) {
    const relative = path.relative(ROOT_DIR, absolute);
    if (!relative || relative.startsWith("..")) continue;
    const snapshotPath = path.join(snapshotRoot, relative);
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.copyFile(absolute, snapshotPath);
  }
}

async function collectClipAssetEntries(rootPath, clipPath, items = [], relativePrefix = "") {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".history" || entry.name === ".admin-history") continue;
    const absolute = path.join(rootPath, entry.name);
    const relative = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await collectClipAssetEntries(absolute, clipPath, items, relative);
      continue;
    }

    if (SOURCE_CONTROL_FILES.has(entry.name)) continue;

    const stat = await fs.stat(absolute);
    const ext = path.extname(entry.name).toLowerCase();
    items.push({
      name: entry.name,
      relativePath: relative.replace(/\\/g, "/"),
      absolutePath: absolute,
      size: stat.size,
      sizeLabel: formatByteSize(stat.size),
      ext,
      mime: MIME_MAP[ext] || "application/octet-stream",
      kind: classifyAssetKind(ext)
    });
  }
  return items;
}

async function listClipAssets(courseCode, clip) {
  const items = await collectClipAssetEntries(clip.folderAbsolute, clip.folderAbsolute, []);
  return items
    .map((item) => ({
      ...item,
      url: buildCourseFileUrl(courseCode, clip.clipKey, item.relativePath)
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath, "ko"));
}

function extractMediaAssetsFromHtml(html) {
  const source = stripMetadataNoiseHtml(html);
  const images = [];
  const iframes = [];
  const audios = [];
  const videos = [];
  const seenImages = new Set();
  const seenFrames = new Set();
  const seenAudios = new Set();
  const seenVideos = new Set();

  for (const match of source.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    const tag = String(match[0] || "");
    const src = normalizeWs(match[1] || "");
    if (!src || src.startsWith("data:") || seenImages.has(src)) continue;
    seenImages.add(src);
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    images.push({
      src,
      alt: normalizeWs(decodeHtmlEntities(altMatch?.[1] || ""))
    });
  }

  for (const match of source.matchAll(/<(iframe|embed)\b[^>]*(?:src)=["']([^"']+)["'][^>]*>/gi)) {
    const src = normalizeWs(match[2] || "");
    if (!src || seenFrames.has(src)) continue;
    seenFrames.add(src);
    iframes.push({
      tag: String(match[1] || "").toLowerCase(),
      src
    });
  }

  for (const match of source.matchAll(/<object\b[^>]*data=["']([^"']+)["'][^>]*>/gi)) {
    const src = normalizeWs(match[1] || "");
    if (!src || seenFrames.has(src)) continue;
    seenFrames.add(src);
    iframes.push({
      tag: "object",
      src
    });
  }

  const pushMediaFromHtml = (tagName, collection, seen, kind) => {
    const blockRe = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
    for (const match of source.matchAll(blockRe)) {
      const blockHtml = String(match[0] || "");
      const inlineSrc = normalizeWs(extractHtmlAttribute(blockHtml, "src"));
      const nestedSrc =
        normalizeWs(blockHtml.match(/<source\b[^>]*src=["']([^"']+)["']/i)?.[1] || "") ||
        normalizeWs(blockHtml.match(/<track\b[^>]*src=["']([^"']+)["']/i)?.[1] || "");
      const src = inlineSrc || nestedSrc;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      collection.push({
        kind,
        src
      });
    }

    const selfClosingRe = new RegExp(`<${tagName}\\b[^>]*src=["']([^"']+)["'][^>]*\\/?>`, "gi");
    for (const match of source.matchAll(selfClosingRe)) {
      const src = normalizeWs(match[1] || "");
      if (!src || seen.has(src)) continue;
      seen.add(src);
      collection.push({
        kind,
        src
      });
    }
  };

  pushMediaFromHtml("audio", audios, seenAudios, "audio");
  pushMediaFromHtml("video", videos, seenVideos, "video");

  return { images, iframes, audios, videos };
}

function rewriteRelativeUrls(html, courseCode, clipKey) {
  if (!html) return "";
  return html.replace(
    /(src|href)=["'](?!https?:|mailto:|tel:|#|data:|\/\/)([^"']+)["']/gi,
    (_match, attr, rawPath) => {
      const raw = String(rawPath || "").trim();
      // Keep absolute/site-root URLs untouched (e.g. /practice-files/..., /api/...).
      if (
        /^(\/|https?:|mailto:|tel:|#|data:|\/\/|javascript:)/i.test(raw)
      ) {
        return `${attr}="${raw}"`;
      }

      const safePath = String(rawPath || "")
        .replace(/\\/g, "/")
        .replace(/^\.\//, "")
        .replace(/^\/+/, "");
      return `${attr}="/course-files/${encodeURIComponent(normalizeCourseCode(courseCode || DEFAULT_COURSE_CODE))}/${encodeURIComponent(clipKey)}/${safePath}"`;
    }
  );
}

function rewritePracticeDriveUrls(html) {
  const source = String(html || "");
  if (!source) return source;

  const fileLikeRe =
    /href=["']https?:\/\/drive\.google\.com\/(?:file\/d|drive\/folders)\/([A-Za-z0-9_-]+)[^"']*["']/gi;
  const openRe =
    /href=["']https?:\/\/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)[^"']*["']/gi;

  const swap = (_match, id) => {
    const key = normalizeWs(id);
    if (!PRACTICE_FILE_MAP[key]) return _match;
    return `href="/practice-files/${encodeURIComponent(key)}"`;
  };

  return source.replace(fileLikeRe, swap).replace(openRe, swap);
}

function rewriteVisibleReferences(input, catalog) {
  let output = String(input || "");
  if (!output || !catalog) return output;

  output = output.replace(/#(ch\d{2}-clip\d{2})/gi, (_match, rawKey) => {
    const mapped = toVisibleClipKey(catalog, rawKey);
    return mapped ? `#${mapped}` : `#${rawKey}`;
  });

  for (const [canonicalChapterId, visibleChapterId] of catalog.visibleChapterIdByCanonicalId || []) {
    if (!canonicalChapterId || !visibleChapterId || canonicalChapterId === visibleChapterId) {
      continue;
    }

    const canonicalIndex = chapterIndexFromId(canonicalChapterId);
    const visibleIndex = chapterIndexFromId(visibleChapterId);
    if (canonicalIndex == null || visibleIndex == null) continue;

    const canonicalPadded = String(canonicalIndex).padStart(2, "0");
    const visiblePadded = String(visibleIndex).padStart(2, "0");

    output = output.replace(
      new RegExp(`\\bCH\\s+${canonicalPadded}\\b`, "g"),
      `CH ${visiblePadded}`
    );
    output = output.replace(
      new RegExp(`\\bCH${canonicalPadded}\\b`, "g"),
      `CH${visiblePadded}`
    );
  }

  return output;
}

function rewriteCanonicalReferences(input, catalog) {
  let output = String(input || "");
  if (!output || !catalog) return output;

  output = output.replace(/#(ch\d{2}-clip\d{2})/gi, (_match, rawKey) => {
    const mapped = toCanonicalClipKey(catalog, rawKey);
    return mapped ? `#${mapped}` : `#${rawKey}`;
  });

  const chapterMappings = Array.from(catalog.canonicalChapterIdByVisibleId || [])
    .map(([visibleChapterId, canonicalChapterId]) => {
      const visibleIndex = chapterIndexFromId(visibleChapterId);
      const canonicalIndex = chapterIndexFromId(canonicalChapterId);
      return {
        visibleChapterId,
        canonicalChapterId,
        visibleIndex,
        canonicalIndex
      };
    })
    .filter(
      (item) =>
        item.canonicalChapterId &&
        item.visibleChapterId &&
        item.canonicalChapterId !== item.visibleChapterId &&
        item.canonicalIndex != null &&
        item.visibleIndex != null
    )
    .sort((a, b) => b.visibleIndex - a.visibleIndex);

  for (const mapping of chapterMappings) {
    const visiblePadded = String(mapping.visibleIndex).padStart(2, "0");
    const canonicalPadded = String(mapping.canonicalIndex).padStart(2, "0");

    output = output.replace(
      new RegExp(`\\bCH\\s+${visiblePadded}\\b`, "g"),
      `CH ${canonicalPadded}`
    );
    output = output.replace(
      new RegExp(`\\bCH${visiblePadded}\\b`, "g"),
      `CH${canonicalPadded}`
    );
  }

  return output;
}

function rewriteMetadataLinks(links, catalog) {
  if (!Array.isArray(links)) return [];

  return links.map((link) => ({
    ...link,
    href: rewriteVisibleReferences(link.href || "", catalog),
    absolute: rewriteVisibleReferences(link.absolute || "", catalog),
    text: rewriteVisibleReferences(link.text || "", catalog)
  }));
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(input) {
  return String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractHtmlAttribute(tagHtml, attrName) {
  const match = String(tagHtml || "").match(
    new RegExp(`\\b${escapeRegExp(attrName)}=["']([^"']*)["']`, "i")
  );
  return String(match?.[1] || "");
}

function stripMetadataNoiseHtml(html) {
  return String(html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(
      /<span[^>]*class=["'][^"']*glossary-tooltip[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      ""
    )
    .replace(
      /<div[^>]*class=["'][^"']*clip-nav-footer[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      " "
    )
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");
}

function findMatchingTagRange(source, openingMatch) {
  if (!openingMatch || openingMatch.index == null) return null;
  const tagName = String(openingMatch[1] || "").toLowerCase();
  if (!tagName) return null;

  const tagRe = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, "gi");
  tagRe.lastIndex = openingMatch.index;
  let depth = 0;
  let match;

  while ((match = tagRe.exec(source))) {
    const token = match[0] || "";
    const isClosing = /^<\//.test(token);
    const isSelfClosing = /\/>$/.test(token);

    if (!isClosing) depth += 1;
    if (!isClosing && isSelfClosing) depth -= 1;
    if (isClosing) depth -= 1;

    if (depth === 0) {
      return {
        start: openingMatch.index,
        end: tagRe.lastIndex,
        outerHtml: source.slice(openingMatch.index, tagRe.lastIndex),
        innerHtml: source.slice(openingMatch.index + openingMatch[0].length, match.index),
        tagName
      };
    }
  }

  return null;
}

function extractElementsByClass(html, className) {
  const source = String(html || "");
  const targetClass = normalizeWs(className);
  if (!source || !targetClass) return [];

  const openTagRe = /<([a-z0-9:-]+)\b[^>]*>/gi;
  const matches = [];
  let match;

  while ((match = openTagRe.exec(source))) {
    const classAttr = String(match[0] || "").match(/\bclass=["']([^"']+)["']/i);
    const classTokens = String(classAttr?.[1] || "")
      .split(/\s+/)
      .map((token) => normalizeWs(token))
      .filter(Boolean);
    if (!classTokens.includes(targetClass)) continue;

    const range = findMatchingTagRange(source, match);
    if (!range) continue;
    matches.push(range);
  }

  return matches;
}

function htmlSnippetToInlineText(html) {
  const source = stripMetadataNoiseHtml(html);
  if (!source) return "";

  return normalizeWs(
    decodeHtmlEntities(
      source
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
    )
  );
}

function stripHtmlToText(html) {
  const source = stripMetadataNoiseHtml(html);
  if (!source) return "";

  return decodeHtmlEntities(
    source
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(td|th)>/gi, "\t")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<\/(p|div|section|article|aside|header|footer|ul|ol|li|h[1-6]|table)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\t[ \t]+/g, "\t")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
  )
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function summarizeText(value, maxLength = 180) {
  const normalized = normalizeWs(value);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const sliced = normalized.slice(0, Math.max(0, maxLength - 1));
  const boundary = sliced.lastIndexOf(" ");
  const trimmed = (boundary >= 60 ? sliced.slice(0, boundary) : sliced).trim();
  return `${trimmed}…`;
}

function parseMarkdownFrontMatter(markdown) {
  const source = String(markdown || "");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of String(match[1] || "").split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    const key = pair[1];
    const rawValue = String(pair[2] || "").trim();
    data[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }

  return {
    data,
    body: source.slice(match[0].length)
  };
}

function extractFirstHtmlByClass(html, className) {
  const match = extractElementsByClass(html, className)[0];
  if (!match) return "";
  return htmlSnippetToInlineText(match.innerHtml);
}

function extractBadgeTextsFromHtml(html) {
  const source = String(html || "");
  const badges = [];
  const seen = new Set();

  for (const match of source.matchAll(
    /<span[^>]*class=["'][^"']*clip-badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  )) {
    const text = normalizeWs(decodeHtmlEntities(String(match[1] || "").replace(/<[^>]+>/g, " ")));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    badges.push(text);
  }

  return badges;
}

function extractLinksFromHtml(html, route = "") {
  const source = stripMetadataNoiseHtml(html);
  const links = [];
  const seen = new Set();
  const baseUrl = "https://lg.cmdspace.work/axcamp";

  for (const match of source.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const href = String(match[1] || "").trim();
    const text = htmlSnippetToInlineText(match[2] || "");
    if (!href || href === route || /^javascript:/i.test(href)) continue;
    const absolute = href.startsWith("http")
      ? href
      : href.startsWith("#")
        ? `${baseUrl}${href}`
        : href.startsWith("/")
          ? `${baseUrl}${href}`
          : href;
    const key = href;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ href, absolute, text: text || href });
  }

  return links;
}

function extractSectionsFromHtml(html) {
  const source = stripMetadataNoiseHtml(html);
  const sections = [];
  const seen = new Set();

  for (const block of extractElementsByClass(source, "clip-section")) {
    const titleBlock = extractElementsByClass(block.outerHtml, "clip-section-title")[0];
    if (!titleBlock) continue;

    const title = htmlSnippetToInlineText(titleBlock.innerHtml);
    if (!title || seen.has(title)) continue;

    const contentBlock = extractElementsByClass(block.outerHtml, "clip-section-content")[0];
    const sectionHtml = String(contentBlock ? contentBlock.innerHtml : block.innerHtml).trim();
    const media = extractMediaAssetsFromHtml(sectionHtml);
    let text = stripHtmlToText(sectionHtml);

    if (!text) {
      const mediaSummary = [];
      if (media.images.length) mediaSummary.push(`이미지 ${media.images.length}개`);
      if (media.iframes.length) mediaSummary.push(`임베드 ${media.iframes.length}개`);
      if (media.audios.length) mediaSummary.push(`오디오 ${media.audios.length}개`);
      if (media.videos.length) mediaSummary.push(`동영상 ${media.videos.length}개`);
      if (mediaSummary.length) text = `${title} (${mediaSummary.join(", ")})`;
    }

    if (!text) continue;
    seen.add(title);
    sections.push({
      index: sections.length + 1,
      title,
      text,
      html: sectionHtml,
      images: media.images,
      iframes: media.iframes,
      audios: media.audios,
      videos: media.videos
    });
  }

  return sections;
}

function buildOverviewFromHtml(rawHtml, fallback = "") {
  const explicit = extractFirstHtmlByClass(rawHtml, "clip-overview");
  if (explicit) return explicit;

  for (const match of String(rawHtml || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = htmlSnippetToInlineText(match[1] || "");
    if (text && text.length >= 20) return summarizeText(text, 200);
  }

  const sections = extractSectionsFromHtml(rawHtml);
  const sectionText = sections.map((section) => normalizeWs(section.text)).find(Boolean);
  if (sectionText) return summarizeText(sectionText, 200);

  return summarizeText(fallback, 200);
}

function buildMarkdownSnapshotFromHtml(html) {
  let source = stripMetadataNoiseHtml(html);
  if (!source) return "";

  source = source
    .replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, (_, inner) => {
      const figureHtml = String(inner || "");
      const imageTag = figureHtml.match(/<img\b[^>]*>/i)?.[0] || "";
      const iframeTag = figureHtml.match(/<iframe\b[^>]*>/i)?.[0] || "";
      const figcaption = htmlSnippetToInlineText(
        figureHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || ""
      );

      if (imageTag) {
        const src = extractHtmlAttribute(imageTag, "src");
        const alt = extractHtmlAttribute(imageTag, "alt") || figcaption || "image";
        return `\n\n![${alt}](${src})${figcaption ? `\n\n*${figcaption}*` : ""}\n\n`;
      }

      if (iframeTag) {
        const src = extractHtmlAttribute(iframeTag, "src");
        const title = extractHtmlAttribute(iframeTag, "title") || figcaption || "embedded resource";
        return `\n\n[${title}](${src})\n\n`;
      }

      return `\n\n${stripHtmlToText(figureHtml)}\n\n`;
    })
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = extractHtmlAttribute(tag, "src");
      const alt = extractHtmlAttribute(tag, "alt") || "image";
      return src ? `\n\n![${alt}](${src})\n\n` : "\n\n";
    })
    .replace(/<iframe\b[^>]*>/gi, (tag) => {
      const src = extractHtmlAttribute(tag, "src");
      const title = extractHtmlAttribute(tag, "title") || "embedded resource";
      return src ? `\n\n[${title}](${src})\n\n` : "\n\n";
    })
    .replace(/<audio\b[^>]*>([\s\S]*?)<\/audio>/gi, (match, inner) => {
      const src =
        extractHtmlAttribute(match, "src") ||
        String(inner || "").match(/<source\b[^>]*src=["']([^"']+)["']/i)?.[1] ||
        "";
      return src ? `\n\n[오디오 자료](${src})\n\n` : "\n\n";
    })
    .replace(/<audio\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
      return src ? `\n\n[오디오 자료](${src})\n\n` : "\n\n";
    })
    .replace(/<video\b[^>]*>([\s\S]*?)<\/video>/gi, (match, inner) => {
      const src =
        extractHtmlAttribute(match, "src") ||
        String(inner || "").match(/<source\b[^>]*src=["']([^"']+)["']/i)?.[1] ||
        "";
      return src ? `\n\n[동영상 자료](${src})\n\n` : "\n\n";
    })
    .replace(/<video\b[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
      return src ? `\n\n[동영상 자료](${src})\n\n` : "\n\n";
    })
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
      const text = htmlSnippetToInlineText(inner || "") || href;
      return `[${text}](${href})`;
    })
    .replace(
      /<div\b[^>]*class=["'][^"']*clip-section-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      (_, inner) => {
        const text = htmlSnippetToInlineText(inner || "");
        return text ? `\n\n## ${text}\n\n` : "\n\n";
      }
    )
    .replace(
      /<div\b[^>]*class=["'][^"']*(info-block-title|tip-block-title|practice-step-title|practice-card-title)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      (_, __, inner) => {
        const text = htmlSnippetToInlineText(inner || "");
        return text ? `\n\n### ${text}\n\n` : "\n\n";
      }
    )
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
      const text = htmlSnippetToInlineText(inner || "");
      const hashes = "#".repeat(Math.max(1, Number(level) || 1));
      return text ? `\n\n${hashes} ${text}\n\n` : "\n\n";
    })
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
      return `**${htmlSnippetToInlineText(inner || "")}**`;
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
      return `*${htmlSnippetToInlineText(inner || "")}*`;
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => {
      return `\`${htmlSnippetToInlineText(inner || "")}\``;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<tr\b[^>]*>/gi, "\n| ")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(p|div|section|article|aside|header|footer|ul|ol|table)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "");

  return decodeHtmlEntities(source)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeMarkdownTables(markdown) {
  const lines = String(markdown || "")
    .split("\n")
    .map((line) => line.trimEnd());
  const output = [];
  let inTable = false;
  let headerAdded = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isTableRow = /^\|.+\|$/.test(line);

    if (isTableRow) {
      if (!inTable) {
        inTable = true;
        headerAdded = false;
      }
      output.push(line);
      if (!headerAdded) {
        const cells = line.split("|").slice(1, -1).length;
        output.push(`| ${Array.from({ length: cells }, () => "---").join(" | ")} |`);
        headerAdded = true;
      }
      continue;
    }

    if (!line && inTable) {
      continue;
    }

    inTable = false;
    headerAdded = false;
    output.push(rawLine);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildMarkdownDocument(clip, existingMarkdown, html) {
  const existing = parseMarkdownFrontMatter(existingMarkdown);
  const route = clip.route || `#${clip.clipKey}`;
  const chapterCode = String(clip.chapterCode || chapterCodeFromId(clip.chapterId || "") || "")
    .toLowerCase();
  const title = extractClipTitleFromHtml(html, clip.title || clip.clipKey);
  const frontMatter = [
    "---",
    `route: ${JSON.stringify(route)}`,
    `chapter: ${JSON.stringify(chapterCode)}`,
    `title: ${JSON.stringify(title)}`,
    `source_url: ${JSON.stringify(`https://lg.cmdspace.work/axcamp${route}`)}`
  ];

  if (existing.data.exported_at) {
    frontMatter.push(`exported_at: ${JSON.stringify(existing.data.exported_at)}`);
  }

  frontMatter.push("---");

  const body = normalizeMarkdownTables(buildMarkdownSnapshotFromHtml(html));
  return `${frontMatter.join("\n")}\n\n${body}\n`;
}

function buildMetadataFromHtml(clip, existingMetadata, rawHtml) {
  const clipTitle = extractClipTitleFromHtml(
    rawHtml,
    existingMetadata?.clipTitle || clip.title || clip.clipKey
  );
  const overview = buildOverviewFromHtml(rawHtml, existingMetadata?.overview || "");
  const badges = extractBadgeTextsFromHtml(rawHtml);
  const text = stripHtmlToText(rawHtml);
  const route = clip.route || `#${clip.clipKey}`;
  const sections = extractSectionsFromHtml(rawHtml);
  const media = extractMediaAssetsFromHtml(rawHtml);

  return {
    ...existingMetadata,
    route,
    url: `https://lg.cmdspace.work/axcamp${route}`,
    pageTitle: existingMetadata?.pageTitle || "AX Camp for Leaders | LG",
    clipTitle,
    overview,
    badges: badges.length
      ? badges
      : Array.isArray(existingMetadata?.badges)
        ? existingMetadata.badges
        : [],
    html: rawHtml,
    text,
    links: extractLinksFromHtml(rawHtml, route),
    sections,
    images: media.images,
    iframes: media.iframes,
    audios: media.audios,
    videos: media.videos
  };
}

function invalidateCatalogCache(sourceRoot) {
  const key = path.resolve(sourceRoot || SOURCE_ROOT);
  catalogPromises.delete(key);
}

function makeAttachmentHeader(fileName) {
  const fallback = String(fileName || "download")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "");
  const encoded = encodeURIComponent(String(fileName || "download"));
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

async function loadCourseDirectory() {
  const defaultCourse = defaultCourseContext();
  const generated = [];
  const raw = await readJsonFileSafe(GENERATED_COURSE_CATALOG_FILE, []);
  const entries = Array.isArray(raw) ? raw : [];

  for (const item of entries) {
    const slug = normalizeWs(item.slug || "").toLowerCase();
    const courseCode = normalizeCourseCode(item.courseCode || "");
    if (!slug || !courseCode) continue;
    const sourceRoot = path.resolve(GENERATED_COURSES_DIR, slug);
    if (!fsSync.existsSync(path.join(sourceRoot, "export-report.json"))) continue;
    generated.push({
      courseCode,
      slug,
      courseName: normalizeWs(item.courseName || item.name || slug),
      sourceRoot,
      launchUrl: normalizeWs(item.launchUrl || `/?course=${encodeURIComponent(courseCode)}`)
    });
  }

  const courses = [defaultCourse];
  const byCode = new Map([[defaultCourse.courseCode, defaultCourse]]);
  const bySlug = new Map([[defaultCourse.slug, defaultCourse]]);

  for (const course of generated) {
    if (byCode.has(course.courseCode) || bySlug.has(course.slug)) continue;
    byCode.set(course.courseCode, course);
    bySlug.set(course.slug, course);
    courses.push(course);
  }

  return { courses, byCode, bySlug };
}

async function resolveCourseContext(primary, secondary = "") {
  const dir = await loadCourseDirectory();
  const code = normalizeCourseCode(primary || secondary || "");
  if (code && dir.byCode.has(code)) return dir.byCode.get(code);
  const slug = normalizeWs(primary || secondary || "").toLowerCase();
  if (slug && dir.bySlug.has(slug)) return dir.bySlug.get(slug);
  return dir.byCode.get(DEFAULT_COURSE_CODE) || defaultCourseContext();
}

async function buildCatalog(sourceRoot) {
  const reportFile = path.join(sourceRoot, "export-report.json");
  const report = await readJsonFileSafe(reportFile, null);
  const overrides = await readVisibleCatalogOverrides(sourceRoot);
  if (!report || !Array.isArray(report.chapters)) {
    throw new Error(`Cannot load chapter catalog: ${reportFile}`);
  }

  const canonicalChaptersById = new Map();
  const canonicalClipsByKey = new Map();

  for (const chapter of report.chapters) {
    const canonicalChapterId = normalizeWs(chapter.chapterId).toLowerCase();
    const chapterObj = {
      chapterId: canonicalChapterId,
      canonicalChapterId,
      chapterCode: chapterCodeFromId(canonicalChapterId),
      chapterNum: normalizeWs(chapter.chapterNum),
      title: normalizeWs(chapter.title),
      time: normalizeWs(chapter.time),
      clips: [],
      clipObjects: []
    };

    for (const clip of chapter.clips || []) {
      const clipKey = clipKeyFromRoute(clip.route);
      if (!clipKey) continue;
      if (EXCLUDED_CLIP_KEYS.has(clipKey)) continue;
      const absoluteClipDir = path.resolve(sourceRoot, clip.folder || "");
      const metadataPath = path.join(absoluteClipDir, "metadata.json");
      const metadata = await readJsonFileSafe(metadataPath, null);

      const cleanTitle = deriveClipTitle(
        metadata,
        metadata?.clipTitle || clip.title || clipKey
      );

      const clipObj = {
        clipKey,
        canonicalClipKey: clipKey,
        route: clip.route,
        canonicalRoute: clip.route,
        title: cleanTitle,
        type: normalizeWs(clip.type),
        chapterId: canonicalChapterId,
        canonicalChapterId,
        chapterCode: chapterCodeFromId(canonicalChapterId),
        chapterNum: normalizeWs(chapter.chapterNum),
        chapterTitle: normalizeWs(chapter.title),
        overview: normalizeWs(metadata?.overview || ""),
        badges: Array.isArray(metadata?.badges) ? metadata.badges : [],
        folderRelative: clip.folder || "",
        folderAbsolute: absoluteClipDir,
        metadataPath,
        screenshotPath: path.join(absoluteClipDir, "screenshot.png")
      };
      chapterObj.clipObjects.push(clipObj);
      canonicalClipsByKey.set(clipKey, clipObj);
    }

    if (chapterObj.clipObjects.length) {
      canonicalChaptersById.set(canonicalChapterId, chapterObj);
    }
  }

  async function buildSyntheticClip(sourceRootDir, spec, chapterId, chapterTitle, chapterNum) {
    const folderAbsolute = path.resolve(sourceRootDir, spec.folderRelative || "");
    const metadataPath = path.join(folderAbsolute, "metadata.json");
    const metadata = await readJsonFileSafe(metadataPath, null);

    const clipKey = normalizeWs(spec.clipKey).toLowerCase();
    const cleanTitle = deriveClipTitle(metadata, spec.title || metadata?.clipTitle || clipKey);
    const cleanType = normalizeWs(spec.type || metadata?.type || "");

    return {
      clipKey,
      canonicalClipKey: clipKey,
      route: `#${clipKey}`,
      canonicalRoute: `#${clipKey}`,
      title: cleanTitle,
      type: cleanType,
      chapterId,
      canonicalChapterId: chapterId,
      chapterCode: chapterCodeFromId(chapterId),
      chapterNum,
      chapterTitle,
      overview: normalizeWs(metadata?.overview || ""),
      badges: Array.isArray(metadata?.badges) ? metadata.badges : [],
      folderRelative: spec.folderRelative || "",
      folderAbsolute,
      metadataPath,
      screenshotPath: path.join(folderAbsolute, "screenshot.png")
    };
  }

  const visibleBlueprints = [
    {
      visibleChapterId: "ch00",
      title: "과정 안내",
      time: "08:30",
      sourceChapterIds: ["ch00"],
      clipKeys: ["ch00-clip01", "ch00-clip02"]
    },
    {
      visibleChapterId: "ch01",
      title: "AI 핵심 개념",
      time: "08:50",
      sourceChapterIds: ["ch01"],
      clipKeys: ["ch01-clip01", "ch01-clip02", "ch01-clip03", "ch01-clip04"]
    },
    {
      visibleChapterId: "ch02",
      title: "Gemini & ChatGPT",
      time: "09:30",
      sourceChapterIds: ["ch03"],
      clipKeys: ["ch03-clip01", "ch03-clip02", "ch03-clip03", "ch01-clip05", "ch03-clip04"],
      clipTitles: {
        "ch03-clip01": "Gemini 소개 및 접속 방법",
        "ch03-clip02": "프롬프팅 기초",
        "ch03-clip03": "비지니스 프롬프팅: AI 회의록",
        "ch01-clip05": "Gems 소개: AI 비서 만들기",
        "ch03-clip04": "ChatGPT 및 GPTs 소개"
      }
    },
    {
      visibleChapterId: "ch03",
      title: "NotebookLM",
      time: "13:00",
      sourceChapterIds: ["ch04"],
      clipKeys: ["ch04-clip01", "ch04-clip02", "ch04-clip03"]
    },
    {
      visibleChapterId: "ch04",
      title: "Google AI Studio & Vibe Coding",
      time: "14:10",
      sourceChapterIds: ["ch05", "ch06"],
      clipKeys: [
        "ch05-clip02",
        "ch06-clip01",
        "ch06-clip02"
      ],
      clipTitles: {
        "ch05-clip02": "Google AI Studio 소개 및 접속 방법",
        "ch06-clip01": "바이브 코딩이란",
        "ch06-clip02": "바이브 코딩으로 웹앱 제작하기"
      }
    },
    {
      visibleChapterId: "ch05",
      title: "Hi-D Code",
      time: "16:10",
      sourceChapterIds: [],
      syntheticClips: [
        {
          clipKey: "ch05-clip01",
          folderRelative: "generated/hid-code/ch05-clip01",
          title: "Hi-D Code 소개 및 시연 (최남석, Agentic AI 팀)",
          type: "개요"
        }
      ]
    },
    {
      visibleChapterId: "ch06",
      title: "Key Takeaways & Q/A",
      time: "17:10",
      sourceChapterIds: ["ch09"],
      clipKeys: ["ch09-clip01", "ch09-clip02"]
    },
    {
      visibleChapterId: "ch07",
      title: "참고자료 라이브러리",
      time: "17:20",
      sourceChapterIds: ["ch07", "ch08"],
      clipKeys: [
        "ch07-clip01",
        "ch07-clip02",
        "ch07-clip03",
        "ch07-clip04",
        "ch07-clip05",
        "ch07-clip06",
        "ch07-clip07",
        "ch07-clip08",
        "ch08-clip01",
        "ch08-clip03",
        "ch08-clip06"
      ]
    }
  ];

  const chapters = [];
  const clipsByKey = new Map();
  const visibleClipsByKey = new Map();
  const canonicalVisibleClipsByKey = new Map();
  const visibleChapterIdByCanonicalId = new Map();
  const canonicalChapterIdByVisibleId = new Map();
  const visibleClipKeyByCanonicalKey = new Map();
  const sourceChapterIdsByVisibleId = new Map();
  const registerClipObject = (clipObj) => {
    if (!clipObj?.clipKey) return;

    const visibleKey = normalizeWs(clipObj.clipKey).toLowerCase();
    const canonicalKey = normalizeWs(clipObj.canonicalClipKey || clipObj.clipKey).toLowerCase();
    if (!visibleKey) return;

    visibleClipsByKey.set(visibleKey, clipObj);
    clipsByKey.set(visibleKey, clipObj);

    if (canonicalKey) {
      canonicalVisibleClipsByKey.set(canonicalKey, clipObj);
      visibleClipKeyByCanonicalKey.set(canonicalKey, visibleKey);
      if (!clipsByKey.has(canonicalKey)) {
        clipsByKey.set(canonicalKey, clipObj);
      }
    }
  };

  for (const [chapterIndex, blueprint] of visibleBlueprints.entries()) {
    const visibleChapterId = blueprint.visibleChapterId;
    const primarySourceChapterId = normalizeWs(blueprint.sourceChapterIds?.[0] || visibleChapterId).toLowerCase();
    const visibleChapterNum = formatChapterNum(chapterIndex);
    const visibleChapterCode = chapterCodeFromId(visibleChapterId);
    const chapterOverride = overrides.chapters?.[visibleChapterId] || {};
    const chapterObj = {
      chapterId: visibleChapterId,
      canonicalChapterId: primarySourceChapterId,
      chapterCode: visibleChapterCode,
      chapterNum: visibleChapterNum,
      title: normalizeWs(chapterOverride.title || blueprint.title),
      time: normalizeWs(chapterOverride.time || blueprint.time || ""),
      sourceChapterIds: Array.isArray(blueprint.sourceChapterIds) ? [...blueprint.sourceChapterIds] : [],
      clips: [],
      clipObjects: []
    };

    canonicalChapterIdByVisibleId.set(visibleChapterId, primarySourceChapterId);
    sourceChapterIdsByVisibleId.set(visibleChapterId, chapterObj.sourceChapterIds);

    for (const sourceChapterId of blueprint.sourceChapterIds || []) {
      visibleChapterIdByCanonicalId.set(normalizeWs(sourceChapterId).toLowerCase(), visibleChapterId);
    }

    const clipSpecs = [];
    for (const clipKey of blueprint.clipKeys || []) {
      clipSpecs.push({ clipKey, synthetic: false });
    }
    for (const syntheticClip of blueprint.syntheticClips || []) {
      clipSpecs.push({ ...syntheticClip, synthetic: true });
    }

    for (const [clipIndex, clipSpec] of clipSpecs.entries()) {
      let clipObj = null;

      if (clipSpec.synthetic) {
        clipObj = await buildSyntheticClip(
          sourceRoot,
          clipSpec,
          visibleChapterId,
          chapterObj.title,
          visibleChapterNum
        );
      } else {
        const sourceClip = canonicalClipsByKey.get(normalizeWs(clipSpec.clipKey).toLowerCase());
        if (!sourceClip) continue;
        clipObj = {
          ...sourceClip,
          clipKey: `${visibleChapterId}-clip${String(clipIndex + 1).padStart(2, "0")}`,
          route: `#${visibleChapterId}-clip${String(clipIndex + 1).padStart(2, "0")}`,
          chapterId: visibleChapterId,
          canonicalChapterId: sourceClip.canonicalChapterId,
          chapterCode: visibleChapterCode,
          chapterNum: visibleChapterNum,
          chapterTitle: chapterObj.title,
          title: normalizeWs(blueprint.clipTitles?.[clipSpec.clipKey] || clipSpec.title || sourceClip.title),
          canonicalClipKey: sourceClip.canonicalClipKey,
          canonicalRoute: sourceClip.canonicalRoute
        };
      }

      if (!clipObj) continue;

      if (clipSpec.synthetic) {
        clipObj.chapterId = visibleChapterId;
        clipObj.canonicalChapterId = visibleChapterId;
        clipObj.chapterCode = visibleChapterCode;
        clipObj.chapterNum = visibleChapterNum;
        clipObj.chapterTitle = chapterObj.title;
        clipObj.clipKey = `${visibleChapterId}-clip${String(clipIndex + 1).padStart(2, "0")}`;
        clipObj.route = `#${clipObj.clipKey}`;
        clipObj.canonicalClipKey = clipObj.clipKey;
        clipObj.canonicalRoute = clipObj.route;
      }

      const clipOverride = overrides.clips?.[clipObj.clipKey] || {};
      if (clipOverride.title) {
        clipObj.title = clipOverride.title;
      }
      if (clipOverride.type) {
        clipObj.type = clipOverride.type;
      }

      registerClipObject(clipObj);
      chapterObj.clipObjects.push(clipObj);
    }

    if (chapterObj.clipObjects.length) {
      chapterObj.clips = chapterObj.clipObjects.map((clipObj) => ({
        clipKey: clipObj.clipKey,
        canonicalClipKey: clipObj.canonicalClipKey,
        route: clipObj.route,
        title: clipObj.title,
        type: clipObj.type
      }));
      chapters.push(chapterObj);
    }
  }

  return {
    chapters,
    clipsByKey,
    visibleClipsByKey,
    canonicalClipsByKey: canonicalVisibleClipsByKey,
    visibleChapterIdByCanonicalId,
    canonicalChapterIdByVisibleId,
    visibleClipKeyByCanonicalKey,
    sourceChapterIdsByVisibleId
  };
}

async function readCatalogVersion(sourceRoot) {
  const reportFile = path.join(sourceRoot, "export-report.json");
  const syntheticFiles = [
    path.join(sourceRoot, VISIBLE_CATALOG_OVERRIDES_FILE),
    path.join(sourceRoot, "generated", "hid-code", "ch05-clip01", "content.html"),
    path.join(sourceRoot, "generated", "hid-code", "ch05-clip01", "metadata.json")
  ];
  try {
    const parts = [];
    for (const filePath of [reportFile, ...syntheticFiles]) {
      try {
        const stat = await fs.stat(filePath);
        parts.push(`${filePath}:${stat.mtimeMs}:${stat.size}`);
      } catch {
        parts.push(`${filePath}:missing`);
      }
    }
    return parts.join("|");
  } catch {
    return "missing";
  }
}

async function getCatalog(courseContext) {
  const context = courseContext || defaultCourseContext();
  const key = path.resolve(context.sourceRoot || SOURCE_ROOT);
  const version = await readCatalogVersion(key);
  const cached = catalogPromises.get(key);

  if (!cached || cached.version !== version) {
    let promise = buildCatalog(key);
    promise = promise.catch((error) => {
      const latest = catalogPromises.get(key);
      if (latest && latest.promise === promise) {
        catalogPromises.delete(key);
      }
      throw error;
    });
    catalogPromises.set(key, { version, promise });
  }

  return catalogPromises.get(key).promise;
}

async function resolveUserFromRequest(req, urlObj) {
  const token = normalizeWs(
    req.headers["x-session-token"] || urlObj.searchParams.get("sessionToken")
  );
  const accountId = cleanAccountId(
    req.headers["x-account-id"] || urlObj.searchParams.get("accountId")
  );

  const db = await readDb();

  if (token) {
    const byToken = db.users.find((item) => item.sessionToken === token) || null;
    if (byToken) return byToken;
  }

  if (accountId) {
    return db.users.find((item) => item.accountId === accountId) || null;
  }

  return null;
}

async function resolveActiveCourse(user, urlObj) {
  const requested = normalizeCourseCode(urlObj?.searchParams?.get("course"));
  const primary = requested || normalizeCourseCode(user?.courseCode || "");
  const secondary = normalizeWs(user?.courseSlug || "");
  return resolveCourseContext(primary, secondary);
}

async function readRequestJson(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_REQUEST_BODY_BYTES) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function handleSignup(req, res) {
  const payload = await readRequestJson(req);
  const accountId = cleanAccountId(payload.accountId);
  const letsId = cleanAccountId(payload.letsId || accountId);
  const password = String(payload.password || "");
  const teamName = cleanTeamName(payload.teamName);
  const displayName = normalizeWs(payload.displayName || accountId);
  const requestedCourseCode = normalizeCourseCode(payload.courseCode || "");

  if (!ACCOUNT_ID_REGEX.test(accountId)) {
    return sendJson(res, 400, {
      ok: false,
      error:
        "Let's ID는 2~32자, 문자/숫자/._- 조합으로 입력해 주세요. (예: leader01)"
    });
  }

  if (password.length < 2 || password.length > 64) {
    return sendJson(res, 400, {
      ok: false,
      error: "비밀번호는 2~64자로 입력해 주세요."
    });
  }

  if (!teamName) {
    return sendJson(res, 400, {
      ok: false,
      error: "소속 팀명을 입력해 주세요."
    });
  }

  if (!displayName) {
    return sendJson(res, 400, {
      ok: false,
      error: "표시이름을 입력해 주세요."
    });
  }

  const course = await resolveCourseContext(requestedCourseCode || DEFAULT_COURSE_CODE);
  if (requestedCourseCode && course.courseCode !== requestedCourseCode) {
    return sendJson(res, 400, {
      ok: false,
      error: "유효하지 않은 교육과정 코드입니다."
    });
  }

  const db = await readDb();
  const exists = db.users.some((item) => item.accountId === accountId);
  if (exists) {
    return sendJson(res, 409, {
      ok: false,
      error: "이미 존재하는 Let's ID입니다."
    });
  }

  const now = new Date().toISOString();
  const sessionToken = generateSessionToken();
  const user = ensureUserShape({
    accountId,
    letsId,
    password,
    teamName,
    displayName,
    courseCode: course.courseCode,
    courseSlug: course.slug,
    createdAt: now,
    lastLoginAt: now,
    sessionToken,
    progress: { completedClipKeys: [] },
    axTasks: {},
    notes: {}
  });

  db.users.push(user);
  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    user: toUserResponse(user),
    course: toCourseResponse(course),
    sessionToken,
    progress: user.progress,
    axTasks: user.axTasks || {},
    notes: user.notes || {}
  });
}

async function handleLogin(req, res) {
  const payload = await readRequestJson(req);
  const accountId = cleanAccountId(payload.accountId);
  const password = String(payload.password || "");
  const requestedCourseCode = normalizeCourseCode(payload.courseCode || "");

  if (!ACCOUNT_ID_REGEX.test(accountId)) {
    return sendJson(res, 400, {
      ok: false,
      error:
        "Let's ID는 2~32자, 문자/숫자/._- 조합으로 입력해 주세요. (예: leader01)"
    });
  }

  if (!password) {
    return sendJson(res, 400, {
      ok: false,
      error: "비밀번호를 입력해 주세요."
    });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.accountId === accountId);

  if (!user) {
    return sendJson(res, 404, {
      ok: false,
      error: "존재하지 않는 Let's ID입니다."
    });
  }

  if (user.password !== password) {
    return sendJson(res, 401, {
      ok: false,
      error: "비밀번호가 올바르지 않습니다."
    });
  }

  const currentCourse = await resolveCourseContext(user.courseCode, user.courseSlug);
  if (requestedCourseCode) {
    const requested = await resolveCourseContext(requestedCourseCode);
    if (requested.courseCode !== requestedCourseCode) {
      return sendJson(res, 400, {
        ok: false,
        error: "유효하지 않은 교육과정 코드입니다."
      });
    }
    user.courseCode = requested.courseCode;
    user.courseSlug = requested.slug;
  } else {
    user.courseCode = currentCourse.courseCode;
    user.courseSlug = currentCourse.slug;
  }
  const activeCourse = await resolveCourseContext(user.courseCode, user.courseSlug);

  user.lastLoginAt = new Date().toISOString();
  user.sessionToken = generateSessionToken();
  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    user: toUserResponse(user),
    course: toCourseResponse(activeCourse),
    sessionToken: user.sessionToken,
    progress: user.progress,
    axTasks: user.axTasks || {},
    notes: user.notes || {}
  });
}

async function handleLogout(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user) {
    return sendJson(res, 200, { ok: true });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === user.accountId);
  if (dbUser) {
    dbUser.sessionToken = "";
    await writeDb(db);
  }

  return sendJson(res, 200, { ok: true });
}

async function handlePasswordHint(req, res) {
  const payload = await readRequestJson(req);
  const accountId = cleanAccountId(payload.accountId);

  if (!accountId) {
    return sendJson(res, 400, {
      ok: false,
      error: "Let's ID를 입력해 주세요."
    });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.accountId === accountId);
  if (!user) {
    return sendJson(res, 404, {
      ok: false,
      error: "존재하지 않는 Let's ID입니다."
    });
  }

  return sendJson(res, 200, {
    ok: true,
    letsId: user.letsId || user.accountId,
    hint: maskPasswordHint(user.password)
  });
}

async function handlePasswordRecover(req, res) {
  const payload = await readRequestJson(req);
  const accountId = cleanAccountId(payload.accountId);
  const teamName = cleanTeamName(payload.teamName);

  if (!accountId || !teamName) {
    return sendJson(res, 400, {
      ok: false,
      error: "Let's ID와 소속 팀명을 모두 입력해 주세요."
    });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.accountId === accountId);
  if (!user) {
    return sendJson(res, 404, {
      ok: false,
      error: "존재하지 않는 Let's ID입니다."
    });
  }

  if (cleanTeamName(user.teamName) !== teamName) {
    return sendJson(res, 401, {
      ok: false,
      error: "소속 팀명이 일치하지 않습니다."
    });
  }

  return sendJson(res, 200, {
    ok: true,
    letsId: user.letsId || user.accountId,
    password: user.password
  });
}

async function handleAccountUpdate(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  const payload = await readRequestJson(req);
  const nextAccountId = cleanAccountId(
    payload.accountId || payload.letsId || currentUser.accountId
  );
  const displayName = normalizeWs(payload.displayName || "");
  const teamName = cleanTeamName(payload.teamName || "");
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");

  if (!currentPassword) {
    return sendJson(res, 400, {
      ok: false,
      error: "현재 비밀번호를 입력해 주세요."
    });
  }

  if (!ACCOUNT_ID_REGEX.test(nextAccountId)) {
    return sendJson(res, 400, {
      ok: false,
      error:
        "Let's ID는 2~32자, 문자/숫자/._- 조합으로 입력해 주세요. (예: leader01)"
    });
  }

  if (!displayName) {
    return sendJson(res, 400, {
      ok: false,
      error: "표시이름을 입력해 주세요."
    });
  }

  if (!teamName) {
    return sendJson(res, 400, {
      ok: false,
      error: "소속 팀명을 입력해 주세요."
    });
  }

  if (newPassword && (newPassword.length < 2 || newPassword.length > 64)) {
    return sendJson(res, 400, {
      ok: false,
      error: "새 비밀번호는 2~64자로 입력해 주세요."
    });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === currentUser.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  if (dbUser.password !== currentPassword) {
    return sendJson(res, 401, {
      ok: false,
      error: "현재 비밀번호가 올바르지 않습니다."
    });
  }

  if (dbUser.accountId !== nextAccountId) {
    const duplicate = db.users.some((item) => item.accountId === nextAccountId);
    if (duplicate) {
      return sendJson(res, 409, {
        ok: false,
        error: "이미 사용 중인 Let's ID입니다."
      });
    }
  }

  dbUser.accountId = nextAccountId;
  dbUser.letsId = nextAccountId;
  dbUser.displayName = displayName;
  dbUser.teamName = teamName;

  if (newPassword) {
    dbUser.password = newPassword;
  }

  if (String(dbUser.accountId).toLowerCase() === ROOT_ACCOUNT_ID) {
    dbUser.isAdmin = true;
  }

  dbUser.sessionToken = generateSessionToken();
  dbUser.lastLoginAt = new Date().toISOString();

  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    user: toUserResponse(dbUser),
    sessionToken: dbUser.sessionToken,
    progress: dbUser.progress || { completedClipKeys: [] },
    axTasks: dbUser.axTasks || {},
    notes: dbUser.notes || {}
  });
}

async function handleGetMe(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }
  const course = await resolveActiveCourse(user, urlObj);

  return sendJson(res, 200, {
    ok: true,
    user: toUserResponse(user),
    course: toCourseResponse(course),
    sessionToken: user.sessionToken || "",
    progress: user.progress || { completedClipKeys: [] },
    axTasks: user.axTasks || {},
    notes: user.notes || {}
  });
}

async function handleGetCourses(_req, res) {
  const directory = await loadCourseDirectory();
  return sendJson(res, 200, {
    ok: true,
    courses: directory.courses.map((course) => toCourseResponse(course))
  });
}

async function handleGetChapters(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  const course = await resolveActiveCourse(user, urlObj);
  const catalog = await getCatalog(course);
  const { chapters } = catalog;
  const completed = new Set(user?.progress?.completedClipKeys || []);

  const enriched = chapters.map((chapter) => ({
    chapterId: chapter.chapterId,
    chapterCode: chapter.chapterCode,
    chapterNum: chapter.chapterNum,
    title: chapter.title,
    time: chapter.time,
    clips: chapter.clips.map((clip) => ({
      clipKey: clip.clipKey,
      route: clip.route,
      title: clip.title,
      type: clip.type,
      completed:
        completed.has(clip.canonicalClipKey) || completed.has(clip.clipKey)
    }))
  }));

  return sendJson(res, 200, {
    ok: true,
    course: toCourseResponse(course),
    chapters: enriched
  });
}

async function resolveClipPayload(clipKey, course) {
  const activeCourse = course || defaultCourseContext();
  const catalog = await getCatalog(activeCourse);
  const normalizedClipKey = normalizeWs(clipKey).toLowerCase();
  const clip = resolveCatalogClip(catalog, normalizedClipKey);
  if (!clip) return null;

  const metadata = await readJsonFileSafe(clip.metadataPath, {});
  const htmlPath = path.join(clip.folderAbsolute, "content.html");
  const mdPath = path.join(clip.folderAbsolute, "content.md");
  const txtPath = path.join(clip.folderAbsolute, "content.txt");

  const htmlRaw = await readFileSafe(htmlPath, "");
  const mdRaw = await readFileSafe(mdPath, "");
  const txtRaw = await readFileSafe(txtPath, "");

  const htmlContent = htmlRaw
    ? rewriteVisibleReferences(
        rewritePracticeDriveUrls(
          rewriteRelativeUrls(htmlRaw, activeCourse.courseCode, clip.clipKey)
        ),
        catalog
      )
    : `<pre>${escapeHtml(mdRaw || txtRaw || "콘텐츠가 없습니다.")}</pre>`;
  const renderedMetadata = buildMetadataFromHtml(clip, metadata, htmlContent);
  const baseBadges =
    Array.isArray(renderedMetadata?.badges) && renderedMetadata.badges.length
      ? renderedMetadata.badges
      : clip.badges?.length
        ? clip.badges
        : Array.isArray(metadata?.badges)
          ? metadata.badges
          : [];
  const badges = baseBadges.map((badge) => rewriteVisibleReferences(badge, catalog));

  const screenshotRelative = (await pathExists(clip.screenshotPath))
    ? `/course-files/${encodeURIComponent(activeCourse.courseCode)}/${encodeURIComponent(clip.clipKey)}/screenshot.png`
    : null;

  return {
    clipKey: clip.clipKey,
    canonicalClipKey: clip.canonicalClipKey,
    route: clip.route,
    title: clip.title,
    type: clip.type,
    chapterId: clip.chapterId,
    chapterCode: clip.chapterCode,
    chapterNum: clip.chapterNum,
    chapterTitle: clip.chapterTitle,
    overview: normalizeWs(renderedMetadata?.overview || clip.overview || metadata?.overview || ""),
    badges,
    links: Array.isArray(renderedMetadata?.links) ? renderedMetadata.links : [],
    prompts: Array.isArray(metadata?.prompts) ? metadata.prompts : [],
    sections: Array.isArray(renderedMetadata?.sections) ? renderedMetadata.sections : [],
    screenshot: screenshotRelative,
    contentHtml: htmlContent
  };
}

async function handleGetClip(req, res, urlObj) {
  const pathnameParts = urlObj.pathname.split("/").filter(Boolean);
  const clipKey = pathnameParts[pathnameParts.length - 1];
  const user = await resolveUserFromRequest(req, urlObj);
  const course = await resolveActiveCourse(user, urlObj);
  const payload = await resolveClipPayload(clipKey, course);

  if (!payload) {
    return sendJson(res, 404, { ok: false, error: "클립을 찾을 수 없습니다." });
  }

  const completedSet = new Set(user?.progress?.completedClipKeys || []);

  return sendJson(res, 200, {
    ok: true,
    course: toCourseResponse(course),
    clip: payload,
    completed:
      completedSet.has(payload.canonicalClipKey) ||
      completedSet.has(payload.clipKey)
  });
}

async function handleProgress(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }
  const course = await resolveActiveCourse(user, urlObj);
  const catalog = await getCatalog(course);

  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      completedClipKeys: toVisibleCompletedClipKeys(
        catalog,
        user.progress?.completedClipKeys || []
      )
    });
  }

  const payload = await readRequestJson(req);
  const clipKey = normalizeWs(payload.clipKey).toLowerCase();
  const completed = Boolean(payload.completed);

  if (!clipKey) {
    return sendJson(res, 400, { ok: false, error: "clipKey가 필요합니다." });
  }

  const clip = resolveCatalogClip(catalog, clipKey);
  if (!clip) {
    return sendJson(res, 400, { ok: false, error: "유효하지 않은 clipKey입니다." });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === user.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  if (!dbUser.progress || !Array.isArray(dbUser.progress.completedClipKeys)) {
    dbUser.progress = { completedClipKeys: [] };
  }

  const set = new Set(dbUser.progress.completedClipKeys);
  const storedClipKey = clip.canonicalClipKey || clip.clipKey;
  if (completed) {
    set.add(storedClipKey);
  } else {
    set.delete(storedClipKey);
    set.delete(clip.clipKey);
  }
  dbUser.progress.completedClipKeys = [...set];

  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    completedClipKeys: toVisibleCompletedClipKeys(
      catalog,
      dbUser.progress.completedClipKeys
    )
  });
}

async function handleAxTask(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  const requestedChapterId = normalizeWs(urlObj.searchParams.get("chapterId")).toLowerCase();
  const course = await resolveActiveCourse(user, urlObj);
  const catalog = await getCatalog(course);
  const { chapters } = catalog;
  const chapterId = toCanonicalChapterId(catalog, requestedChapterId);
  const chapterIds = new Set(chapters.map((item) => String(item.chapterId || "").toLowerCase()));
  const canonicalChapterIds = new Set(
    chapters.map((item) => String(item.canonicalChapterId || "").toLowerCase())
  );

  const getUserTasks = () => {
    if (!user.axTasks || typeof user.axTasks !== "object") {
      return {};
    }
    return user.axTasks;
  };

  if (req.method === "GET") {
    const axTasks = getUserTasks();
    if (!chapterId) {
      return sendJson(res, 200, {
        ok: true,
        axTasks
      });
    }

    if (!canonicalChapterIds.has(chapterId) && !chapterIds.has(requestedChapterId)) {
      return sendJson(res, 400, {
        ok: false,
        error: "유효하지 않은 chapterId입니다."
      });
    }

    const visibleChapterId = toVisibleChapterId(catalog, chapterId);
    const task = axTasks[chapterId] || axTasks[visibleChapterId] || null;

    return sendJson(res, 200, {
      ok: true,
      chapterId: visibleChapterId,
      axTask: task
        ? {
            ...task,
            chapterId: visibleChapterId
          }
        : null
    });
  }

  const payload = await readRequestJson(req);
  const title = normalizeWs(payload.title);
  const reason = normalizeWs(payload.reason);
  const effect = normalizeWs(payload.effect);

  if (!chapterId || !canonicalChapterIds.has(chapterId)) {
    return sendJson(res, 400, {
      ok: false,
      error: "chapterId가 필요하며 유효해야 합니다."
    });
  }

  if (!title || !reason || !effect) {
    return sendJson(res, 400, {
      ok: false,
      error: "과제명/선정 이유/기대효과를 모두 입력해 주세요."
    });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === user.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  if (!dbUser.axTasks || typeof dbUser.axTasks !== "object") {
    dbUser.axTasks = {};
  }

  const now = new Date().toISOString();
  const previous = dbUser.axTasks[chapterId] || null;
  const hadSubmission = Boolean(previous?.submittedAt);

  dbUser.axTasks[chapterId] = {
    chapterId,
    title,
    reason,
    effect,
    submittedAt: hadSubmission ? previous.submittedAt : now,
    updatedAt: now
  };

  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    chapterId: toVisibleChapterId(catalog, chapterId),
    axTask: {
      ...dbUser.axTasks[chapterId],
      chapterId: toVisibleChapterId(catalog, chapterId)
    }
  });
}

async function handleNotes(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }
  const course = await resolveActiveCourse(user, urlObj);

  const catalog = await getCatalog(course);
  const clipKey = normalizeWs(urlObj.searchParams.get("clipKey")).toLowerCase();
  if (!clipKey) {
    return sendJson(res, 400, {
      ok: false,
      error: "clipKey가 필요합니다."
    });
  }

  const clip = resolveCatalogClip(catalog, clipKey);
  if (!clip) {
    return sendJson(res, 400, {
      ok: false,
      error: "유효하지 않은 clipKey입니다."
    });
  }

  const storedClipKey = clip.canonicalClipKey || clip.clipKey;
  const publicClipKey = clip.clipKey;

  if (req.method === "GET") {
    const note =
      user.notes?.[storedClipKey] ||
      user.notes?.[publicClipKey] || {
        clipKey: publicClipKey,
        content: "",
        updatedAt: null
      };
    return sendJson(res, 200, { ok: true, note });
  }

  const payload = await readRequestJson(req);
  const contentRaw = String(payload.content || "");
  if (contentRaw.length > 20000) {
    return sendJson(res, 400, {
      ok: false,
      error: "노트는 20,000자 이하로 입력해 주세요."
    });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === user.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  if (!dbUser.notes || typeof dbUser.notes !== "object") {
    dbUser.notes = {};
  }

  dbUser.notes[storedClipKey] = {
    clipKey: storedClipKey,
    content: contentRaw,
    updatedAt: new Date().toISOString()
  };

  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    note: {
      ...dbUser.notes[storedClipKey],
      clipKey: publicClipKey
    }
  });
}

async function handleAdminUsers(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const db = await readDb();
  const users = db.users
    .map((item) => {
      const completed = item.progress?.completedClipKeys || [];
      const noteCount = Object.keys(item.notes || {}).length;
      const taskCount = Object.keys(item.axTasks || {}).length;
      return {
        letsId: item.letsId || item.accountId,
        accountId: item.accountId,
        displayName: item.displayName,
        teamName: item.teamName,
        password: item.password,
        isAdmin: Boolean(item.isAdmin),
        createdAt: item.createdAt,
        lastLoginAt: item.lastLoginAt,
        completedCount: completed.length,
        taskCount,
        noteCount
      };
    })
    .sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return String(a.accountId).localeCompare(String(b.accountId));
    });

  return sendJson(res, 200, {
    ok: true,
    users
  });
}

async function handleAdminClipSource(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const activeCourse = await resolveActiveCourse(currentUser, urlObj);
  const catalog = await getCatalog(activeCourse);
  const pathnameParts = urlObj.pathname.split("/").filter(Boolean);
  const clipKey = normalizeWs(decodeURIComponent(pathnameParts[pathnameParts.length - 1] || "")).toLowerCase();
  const clip = resolveCatalogClip(catalog, clipKey);

  if (!clip) {
    return sendJson(res, 404, { ok: false, error: "클립을 찾을 수 없습니다." });
  }

  const htmlPath = path.join(clip.folderAbsolute, "content.html");
  const mdPath = path.join(clip.folderAbsolute, "content.md");
  const txtPath = path.join(clip.folderAbsolute, "content.txt");
  const metadataPath = path.join(clip.folderAbsolute, "metadata.json");

  if (req.method === "GET") {
    const storedContentHtml = await readFileSafe(htmlPath, "");
    const contentHtml = rewriteVisibleReferences(storedContentHtml, catalog);
    const metadata = await readJsonFileSafe(metadataPath, {});
    return sendJson(res, 200, {
      ok: true,
      clip: {
        clipKey: clip.clipKey,
        canonicalClipKey: clip.canonicalClipKey,
        title: clip.title,
        route: clip.route,
        chapterNum: clip.chapterNum,
        chapterTitle: clip.chapterTitle
      },
      source: {
        contentHtml,
        canonicalContentHtml: storedContentHtml,
        contentPath: path.relative(ROOT_DIR, htmlPath).replace(/\\/g, "/"),
        markdownPath: path.relative(ROOT_DIR, mdPath).replace(/\\/g, "/"),
        metadataPath: path.relative(ROOT_DIR, metadataPath).replace(/\\/g, "/"),
        textPath: path.relative(ROOT_DIR, txtPath).replace(/\\/g, "/")
      },
      metadata: {
        clipTitle: metadata?.clipTitle || "",
        overview: metadata?.overview || "",
        badges: Array.isArray(metadata?.badges) ? metadata.badges : []
      }
    });
  }

  const payload = await readRequestJson(req);
  const editorContentHtml = String(payload.contentHtml || "");
  if (!editorContentHtml.trim()) {
    return sendJson(res, 400, { ok: false, error: "contentHtml이 비어 있습니다." });
  }
  const storedContentHtml = rewriteCanonicalReferences(editorContentHtml, catalog);

  const existingMetadata = await readJsonFileSafe(metadataPath, {});
  const existingMarkdown = await readFileSafe(mdPath, "");
  const nextMetadata = buildMetadataFromHtml(clip, existingMetadata, editorContentHtml);
  const nextMarkdown = buildMarkdownDocument(clip, existingMarkdown, editorContentHtml);
  const nextText = stripHtmlToText(editorContentHtml);

  await writeAdminHistorySnapshot(`clip-source-${clip.clipKey}`, [
    htmlPath,
    mdPath,
    txtPath,
    metadataPath
  ]);
  await fs.writeFile(htmlPath, storedContentHtml, "utf8");
  await fs.writeFile(mdPath, nextMarkdown, "utf8");
  await fs.writeFile(txtPath, `${nextText}\n`, "utf8");
  await writeJsonFile(metadataPath, nextMetadata);
  invalidateCatalogCache(activeCourse.sourceRoot);

  return sendJson(res, 200, {
    ok: true,
    savedAt: new Date().toISOString(),
    clip: {
      clipKey: clip.clipKey,
      title: nextMetadata.clipTitle || clip.title,
      route: clip.route
    },
    metadata: {
      clipTitle: nextMetadata.clipTitle || "",
      overview: nextMetadata.overview || "",
      badges: Array.isArray(nextMetadata.badges) ? nextMetadata.badges : []
    }
  });
}

async function handleAdminSidebarSource(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const activeCourse = await resolveActiveCourse(currentUser, urlObj);
  const catalog = await getCatalog(activeCourse);
  const pathnameParts = urlObj.pathname.split("/").filter(Boolean);
  const clipKey = normalizeWs(
    decodeURIComponent(pathnameParts[pathnameParts.length - 1] || "")
  ).toLowerCase();
  const clip = resolveCatalogClip(catalog, clipKey);

  if (!clip) {
    return sendJson(res, 404, { ok: false, error: "클립을 찾을 수 없습니다." });
  }

  const visibleChapter = catalog.chapters.find(
    (item) => normalizeWs(item.chapterId).toLowerCase() === normalizeWs(clip.chapterId).toLowerCase()
  );
  const visibleClip = visibleChapter?.clips?.find(
    (item) => normalizeWs(item.clipKey).toLowerCase() === normalizeWs(clip.clipKey).toLowerCase()
  );
  const sourceChapterIds = Array.isArray(catalog.sourceChapterIdsByVisibleId?.get(clip.chapterId))
    ? catalog.sourceChapterIdsByVisibleId.get(clip.chapterId)
    : [];
  const hasSingleSourceChapter = sourceChapterIds.length === 1;
  const sourceChapterId = sourceChapterIds.length === 1
    ? normalizeWs(sourceChapterIds[0]).toLowerCase()
    : normalizeWs(clip.canonicalChapterId || "").toLowerCase();
  const canonicalRoute = clip.canonicalRoute || `#${clip.canonicalClipKey || clip.clipKey}`;
  const overridesPath = path.join(activeCourse.sourceRoot, VISIBLE_CATALOG_OVERRIDES_FILE);
  const reportFile = path.join(activeCourse.sourceRoot, "export-report.json");
  const chapterJsonPath = path.join(path.resolve(clip.folderAbsolute, ".."), "chapter.json");
  const metadataPath = path.join(clip.folderAbsolute, "metadata.json");
  const overrides = await readVisibleCatalogOverrides(activeCourse.sourceRoot);
  const report = await readJsonFileSafe(reportFile, null);
  const chapterJson = await readJsonFileSafe(chapterJsonPath, null);
  const metadata = await readJsonFileSafe(metadataPath, {});

  if (!report || !Array.isArray(report.chapters) || !visibleChapter || !visibleClip) {
    return sendJson(res, 500, { ok: false, error: "카탈로그를 읽을 수 없습니다." });
  }

  const reportChapter = report.chapters.find(
    (item) => normalizeWs(item.chapterId).toLowerCase() === sourceChapterId
  );
  const reportClip = reportChapter?.clips?.find(
    (item) => normalizeWs(item.route).toLowerCase() === canonicalRoute.toLowerCase()
  );
  const reportFlatClip = Array.isArray(report.clips)
    ? report.clips.find(
        (item) => normalizeWs(item.route).toLowerCase() === canonicalRoute.toLowerCase()
      )
    : null;
  const chapterClip = Array.isArray(chapterJson?.clips)
    ? chapterJson.clips.find(
        (item) => normalizeWs(item.route).toLowerCase() === canonicalRoute.toLowerCase()
      )
    : null;
  const chapterOverride = overrides.chapters?.[clip.chapterId] || {};
  const clipOverride = overrides.clips?.[clip.clipKey] || {};

  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      clip: {
        clipKey: clip.clipKey,
        canonicalClipKey: clip.canonicalClipKey,
        route: clip.route,
        chapterNum: clip.chapterNum
      },
      sidebar: {
        chapterTitle: normalizeWs(
          chapterOverride.title ||
            visibleChapter.title ||
            reportChapter?.title ||
            chapterJson?.title ||
            clip.chapterTitle
        ),
        chapterTime: normalizeWs(
          chapterOverride.time ||
            visibleChapter.time ||
            reportChapter?.time ||
            chapterJson?.time ||
            ""
        ),
        clipTitle: normalizeWs(
          clipOverride.title ||
            metadata?.navTitle ||
            reportClip?.title ||
            chapterClip?.title ||
            visibleClip.title ||
            clip.title
        ),
        clipType: normalizeSidebarClipType(
          clipOverride.type ||
            reportClip?.type ||
            chapterClip?.type ||
            visibleClip.type ||
            clip.type,
          clip.type
        )
      },
      source: {
        overridesPath: path.relative(ROOT_DIR, overridesPath).replace(/\\/g, "/"),
        reportPath: path.relative(ROOT_DIR, reportFile).replace(/\\/g, "/"),
        chapterPath: path.relative(ROOT_DIR, chapterJsonPath).replace(/\\/g, "/"),
        metadataPath: path.relative(ROOT_DIR, metadataPath).replace(/\\/g, "/")
      }
    });
  }

  const payload = await readRequestJson(req);
  const chapterTitle = normalizeWs(payload.chapterTitle || "");
  const chapterTime = normalizeWs(payload.chapterTime || "");
  const clipTitle = normalizeWs(payload.clipTitle || "");
  const clipType = normalizeSidebarClipType(
    payload.clipType,
    reportClip?.type || reportFlatClip?.type || chapterClip?.type || visibleClip?.type || clip.type
  );

  if (!chapterTitle) {
    return sendJson(res, 400, { ok: false, error: "챕터 제목을 입력해 주세요." });
  }
  if (!clipTitle) {
    return sendJson(res, 400, { ok: false, error: "클립 제목을 입력해 주세요." });
  }

  const nextOverrides = normalizeVisibleCatalogOverrides(overrides);
  nextOverrides.chapters[clip.chapterId] = {
    title: chapterTitle,
    time: chapterTime
  };
  nextOverrides.clips[clip.clipKey] = {
    title: clipTitle,
    type: clipType
  };
  const nextMetadata = { ...metadata, navTitle: clipTitle };

  const historyFiles = [overridesPath, metadataPath];
  let shouldWriteReport = false;
  let shouldWriteChapterJson = false;

  if (hasSingleSourceChapter && reportChapter) {
    reportChapter.title = chapterTitle;
    reportChapter.time = chapterTime;
    shouldWriteReport = true;
  }
  if (reportClip) {
    reportClip.title = clipTitle;
    reportClip.type = clipType;
    shouldWriteReport = true;
  }
  if (reportFlatClip) {
    reportFlatClip.title = clipTitle;
    reportFlatClip.type = clipType;
    shouldWriteReport = true;
  }
  if (chapterJson && hasSingleSourceChapter) {
    chapterJson.title = chapterTitle;
    chapterJson.time = chapterTime;
    shouldWriteChapterJson = true;
  }
  if (chapterClip) {
    chapterClip.title = clipTitle;
    chapterClip.type = clipType;
    shouldWriteChapterJson = true;
  }
  if (shouldWriteReport) {
    historyFiles.push(reportFile);
  }
  if (shouldWriteChapterJson) {
    historyFiles.push(chapterJsonPath);
  }

  await writeAdminHistorySnapshot(`sidebar-${clip.clipKey}`, historyFiles);
  if (shouldWriteReport) {
    await writeJsonFile(reportFile, report);
  }
  if (shouldWriteChapterJson) {
    await writeJsonFile(chapterJsonPath, chapterJson);
  }
  await writeJsonFile(overridesPath, nextOverrides);
  await writeJsonFile(metadataPath, nextMetadata);
  invalidateCatalogCache(activeCourse.sourceRoot);

  return sendJson(res, 200, {
    ok: true,
    savedAt: new Date().toISOString(),
    sidebar: {
      chapterTitle,
      chapterTime,
      clipTitle,
      clipType
    }
  });
}

async function handleAdminClipAssets(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const activeCourse = await resolveActiveCourse(currentUser, urlObj);
  const catalog = await getCatalog(activeCourse);
  const pathnameParts = urlObj.pathname.split("/").filter(Boolean);
  const clipKey = normalizeWs(
    decodeURIComponent(pathnameParts[pathnameParts.length - 1] || "")
  ).toLowerCase();
  const clip = resolveCatalogClip(catalog, clipKey);

  if (!clip) {
    return sendJson(res, 404, { ok: false, error: "클립을 찾을 수 없습니다." });
  }

  if (req.method === "GET") {
    const assets = await listClipAssets(activeCourse.courseCode, clip);
    return sendJson(res, 200, {
      ok: true,
      clip: {
        clipKey: clip.clipKey,
        route: clip.route,
        chapterNum: clip.chapterNum
      },
      assets,
      upload: {
        targetDir: "assets/",
        maxBytes: MAX_ADMIN_ASSET_BYTES,
        maxBytesLabel: formatByteSize(MAX_ADMIN_ASSET_BYTES),
        allowedExtensions: Array.from(ALLOWED_ADMIN_ASSET_EXTENSIONS)
      }
    });
  }

  if (req.method === "DELETE") {
    const payload = await readRequestJson(req);
    const relativePath = String(payload.relativePath || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (!relativePath || relativePath.includes("..")) {
      return sendJson(res, 400, { ok: false, error: "삭제할 자산 경로가 올바르지 않습니다." });
    }

    const targetPath = path.resolve(clip.folderAbsolute, relativePath);
    if (!targetPath.startsWith(clip.folderAbsolute)) {
      return sendJson(res, 400, { ok: false, error: "유효하지 않은 자산 경로입니다." });
    }

    const baseName = path.basename(targetPath);
    if (SOURCE_CONTROL_FILES.has(baseName)) {
      return sendJson(res, 400, { ok: false, error: "교재 원본 파일은 여기서 삭제할 수 없습니다." });
    }

    if (!(await pathExists(targetPath))) {
      return sendJson(res, 404, { ok: false, error: "삭제할 자산을 찾을 수 없습니다." });
    }

    await writeAdminHistorySnapshot(`clip-asset-delete-${clip.clipKey}`, [targetPath]);
    await fs.unlink(targetPath);

    return sendJson(res, 200, {
      ok: true,
      deletedAt: new Date().toISOString(),
      relativePath
    });
  }

  const payload = await readRequestJson(req);
  const originalName = sanitizeAssetFileName(payload.fileName || "");
  const ext = path.extname(originalName).toLowerCase();
  const base64 = String(payload.contentBase64 || "").trim();

  if (!originalName || !ext) {
    return sendJson(res, 400, { ok: false, error: "파일 이름이 올바르지 않습니다." });
  }

  if (!ALLOWED_ADMIN_ASSET_EXTENSIONS.has(ext)) {
    return sendJson(res, 400, {
      ok: false,
      error: `지원하지 않는 파일 형식입니다. (${ext})`
    });
  }

  if (!base64) {
    return sendJson(res, 400, { ok: false, error: "업로드할 파일 내용이 비어 있습니다." });
  }

  let content;
  try {
    content = Buffer.from(base64, "base64");
  } catch {
    return sendJson(res, 400, { ok: false, error: "파일 인코딩을 읽을 수 없습니다." });
  }

  if (!content.length) {
    return sendJson(res, 400, { ok: false, error: "업로드할 파일 내용이 비어 있습니다." });
  }

  if (content.length > MAX_ADMIN_ASSET_BYTES) {
    return sendJson(res, 400, {
      ok: false,
      error: `파일 용량은 ${formatByteSize(MAX_ADMIN_ASSET_BYTES)} 이하로 업로드해 주세요.`
    });
  }

  const assetDir = path.join(clip.folderAbsolute, "assets");
  await fs.mkdir(assetDir, { recursive: true });

  const stem = path.basename(originalName, ext) || "asset";
  let candidateName = `${stem}${ext}`;
  let relativePath = `assets/${candidateName}`;
  let targetPath = path.join(clip.folderAbsolute, relativePath);
  let suffix = 2;

  while (await pathExists(targetPath)) {
    candidateName = `${stem}-${suffix}${ext}`;
    relativePath = `assets/${candidateName}`;
    targetPath = path.join(clip.folderAbsolute, relativePath);
    suffix += 1;
  }

  await fs.writeFile(targetPath, content);

  const stat = await fs.stat(targetPath);
  const url = buildCourseFileUrl(activeCourse.courseCode, clip.clipKey, relativePath);

  return sendJson(res, 200, {
    ok: true,
    uploadedAt: new Date().toISOString(),
    asset: {
      name: candidateName,
      relativePath,
      url,
      size: stat.size,
      sizeLabel: formatByteSize(stat.size),
      ext,
      mime: MIME_MAP[ext] || "application/octet-stream",
      kind: classifyAssetKind(ext)
    }
  });
}

async function handleAdminPublishStatus(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const git = await getGitPublishStatus();
  return sendJson(res, 200, {
    ok: true,
    git
  });
}

async function handleAdminPublish(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { ok: false, error: "관리자 권한이 필요합니다." });
  }

  const payload = await readRequestJson(req);
  const message = normalizeWs(payload.message || "") || "Publish root editor updates";
  const before = await getGitPublishStatus();
  const branch = before.branch || "main";

  if (before.behind > 0) {
    return sendJson(res, 409, {
      ok: false,
      error: "현재 로컬 브랜치가 원격보다 뒤처져 있습니다. 먼저 터미널에서 pull/rebase 후 다시 시도해 주세요.",
      git: before
    });
  }

  const operations = [];
  const stageTargets = [
    ...before.publishable.tracked.map((item) => item.path),
    ...before.publishable.untracked.map((item) => item.path)
  ];

  if (stageTargets.length) {
    await runGit(["add", "-A", "--", ...stageTargets]);
    try {
      await runGit(["commit", "-m", message]);
      operations.push("commit");
    } catch (error) {
      const stderr = String(error?.stderr || error?.message || "");
      if (!/nothing to commit/i.test(stderr)) {
        throw error;
      }
    }
  }

  const afterCommit = await getGitPublishStatus();
  if (afterCommit.ahead > 0) {
    await runGit(["push", "origin", branch]);
    operations.push("push");
  } else if (!operations.length) {
    return sendJson(res, 400, {
      ok: false,
      error: "push할 변경 사항이 없습니다.",
      git: afterCommit
    });
  }

  const afterPush = await getGitPublishStatus();
  return sendJson(res, 200, {
    ok: true,
    operations,
    git: afterPush
  });
}

async function handleBuilderState(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === currentUser.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  dbUser.builder = ensureBuilderShape(dbUser.builder);

  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      builder: dbUser.builder
    });
  }

  const payload = await readRequestJson(req);
  if (!payload.builder || typeof payload.builder !== "object") {
    return sendJson(res, 400, {
      ok: false,
      error: "builder 데이터가 필요합니다."
    });
  }

  dbUser.builder = ensureBuilderShape(payload.builder);
  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    builder: dbUser.builder
  });
}

async function handleBuilderProjectFromTemplate(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  const payload = await readRequestJson(req);
  const template = normalizeWs(payload.template || "ax-camp");
  const projectName = normalizeWs(payload.name || "");

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === currentUser.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  const builder = ensureBuilderShape(dbUser.builder);
  const project = createProjectFromTemplate(template, projectName);
  builder.projects = [...builder.projects, project].slice(0, 20);
  builder.activeProjectId = project.projectId;
  dbUser.builder = ensureBuilderShape(builder);
  await writeDb(db);

  return sendJson(res, 200, {
    ok: true,
    project,
    builder: dbUser.builder
  });
}

async function handleBuilderExport(req, res, urlObj) {
  const currentUser = await resolveUserFromRequest(req, urlObj);
  if (!currentUser) {
    return sendJson(res, 401, { ok: false, error: "로그인이 필요합니다." });
  }

  const projectId = normalizeWs(urlObj.searchParams.get("projectId"));
  if (!projectId) {
    return sendJson(res, 400, {
      ok: false,
      error: "projectId가 필요합니다."
    });
  }

  const db = await readDb();
  const dbUser = db.users.find((item) => item.accountId === currentUser.accountId);
  if (!dbUser) {
    return sendJson(res, 404, { ok: false, error: "사용자를 찾을 수 없습니다." });
  }

  const builder = ensureBuilderShape(dbUser.builder);
  const project = builder.projects.find((item) => item.projectId === projectId);
  if (!project) {
    return sendJson(res, 404, { ok: false, error: "프로젝트를 찾을 수 없습니다." });
  }

  return sendJson(res, 200, {
    ok: true,
    exportBundle: buildBuilderExport(project)
  });
}

async function handleCourseFile(req, res, urlObj) {
  const parts = urlObj.pathname.split("/").filter(Boolean);
  if (parts.length < 3) {
    return sendJson(res, 404, { ok: false, error: "파일 경로가 올바르지 않습니다." });
  }

  const directory = await loadCourseDirectory();
  const maybeCourseCode = normalizeCourseCode(decodeURIComponent(parts[1] || ""));
  let course = directory.byCode.get(DEFAULT_COURSE_CODE) || defaultCourseContext();
  let clipKey = "";
  let requested = "";

  if (parts.length >= 4 && directory.byCode.has(maybeCourseCode)) {
    course = directory.byCode.get(maybeCourseCode);
    clipKey = decodeURIComponent(parts[2] || "");
    requested = parts.slice(3).join("/");
  } else {
    clipKey = decodeURIComponent(parts[1] || "");
    requested = parts.slice(2).join("/");
  }

  const catalog = await getCatalog(course);
  const clip = resolveCatalogClip(catalog, clipKey);
  if (!clip) {
    return sendJson(res, 404, { ok: false, error: "클립을 찾을 수 없습니다." });
  }

  const targetPath = path.resolve(clip.folderAbsolute, requested);
  if (!targetPath.startsWith(clip.folderAbsolute)) {
    return sendJson(res, 400, { ok: false, error: "유효하지 않은 파일 요청입니다." });
  }

  if (!(await pathExists(targetPath))) {
    return sendJson(res, 404, { ok: false, error: "파일이 없습니다." });
  }

  const ext = path.extname(targetPath).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const content = await fs.readFile(targetPath);

  res.writeHead(200, { "Content-Type": mime });
  res.end(content);
}

async function handlePracticeFile(req, res, urlObj) {
  const parts = urlObj.pathname.split("/").filter(Boolean);
  const key = normalizeWs(decodeURIComponent(parts[1] || ""));
  const relativePath = PRACTICE_FILE_MAP[key];

  if (!relativePath) {
    return sendJson(res, 404, {
      ok: false,
      error: "요청한 실습 파일 키를 찾을 수 없습니다."
    });
  }

  const targetPath = path.resolve(SOURCE_ROOT, relativePath);
  if (!targetPath.startsWith(SOURCE_ROOT)) {
    return sendJson(res, 400, {
      ok: false,
      error: "유효하지 않은 파일 요청입니다."
    });
  }

  if (!(await pathExists(targetPath))) {
    return sendJson(res, 404, {
      ok: false,
      error: "실습 파일이 존재하지 않습니다."
    });
  }

  const stat = await fs.stat(targetPath);
  if (stat.isDirectory()) {
    return sendJson(res, 400, {
      ok: false,
      error: "디렉터리는 다운로드할 수 없습니다."
    });
  }

  const ext = path.extname(targetPath).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const content = await fs.readFile(targetPath);
  const fileName = path.basename(targetPath);

  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": content.length,
    "Content-Disposition": makeAttachmentHeader(fileName)
  });
  res.end(content);
}

async function handleStatic(req, res, urlObj) {
  let requestPath = urlObj.pathname === "/" ? "/index.html" : urlObj.pathname;
  requestPath = requestPath.replace(/^\/+/, "");

  const targetPath = path.resolve(PUBLIC_DIR, requestPath);
  if (!targetPath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 400, "text/plain; charset=utf-8", "Bad request");
  }

  if (!(await pathExists(targetPath))) {
    return sendText(res, 404, "text/plain; charset=utf-8", "Not found");
  }

  const stat = await fs.stat(targetPath);
  if (stat.isDirectory()) {
    return sendText(res, 403, "text/plain; charset=utf-8", "Forbidden");
  }

  const ext = path.extname(targetPath).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const content = await fs.readFile(targetPath);

  res.writeHead(200, { "Content-Type": mime });
  res.end(content);
}

async function route(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && urlObj.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "ax-literacy" });
  }

  if (req.method === "GET" && urlObj.pathname === "/api/courses") {
    return handleGetCourses(req, res);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/signup") {
    return handleSignup(req, res);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/login") {
    return handleLogin(req, res);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/logout") {
    return handleLogout(req, res, urlObj);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/password-hint") {
    return handlePasswordHint(req, res);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/password-recover") {
    return handlePasswordRecover(req, res);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/account") {
    return handleAccountUpdate(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname === "/api/me") {
    return handleGetMe(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname === "/api/chapters") {
    return handleGetChapters(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname.startsWith("/api/clips/")) {
    return handleGetClip(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    urlObj.pathname === "/api/progress"
  ) {
    return handleProgress(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    urlObj.pathname === "/api/ax-task"
  ) {
    return handleAxTask(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    urlObj.pathname === "/api/notes"
  ) {
    return handleNotes(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname === "/api/admin/users") {
    return handleAdminUsers(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    urlObj.pathname.startsWith("/api/admin/clip-source/")
  ) {
    return handleAdminClipSource(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    urlObj.pathname.startsWith("/api/admin/sidebar-source/")
  ) {
    return handleAdminSidebarSource(req, res, urlObj);
  }

  if (
    (req.method === "GET" || req.method === "POST" || req.method === "DELETE") &&
    urlObj.pathname.startsWith("/api/admin/clip-assets/")
  ) {
    return handleAdminClipAssets(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname === "/api/admin/publish-status") {
    return handleAdminPublishStatus(req, res, urlObj);
  }

  if (req.method === "POST" && urlObj.pathname === "/api/admin/publish") {
    return handleAdminPublish(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname.startsWith("/course-files/")) {
    return handleCourseFile(req, res, urlObj);
  }

  if (req.method === "GET" && urlObj.pathname.startsWith("/practice-files/")) {
    return handlePracticeFile(req, res, urlObj);
  }

  if (req.method === "GET") {
    return handleStatic(req, res, urlObj);
  }

  return sendText(res, 405, "text/plain; charset=utf-8", "Method not allowed");
}

async function start() {
  await ensureDb();
  await ensureRootUser();
  await getCatalog();

  const server = http.createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      console.error("[AX_Literacy] request error:", error);
      if (String(error?.message || "").includes("Request body too large")) {
        sendJson(res, 413, {
          ok: false,
          error: `요청 본문이 너무 큽니다. ${formatByteSize(MAX_REQUEST_BODY_BYTES)} 이하로 줄여 주세요.`
        });
        return;
      }
      sendJson(res, 500, { ok: false, error: "서버 오류가 발생했습니다." });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[AX_Literacy] running on http://${HOST}:${PORT}`);
    console.log(`[AX_Literacy] source chapters: ${CHAPTERS_DIR}`);
  });
}

start().catch((error) => {
  console.error("[AX_Literacy] startup failed:", error);
  process.exit(1);
});
