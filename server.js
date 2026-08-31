const http = require("http");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const compiler = require("./scripts/compiler");

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
const PRACTICE_ROOT_REL = "[공유용] LG 리더십 향상 with AI 실습자료";
const PRACTICE_FILE_MAP = {
  "all-zip": "practice_zips/LG_AX_Camp_For_Leaders_practice_all.zip",
  "ch04-zip": "practice_zips/CH04_NotebookLM_practice.zip",
  "1iKGcE5A6LldmVDV8evPlreUTT2fcfmGL": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/03_EXAONE_가상_기밀보고서.md`,
  "1xJtcpem3mt4aWAKx08SfXjR9QxtIPSsO": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/TB 26-01-03 샤오미 EV 혁신 방정식 - 자동차 산업의 시간과 비용을 재정의하다.pdf`,
  "1h2CfdVLN6Bx4SkUhQW-dL7VZAHfWTnAc": `${PRACTICE_ROOT_REL}/CH02-EXAONE_보안AI/06_EXAONE_3단계_프롬프트.md`,
  "1xFco3cSTZApWXSG5iWY04K50GMmFCO9N": `${PRACTICE_ROOT_REL}/CH03-01-Gemini_회의분석/02_회의_맥락_참고자료.md`,
  "1B-zoWWsqVynVUiRqm7lrLcoW68gWQ-86": `${PRACTICE_ROOT_REL}/CH03-01-Gemini_회의분석/07_Gemini_단일흐름_프롬프트.md`,
  "1SQgCgDVWwXBjK93LwaI3m4vRgOuMQop_": `${PRACTICE_ROOT_REL}/CH03-02-Gems_AI어시스턴트/08_Gems_시스템_인스트럭션.md`,
  "1cFef9M4qSs5lBz-v8tJrOiMRIDsdlMkK": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/WEF_Future_of_Jobs_Report_2025.pdf`,
  "1D2co02HGXX1a-WEgVLjIuIyl3gcNH61_": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/gx-global-powers-of-luxury-goods-2023.pdf`,
  "1rUUUqSBenQZAUnM-53nKHajIX9sA_azI": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/global-powers-of-luxury-goods-2026.pdf`,
  "1MzJFg7xjyU5tiaulI-DyKBUYPxkQMZMA": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/09_NotebookLM_프롬프트.md`,
  "1gvjUkRlvncW_qN2t59e_f83tW9rA2Ddr": `${PRACTICE_ROOT_REL}/CH04-NotebookLM_멀티소스리서치/lg-logo-red.png`,
  "1PH3gO05x64ANRdLktbKBl0GoZJ7XZ_9Q": `${PRACTICE_ROOT_REL}/CH06-바이브코딩_리서치앱/10_바이브코딩_리서치앱_프롬프트.md`,
  // 260810: CH02-4 팀 토론 대화문(샘플) 로컬화 — 본문 href의 Drive URL이 이 키로 자동 치환됨(rewritePracticeDriveUrls)
  "11Nm5kKmZk16Fj57ZJgYDRUc7gw3fBKdX": `${PRACTICE_ROOT_REL}/CH02-04-팀토론_대화문/팀_토론_대화문_샘플.pdf`
};

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 4071);
const EXCLUDED_CLIP_KEYS = new Set([]);

// 이 Set은 숨겨진 챕터/클립의 canonical 키 목록으로, 해시 직접 접근 시 안전 처리에 사용됩니다.
// (구 visibleBlueprints 배열은 폐기됨 — 목차는 export-report.json + visible-catalog-overrides.json이 단일 원천)
const HIDDEN_CHAPTER_CLIP_KEYS = new Set([]);
const SKIP_TITLE_KEYWORDS = new Set(["개념", "실습", "참고", "개요", "플랫폼", "심화"]);
const ALLOWED_SECTION_TYPES = new Set([
  "개념",
  "실습",
  "플랫폼",
  "설정",
  "참고",
  "개요",
  "토론",
  "퀴즈",
  "팀 토론",
  "통합·저장",
  "실천·성찰"
]);
// 소스(chapter.json/export-report)의 변형 표기를 허용 타입으로 흡수한다.
const SECTION_TYPE_ALIASES = new Map([
  ["팀토론", "팀 토론"],
  ["통합 실습", "실습"],
  ["플랫폼·실습", "플랫폼"]
]);
const ALLOWED_BLOCK_KINDS = new Set([
  "overview",
  "markdown",
  "prompt",
  "checklist",
  "resource",
  "quiz",
  "note",
  "table"
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]);
const DOCUMENT_EXTENSIONS = new Set([".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".md"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);

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

  for (const line of rawLines) {
    if (/^~?\d+\s*분$/.test(line)) continue;
    if (/^CH\s*\d+/i.test(line)) continue;
    if (SKIP_TITLE_KEYWORDS.has(line)) continue;
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

function canonicalizeSectionType(type) {
  let value = normalizeWs(type);
  if (!value) return "";
  // "실천 · 성찰" → "실천·성찰", "팀 토론 · Round 1" → "팀 토론·Round 1"
  value = value.replace(/\s*·\s*/g, "·");
  // "팀 토론·Round 1" 같은 라운드 접미어 제거
  value = value.replace(/·Round\s*\d+$/i, "");
  if (SECTION_TYPE_ALIASES.has(value)) return SECTION_TYPE_ALIASES.get(value);
  return value;
}

function normalizeSectionType(type) {
  const value = canonicalizeSectionType(type);
  return ALLOWED_SECTION_TYPES.has(value) ? value : "개념";
}

function normalizeSidebarClipType(type, fallback = "개념") {
  const value = canonicalizeSectionType(type);
  if (ALLOWED_SECTION_TYPES.has(value)) return value;
  return normalizeWs(fallback) || "개념";
}

function normalizeBlockKind(kind) {
  const value = normalizeWs(kind).toLowerCase();
  return ALLOWED_BLOCK_KINDS.has(value) ? value : "markdown";
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
  // [260826] canonical→visible 매핑을 "이미 visible 키로 존재" 검사보다 우선한다.
  // 챕터 내 순서 회전(CH01 진단 선행 배치)처럼 canonical·visible 키공간이 겹치면,
  // 기존 우선순위는 파일(canonical 기준) 참조의 회전 매핑을 무시해 잘못된 클립으로 연결됐다.
  // 회전이 없는 클립은 매핑이 항등이라 동작이 그대로다. (역방향은 resolveCatalogClip이 visible 우선)
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
  if (IMAGE_EXTENSIONS.has(normalized)) {
    return "image";
  }
  if (normalized === ".pdf") return "pdf";
  if (DOCUMENT_EXTENSIONS.has(normalized)) {
    return "document";
  }
  if (AUDIO_EXTENSIONS.has(normalized)) return "audio";
  if (normalized === ".mp4") return "video";
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

function rewriteVisibleReferences(input, catalog, currentClip = null) {
  let output = String(input || "");
  if (!output || !catalog) return output;

  

  // [Revision v2] suffix route(ch02-clip03b 등)까지 통째로 매칭한다 — 2자리 고정 시 꼬리가 잘림
  output = output.replace(/#(ch\d{2}-clip\d{2}[a-z]*)/gi, (_match, rawKey) => {
    const mapped = toVisibleClipKey(catalog, rawKey);
    return mapped ? `#${mapped}` : `#${rawKey}`;
  });

  // [260826] 본문 자산 URL(/course-files/<course>/<clipKey>/…)의 클립 키도 해시 링크와 동일하게
  // canonical→visible로 재작성한다. 챕터 내 순서 회전(CH01)으로 키공간이 겹치면, canonical 그대로의
  // URL이 visible 우선 해석(handleCourseFile)에서 다른 클립 폴더로 연결돼 404가 나기 때문.
  output = output.replace(/(\/course-files\/[^/"'\s]+\/)(ch\d{2}-clip\d{2}[a-z]*)(\/)/gi, (_match, prefix, rawKey, slash) => {
    const mapped = toVisibleClipKey(catalog, rawKey);
    return `${prefix}${mapped || rawKey}${slash}`;
  });

  if (currentClip && currentClip.canonicalChapterId && currentClip.chapterId) {
    const canonicalId = normalizeWs(currentClip.canonicalChapterId).toLowerCase();
    const visibleId = normalizeWs(currentClip.chapterId).toLowerCase();
    if (canonicalId !== visibleId) {
      const canonicalIndex = chapterIndexFromId(canonicalId);
      const visibleIndex = chapterIndexFromId(visibleId);
      if (canonicalIndex != null && visibleIndex != null) {
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
    }
  }

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

function rewriteCanonicalReferences(input, catalog, currentClip = null) {
  let output = String(input || "");
  if (!output || !catalog) return output;

  

  // [Revision v2] suffix route(ch02-clip03b 등)까지 통째로 매칭한다 — 2자리 고정 시 꼬리가 잘림
  output = output.replace(/#(ch\d{2}-clip\d{2}[a-z]*)/gi, (_match, rawKey) => {
    const mapped = toCanonicalClipKey(catalog, rawKey);
    return mapped ? `#${mapped}` : `#${rawKey}`;
  });

  // [260826] 자산 URL의 클립 키도 visible→canonical 역변환 (rewriteVisibleReferences의 역방향 —
  // 편집기 저장 시 화면 기준 URL을 파일 저장용 canonical 기준으로 되돌린다)
  output = output.replace(/(\/course-files\/[^/"'\s]+\/)(ch\d{2}-clip\d{2}[a-z]*)(\/)/gi, (_match, prefix, rawKey, slash) => {
    const mapped = toCanonicalClipKey(catalog, rawKey);
    return `${prefix}${mapped || rawKey}${slash}`;
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
    .replace(/<!--[\s\S]*?-->/g, " ")
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
    pageTitle: existingMetadata?.pageTitle || "성과향상 with AI | LG",
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
  return compiler.buildCatalog(sourceRoot);
}

async function readCatalogVersion(sourceRoot) {
  return compiler.readCatalogVersion(sourceRoot);
}

async function getCatalog(courseContext) {
  const context = courseContext || defaultCourseContext();
  return compiler.getCatalog(context.sourceRoot || SOURCE_ROOT);
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
      catalog,
      clip
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
  const badges = baseBadges.map((badge) => rewriteVisibleReferences(badge, catalog, clip));

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
  let clipKey = pathnameParts[pathnameParts.length - 1];
  const user = await resolveUserFromRequest(req, urlObj);
  const course = await resolveActiveCourse(user, urlObj);
  let payload = await resolveClipPayload(clipKey, course);

  if (!payload) {
    const normalizedKey = normalizeWs(clipKey).toLowerCase();
    const isHiddenKey = normalizedKey.startsWith("ch04-") ||
      normalizedKey.startsWith("ch05-") ||
      HIDDEN_CHAPTER_CLIP_KEYS.has(normalizedKey);
    if (isHiddenKey) {
      const catalog = await getCatalog(course);
      const firstChapter = catalog.chapters?.[0];
      const firstClip = firstChapter?.clips?.[0];
      if (firstClip) {
        clipKey = firstClip.clipKey;
        payload = await resolveClipPayload(clipKey, course);
      }
    }
  }

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

// [SECURITY 2026-07-23] 음성 공유 업로드/목록/삭제 핸들러 제거 (Revision v2 보안 조치)

/* ============ [Wrapup] Round 팀 토론 개인 제출·차수 관리 (1단계) ============ */
const WRAPUP_DIR = path.join(DATA_DIR, "wrapup");
const WRAPUP_CONFIG_FILE = path.join(WRAPUP_DIR, "config.json");
const WRAPUP_ROUNDS = new Set(["round1", "round2", "round3"]);

function wrapupSafeSegment(input) {
  // 경로 조작 방지: 한글·영문·숫자·-·_·차수 표기만 허용
  return normalizeWs(input).replace(/[^0-9A-Za-z가-힣\-_]/g, "_").slice(0, 40);
}

async function readWrapupConfig() {
  await fs.mkdir(WRAPUP_DIR, { recursive: true });
  const fallbackCohort = `${new Date().toISOString().slice(0, 10)}차수`;
  const config = await readJsonFileSafe(WRAPUP_CONFIG_FILE, null);
  if (!config) {
    const initial = { currentCohort: fallbackCohort, teamCount: 6 };
    await fs.writeFile(WRAPUP_CONFIG_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  return {
    currentCohort: wrapupSafeSegment(config.currentCohort) || fallbackCohort,
    teamCount: Math.min(Math.max(parseInt(config.teamCount, 10) || 6, 1), 20)
  };
}

function wrapupRoundDir(cohort, round) {
  return path.join(WRAPUP_DIR, wrapupSafeSegment(cohort), round);
}

async function listWrapupSubmissions(cohort, round) {
  const dir = wrapupRoundDir(cohort, round);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir);
  const items = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const item = await readJsonFileSafe(path.join(dir, file), null);
    if (item && item.id) items.push(item);
  }
  items.sort((a, b) => (a.team - b.team) || String(a.name).localeCompare(String(b.name), "ko"));
  return items;
}

async function handleWrapupConfig(req, res) {
  const config = await readWrapupConfig();
  return sendJson(res, 200, { ok: true, cohort: config.currentCohort, teamCount: config.teamCount });
}

async function handleWrapupSubmit(req, res) {
  const payload = await readRequestJson(req);
  const config = await readWrapupConfig();

  const round = normalizeWs(payload.round).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  const team = parseInt(payload.team, 10);
  if (!(team >= 1 && team <= config.teamCount)) {
    return sendJson(res, 400, { ok: false, error: `팀은 1~${config.teamCount}팀 중에서 선택해 주세요.` });
  }
  const name = normalizeWs(payload.name);
  if (name.length < 2 || name.length > 20) {
    return sendJson(res, 400, { ok: false, error: "이름은 2~20자로 입력해 주세요." });
  }
  const markdown = String(payload.markdown || "");
  if (!markdown.trim()) {
    return sendJson(res, 400, { ok: false, error: "제출할 작성 내용이 비어 있습니다. Canvas를 작성한 뒤 제출해 주세요." });
  }
  if (markdown.length > 200000) {
    return sendJson(res, 400, { ok: false, error: "제출 내용이 너무 큽니다." });
  }

  const dir = wrapupRoundDir(config.currentCohort, round);
  await fs.mkdir(dir, { recursive: true });
  const id = `${team}조_${wrapupSafeSegment(name)}`;
  const filePath = path.join(dir, `${id}.json`);
  const existing = await readJsonFileSafe(filePath, null);
  const now = new Date().toISOString();
  const record = {
    id,
    team,
    name,
    round,
    cohort: config.currentCohort,
    markdown,
    submittedAt: existing?.submittedAt || now,
    updatedAt: now
  };
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

  /* [팀 대표 파일] 기록 담당이 ☑ 팀 대표(합의본) 체크로 제출하면 팀 단위로도 저장 —
     팀원들이 다음 실습에서 /api/wrapup/team-file 로 불러와 사용 (파일 공유 불필요) */
  const teamRep = payload.teamRep === true || payload.teamRep === "true";
  if (teamRep) {
    const repDir = path.join(dir, "teamfile");
    await fs.mkdir(repDir, { recursive: true });
    const repRecord = { team, round, cohort: config.currentCohort, name, markdown, updatedAt: now };
    await fs.writeFile(path.join(repDir, `${team}.json`), JSON.stringify(repRecord, null, 2), "utf8");
  }

  return sendJson(res, 200, {
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

async function handleWrapupStatus(req, res, urlObj) {
  const config = await readWrapupConfig();
  const round = normalizeWs(urlObj.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const items = await listWrapupSubmissions(config.currentCohort, round);
  const teams = [];
  for (let t = 1; t <= config.teamCount; t++) {
    const members = items.filter((s) => s.team === t);
    teams.push({ team: t, count: members.length, names: members.map((s) => s.name) });
  }
  /* [팀 대표 파일] 제출 현황에 팀 대표(합의본) 제출 여부 포함 — 강사가 발표 전 6/6 확인용 */
  let teamReps = [];
  const repDir = path.join(wrapupRoundDir(config.currentCohort, round), "teamfile");
  if (await pathExists(repDir)) {
    const repFiles = await fs.readdir(repDir);
    teamReps = repFiles
      .filter((f) => f.endsWith(".json"))
      .map((f) => parseInt(f, 10))
      .filter((n) => n >= 1)
      .sort((a, b) => a - b);
  }
  return sendJson(res, 200, {
    ok: true,
    cohort: config.currentCohort,
    round,
    teamCount: config.teamCount,
    total: items.length,
    teams,
    teamReps
  });
}

/* [팀 대표 파일] 팀 합의본 조회 — 교육생이 다음 실습(CH02-4 등)에서 조 번호로 불러와 사용 */
async function handleWrapupTeamFile(req, res, urlObj) {
  const config = await readWrapupConfig();
  const round = normalizeWs(urlObj.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const team = parseInt(urlObj.searchParams.get("team"), 10);
  if (!(team >= 1 && team <= config.teamCount)) {
    return sendJson(res, 400, { ok: false, error: `팀은 1~${config.teamCount}팀 중에서 선택해 주세요.` });
  }
  const filePath = path.join(wrapupRoundDir(config.currentCohort, round), "teamfile", `${team}.json`);
  const record = await readJsonFileSafe(filePath, null);
  if (!record) {
    return sendJson(res, 200, {
      ok: false,
      notFound: true,
      error: "팀 합의본 파일이 없습니다. 현재는 전원이 각자 제출하는 방식입니다 — 토론 정리본 불러오기를 이용해 주세요."
    });
  }
  return sendJson(res, 200, { ok: true, record });
}

/* [강사 자료실] 로컬 모드 인증 — Worker(원격)와 동일 계약(ok:true/false).
   관리자 세션이면 통과, 아니면 WRAPUP_INSTRUCTOR_CODE 환경변수와 헤더 코드 대조. */
async function handleWrapupInstructorVerify(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (user?.isAdmin) return sendJson(res, 200, { ok: true, via: "session" });
  const given = normalizeWs(req.headers["x-wrapup-instructor"] || "");
  const localCode = normalizeWs(process.env.WRAPUP_INSTRUCTOR_CODE || "");
  if (localCode && given === localCode) return sendJson(res, 200, { ok: true, via: "code" });
  return sendJson(res, 200, { ok: false, error: "관리자 로그인 후 이용해 주세요 (로컬 모드는 코드 대신 관리자 세션으로 입장합니다)." });
}

async function requireWrapupAdmin(req, res, urlObj) {
  const user = await resolveUserFromRequest(req, urlObj);
  if (!user || !user.isAdmin) {
    sendJson(res, 403, { ok: false, error: "관리자 로그인이 필요합니다." });
    return null;
  }
  return user;
}

async function handleWrapupAdminConfig(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const payload = await readRequestJson(req);
  const current = await readWrapupConfig();
  const next = {
    currentCohort: payload.cohort !== undefined
      ? (wrapupSafeSegment(payload.cohort) || current.currentCohort)
      : current.currentCohort,
    teamCount: payload.teamCount !== undefined
      ? Math.min(Math.max(parseInt(payload.teamCount, 10) || current.teamCount, 1), 20)
      : current.teamCount
  };
  await fs.writeFile(WRAPUP_CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  return sendJson(res, 200, { ok: true, cohort: next.currentCohort, teamCount: next.teamCount });
}

async function handleWrapupAdminList(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(urlObj.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(urlObj.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const items = await listWrapupSubmissions(cohort, round);
  return sendJson(res, 200, { ok: true, cohort, round, submissions: items });
}

async function handleWrapupAdminDelete(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const payload = await readRequestJson(req);
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  const id = wrapupSafeSegment(payload.id ? String(payload.id).replace(/조_/, "조_") : "");
  if (!WRAPUP_ROUNDS.has(round) || !id) {
    return sendJson(res, 400, { ok: false, error: "round와 id가 필요합니다." });
  }
  const filePath = path.join(wrapupRoundDir(cohort, round), `${id}.json`);
  if (!(await pathExists(filePath))) {
    return sendJson(res, 404, { ok: false, error: "해당 제출물을 찾을 수 없습니다." });
  }
  await fs.unlink(filePath);
  // [260831] 이미 생성된 이 사람의 토론 정리본(canvas2)도 함께 제거 — 잘못 입력된 이름이 정리본·통합본에 남지 않도록 (없으면 무시)
  let canvas2Deleted = false;
  try {
    const canvas2Path = path.join(wrapupCanvas2Dir(cohort, round), `${id}.json`);
    if (await pathExists(canvas2Path)) {
      await fs.unlink(canvas2Path);
      canvas2Deleted = true;
    }
  } catch (e) { /* 정리본 삭제 실패는 치명적이지 않음 — 제출물 삭제 자체는 성공 */ }
  return sendJson(res, 200, { ok: true, deleted: id, canvas2Deleted });
}
/* ---- [Wrapup 2단계] Gemini Round별 요약 ---- */
const GEMINI_MODEL = normalizeWs(process.env.GEMINI_MODEL) || "gemini-3.5-flash";
const GEMINI_LITE_MODEL = normalizeWs(process.env.GEMINI_LITE_MODEL) || "gemini-3.5-flash-lite";

async function loadGeminiKey() {
  const envKey = normalizeWs(process.env.GEMINI_API_KEY || "");
  if (envKey) return envKey;
  // 환경변수가 없으면 저장소 폴더의 로컬 키 파일에서 읽는다 (gitignore 보호 파일)
  try {
    const files = fsSync
      .readdirSync(ROOT_DIR)
      .filter((f) => /^Google AI Studio_API key.*\.txt$/i.test(f));
    for (const file of files) {
      const raw = await fs.readFile(path.join(ROOT_DIR, file), "utf8");
      const match = raw.match(/(AIza[0-9A-Za-z_\-]{30,}|AQ\.[0-9A-Za-z_\-.]{20,})/);
      if (match) return match[1];
    }
  } catch {
    // ignore
  }
  return "";
}

async function callGeminiOnce(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini API 오류: ${message}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text.trim()) throw new Error("Gemini 응답이 비어 있습니다.");
  return text.trim();
}

// 원격(wrapup.html)과 동일한 폴백 정책: 기본 모델 2회 → lite 1회, 시도 사이 2초 대기.
// 무료 등급 429(할당 초과)에서도 요약이 끝까지 진행되도록 보장한다.
async function callGemini(apiKey, prompt) {
  const attempts = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_LITE_MODEL];
  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await callGeminiOnce(apiKey, attempts[i], prompt);
    } catch (error) {
      lastError = error;
      if (i < attempts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw lastError || new Error("Gemini 호출에 실패했습니다.");
}

// 동시 호출 수를 제한하며 작업 목록을 실행한다 (무료 등급 분당 할당 보호)
async function runWithConcurrency(jobs, limit) {
  const results = new Array(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

const WRAPUP_ROUND_CONTEXT = {
  round1: {
    label: "Round 1 · AI 시대, 우리 팀의 현실과 리더의 고민 (As-Is 진단)",
    mainQuestion: "AI가 우리 팀의 일하는 방식에 들어오면서, 무엇이 실제로 달라졌고 어떤 기존 문제가 더 선명하게 드러났습니까?",
    lens: "실제 업무 장면·공통 이슈·리더 행동·팀원 반응 등 현실 진단 관점"
  },
  round2: {
    label: "Round 2 · AI에게 어디까지 맡기고 리더는 어디서 책임질 것인가 (책임경계 재설계)",
    mainQuestion: "AI에게 어디까지 맡기고 리더는 어디서 책임질 것인가?",
    lens: "가짜 일 제거, AI·팀원·리더 역할 분담, 승인·중단 기준, 리더 역할 전환 관점"
  },
  round3: {
    label: "Round 3 · AI로 팀의 성과와 성장을 어떻게 함께 높일 것인가 (30일 시범 운영 설계)",
    mainQuestion: "AI로 팀의 성과와 성장을 어떻게 함께 높일 것인가?",
    lens: "30일 시범 운영 대상 업무, 팀원 성장 지원, Speak-up, 시간 재투자, 성공 판단 기준 관점"
  }
};

const WRAPUP_COMMON_RULES = [
  "규칙:",
  "- 실명, 고객명, 회사·조직을 식별할 수 있는 정보는 'OO'으로 바꿔서 표기합니다.",
  "- 제출물에 없는 내용을 지어내지 않습니다.",
  "- 각 불릿은 한 문장으로, 교육 현장에서 바로 읽을 수 있게 씁니다.",
  "- 마크다운 형식으로만 답하고, 다른 설명은 붙이지 않습니다."
].join("\n");

function wrapupTeamPrompt(round, team, submissions) {
  const ctx = WRAPUP_ROUND_CONTEXT[round];
  const bodies = submissions
    .map((s) => `--- 팀장 ${s.name}의 제출 ---\n${s.markdown}`)
    .join("\n\n");
  return [
    "당신은 리더십 교육 과정에서 팀 토론 내용을 정리해 발표를 돕는 조교입니다.",
    `토론: ${ctx.label}`,
    `핵심 질문: ${ctx.mainQuestion}`,
    `아래는 ${team}팀 팀장들이 각자 제출한 논의 내용입니다 (${submissions.length}건).`,
    "",
    bodies,
    "",
    "위 내용을 통합해 다음 형식의 마크다운으로만 정리하세요:",
    "### 핵심 논점",
    "- (3~5개 불릿 — 팀이 실제로 논의한 내용 중심)",
    "### 발표 포인트",
    "1. (팀 발표자가 1분 발표에 쓸 첫 번째 포인트)",
    "2. (두 번째 포인트)",
    "### 팀 내 관점 차이",
    "- (제출물 간 시각 차이가 있으면 1~2개, 없으면 '뚜렷한 이견 없음')",
    "",
    WRAPUP_COMMON_RULES
  ].join("\n");
}

function wrapupCrossPrompt(round, teamBlocks) {
  const ctx = WRAPUP_ROUND_CONTEXT[round];
  return [
    "당신은 리더십 교육의 강사를 돕는 조교입니다. 아래는 팀별 토론 요약입니다.",
    `토론: ${ctx.label}`,
    `핵심 질문: ${ctx.mainQuestion}`,
    "",
    teamBlocks,
    "",
    "전체 팀을 관통하는 분석을 다음 형식의 마크다운으로만 작성하세요:",
    "### 공통 이슈 TOP 3",
    "1. (여러 팀에서 반복된 고민·이슈)",
    "2. ...",
    "3. ...",
    "### 팀별로 갈린 관점",
    "- (팀 간 시각이 달랐던 지점 1~3개, 어느 팀이 어떤 입장인지 포함)",
    "### 강사 마무리 멘트 제안",
    "- (강사가 Wrap-up에서 쓸 수 있는 2~3문장 멘트 1개)",
    "",
    WRAPUP_COMMON_RULES
  ].join("\n");
}

function wrapupComparePrompt(round, currentCross, pastBlocks) {
  const ctx = WRAPUP_ROUND_CONTEXT[round];
  return [
    "당신은 리더십 교육의 강사를 돕는 조교입니다. 같은 주제로 여러 차수(기수)의 토론이 진행되었습니다.",
    `토론: ${ctx.label}`,
    "",
    "[이번 차수 교차 분석]",
    currentCross,
    "",
    "[지난 차수 교차 분석]",
    pastBlocks,
    "",
    "다음 형식의 마크다운으로만 작성하세요:",
    "### 차수가 바뀌어도 반복되는 공통 고민",
    "- (1~3개)",
    "### 이번 차수에서 새로 등장한 관점",
    "- (1~3개, 없으면 '뚜렷한 새 관점 없음')",
    "",
    WRAPUP_COMMON_RULES
  ].join("\n");
}

function wrapupSummaryFile(cohort, round) {
  return path.join(wrapupRoundDir(cohort, round), "summary.json");
}

async function listWrapupCohorts() {
  if (!(await pathExists(WRAPUP_DIR))) return [];
  const entries = await fs.readdir(WRAPUP_DIR, { withFileTypes: true });
  // .git 등 숨김 폴더는 차수가 아니다 (원격 동기화 후 .git이 차수 목록에 노출되는 것 방지)
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort();
}

async function handleWrapupSummarize(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const payload = await readRequestJson(req);
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  const apiKey = await loadGeminiKey();
  if (!apiKey) {
    return sendJson(res, 400, {
      ok: false,
      error: "Gemini API 키를 찾을 수 없습니다. GEMINI_API_KEY 환경변수 또는 'Google AI Studio_API key*.txt' 파일을 확인해 주세요."
    });
  }
  const submissions = await listWrapupSubmissions(cohort, round);
  if (!submissions.length) {
    return sendJson(res, 400, { ok: false, error: "제출된 논의 내용이 없습니다. 교육생 제출 후 다시 실행해 주세요." });
  }

  // 팀별 요약은 동시 3개로 제한해 병렬 실행 (전체 동시 호출은 무료 등급 429를 자초)
  const teamJobs = [];
  for (let t = 1; t <= config.teamCount; t++) {
    const members = submissions.filter((s) => s.team === t);
    if (!members.length) continue;
    teamJobs.push(async () => {
      const entry = { team: t, memberCount: members.length, names: members.map((s) => s.name) };
      try {
        entry.summary = await callGemini(apiKey, wrapupTeamPrompt(round, t, members));
      } catch (error) {
        entry.error = String(error.message || error);
      }
      return entry;
    });
  }
  const teams = (await runWithConcurrency(teamJobs, 3)).sort((a, b) => a.team - b.team);

  let cross = "";
  let crossError = "";
  const okTeams = teams.filter((t) => t.summary);
  if (okTeams.length >= 2) {
    const blocks = okTeams.map((t) => `## ${t.team}팀 요약\n${t.summary}`).join("\n\n");
    try {
      cross = await callGemini(apiKey, wrapupCrossPrompt(round, blocks));
    } catch (error) {
      crossError = String(error.message || error);
    }
  } else if (okTeams.length === 1) {
    cross = "(참여 팀이 1개뿐이라 교차 분석을 생략했습니다)";
  }

  // 차수 비교: 다른 차수의 같은 라운드 교차 분석이 있으면 최근 2개까지 비교
  let cohortCompare = "";
  try {
    const cohorts = (await listWrapupCohorts()).filter((c) => c !== cohort);
    const pastCrosses = [];
    for (const past of cohorts.slice(-2)) {
      const pastSummary = await readJsonFileSafe(wrapupSummaryFile(past, round), null);
      if (pastSummary?.cross && !String(pastSummary.cross).startsWith("(")) {
        pastCrosses.push(`[${past}]\n${pastSummary.cross}`);
      }
    }
    if (cross && pastCrosses.length) {
      cohortCompare = await callGemini(apiKey, wrapupComparePrompt(round, cross, pastCrosses.join("\n\n")));
    }
  } catch {
    // 차수 비교 실패는 치명적이지 않음
  }

  const summary = {
    ok: true,
    round,
    cohort,
    model: GEMINI_MODEL,
    generatedAt: new Date().toISOString(),
    teamCount: config.teamCount,
    submissionTotal: submissions.length,
    teams,
    cross,
    crossError: crossError || undefined,
    cohortCompare: cohortCompare || undefined
  };
  await fs.mkdir(wrapupRoundDir(cohort, round), { recursive: true });
  await fs.writeFile(wrapupSummaryFile(cohort, round), JSON.stringify(summary, null, 2), "utf8");
  return sendJson(res, 200, summary);
}

async function handleWrapupSummary(req, res, urlObj) {
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(urlObj.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(urlObj.searchParams.get("round")).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round 파라미터가 필요합니다 (round1~round3)." });
  }
  const summary = await readJsonFileSafe(wrapupSummaryFile(cohort, round), null);
  if (!summary) {
    return sendJson(res, 404, { ok: false, error: "아직 생성된 요약이 없습니다. 강사가 '요약 생성'을 실행하면 표시됩니다." });
  }
  return sendJson(res, 200, summary);
}

async function handleWrapupCohorts(req, res) {
  const config = await readWrapupConfig();
  const cohorts = await listWrapupCohorts();
  return sendJson(res, 200, { ok: true, current: config.currentCohort, cohorts });
}

/* ---- [Wrapup 5단계] 개인별 토론 정리본 (팀 합의 + 개인 원문 결정형 병합) ---- */
// 원칙: AI 호출 없이 개인 제출 원문(우선·전문 보존)과 팀 요약(참고)을 고정 템플릿으로 합친다.
// 생성·저장(POST)은 강사 전용, 조회(GET)는 저장본이 없거나 구버전이면 즉석 병합으로 항상 응답한다.
const WRAPUP_ROUND_SEQ = ["round1", "round2", "round3"];

function wrapupCanvas2Dir(cohort, round) {
  return path.join(wrapupRoundDir(cohort, round), "canvas2");
}

// 팀 요약 마크다운을 '합의(핵심 논점·발표 포인트)'와 '팀 내 관점 차이'로 분리
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
  const ctx = WRAPUP_ROUND_CONTEXT[round];
  const { consensus, diff } = splitWrapupTeamSummary(teamEntry?.summary);
  const pendingNote = "_(팀 합의 요약이 아직 생성되지 않았습니다 — 강사가 Wrap-up 보드에서 '요약 생성'을 실행하면 반영됩니다.)_";
  return [
    `# ${ctx.label} · 토론 정리본 — ${submission.name} (${submission.team}팀)`,
    "",
    "> **문서 구성 안내** — ① 나의 결론(개인 작성 원문·우선) ② 팀 공통 합의(참고) ③ 팀 내 관점 차이 순서입니다.",
    "> 직군·직무·근속·경험에 따른 개인 작성 내용이 우선이며, 팀 합의는 참고 계층입니다.",
    `> 원본 제출: ${submission.updatedAt || "-"} · 팀 요약 기준: ${summaryMeta?.generatedAt || "미생성"}`,
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
  const teamEntry = summary?.teams?.find?.((t) => t.team === submission.team) || null;
  return {
    id: submission.id,
    team: submission.team,
    name: submission.name,
    round,
    cohort,
    markdown: buildCanvas2Markdown(round, submission, teamEntry, summary),
    method: "template",
    sourceUpdatedAt: submission.updatedAt || null,
    summaryGeneratedAt: summary?.generatedAt || null,
    generatedAt: new Date().toISOString()
  };
}

// 저장본이 최신이면 그대로, 없거나 원본 제출·팀 요약보다 오래됐으면 즉석 병합(저장하지 않음)
async function getWrapupCanvas2(cohort, round, team, name) {
  const id = `${team}조_${wrapupSafeSegment(name)}`;
  const submission = await readJsonFileSafe(path.join(wrapupRoundDir(cohort, round), `${id}.json`), null);
  if (!submission || !submission.id) return null;
  const summary = await readJsonFileSafe(wrapupSummaryFile(cohort, round), null);
  const stored = await readJsonFileSafe(path.join(wrapupCanvas2Dir(cohort, round), `${id}.json`), null);
  const fresh = stored &&
    stored.sourceUpdatedAt === (submission.updatedAt || null) &&
    stored.summaryGeneratedAt === (summary?.generatedAt || null);
  if (fresh) return { record: stored, stored: true };
  return { record: buildCanvas2Record(cohort, round, submission, summary), stored: false };
}

async function handleWrapupCanvas2Get(req, res, urlObj) {
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(urlObj.searchParams.get("cohort")) || config.currentCohort;
  const round = normalizeWs(urlObj.searchParams.get("round")).toLowerCase();
  const team = parseInt(urlObj.searchParams.get("team"), 10);
  const name = normalizeWs(urlObj.searchParams.get("name"));
  if (!WRAPUP_ROUNDS.has(round) || !(team >= 1) || name.length < 2) {
    return sendJson(res, 400, { ok: false, error: "round, team, name 파라미터가 필요합니다." });
  }
  const result = await getWrapupCanvas2(cohort, round, team, name);
  if (!result) {
    return sendJson(res, 404, { ok: false, error: "해당 라운드의 제출물이 없습니다. 먼저 Team Canvas를 제출해 주세요." });
  }
  return sendJson(res, 200, { ok: true, stored: result.stored, canvas2: result.record });
}

// R1~3 토론 정리본을 한 사람 기준으로 통합 — CH04 NotebookLM 업로드용 (자동 목차 포함)
async function handleWrapupCanvas2Bundle(req, res, urlObj) {
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(urlObj.searchParams.get("cohort")) || config.currentCohort;
  const team = parseInt(urlObj.searchParams.get("team"), 10);
  const name = normalizeWs(urlObj.searchParams.get("name"));
  if (!(team >= 1) || name.length < 2) {
    return sendJson(res, 400, { ok: false, error: "team, name 파라미터가 필요합니다." });
  }
  const parts = [];
  const included = {};
  for (const round of WRAPUP_ROUND_SEQ) {
    const result = await getWrapupCanvas2(cohort, round, team, name);
    included[round] = Boolean(result);
    if (result) parts.push(result.record.markdown.trim());
  }
  if (parts.length === 0) {
    return sendJson(res, 404, { ok: false, error: "제출된 라운드가 없습니다. Round 1~3 Team Canvas를 먼저 제출해 주세요." });
  }
  const toc = WRAPUP_ROUND_SEQ.map((round) => {
    const label = WRAPUP_ROUND_CONTEXT[round].label;
    return included[round] ? `- ${label}` : `- ${label} — (미제출)`;
  }).join("\n");
  const markdown = [
    `# Round 1~3 팀 토론 정리본 통합본 — ${name} (${team}팀)`,
    "",
    "> CH04 NotebookLM 실습의 '필수 3. Round 1~3 팀 토론 정리본 통합본' 소스로 업로드하는 개인화 파일입니다.",
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
  const filename = `CH04_R1-3_팀토론정리본_${wrapupSafeSegment(name)}.md`;
  return sendJson(res, 200, { ok: true, cohort, team, name, included, filename, markdown });
}

// 강사 전용: 해당 라운드 전 제출자의 토론 정리본을 일괄 생성·저장 (결정형이라 재실행 안전)
async function handleWrapupCanvas2Generate(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const payload = await readRequestJson(req);
  const config = await readWrapupConfig();
  const cohort = wrapupSafeSegment(payload.cohort) || config.currentCohort;
  const round = normalizeWs(payload.round).toLowerCase();
  if (!WRAPUP_ROUNDS.has(round)) {
    return sendJson(res, 400, { ok: false, error: "round는 round1~round3 중 하나여야 합니다." });
  }
  // team이 오면 그 팀만 생성 (Worker 쪽은 서브요청 한도 때문에 팀 단위 호출 — 파리티 유지)
  const teamFilter = payload.team !== undefined ? parseInt(payload.team, 10) : null;
  let submissions = await listWrapupSubmissions(cohort, round);
  if (teamFilter) submissions = submissions.filter((s) => s.team === teamFilter);
  if (submissions.length === 0) {
    return sendJson(res, 404, { ok: false, error: teamFilter ? `${teamFilter}팀에 제출물이 없습니다.` : "해당 라운드에 제출물이 없습니다." });
  }
  const summary = await readJsonFileSafe(wrapupSummaryFile(cohort, round), null);
  const dir = wrapupCanvas2Dir(cohort, round);
  await fs.mkdir(dir, { recursive: true });
  const generated = [];
  for (const submission of submissions) {
    const record = buildCanvas2Record(cohort, round, submission, summary);
    await fs.writeFile(path.join(dir, `${record.id}.json`), JSON.stringify(record, null, 2), "utf8");
    generated.push({ id: record.id, team: record.team, name: record.name });
  }
  return sendJson(res, 200, {
    ok: true,
    cohort,
    round,
    count: generated.length,
    summaryUsed: Boolean(summary),
    generated
  });
}
/* ---- [Wrapup 4단계] 프라이빗 저장소 동기화 + zip 내보내기 ---- */
const WRAPUP_GIT_REMOTE_PLAIN = normalizeWs(process.env.WRAPUP_GIT_REMOTE) ||
  "https://github.com/dollmao5/Lets_AX_Wrapup_DATA.git";

async function loadWrapupGitToken() {
  const envToken = normalizeWs(process.env.WRAPUP_GIT_TOKEN || "");
  if (envToken) return envToken;
  try {
    const files = fsSync
      .readdirSync(ROOT_DIR)
      .filter((f) => /^Github_Fine-grained.*\.txt$/i.test(f));
    for (const file of files) {
      const raw = await fs.readFile(path.join(ROOT_DIR, file), "utf8");
      const match = raw.match(/github_pat_[A-Za-z0-9_]+/);
      if (match) return match[0];
    }
  } catch {
    // ignore
  }
  return ""; // 토큰이 없으면 시스템 git 자격증명(자격 증명 관리자)으로 시도
}

async function wrapupRemoteUrl() {
  const token = await loadWrapupGitToken();
  if (!token) return WRAPUP_GIT_REMOTE_PLAIN;
  return WRAPUP_GIT_REMOTE_PLAIN.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

async function wrapupGit(args, options = {}) {
  return execFileAsync("git", ["-C", WRAPUP_DIR, ...args], {
    timeout: 120000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    ...options
  });
}

async function ensureWrapupRepo() {
  await fs.mkdir(WRAPUP_DIR, { recursive: true });
  if (!(await pathExists(path.join(WRAPUP_DIR, ".git")))) {
    await wrapupGit(["init", "-b", "main"]);
    await wrapupGit(["config", "user.email", "wrapup-sync@local"]);
    await wrapupGit(["config", "user.name", "AXCAMP Wrapup Sync"]);
  }
  const url = await wrapupRemoteUrl();
  const remotes = await wrapupGit(["remote"]).then((r) => r.stdout.trim().split(/\r?\n/)).catch(() => []);
  if (remotes.includes("origin")) {
    await wrapupGit(["remote", "set-url", "origin", url]);
  } else {
    await wrapupGit(["remote", "add", "origin", url]);
  }
}

function wrapupGitErrorMessage(error) {
  const raw = String(error?.stderr || error?.message || error);
  return raw
    .replace(/https:\/\/[^@\s]+@github\.com/g, "https://***@github.com") // 토큰 마스킹
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-3)
    .join(" / ")
    .slice(0, 300);
}

async function handleWrapupSync(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  const payload = await readRequestJson(req);
  const direction = normalizeWs(payload.direction).toLowerCase();
  if (direction !== "push" && direction !== "pull") {
    return sendJson(res, 400, { ok: false, error: "direction은 push 또는 pull이어야 합니다." });
  }
  try {
    await ensureWrapupRepo();
    await wrapupGit(["fetch", "origin", "main"]).catch(() => null); // 원격이 비어 있으면 무시

    if (direction === "pull") {
      const hasRemote = await wrapupGit(["rev-parse", "--verify", "FETCH_HEAD"]).then(() => true).catch(() => false);
      if (!hasRemote) {
        return sendJson(res, 200, { ok: true, direction, message: "원격 저장소가 비어 있습니다. 불러올 데이터가 없습니다." });
      }
      // 로컬 미커밋 변경을 먼저 보존 커밋
      await wrapupGit(["add", "-A"]);
      await wrapupGit(["commit", "-m", `local snapshot before pull ${new Date().toISOString()}`]).catch(() => null);
      await wrapupGit(["merge", "FETCH_HEAD", "--allow-unrelated-histories", "-X", "theirs", "-m", "wrapup pull merge"]).catch(() => null);
      // 원격에 있는 파일을 전부 워킹트리에 복원한다 (로컬에서 지워졌던 파일 포함 — 원격 우선)
      await wrapupGit(["checkout", "FETCH_HEAD", "--", "."]);
      await wrapupGit(["add", "-A"]);
      await wrapupGit(["commit", "-m", "wrapup pull restore"]).catch(() => null);
      const files = await wrapupGit(["ls-files"]).then((r) => r.stdout.trim().split(/\r?\n/).filter(Boolean));
      return sendJson(res, 200, { ok: true, direction, message: `불러오기 완료 (${files.length}개 파일)`, fileCount: files.length });
    }

    // push
    await wrapupGit(["add", "-A"]);
    const hasChanges = await wrapupGit(["diff", "--cached", "--quiet"]).then(() => false).catch(() => true);
    if (hasChanges) {
      await wrapupGit(["commit", "-m", `wrapup sync ${new Date().toISOString()}`]);
    }
    const hasRemote = await wrapupGit(["rev-parse", "--verify", "FETCH_HEAD"]).then(() => true).catch(() => false);
    if (hasRemote) {
      await wrapupGit(["merge", "FETCH_HEAD", "--allow-unrelated-histories", "-X", "ours", "-m", "wrapup push merge"]).catch(() => null);
    }
    await wrapupGit(["push", "-u", "origin", "main"]);
    return sendJson(res, 200, { ok: true, direction, message: hasChanges ? "저장(백업) 완료 — 변경분을 원격에 올렸습니다." : "변경 사항이 없어 원격 상태만 맞췄습니다." });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: `동기화 실패: ${wrapupGitErrorMessage(error)}` });
  }
}

async function handleWrapupExport(req, res, urlObj) {
  const admin = await requireWrapupAdmin(req, res, urlObj);
  if (!admin) return;
  try {
    await fs.mkdir(WRAPUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const zipName = `wrapup-backup-${stamp}.zip`;
    const zipPath = path.join(DATA_DIR, zipName);
    // PowerShell Compress-Archive로 zip 생성 (.git 폴더 제외)
    const psCommand = `Get-ChildItem -LiteralPath '${WRAPUP_DIR}' -Exclude '.git' | Compress-Archive -DestinationPath '${zipPath}' -Force`;
    await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", psCommand], { timeout: 120000 });
    const buffer = await fs.readFile(zipPath);
    await fs.unlink(zipPath).catch(() => null);
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": makeAttachmentHeader(zipName),
      "Content-Length": buffer.length
    });
    return res.end(buffer);
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: `내보내기 실패: ${String(error.message || error).slice(0, 200)}` });
  }
}
/* ============ [Wrapup] 끝 ============ */

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
    const contentHtml = rewriteVisibleReferences(storedContentHtml, catalog, clip);
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
  const storedContentHtml = rewriteCanonicalReferences(editorContentHtml, catalog, clip);

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
      const errText = String(error?.stdout || error?.stderr || error?.message || "");
      if (!/nothing to commit/i.test(errText)) {
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
    requested = decodeURIComponent(parts.slice(3).join("/"));
  } else {
    clipKey = decodeURIComponent(parts[1] || "");
    requested = decodeURIComponent(parts.slice(2).join("/"));
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
  if (requestPath === "/wrapup") requestPath = "/wrapup.html"; // [Wrapup 3단계] 보드 페이지
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

  // [SECURITY 2026-07-23] 음성 공유 API 라우트 제거 (Revision v2 보안 조치)

  // [Wrapup] Round 팀 토론 제출·차수 관리
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/config") {
    return handleWrapupConfig(req, res);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/wrapup/submit") {
    return handleWrapupSubmit(req, res);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/status") {
    return handleWrapupStatus(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/team-file") {
    return handleWrapupTeamFile(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/wrapup/instructor-verify") {
    return handleWrapupInstructorVerify(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/admin/wrapup/config") {
    return handleWrapupAdminConfig(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/admin/wrapup/list") {
    return handleWrapupAdminList(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/admin/wrapup/delete") {
    return handleWrapupAdminDelete(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/admin/wrapup/summarize") {
    return handleWrapupSummarize(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/summary") {
    return handleWrapupSummary(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/cohorts") {
    return handleWrapupCohorts(req, res);
  }
  // [Wrapup 5단계] 개인별 토론 정리본 (조회는 즉석 병합 폴백, 일괄 생성은 강사 전용)
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/canvas2") {
    return handleWrapupCanvas2Get(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/wrapup/canvas2-bundle") {
    return handleWrapupCanvas2Bundle(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/admin/wrapup/canvas2") {
    return handleWrapupCanvas2Generate(req, res, urlObj);
  }
  if (req.method === "POST" && urlObj.pathname === "/api/admin/wrapup/sync") {
    return handleWrapupSync(req, res, urlObj);
  }
  if (req.method === "GET" && urlObj.pathname === "/api/admin/wrapup/export") {
    return handleWrapupExport(req, res, urlObj);
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
      try {
        require("fs").appendFileSync(
          "D:/26년/20.실팀장 리더십 향상 과정개발/03.Github_AX Camp_260519/Lets_AX_EXE/debug_error.log",
          `[${new Date().toISOString()}] ${error.stack || error.message}\n`
        );
      } catch (err) {}
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
    // [Wrapup 4단계] 교육생 접속용 LAN 주소 안내
    try {
      const nets = require("os").networkInterfaces();
      const lan = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === "IPv4" && !net.internal) lan.push(net.address);
        }
      }
      if (lan.length) {
        console.log("");
        console.log("================================================");
        for (const ip of lan) {
          console.log(`  교육생 접속 주소:  http://${ip}:${PORT}`);
        }
        console.log(`  Wrap-up 보드:      http://localhost:${PORT}/wrapup`);
        console.log("================================================");
      }
    } catch {
      // ignore
    }
  });
}

// [리팩토링 1단계] require로 불러올 때는 서버를 기동하지 않는다.
// - `node server.js` 직접 실행(npm start, build-pages의 spawn 포함): 기존과 동일하게 기동
// - `require("./server.js")` (scripts/regen-clip.js 등): 기동 없이 아래 export만 사용
if (require.main === module) {
  start().catch((error) => {
    console.error("[AX_Literacy] startup failed:", error);
    process.exit(1);
  });
}

// [리팩토링 1단계] 본문 저장(clip-source) 재생성 로직 공유 export.
// 루트 편집기 저장과 scripts/regen-clip.js CLI가 동일한 함수를 사용하게 하여
// content.html 직접 수정 시 파생 파일(md/txt/metadata) 불일치를 방지한다.
module.exports = {
  stripHtmlToText,
  buildMarkdownDocument,
  buildMetadataFromHtml,
  PRACTICE_FILE_MAP,
  PRACTICE_ROOT_REL
};
