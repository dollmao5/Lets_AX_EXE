const STORAGE_SESSION_KEY = "ax_literacy_session_token";
const STORAGE_LAST_ID_KEY = "ax_literacy_last_lets_id";
const STORAGE_COURSE_CODE_KEY = "ax_literacy_course_code";
const STORAGE_SIDEBAR_COLLAPSED_KEY = "ax_literacy_sidebar_collapsed";
const STORAGE_FONT_SCALE_KEY = "ax_literacy_font_scale";
const FONT_SCALE_MAX_STEP = 3; // 0=기본 → 1(110%) → 2(120%) → 3(130%), styles.css html[data-font-scale]와 짝
const AX_TASK_BOARD_URL =
  "https://share-board-sidk.onrender.com/";
const STATIC_CONFIG = window.__AX_STATIC_CONFIG__ || null;
const STATIC_MODE = Boolean(STATIC_CONFIG && STATIC_CONFIG.mode === "static");
const STATIC_BASE_PATH = normalizeBasePathValue(STATIC_CONFIG?.basePath || "");
const STATIC_DOWNLOAD_NAME_MAP = STATIC_CONFIG?.downloadFilenames || {};
const STATIC_PROGRESS_KEY = "ax_literacy_static_progress";
const STATIC_NOTES_KEY = "ax_literacy_static_notes";
const STATIC_PUBLIC_USER = Object.freeze({
  accountId: "public",
  displayName: "Public Viewer",
  teamName: "",
  courseCode: String(STATIC_CONFIG?.courseCode || "AXCAMP")
});
const STATIC_PUBLIC_COURSE = Object.freeze({
  courseCode: String(STATIC_CONFIG?.courseCode || "AXCAMP"),
  courseName: String(STATIC_CONFIG?.courseName || "AXCAMP"),
  launchUrl: STATIC_BASE_PATH || "/"
});

/* [Wrapup 외부접속] 정적 사이트(GitHub Pages)에서 Round 제출·현황 조회를 살린다.
   콘텐츠 위젯은 fetch('/api/wrapup/...')를 그대로 쓰고, 여기서 Cloudflare Worker로 중계한다.
   제출 시 강사가 차수 코드를 설정해 두었으면 최초 1회 입력받아 저장 후 자동 첨부한다. */
const WRAPUP_REMOTE_API_BASE = "https://axcamp-wrapup.dollmao5.workers.dev";
const WRAPUP_SESSION_CODE_KEY = "ax_wrapup_session_code";
if (STATIC_MODE && typeof window !== "undefined" && typeof window.fetch === "function") {
  const nativeFetch = window.fetch.bind(window);
  const submitWithSessionCode = async (remoteUrl, init) => {
    let payload = {};
    try {
      payload = JSON.parse(init?.body || "{}");
    } catch {
      payload = {};
    }
    const send = (code) => {
      const body = JSON.stringify(code ? { ...payload, code } : payload);
      return nativeFetch(remoteUrl, { ...init, body });
    };
    let savedCode = "";
    try {
      savedCode = localStorage.getItem(WRAPUP_SESSION_CODE_KEY) || "";
    } catch {}
    let response = await send(savedCode);
    if (response.status === 401) {
      const data = await response.clone().json().catch(() => null);
      if (data?.codeRequired) {
        const entered = window.prompt("강사가 안내한 차수 코드를 입력해 주세요.", savedCode || "");
        if (entered === null) return response;
        const code = entered.trim();
        try {
          localStorage.setItem(WRAPUP_SESSION_CODE_KEY, code);
        } catch {}
        response = await send(code);
      }
    }
    return response;
  };
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (!url.startsWith("/api/wrapup/")) {
      return nativeFetch(input, init);
    }
    const remoteUrl = `${WRAPUP_REMOTE_API_BASE}${url}`;
    if (url === "/api/wrapup/submit" && init?.method === "POST") {
      return submitWithSessionCode(remoteUrl, init);
    }
    return nativeFetch(remoteUrl, init);
  };
}

/* [260831] 토론 정리본 '미리보기'용 초경량 마크다운 표시기 — 1차수 피드백 반영.
   불러오기 위젯(2-3·2-3b·2-4·3-1b)의 미리보기에 마크다운 원문 기호(##·**·-)가 그대로 노출되어
   "깨져 보인다"는 피드백 → 화면 표시만 서식으로 변환한다. [복사]/[.md 다운로드]는 계속 원문 사용.
   위젯은 window.axMdPreview가 없으면 textContent(원문)로 폴백한다. 복구(제거): 이 함수 삭제. */
window.axMdPreview = function (md) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return String(md || "").split(/\r?\n/).map((line) => {
    const t = line.trim();
    if (t === "") return '<div style="height:8px"></div>';
    if (/^-{3,}$/.test(t)) return '<hr style="border:none;border-top:1px dashed #cbd5e1;margin:10px 0">';
    if (t.startsWith("### ")) return '<div style="font-weight:800;margin:10px 0 2px">' + inline(t.slice(4)) + "</div>";
    if (t.startsWith("## ")) return '<div style="font-weight:800;font-size:1.04em;margin:12px 0 3px;padding-bottom:2px;border-bottom:1px solid #e4e7ec">' + inline(t.slice(3)) + "</div>";
    if (t.startsWith("# ")) return '<div style="font-weight:900;font-size:1.08em;margin:2px 0 6px">' + inline(t.slice(2)) + "</div>";
    if (t.startsWith("> ")) return '<div style="color:#667085;padding-left:10px;border-left:3px solid #e4e7ec;margin:2px 0">' + inline(t.slice(2)) + "</div>";
    if (/^[-*] /.test(t)) return '<div style="padding-left:16px;text-indent:-12px;margin:2px 0">• ' + inline(t.slice(2)) + "</div>";
    if (/^\d+\. /.test(t)) return '<div style="padding-left:16px;margin:2px 0">' + inline(t) + "</div>";
    return "<div>" + inline(line) + "</div>";
  }).join("");
};

const QUICK_EDITABLE_TAGS = new Set([
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "td",
  "th",
  "strong",
  "em",
  "span",
  "a",
  "figcaption",
  "blockquote"
]);

function normalizeBasePathValue(input) {
  const raw = String(input || "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function withBase(path) {
  const raw = String(path || "");
  if (!STATIC_MODE || !raw) return raw;
  if (/^(?:https?:|data:|mailto:|tel:|javascript:|#)/i.test(raw)) return raw;
  if (STATIC_BASE_PATH && (raw === STATIC_BASE_PATH || raw.startsWith(`${STATIC_BASE_PATH}/`))) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `${STATIC_BASE_PATH}${raw}`;
  }
  return raw;
}

function resolveRuntimeUrl(url) {
  const raw = String(url || "");
  if (!raw) return raw;
  if (/^(?:https?:|data:|mailto:|tel:|javascript:|#)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return withBase(raw);
  return raw;
}

function runtimePathname(url) {
  try {
    return new URL(String(url || ""), window.location.origin).pathname || "";
  } catch {
    return String(url || "");
  }
}

function stripStaticBasePath(pathname) {
  const value = String(pathname || "");
  if (!STATIC_BASE_PATH) return value;
  if (value === STATIC_BASE_PATH) return "/";
  if (value.startsWith(`${STATIC_BASE_PATH}/`)) {
    return value.slice(STATIC_BASE_PATH.length);
  }
  return value;
}

function isPracticeFileHref(href) {
  return stripStaticBasePath(runtimePathname(href)).startsWith("/practice-files/");
}

function lookupStaticDownloadName(url) {
  const pathname = stripStaticBasePath(runtimePathname(url));
  return normalizeWs(STATIC_DOWNLOAD_NAME_MAP[pathname] || "");
}

const state = {
  guestMode: false,
  accountId: "",
  sessionToken: "",
  isAdmin: false,
  user: null,
  chapters: [],
  clipMap: new Map(),
  completedSet: new Set(),
  currentClipKey: "",
  currentChapterId: "",
  currentChapterNum: "",
  currentChapterTitle: "",
  currentVisibleContentHtml: "",
  expandedChapters: new Set(),
  sidebarCollapsed: false,
  activeSlideDeck: null,
  activeSlideIndex: 0,
  taskPanelOpen: false,
  notePanelOpen: false,
  editModeOpen: false,
  editorSourceClipKey: "",
  editorSourceHtml: "",
  editorDirty: false,
  editorPreviewClickTimer: null,
  editorAssets: [],
  editorAssetMap: new Map(),
  editorActiveAssetPath: "",
  editorEmbedSpec: null,
  sidebarEditOpen: false,
  sidebarDirty: false,
  sidebarSourceClipKey: "",
  sidebarSourceState: null,
  publishPanelOpen: false,
  publishStatus: null,
  courses: [],
  currentCourse: null,
  mermaidReady: false,
  catalogPatched: false
};

const el = {
  loginView: document.getElementById("loginView"),
  appView: document.getElementById("appView"),
  layout: document.getElementById("appLayout"),
  showLoginModeBtn: document.getElementById("showLoginModeBtn"),
  showSignupModeBtn: document.getElementById("showSignupModeBtn"),
  loginForm: document.getElementById("loginForm"),
  loginCourseCode: document.getElementById("loginCourseCode"),
  loginAccountId: document.getElementById("loginAccountId"),
  loginPassword: document.getElementById("loginPassword"),
  loginError: document.getElementById("loginError"),
  signupForm: document.getElementById("signupForm"),
  signupCourseCode: document.getElementById("signupCourseCode"),
  signupAccountId: document.getElementById("signupAccountId"),
  signupPassword: document.getElementById("signupPassword"),
  signupTeamName: document.getElementById("signupTeamName"),
  signupDisplayName: document.getElementById("signupDisplayName"),
  signupError: document.getElementById("signupError"),
  courseCodeList: document.getElementById("courseCodeList"),
  showPasswordHelpBtn: document.getElementById("showPasswordHelpBtn"),
  passwordHelpPanel: document.getElementById("passwordHelpPanel"),
  closePasswordHelpBtn: document.getElementById("closePasswordHelpBtn"),
  helpAccountId: document.getElementById("helpAccountId"),
  passwordHintBtn: document.getElementById("passwordHintBtn"),
  passwordHintResult: document.getElementById("passwordHintResult"),
  helpTeamName: document.getElementById("helpTeamName"),
  passwordRecoverBtn: document.getElementById("passwordRecoverBtn"),
  passwordRecoverResult: document.getElementById("passwordRecoverResult"),
  currentUser: document.getElementById("currentUser"),
  currentCourseBadge: document.getElementById("currentCourseBadge"),
  accountSettingsBtn: document.getElementById("accountSettingsBtn"),
  accountModal: document.getElementById("accountModal"),
  closeAccountModalBtn: document.getElementById("closeAccountModalBtn"),
  accountForm: document.getElementById("accountForm"),
  accountEditId: document.getElementById("accountEditId"),
  accountEditTeamName: document.getElementById("accountEditTeamName"),
  accountEditDisplayName: document.getElementById("accountEditDisplayName"),
  accountCurrentPassword: document.getElementById("accountCurrentPassword"),
  accountNewPassword: document.getElementById("accountNewPassword"),
  accountStatus: document.getElementById("accountStatus"),
  slideDeckModal: document.getElementById("slideDeckModal"),
  slideDeckKicker: document.getElementById("slideDeckKicker"),
  slideDeckTitle: document.getElementById("slideDeckTitle"),
  slideDeckCounter: document.getElementById("slideDeckCounter"),
  downloadSlideDeckBtn: document.getElementById("downloadSlideDeckBtn"),
  slideDeckStage: document.getElementById("slideDeckStage"),
  slideDeckDots: document.getElementById("slideDeckDots"),
  closeSlideDeckBtn: document.getElementById("closeSlideDeckBtn"),
  slidePrevBtn: document.getElementById("slidePrevBtn"),
  slideNextBtn: document.getElementById("slideNextBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  instructorModeBtn: document.getElementById("instructorModeBtn"),
  adminModeBtn: document.getElementById("adminModeBtn"),
  openWrapupBtn: document.getElementById("openWrapupBtn"),
  instructorDocsBtn: document.getElementById("instructorDocsBtn"),
  continueGuestBtn: document.getElementById("continueGuestBtn"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  fontSizeDownBtn: document.getElementById("fontSizeDownBtn"),
  fontSizeUpBtn: document.getElementById("fontSizeUpBtn"),
  fontSizeLabel: document.getElementById("fontSizeLabel"),
  chapterList: document.getElementById("chapterList"),
  clipTitle: document.getElementById("clipTitle"),
  clipOverview: document.getElementById("clipOverview"),
  clipBadges: document.getElementById("clipBadges"),
  clipBody: document.getElementById("clipBody"),
  markCompleteBtn: document.getElementById("markCompleteBtn"),
  progressBadge: document.getElementById("progressBadge"),
  toggleTaskBtn: document.getElementById("toggleTaskBtn"),
  toggleNoteBtn: document.getElementById("toggleNoteBtn"),
  toggleEditModeBtn: document.getElementById("toggleEditModeBtn"),
  saveContentEditorTopBtn: document.getElementById("saveContentEditorTopBtn"),
  toggleSidebarModeBtn: document.getElementById("toggleSidebarModeBtn"),
  togglePublishModeBtn: document.getElementById("togglePublishModeBtn"),
  contentEditorPanel: document.getElementById("contentEditorPanel"),
  contentEditorPath: document.getElementById("contentEditorPath"),
  contentEditorInput: document.getElementById("contentEditorInput"),
  contentEditorHighlight: document.getElementById("contentEditorHighlight"),
  contentEditorPreview: document.getElementById("contentEditorPreview"),
  contentEditorStatus: document.getElementById("contentEditorStatus"),
  contentAssetInput: document.getElementById("contentAssetInput"),
  chooseContentAssetsBtn: document.getElementById("chooseContentAssetsBtn"),
  contentAssetSelectionSummary: document.getElementById("contentAssetSelectionSummary"),
  contentAssetUploadHint: document.getElementById("contentAssetUploadHint"),
  contentAssetList: document.getElementById("contentAssetList"),
  contentAssetStatus: document.getElementById("contentAssetStatus"),
  reloadContentAssetsBtn: document.getElementById("reloadContentAssetsBtn"),
  uploadContentAssetsBtn: document.getElementById("uploadContentAssetsBtn"),
  contentAssetPreviewPanel: document.getElementById("contentAssetPreviewPanel"),
  contentAssetPreviewTitle: document.getElementById("contentAssetPreviewTitle"),
  contentAssetPreviewMeta: document.getElementById("contentAssetPreviewMeta"),
  contentAssetPreviewBody: document.getElementById("contentAssetPreviewBody"),
  contentAssetSnippet: document.getElementById("contentAssetSnippet"),
  copyContentAssetPathBtn: document.getElementById("copyContentAssetPathBtn"),
  insertContentAssetLinkBtn: document.getElementById("insertContentAssetLinkBtn"),
  insertContentAssetMediaBtn: document.getElementById("insertContentAssetMediaBtn"),
  contentEmbedUrlInput: document.getElementById("contentEmbedUrlInput"),
  contentEmbedTitleInput: document.getElementById("contentEmbedTitleInput"),
  previewContentEmbedBtn: document.getElementById("previewContentEmbedBtn"),
  insertContentEmbedBtn: document.getElementById("insertContentEmbedBtn"),
  clearContentEmbedBtn: document.getElementById("clearContentEmbedBtn"),
  contentEmbedPreviewPanel: document.getElementById("contentEmbedPreviewPanel"),
  contentEmbedPreviewTitle: document.getElementById("contentEmbedPreviewTitle"),
  contentEmbedPreviewMeta: document.getElementById("contentEmbedPreviewMeta"),
  contentEmbedPreviewBody: document.getElementById("contentEmbedPreviewBody"),
  contentEmbedSnippet: document.getElementById("contentEmbedSnippet"),
  contentEmbedStatus: document.getElementById("contentEmbedStatus"),
  reloadEditorBtn: document.getElementById("reloadEditorBtn"),
  saveEditorBtn: document.getElementById("saveEditorBtn"),
  closeEditorBtn: document.getElementById("closeEditorBtn"),
  sidebarEditorPanel: document.getElementById("sidebarEditorPanel"),
  sidebarEditorPath: document.getElementById("sidebarEditorPath"),
  sidebarChapterTitleInput: document.getElementById("sidebarChapterTitleInput"),
  sidebarChapterTimeInput: document.getElementById("sidebarChapterTimeInput"),
  sidebarClipTitleInput: document.getElementById("sidebarClipTitleInput"),
  sidebarClipTypeInput: document.getElementById("sidebarClipTypeInput"),
  sidebarPreviewChapterNum: document.getElementById("sidebarPreviewChapterNum"),
  sidebarPreviewChapterTitle: document.getElementById("sidebarPreviewChapterTitle"),
  sidebarPreviewChapterTime: document.getElementById("sidebarPreviewChapterTime"),
  sidebarPreviewClipTitle: document.getElementById("sidebarPreviewClipTitle"),
  sidebarPreviewClipType: document.getElementById("sidebarPreviewClipType"),
  sidebarEditorStatus: document.getElementById("sidebarEditorStatus"),
  reloadSidebarEditorBtn: document.getElementById("reloadSidebarEditorBtn"),
  saveSidebarEditorBtn: document.getElementById("saveSidebarEditorBtn"),
  closeSidebarEditorBtn: document.getElementById("closeSidebarEditorBtn"),
  publishPanel: document.getElementById("publishPanel"),
  publishBranchSummary: document.getElementById("publishBranchSummary"),
  publishHeadSummary: document.getElementById("publishHeadSummary"),
  publishDivergenceSummary: document.getElementById("publishDivergenceSummary"),
  publishPendingSummary: document.getElementById("publishPendingSummary"),
  publishCommitMessageInput: document.getElementById("publishCommitMessageInput"),
  publishTrackedFiles: document.getElementById("publishTrackedFiles"),
  publishIgnoredFiles: document.getElementById("publishIgnoredFiles"),
  publishPanelStatus: document.getElementById("publishPanelStatus"),
  reloadPublishStatusBtn: document.getElementById("reloadPublishStatusBtn"),
  runPublishBtn: document.getElementById("runPublishBtn"),
  closePublishPanelBtn: document.getElementById("closePublishPanelBtn"),
  taskPanel: document.getElementById("taskPanel"),
  taskForm: document.getElementById("taskForm"),
  taskChapterContext: document.getElementById("taskChapterContext"),
  taskTitle: document.getElementById("taskTitle"),
  taskReason: document.getElementById("taskReason"),
  taskEffect: document.getElementById("taskEffect"),
  taskStatus: document.getElementById("taskStatus"),
  notePanel: document.getElementById("notePanel"),
  noteClipContext: document.getElementById("noteClipContext"),
  noteText: document.getElementById("noteText"),
  notePreview: document.getElementById("notePreview"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  copyNoteBtn: document.getElementById("copyNoteBtn"),
  noteStatus: document.getElementById("noteStatus"),
  adminSection: document.getElementById("adminSection"),
  refreshUsersBtn: document.getElementById("refreshUsersBtn"),
  adminUsersTbody: document.getElementById("adminUsersTbody"),
  adminStatus: document.getElementById("adminStatus")
};

const PROMPT_PREVIEW_MAX_LINES = 30;
const COPY_FEEDBACK_MS = 1200;
let copyToastTimer = null;

function normalizeWs(input) {
  return String(input || "").replace(/\s+/g, " ").trim();
}

function normalizeCourseCode(input) {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function staticStorageKey(prefix) {
  const courseCode = normalizeCourseCode(
    state.currentCourse?.courseCode || STATIC_PUBLIC_COURSE.courseCode || "AXCAMP"
  );
  return `${prefix}:${courseCode}`;
}

function readStaticJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStaticJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readSidebarCollapsedPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED_KEY);
    // 저장된 선호가 없으면 좁은 화면(모바일)은 기본 접힘 — 본문 압착 방지
    if (stored === null && window.innerWidth < 900) return true;
    return stored === "1";
  } catch {
    return false;
  }
}

function writeSidebarCollapsedPreference(value) {
  try {
    localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

/* 글자 크기 단계 조절 — 상단바 [가−/가＋] 버튼. 단계는 계정과 무관하게 브라우저별로 기억된다. */
function readFontScalePreference() {
  try {
    const step = parseInt(localStorage.getItem(STORAGE_FONT_SCALE_KEY) || "0", 10);
    if (!Number.isFinite(step)) return 0;
    return Math.min(Math.max(step, 0), FONT_SCALE_MAX_STEP);
  } catch {
    return 0;
  }
}

function applyFontScaleStep(step) {
  const clamped = Math.min(Math.max(Number(step) || 0, 0), FONT_SCALE_MAX_STEP);
  const rootEl = document.documentElement;
  if (clamped > 0) rootEl.setAttribute("data-font-scale", String(clamped));
  else rootEl.removeAttribute("data-font-scale");
  if (el.fontSizeLabel) el.fontSizeLabel.textContent = clamped === 0 ? "기본" : `+${clamped}`;
  if (el.fontSizeDownBtn) el.fontSizeDownBtn.disabled = clamped === 0;
  if (el.fontSizeUpBtn) el.fontSizeUpBtn.disabled = clamped >= FONT_SCALE_MAX_STEP;
  return clamped;
}

function changeFontScaleStep(delta) {
  const next = applyFontScaleStep(readFontScalePreference() + delta);
  try {
    localStorage.setItem(STORAGE_FONT_SCALE_KEY, String(next));
  } catch {
    // 저장에 실패해도 이번 화면 적용은 유지
  }
}

function getStaticCompletedClipKeys() {
  const items = readStaticJson(staticStorageKey(STATIC_PROGRESS_KEY), []);
  return Array.isArray(items) ? items.map((item) => normalizeClipKey(item)).filter(Boolean) : [];
}

function setStaticCompletedClipKeys(keys) {
  const normalized = Array.from(new Set((keys || []).map((item) => normalizeClipKey(item)).filter(Boolean)));
  writeStaticJson(staticStorageKey(STATIC_PROGRESS_KEY), normalized);
  return normalized;
}

function getStaticNotesMap() {
  const value = readStaticJson(staticStorageKey(STATIC_NOTES_KEY), {});
  return value && typeof value === "object" ? value : {};
}

function setStaticNotesMap(notes) {
  const payload = notes && typeof notes === "object" ? notes : {};
  writeStaticJson(staticStorageKey(STATIC_NOTES_KEY), payload);
  return payload;
}

function normalizeClipKey(input) {
  const key = normalizeWs(input).replace(/^#/, "");
  if (!key) return "";
  return key;
}

// [폐기됨 2026-08-10] CLIENT_CATALOG_BLUEPRINTS / buildClientVisibleCatalog / needsClientCatalogPatch 제거.
// 현행 목차는 서버(export-report.json + visible-catalog-overrides.json)가 단일 원천이며,
// 클라이언트 블루프린트는 구(舊) 과정(Gemini 활용/NotebookLM/AI Studio 체계)의 잔재였습니다.
// 복구가 필요하면 git 이력(이 커밋 이전)을 참고하세요.

// [HIDDEN] 화면에서 제외된 클립 키 목록 (해시 직접 접근 시 안전 리다이렉트에 사용)
// 주의: 여기 키는 전부 "현행 카탈로그에 존재하지 않는" 키여야 합니다 (knownClipKeys가 우선하므로
// 현행 키를 넣어도 동작은 안 하지만 논리 모순이 됩니다).
const HIDDEN_CLIP_KEYS_REDIRECT_SET = new Set([
  // [HIDDEN] ch00-clip02: 자사 생성형 AI 서비스 현황 (overrides에서 제외됨, 복구는 git 이력 참고)
  "ch00-clip02",
  // [HIDDEN] ch04-clip05: 기업 분석 코스: 열린 주제로 해보는 NotebookLM 분석
  "ch04-clip05",
  // [HIDDEN] 구 과정 Google AI Studio & Vibe Coding의 잔여 키 (현행 ch05-clip01/02와 무관)
  "ch05-clip03",
  "ch06-clip01-hidcode"
]);

// 숨겨진 클립 해시 접근 시 이 챕터('오늘의 핵심 요약', CH05)의 첫 클립으로 리다이렉트합니다.
const HIDDEN_REDIRECT_TARGET_CHAPTER_ID = "ch05";

const CLIENT_RUNTIME_CLIP_OVERRIDE_URLS = {};

async function applyRuntimeClipOverride(clipKey, payload) {
  const normalized = normalizeClipKey(clipKey);
  const overrideUrl = CLIENT_RUNTIME_CLIP_OVERRIDE_URLS[normalized];
  if (!overrideUrl) return payload;

  try {
    const response = await fetch(resolveRuntimeUrl(overrideUrl), { cache: "no-store" });
    if (!response.ok) return payload;

    const contentHtml = await response.text();
    if (!contentHtml.trim()) return payload;

    const doc = new DOMParser().parseFromString(contentHtml, "text/html");
    const overview = normalizeWs(doc.querySelector(".clip-overview")?.textContent || "");
    const badges = Array.from(doc.querySelectorAll(".clip-header .clip-badge"))
      .map((badge) => normalizeWs(badge.textContent || ""))
      .filter(Boolean);

    return {
      ...payload,
      clip: {
        ...(payload?.clip || {}),
        overview: overview || payload?.clip?.overview || "",
        badges: badges.length ? badges : payload?.clip?.badges || []
      },
      contentHtml
    };
  } catch {
    return payload;
  }
}

function flattenVisibleClips(chapters = state.chapters) {
  const items = [];

  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    for (const clip of Array.isArray(chapter?.clips) ? chapter.clips : []) {
      items.push({
        ...clip,
        chapterId: chapter.chapterId || clip.chapterId || "",
        chapterTitle: chapter.title || clip.chapterTitle || "",
        chapterNum: chapter.chapterNum || clip.chapterNum || "",
        chapterCode: chapter.chapterCode || clip.chapterCode || "",
        chapterTime: chapter.time || clip.chapterTime || ""
      });
    }
  }

  return items;
}

function buildClipNavFooterHtml(clipKey) {
  const normalized = normalizeClipKey(clipKey);
  const orderedClips = flattenVisibleClips();
  const currentIndex = orderedClips.findIndex(
    (clip) => normalizeClipKey(clip.clipKey) === normalized
  );

  if (currentIndex < 0) return "";

  const previousClip = orderedClips[currentIndex - 1] || null;
  const nextClip = orderedClips[currentIndex + 1] || null;

  const previousHtml = previousClip
    ? `<a class="clip-nav-btn" href="#${escapeAttribute(previousClip.clipKey)}">← ${escapeHtml(previousClip.title || previousClip.clipKey)}</a>`
    : '<a class="clip-nav-btn disabled" href="#">← 처음</a>';

  const nextHtml = nextClip
    ? `<a class="clip-nav-btn" href="#${escapeAttribute(nextClip.clipKey)}">${escapeHtml(nextClip.title || nextClip.clipKey)} →</a>`
    : '<a class="clip-nav-btn disabled" href="#">끝 →</a>';

  return `<div class="clip-nav-footer">${previousHtml}${nextHtml}</div>`;
}

function rewriteClipNavFooter(doc, clipKey) {
  if (!doc?.body) return;

  const footerHtml = buildClipNavFooterHtml(clipKey);
  if (!footerHtml) return;

  const footers = Array.from(doc.querySelectorAll(".clip-nav-footer"));
  if (!footers.length) {
    doc.body.insertAdjacentHTML("beforeend", footerHtml);
    return;
  }

  const lastFooter = footers[footers.length - 1];
  for (let index = 0; index < footers.length - 1; index += 1) {
    footers[index].remove();
  }
  lastFooter.outerHTML = footerHtml;
}

function applyClientClipDisplay(clip, sidebarClip) {
  if (!sidebarClip) return clip;
  return {
    ...clip,
    title: sidebarClip.title || clip.title,
    type: sidebarClip.type || clip.type,
    chapterId: sidebarClip.chapterId || clip.chapterId,
    chapterCode: sidebarClip.chapterCode || clip.chapterCode,
    chapterNum: sidebarClip.chapterNum || clip.chapterNum,
    chapterTitle: sidebarClip.chapterTitle || clip.chapterTitle,
    chapterTime: sidebarClip.chapterTime || clip.chapterTime
  };
}

function rewriteClientClipHtml(clipKey, contentHtml) {
  const normalized = normalizeClipKey(clipKey);
  const needsTimetableFix = normalized === "ch00-clip01";
  if (!String(contentHtml || "").trim()) {
    return contentHtml;
  }

  const doc = new DOMParser().parseFromString(String(contentHtml), "text/html");
  const sidebarClip = state.clipMap.get(normalized) || null;

  if (sidebarClip) {
    const chapterBadge = doc.querySelector(".clip-header .clip-badges .clip-badge.chapter");
    if (chapterBadge && sidebarClip.chapterNum) {
      chapterBadge.textContent = sidebarClip.chapterNum;
    }

    // [KEEP-ORIGINAL-TITLE] 클립 페이지 헤더 제목은 content.html 원본(긴 제목)을 유지합니다.
    // 사이드바에는 visible-catalog-overrides.json의 짧은 제목이 표시되고, 헤더는 덮어쓰지 않습니다.
    // 복구(사이드바 제목으로 헤더도 덮어쓰기) 시 아래 주석을 해제하세요:
    // const titleNode = doc.querySelector(".clip-header .clip-title");
    // if (titleNode && sidebarClip.title && !titleNode.hasAttribute("data-keep-title")) {
    //   titleNode.textContent = sidebarClip.title;
    // }

    const typeBadge = Array.from(
      doc.querySelectorAll(".clip-header .clip-badges .clip-badge")
    ).find(
      (badge) => !badge.classList.contains("chapter") && !badge.classList.contains("time")
    );
    if (typeBadge && sidebarClip.type) {
      const normalizedType = normalizeWs(sidebarClip.type);
      const nextTypeClass =
        normalizedType === "실습"
          ? "type-practice"
          : normalizedType === "참고"
            ? "type-reference"
            : normalizedType === "설정"
              ? "type-setup"
              : normalizedType === "개요"
                ? "type-overview"
                : normalizedType === "개념"
                  ? "type-concept"
                  : normalizedType === "플랫폼"
                    ? "type-platform"
                    : "";
      typeBadge.className = nextTypeClass ? `clip-badge ${nextTypeClass}` : "clip-badge";
      typeBadge.textContent = normalizedType;
    }
  }

  rewriteClipNavFooter(doc, normalized);

  // [REMOVED 260902] needsTimetableFix 시간표 행 숨김 블록 물리 제거 — CH00 본문에 트리거 문구(자사 생성형 AI/Google AI Studio/기업 분석 코스/CH04:/CH05: 등)가 더 이상 없어 완전 사문화됐고,
  // 범용 셀렉터(.comparison-table tbody tr)가 CH00의 다른 표(학습 Flow 표 등)까지 스캔해 향후 'CH04:'류 표기를 쓰는 행을 조용히 지울 위험만 남아 제거함.
  // 복구: git 이력(이 커밋 직전)에서 if (needsTimetableFix) { ... } 블록 전체를 이 자리에 되살리면 됨. needsTimetableFix 상수(위쪽)는 복구 편의를 위해 유지.

  return doc.body.innerHTML;
}

function showLogin() {
  el.loginView.classList.remove("hidden");
  el.appView.classList.add("hidden");
}

function showApp() {
  el.loginView.classList.add("hidden");
  el.appView.classList.remove("hidden");
}

async function api(path, options = {}) {
  window.api = api;
  if (STATIC_MODE) {
    return apiStatic(path, options);
  }

  // [Wrapup 1단계] 게스트 모드: 개인 상태 API는 브라우저 저장 셤으로 처리 (정적 빌드와 동일 UX)
  if (state.guestMode) {
    const p = String(path || "");
    if (p === "/api/progress" || p.startsWith("/api/notes") || p.startsWith("/api/ax-task") || p === "/api/logout") {
      return apiStatic(path, options);
    }
  }

  const headers = {
    ...(options.headers || {})
  };

  if (state.sessionToken) {
    headers["x-session-token"] = state.sessionToken;
  }

  if (state.accountId) {
    headers["x-account-id"] = state.accountId;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg = data.error || `요청 실패 (${response.status})`;
    throw new Error(msg);
  }

  return data;
}

/* [원격 관리자] 정적 모드 관리자 API — 읽기는 정적 데이터로 합성, 쓰기는 Worker 편집 큐로 전달 */
function staticAdminCode() {
  try {
    return localStorage.getItem("ax_wrapup_instructor_code") || "";
  } catch {
    return "";
  }
}

async function remoteAdminPost(path, body) {
  const response = await fetch(`${WRAPUP_REMOTE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wrapup-instructor": staticAdminCode()
    },
    body: JSON.stringify(body || {})
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || `요청 실패 (${response.status})`);
  }
  return data;
}

async function apiStaticAdmin(normalizedPath, method, options, fetchJson) {
  const lastSegment = decodeURIComponent(normalizedPath.split("/").filter(Boolean).pop() || "");

  if (normalizedPath.startsWith("/api/admin/clip-source/")) {
    if (method === "GET") {
      const data = await fetchJson(withBase(`/data/clips/${encodeURIComponent(lastSegment)}.json`));
      return {
        ok: true,
        clip: { clipKey: lastSegment, title: data.clip?.title || "" },
        source: {
          contentHtml: String(data.clip?.contentHtml || ""),
          contentPath: "원격 편집 — 저장 시 자동 커밋·배포 (약 3~4분 후 사이트 반영)"
        },
        metadata: {
          clipTitle: data.clip?.title || "",
          overview: "",
          badges: []
        }
      };
    }
    return remoteAdminPost(normalizedPath, { contentHtml: String(options.body?.contentHtml || "") });
  }

  if (normalizedPath.startsWith("/api/admin/sidebar-source/")) {
    if (method === "GET") {
      // 화면에 보이는 현재 값이 우선 사용되므로 빈 응답이면 충분하다
      return { ok: true, clip: { clipKey: lastSegment }, sidebar: {}, source: {} };
    }
    return remoteAdminPost(normalizedPath, options.body || {});
  }

  if (normalizedPath.startsWith("/api/admin/clip-assets/")) {
    if (method === "GET") {
      return {
        ok: true,
        assets: [],
        upload: { allowedExtensions: ["공개 사이트에서는 업로드 불가 — 강사 PC에서 진행"], maxBytesLabel: "-" }
      };
    }
    throw new Error("자산 업로드는 강사 PC(교육장 서버)에서만 가능합니다.");
  }

  if (normalizedPath === "/api/admin/publish-status" && method === "GET") {
    return {
      ok: true,
      git: {
        branch: "main",
        upstream: "자동 배포",
        head: null,
        ahead: 0,
        behind: 0,
        publishable: { trackedCount: 0, untrackedCount: 0, trackedFiles: [], untrackedFiles: [] }
      }
    };
  }

  if (normalizedPath === "/api/admin/publish" && method === "POST") {
    return {
      ok: true,
      operations: ["자동 배포"],
      git: { head: "-", headMessage: "공개 사이트 편집은 저장 즉시 자동 커밋·배포됩니다 (약 3~4분 후 반영)" }
    };
  }

  if (normalizedPath.startsWith("/api/admin/users")) {
    return { ok: true, users: [] };
  }

  if (normalizedPath.startsWith("/api/admin/wrapup/")) {
    if (method === "GET") {
      const response = await fetch(`${WRAPUP_REMOTE_API_BASE}${normalizedPath}`, {
        headers: { "x-wrapup-instructor": staticAdminCode() }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
      return data;
    }
    return remoteAdminPost(normalizedPath, options.body || {});
  }

  throw new Error("공개 사이트에서 지원되지 않는 관리자 기능입니다.");
}

async function apiStatic(path, options = {}) {
  const normalizedPath = String(path || "");
  const method = String(options.method || "GET").toUpperCase();

  const fetchJson = async (url) => {
    // cache:"no-cache" — 서버(ETag) 재검증 강제: 배포 갱신 직후에도 낡은 JSON을 쓰지 않게 함 (변경 없으면 304라 비용 낮음)
    const response = await fetch(resolveRuntimeUrl(url), { cache: "no-cache" });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  };

  // [원격 관리자] 공개 사이트 관리자 편집 — 저장은 Worker 경유 편집 큐로 커밋되고
  // GitHub Actions가 서버 로직으로 적용 후 Pages를 자동 재배포한다 (약 3~4분)
  if (normalizedPath.startsWith("/api/admin/")) {
    return apiStaticAdmin(normalizedPath, method, options, fetchJson);
  }

  if (normalizedPath === "/api/health" && method === "GET") {
    return { ok: true, mode: "static" };
  }

  if (normalizedPath === "/api/courses" && method === "GET") {
    return { courses: [STATIC_PUBLIC_COURSE] };
  }

  if (normalizedPath.startsWith("/api/me") && method === "GET") {
    return {
      user: STATIC_PUBLIC_USER,
      sessionToken: "",
      course: STATIC_PUBLIC_COURSE
    };
  }

  if (normalizedPath === "/api/chapters" && method === "GET") {
    const data = await fetchJson(withBase("/data/chapters.json"));
    const completed = new Set(getStaticCompletedClipKeys());
    const chapters = Array.isArray(data.chapters)
      ? data.chapters.map((chapter) => ({
        ...chapter,
        clips: Array.isArray(chapter.clips)
          ? chapter.clips.map((clip) => ({
            ...clip,
            completed: completed.has(clip.clipKey)
          }))
          : []
      }))
      : [];
    return {
      ...data,
      chapters
    };
  }

  if (normalizedPath.startsWith("/api/clips/") && method === "GET") {
    const clipKey = normalizeClipKey(decodeURIComponent(normalizedPath.split("/api/clips/")[1] || ""));
    const data = await fetchJson(withBase(`/data/clips/${encodeURIComponent(clipKey)}.json`));
    return {
      ...data,
      completed: getStaticCompletedClipKeys().includes(clipKey)
    };
  }

  if (normalizedPath === "/api/progress" && method === "POST") {
    const clipKey = normalizeClipKey(options.body?.clipKey || "");
    const completed = Boolean(options.body?.completed);
    const set = new Set(getStaticCompletedClipKeys());
    if (completed) {
      set.add(clipKey);
    } else {
      set.delete(clipKey);
    }
    return {
      ok: true,
      completedClipKeys: setStaticCompletedClipKeys([...set])
    };
  }

  if (normalizedPath.startsWith("/api/notes")) {
    const query = normalizedPath.includes("?") ? new URLSearchParams(normalizedPath.split("?")[1]) : new URLSearchParams();
    const clipKey = normalizeClipKey(query.get("clipKey") || "");
    const notes = getStaticNotesMap();
    const stored = notes[clipKey] || { clipKey, content: "", updatedAt: "" };

    if (method === "GET") {
      return {
        ok: true,
        note: stored
      };
    }

    if (method === "POST") {
      const note = {
        clipKey,
        content: String(options.body?.content || ""),
        updatedAt: new Date().toISOString()
      };
      notes[clipKey] = note;
      setStaticNotesMap(notes);
      return {
        ok: true,
        note
      };
    }
  }

  // [SECURITY 2026-07-23] 정적 모드 음성 공유 API 셤 제거 (Revision v2 보안 조치)

  if (normalizedPath === "/api/logout" && method === "POST") {
    return { ok: true };
  }

  if (
    normalizedPath === "/api/login" ||
    normalizedPath === "/api/signup" ||
    normalizedPath === "/api/password-hint" ||
    normalizedPath === "/api/password-recover" ||
    normalizedPath === "/api/account" ||
    normalizedPath.startsWith("/api/admin/") ||
    normalizedPath.startsWith("/api/ax-task")
  ) {
    throw new Error("이 기능은 GitHub Pages 공개판에서 비활성화됩니다.");
  }

  throw new Error(`지원되지 않는 정적 요청입니다: ${normalizedPath}`);
}

function setLoginError(message) {
  el.loginError.textContent = message || "";
}

function setSignupError(message) {
  el.signupError.textContent = message || "";
}

function setTaskStatus(message, isError = false) {
  el.taskStatus.textContent = message || "";
  el.taskStatus.style.color = isError ? "#b42318" : "";
}

function setNoteStatus(message, isError = false) {
  el.noteStatus.textContent = message || "";
  el.noteStatus.style.color = isError ? "#b42318" : "";
}

function setAdminStatus(message, isError = false) {
  el.adminStatus.textContent = message || "";
  el.adminStatus.style.color = isError ? "#b42318" : "";
}

function setAccountStatus(message, isError = false) {
  el.accountStatus.textContent = message || "";
  el.accountStatus.style.color = isError ? "#b42318" : "#138246";
}

function setEditorStatus(message, isError = false) {
  el.contentEditorStatus.textContent = message || "";
  el.contentEditorStatus.style.color = isError ? "#b42318" : "";
}

function setSidebarEditorStatus(message, isError = false) {
  el.sidebarEditorStatus.textContent = message || "";
  el.sidebarEditorStatus.style.color = isError ? "#b42318" : "";
}

function setPublishPanelStatus(message, isError = false) {
  el.publishPanelStatus.textContent = message || "";
  el.publishPanelStatus.style.color = isError ? "#b42318" : "";
}

function buildHighlightedHtmlSnippet(tagText) {
  const token = String(tagText || "");
  const trimmed = token.trim();

  if (!trimmed) return "";
  if (trimmed.startsWith("<!--")) {
    return `<span class="code-token-comment">${escapeHtml(token)}</span>`;
  }

  const closing = trimmed.startsWith("</");
  const opening = closing ? "</" : "<";
  const ending = trimmed.endsWith("/>") ? "/>" : ">";
  const inner = trimmed.slice(opening.length, trimmed.length - ending.length);
  const tagMatch = inner.match(/^([^\s/>]+)([\s\S]*)$/);

  if (!tagMatch) {
    return `<span class="code-token-delimiter">${escapeHtml(opening)}</span>${escapeHtml(inner)}<span class="code-token-delimiter">${escapeHtml(ending)}</span>`;
  }

  const tagName = tagMatch[1];
  const attrSource = tagMatch[2] || "";
  const attrHtml = escapeHtml(attrSource).replace(
    /([^\s=\/]+)(\s*=\s*)(&quot;.*?&quot;|&#39;.*?&#39;|[^\s"'=<>`]+)/g,
    (_match, name, equalSign, value) =>
      `<span class="code-token-attr">${name}</span>${equalSign}<span class="code-token-value">${value}</span>`
  );

  return [
    `<span class="code-token-delimiter">${escapeHtml(opening)}</span>`,
    `<span class="code-token-tag">${escapeHtml(tagName)}</span>`,
    attrHtml,
    `<span class="code-token-delimiter">${escapeHtml(ending)}</span>`
  ].join("");
}

function buildHighlightedHtmlSource(input) {
  const source = String(input || "");
  if (!source) return "";

  const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*?>/g;
  let cursor = 0;
  let html = "";

  source.replace(tokenPattern, (match, offset) => {
    if (offset > cursor) {
      html += escapeHtml(source.slice(cursor, offset));
    }
    html += buildHighlightedHtmlSnippet(match);
    cursor = offset + match.length;
    return match;
  });

  if (cursor < source.length) {
    html += escapeHtml(source.slice(cursor));
  }

  return html;
}

function isQuickEditablePreviewNode(node) {
  if (!(node instanceof Element)) return false;
  const tagName = String(node.tagName || "").toLowerCase();
  if (!QUICK_EDITABLE_TAGS.has(tagName)) return false;
  if (node.children.length > 0) return false;
  return normalizeWs(node.textContent || "").length > 0;
}

function annotateEditorDocNodes(doc, source, decoratePreview = false) {
  const sourceText = String(source || "");
  const sourceLower = sourceText.toLowerCase();
  const lineStarts = computeLineStarts(sourceText);
  const nodeMap = new Map();
  let searchFrom = 0;

  doc.body.querySelectorAll("*").forEach((node) => {
    const tagName = String(node.tagName || "").toLowerCase();
    if (!tagName) return;

    const needle = `<${tagName}`;
    let offset = sourceLower.indexOf(needle, searchFrom);
    if (offset < 0) {
      offset = sourceLower.indexOf(needle);
    }
    if (offset < 0) return;

    const lineNumber = lineNumberFromOffset(lineStarts, offset);
    nodeMap.set(offset, node);

    if (decoratePreview) {
      node.setAttribute("data-editor-source-index", String(offset));
      node.setAttribute("data-editor-source-line", String(lineNumber));
      node.setAttribute("data-editor-tag", tagName);
      if (isQuickEditablePreviewNode(node)) {
        node.setAttribute("data-editor-quick-editable", "1");
        node.setAttribute("title", `더블클릭해서 텍스트 수정 · 소스 줄 ${lineNumber}`);
      } else {
        node.setAttribute("title", `소스 줄 ${lineNumber}`);
      }
    }

    searchFrom = offset + needle.length;
  });

  return nodeMap;
}

function syncContentEditorScroll() {
  if (!el.contentEditorInput || !el.contentEditorHighlight) return;
  el.contentEditorHighlight.scrollTop = el.contentEditorInput.scrollTop;
  el.contentEditorHighlight.scrollLeft = el.contentEditorInput.scrollLeft;
}

function renderContentEditorHighlight(source) {
  if (!el.contentEditorHighlight) return;
  el.contentEditorHighlight.innerHTML = buildHighlightedHtmlSource(source);
  syncContentEditorScroll();
}

function computeLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function lineNumberFromOffset(lineStarts, offset) {
  const target = Math.max(0, Number(offset) || 0);
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(1, high + 1);
}

function clearEditorPreviewClickTimer() {
  if (state.editorPreviewClickTimer) {
    window.clearTimeout(state.editorPreviewClickTimer);
    state.editorPreviewClickTimer = null;
  }
}

function closeInlineQuickEditor() {
  document.querySelectorAll(".content-inline-editor").forEach((node) => node.remove());
}

function positionInlineQuickEditor(container, target, shell) {
  if (!container || !target || !shell) return;
  const previewRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top = targetRect.bottom - previewRect.top + container.scrollTop + 8;
  const left = targetRect.left - previewRect.left + container.scrollLeft;
  shell.style.top = `${Math.max(8, top)}px`;
  shell.style.left = `${Math.max(8, left)}px`;
}

function buildEditorPreviewHtml(sourceHtml) {
  const source = String(sourceHtml || "");
  if (!source.trim()) {
    return '<p class="muted">미리보기가 없습니다.</p>';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${source}</body>`, "text/html");
  annotateEditorDocNodes(doc, source, true);
  return doc.body.innerHTML || '<p class="muted">미리보기가 없습니다.</p>';
}

function escapeHtmlTextNode(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findOpeningTagEnd(source, startIndex) {
  const text = String(source || "");
  let quote = "";

  for (let index = Math.max(0, Number(startIndex) || 0); index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      return index;
    }
  }

  return -1;
}

function replacePlainTextNodeInSource(source, offset, tagName, nextText) {
  const rawSource = String(source || "");
  const normalizedTag = String(tagName || "").toLowerCase();
  if (!rawSource || !normalizedTag) return "";

  const openEnd = findOpeningTagEnd(rawSource, offset);
  if (openEnd < 0) return "";

  const closeNeedle = `</${normalizedTag}`;
  const closeStart = rawSource.toLowerCase().indexOf(closeNeedle, openEnd + 1);
  if (closeStart < 0) return "";

  return (
    rawSource.slice(0, openEnd + 1) +
    escapeHtmlTextNode(nextText) +
    rawSource.slice(closeStart)
  );
}

function updateQuickEditableTextInSource(source, offset, nextText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${String(source || "")}</body>`, "text/html");
  const nodeMap = annotateEditorDocNodes(doc, source, false);
  const target = nodeMap.get(Number(offset) || 0);
  if (!target || !isQuickEditablePreviewNode(target)) return "";
  const tagName = String(target.tagName || "").toLowerCase();
  return replacePlainTextNodeInSource(source, offset, tagName, nextText);
}

function focusContentEditorSource(offset, lineHint = 0) {
  if (!el.contentEditorInput) return;

  const input = el.contentEditorInput;
  const source = String(input.value || "");
  const safeOffset = Math.max(0, Math.min(source.length, Number(offset) || 0));
  const lineStart = source.lastIndexOf("\n", Math.max(0, safeOffset - 1)) + 1;
  let lineEnd = source.indexOf("\n", safeOffset);
  if (lineEnd < 0) lineEnd = source.length;

  input.focus();
  input.setSelectionRange(lineStart, lineEnd);

  const lineNumber =
    Number(lineHint) > 0 ? Number(lineHint) : source.slice(0, safeOffset).split("\n").length;
  const lineHeight = parseFloat(window.getComputedStyle(input).lineHeight) || 22;
  input.scrollTop = Math.max(0, (lineNumber - 2) * lineHeight);
  syncContentEditorScroll();
  setEditorStatus(`렌더 미리보기에서 선택한 요소의 소스 줄 ${lineNumber}로 이동했습니다.`);
}

function isLiveContentDirectEditEnabled() {
  return Boolean(
    state.isAdmin &&
    state.editModeOpen &&
    state.currentClipKey &&
    state.editorSourceClipKey &&
    state.editorSourceClipKey === state.currentClipKey
  );
}

function editorLiveRenderHtml(rawHtml) {
  const html = String(rawHtml || "");
  if (!state.currentClipKey || state.currentClipKey !== state.editorSourceClipKey) {
    return html;
  }
  return rewriteClientClipHtml(state.currentClipKey, html);
}

function annotateLiveEditorNodes(root, source) {
  if (!(root instanceof Element)) return;
  const sourceText = String(source || "");
  const sourceLower = sourceText.toLowerCase();
  const lineStarts = computeLineStarts(sourceText);
  let searchFrom = 0;

  root.querySelectorAll("*").forEach((node) => {
    const tagName = String(node.tagName || "").toLowerCase();
    if (!tagName) return;

    const needle = `<${tagName}`;
    let offset = sourceLower.indexOf(needle, searchFrom);
    if (offset < 0) {
      offset = sourceLower.indexOf(needle);
    }
    if (offset < 0) return;

    if (isQuickEditablePreviewNode(node)) {
      const lineNumber = lineNumberFromOffset(lineStarts, offset);
      node.setAttribute("data-editor-source-index", String(offset));
      node.setAttribute("data-editor-source-line", String(lineNumber));
      node.setAttribute("data-editor-tag", tagName);
      node.setAttribute("data-editor-quick-editable", "1");
      node.setAttribute("title", `더블클릭해서 텍스트 수정 · 소스 줄 ${lineNumber}`);
    }

    searchFrom = offset + needle.length;
  });
}

function renderClipBodyContent(contentHtml, options = {}) {
  const html = String(contentHtml || "");
  const liveEditEnabled =
    typeof options.liveEditEnabled === "boolean"
      ? options.liveEditEnabled
      : isLiveContentDirectEditEnabled();

  closeInlineQuickEditor();
  el.clipBody.innerHTML = html || "<p>콘텐츠가 없습니다.</p>";
  
  // 동적으로 주입된 script 태그 강제 실행
  el.clipBody.querySelectorAll("script").forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });

  el.clipBody.classList.toggle("direct-edit-enabled", liveEditEnabled);
  if (liveEditEnabled) {
    annotateLiveEditorNodes(el.clipBody, html);
  }
  enhanceClipBody();
  wireClipInteractions();
  applyWrapupIdentityPrefill();
}

/* [260807] 팀·이름 공통 프리필 — R1 제출 시 저장되는 ax_wrapup_identity를 통합 Gate(2-5·3-1c)·
   CH05 회수표/실천계획·정리본/통합본 패널의 빈 성명·팀 칸에 자동 반영해, 교육생이 매 클립마다
   이름을 다시 입력하지 않도록 한다. 반대로 이 칸들에 새로 입력한 성명도 저장해 이후 클립에 승계. */
function applyWrapupIdentityPrefill() {
  const NAME_SELECTOR = [
    'input[data-rev-field="name"]',
    'input[data-c501-field="participantName"]',
    'input[data-c502-field="participantName"]',
    "input[data-c2m-name]",
    "input[data-c2b-name]"
  ].join(",");
  const TEAM_SELECTOR = "select[data-c2m-team],select[data-c2b-team]";

  const readIdentity = () => {
    try { return JSON.parse(localStorage.getItem("ax_wrapup_identity") || "null") || null; } catch (err) { return null; }
  };
  const fill = () => {
    const identity = readIdentity();
    if (!identity || !el.clipBody) return;
    el.clipBody.querySelectorAll(NAME_SELECTOR).forEach((input) => {
      if (identity.name && !String(input.value || "").trim()) {
        input.value = identity.name;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    el.clipBody.querySelectorAll(TEAM_SELECTOR).forEach((select) => {
      if (identity.team && !select.value) {
        select.value = String(identity.team);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  };
  // 클립 자체 복원 스크립트(각자 storageKey 복원, 400ms 지연 프리필 포함)보다 뒤에, 빈 칸만 채운다
  setTimeout(fill, 600);
  setTimeout(fill, 1500);

  if (!el.clipBody || el.clipBody.dataset.identityCaptureWired === "1") return;
  el.clipBody.dataset.identityCaptureWired = "1";
  el.clipBody.addEventListener("change", (ev) => {
    const target = ev.target;
    if (!target || typeof target.matches !== "function" || !target.matches(NAME_SELECTOR)) return;
    const name = String(target.value || "").trim();
    if (!name) return;
    const identity = readIdentity() || {};
    if (identity.name === name) return;
    identity.name = name;
    try { localStorage.setItem("ax_wrapup_identity", JSON.stringify(identity)); } catch (err) { /* 저장 실패해도 진행에는 지장 없음 */ }
  });
}

function openInlineQuickEditor(target, offset, lineNumber, options = {}) {
  const container = options.container || el.contentEditorPreview;
  if (!container || !target) return;
  closeInlineQuickEditor();

  const currentText = String(target.textContent || "");
  const shell = document.createElement("div");
  shell.className = "content-inline-editor";
  shell.innerHTML = `
    <textarea class="content-inline-editor-input" rows="3" spellcheck="false"></textarea>
    <div class="content-inline-editor-actions">
      <button type="button" class="practice-mini-btn ghost" data-inline-edit-action="cancel">취소</button>
      <button type="button" class="practice-mini-btn" data-inline-edit-action="save">적용</button>
    </div>
  `;
  container.appendChild(shell);
  positionInlineQuickEditor(container, target, shell);

  const input = shell.querySelector(".content-inline-editor-input");
  if (!input) return;
  input.value = currentText;
  input.focus();
  input.setSelectionRange(0, input.value.length);

  const commit = () => {
    const nextText = input.value;
    if (nextText === currentText) {
      closeInlineQuickEditor();
      setEditorStatus("변경 사항이 없어 빠른 수정을 닫았습니다.");
      return;
    }

    const nextSource = updateQuickEditableTextInSource(
      el.contentEditorInput?.value || "",
      offset,
      nextText
    );

    if (!nextSource) {
      closeInlineQuickEditor();
      setEditorStatus(
        options.unsupportedMessage || "이 요소는 빠른 수정으로 안전하게 바꿀 수 없어 소스 편집으로 이동합니다.",
        true
      );
      focusContentEditorSource(offset, lineNumber);
      return;
    }

    applyContentEditorDraft(
      nextSource,
      options.successMessage || "렌더 미리보기에서 텍스트를 빠르게 수정했습니다."
    );
  };

  shell.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  shell.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  shell.querySelector('[data-inline-edit-action="cancel"]')?.addEventListener("click", () => {
    closeInlineQuickEditor();
    setEditorStatus("빠른 수정을 취소했습니다.");
  });

  shell.querySelector('[data-inline-edit-action="save"]')?.addEventListener("click", commit);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInlineQuickEditor();
      setEditorStatus("빠른 수정을 취소했습니다.");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  });
}

function onContentEditorPreviewClick(event) {
  const target = event.target.closest("[data-editor-source-index]");
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  clearEditorPreviewClickTimer();
  state.editorPreviewClickTimer = window.setTimeout(() => {
    focusContentEditorSource(
      Number(target.dataset.editorSourceIndex || 0),
      Number(target.dataset.editorSourceLine || 0)
    );
    state.editorPreviewClickTimer = null;
  }, 220);
}

function onContentEditorPreviewDoubleClick(event) {
  const target = event.target.closest("[data-editor-source-index]");
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  clearEditorPreviewClickTimer();

  const offset = Number(target.dataset.editorSourceIndex || 0);
  const lineNumber = Number(target.dataset.editorSourceLine || 0);
  if (target.dataset.editorQuickEditable !== "1") {
    focusContentEditorSource(offset, lineNumber);
    setEditorStatus("이 요소는 빠른 수정 대상이 아니라 소스 위치로 이동했습니다.");
    return;
  }
  openInlineQuickEditor(target, offset, lineNumber);
}

async function onClipBodyDirectEditDoubleClick(event) {
  if (!state.isAdmin) return;

  // 본문 수정 모드가 꺼져 있다면 더블클릭 시 자동으로 본문 수정 에디터를 활성화합니다.
  if (!state.editModeOpen) {
    try {
      await onToggleEditMode();
    } catch (error) {
      setEditorStatus(error.message, true);
      return;
    }
  }

  if (!isLiveContentDirectEditEnabled()) return;
  const target = event.target.closest("[data-editor-source-index]");
  if (!target || !el.clipBody.contains(target)) return;
  if (target.closest(".content-inline-editor")) return;

  event.preventDefault();
  event.stopPropagation();

  const offset = Number(target.dataset.editorSourceIndex || 0);
  const lineNumber = Number(target.dataset.editorSourceLine || 0);
  openInlineQuickEditor(target, offset, lineNumber, {
    container: el.clipBody,
    successMessage: "본문에서 텍스트를 직접 수정했습니다.",
    unsupportedMessage: "이 요소는 본문 직접 수정 대상이 아니라 HTML 소스에서 편집해야 합니다."
  });
}

function renderEditorPreview(html) {
  const source = String(html || "");
  closeInlineQuickEditor();
  clearEditorPreviewClickTimer();
  renderContentEditorHighlight(source);
  el.contentEditorPreview.innerHTML = buildEditorPreviewHtml(source);
  hydrateContentEditorPreview();
}

function setContentAssetStatus(message, isError = false) {
  el.contentAssetStatus.textContent = message || "";
  el.contentAssetStatus.style.color = isError ? "#b42318" : "";
}

function updateContentAssetSelectionSummary(files = null) {
  const items = Array.isArray(files) ? files : Array.from(el.contentAssetInput?.files || []);
  if (!el.contentAssetSelectionSummary) return;
  if (!items.length) {
    el.contentAssetSelectionSummary.textContent = "선택된 파일 없음";
    return;
  }
  if (items.length === 1) {
    el.contentAssetSelectionSummary.textContent = items[0].name || "파일 1건 선택";
    return;
  }
  const firstName = items[0]?.name || "파일";
  el.contentAssetSelectionSummary.textContent = `${firstName} 외 ${items.length - 1}건 선택`;
}

function setContentEmbedStatus(message, isError = false) {
  el.contentEmbedStatus.textContent = message || "";
  el.contentEmbedStatus.style.color = isError ? "#b42318" : "";
}

function formatBytes(bytes) {
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

function currentCourseCode() {
  return normalizeCourseCode(state.currentCourse?.courseCode || "");
}

function guessAssetKind(asset = {}) {
  const kind = normalizeWs(asset.kind || "").toLowerCase();
  if (kind) return kind;
  const ext = normalizeWs(asset.ext || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"].includes(ext)) return "image";
  if (ext === ".pdf") return "pdf";
  if ([".mp3", ".wav", ".m4a"].includes(ext)) return "audio";
  if (ext === ".mp4") return "video";
  return "file";
}

function getUrlPathForDetection(url) {
  try {
    const parsed = new URL(String(url || ""), window.location.origin);
    return `${parsed.pathname || ""}${parsed.search || ""}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

function inferDirectUrlKind(url) {
  const path = getUrlPathForDetection(url);
  if (/\.(png|jpg|jpeg|webp|svg|gif)(?:[?#].*)?$/i.test(path)) return "image";
  if (/\.pdf(?:[?#].*)?$/i.test(path)) return "pdf";
  if (/\.(mp3|wav|m4a|aac|ogg)(?:[?#].*)?$/i.test(path)) return "audio";
  if (/\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(path)) return "video";
  if (/\.m3u8(?:[?#].*)?$/i.test(path)) return "stream";
  return "link";
}

function parseYouTubeVideoId(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      return normalizeWs(parsed.pathname.split("/").filter(Boolean)[0] || "");
    }
    if (!/(^|\.)youtube\.com$/i.test(host) && host !== "youtube.com" && host !== "m.youtube.com") {
      return "";
    }
    if (parsed.pathname === "/watch") {
      return normalizeWs(parsed.searchParams.get("v") || "");
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(segments[0])) {
      return normalizeWs(segments[1] || "");
    }
  } catch {
    return "";
  }
  return "";
}

function buildExternalEmbedSpec(rawUrl, rawTitle = "") {
  const url = String(rawUrl || "").trim();
  const caption = normalizeWs(rawTitle);
  if (!url) {
    return { error: "외부 URL을 입력해 주세요." };
  }

  const youtubeId = parseYouTubeVideoId(url);
  if (youtubeId) {
    const title = caption || "YouTube 영상";
    const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`;
    const snippet = [
      `<div class="clip-section">`,
      `  <div class="clip-section-title">${escapeHtml(title)}</div>`,
      `  <div class="clip-section-content">`,
      `    <p><a href="${escapeAttribute(url)}" target="_blank" rel="noopener">YouTube 원본 열기</a></p>`,
      `    <iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;min-height:420px;border:0;border-radius:18px;background:#000;"></iframe>`,
      `  </div>`,
      `</div>`
    ].join("\n");
    return {
      kind: "youtube",
      title,
      meta: `YouTube · ${youtubeId}`,
      previewHtml: `<iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;min-height:360px;border:0;border-radius:16px;background:#000;"></iframe>`,
      snippet
    };
  }

  const kind = inferDirectUrlKind(url);
  const title = caption || (kind === "pdf"
    ? "외부 PDF 자료"
    : kind === "image"
      ? "외부 이미지"
      : kind === "audio"
        ? "외부 오디오"
        : kind === "video"
          ? "외부 동영상"
          : kind === "stream"
            ? "스트리밍 링크"
            : "외부 자료");
  const safeUrl = escapeAttribute(url);
  const safeTitle = escapeHtml(title);

  if (kind === "image") {
    return {
      kind,
      title,
      meta: "이미지 URL",
      previewHtml: `<img src="${safeUrl}" alt="${escapeAttribute(title)}" style="display:block;max-width:100%;height:auto;border-radius:16px;" />`,
      snippet: [
        `<figure class="clip-media">`,
        `  <img src="${safeUrl}" alt="${escapeAttribute(title)}" style="width:100%;height:auto;border-radius:18px;" />`,
        `  <figcaption>${safeTitle}</figcaption>`,
        `</figure>`
      ].join("\n")
    };
  }

  if (kind === "pdf") {
    return {
      kind,
      title,
      meta: "PDF URL",
      previewHtml: `<iframe src="${safeUrl}" title="${escapeAttribute(title)}" style="width:100%;min-height:420px;border:0;border-radius:12px;background:#fff;"></iframe>`,
      snippet: [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeTitle}</div>`,
        `  <div class="clip-section-content">`,
        `    <p><a href="${safeUrl}" target="_blank" rel="noopener">PDF 원본 열기</a></p>`,
        `    <iframe src="${safeUrl}" title="${escapeAttribute(title)}" loading="lazy" style="width:100%;min-height:720px;border:1px solid #d7e3f7;border-radius:18px;background:#fff;"></iframe>`,
        `  </div>`,
        `</div>`
      ].join("\n")
    };
  }

  if (kind === "audio") {
    return {
      kind,
      title,
      meta: "오디오 URL",
      previewHtml: `<audio controls preload="metadata" style="width:100%;"><source src="${safeUrl}" /></audio>`,
      snippet: [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeTitle}</div>`,
        `  <div class="clip-section-content">`,
        `    <p><a href="${safeUrl}" target="_blank" rel="noopener">오디오 원본 열기</a></p>`,
        `    <audio controls preload="metadata" style="width:100%;">`,
        `      <source src="${safeUrl}" />`,
        `    </audio>`,
        `  </div>`,
        `</div>`
      ].join("\n")
    };
  }

  if (kind === "video") {
    return {
      kind,
      title,
      meta: "동영상 URL",
      previewHtml: `<video controls preload="metadata" style="display:block;width:100%;max-height:420px;border-radius:16px;background:#000;"><source src="${safeUrl}" /></video>`,
      snippet: [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeTitle}</div>`,
        `  <div class="clip-section-content">`,
        `    <p><a href="${safeUrl}" target="_blank" rel="noopener">동영상 원본 열기</a></p>`,
        `    <video controls preload="metadata" style="width:100%;border-radius:18px;background:#000;">`,
        `      <source src="${safeUrl}" />`,
        `    </video>`,
        `  </div>`,
        `</div>`
      ].join("\n")
    };
  }

  if (kind === "stream") {
    return {
      kind,
      title,
      meta: "스트리밍 링크 · HLS/DASH 플레이어 연동 전",
      previewHtml: `<div class="muted">HLS/DASH 스트림은 브라우저별 재생 지원이 다릅니다. 현재는 링크로 삽입하고, 필요하면 이후 <code>hls.js</code> 또는 전용 플레이어를 붙일 수 있습니다.</div>`,
      snippet: [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeTitle}</div>`,
        `  <div class="clip-section-content">`,
        `    <p>스트리밍 주소: <a href="${safeUrl}" target="_blank" rel="noopener">${safeTitle}</a></p>`,
        `    <p class="muted">HLS/DASH 플레이어는 필요 시 별도 스크립트로 확장합니다.</p>`,
        `  </div>`,
        `</div>`
      ].join("\n")
    };
  }

  return {
    kind: "link",
    title,
    meta: "일반 링크",
    previewHtml: `<a href="${safeUrl}" target="_blank" rel="noopener">${safeTitle}</a>`,
    snippet: `<a href="${safeUrl}" target="_blank" rel="noopener">${safeTitle}</a>`
  };
}

function buildAssetInsertionSnippet(asset, mode = "link") {
  const name = String(asset?.name || "asset");
  const url = String(asset?.url || "");
  const safeAlt = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "자료";
  const safeName = escapeHtml(name);
  const safeUrl = escapeAttribute(url);
  const safeLabel = escapeHtml(safeAlt);
  const safeLabelAttr = escapeAttribute(safeAlt);
  const kind = guessAssetKind(asset);

  if (mode === "media" && (kind === "image" || kind === "pdf" || kind === "audio" || kind === "video")) {
    if (kind === "image") {
      return [
        `<figure class="clip-media">`,
        `  <img src="${safeUrl}" alt="${safeLabelAttr}" style="width:100%;height:auto;border-radius:18px;" />`,
        `  <figcaption>${safeLabel}</figcaption>`,
        `</figure>`
      ].join("\n");
    }

    if (kind === "pdf") {
      return [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeLabel}</div>`,
        `  <div class="clip-section-content">`,
        `    <p><a href="${safeUrl}" target="_blank" rel="noopener">PDF 원본 열기</a></p>`,
        `    <iframe src="${safeUrl}" title="${safeLabelAttr}" loading="lazy" style="width:100%;min-height:720px;border:1px solid #d7e3f7;border-radius:18px;background:#fff;"></iframe>`,
        `  </div>`,
        `</div>`
      ].join("\n");
    }

    if (kind === "audio") {
      return [
        `<div class="clip-section">`,
        `  <div class="clip-section-title">${safeLabel}</div>`,
        `  <div class="clip-section-content">`,
        `    <p><a href="${safeUrl}" target="_blank" rel="noopener">오디오 원본 열기</a></p>`,
        `    <audio controls preload="metadata" style="width:100%;">`,
        `      <source src="${safeUrl}" />`,
        `    </audio>`,
        `  </div>`,
        `</div>`
      ].join("\n");
    }

    return [
      `<div class="clip-section">`,
      `  <div class="clip-section-title">${safeLabel}</div>`,
      `  <div class="clip-section-content">`,
      `    <p><a href="${safeUrl}" target="_blank" rel="noopener">동영상 원본 열기</a></p>`,
      `    <video controls preload="metadata" style="width:100%;border-radius:18px;background:#000;">`,
      `      <source src="${safeUrl}" />`,
      `    </video>`,
      `  </div>`,
      `</div>`
    ].join("\n");
  }

  return `<a href="${safeUrl}" target="_blank" rel="noopener">${safeName}</a>`;
}

function resetContentAssetPreview() {
  state.editorActiveAssetPath = "";
  el.contentAssetPreviewPanel.classList.add("hidden");
  el.contentAssetPreviewTitle.textContent = "자산 미리보기";
  el.contentAssetPreviewMeta.textContent = "-";
  el.contentAssetPreviewBody.innerHTML = "";
  el.contentAssetSnippet.textContent = "";
  if (el.copyContentAssetPathBtn) el.copyContentAssetPathBtn.disabled = true;
  if (el.insertContentAssetLinkBtn) el.insertContentAssetLinkBtn.disabled = true;
  if (el.insertContentAssetMediaBtn) {
    el.insertContentAssetMediaBtn.textContent = "미디어 삽입";
    el.insertContentAssetMediaBtn.disabled = true;
  }
}

function renderContentAssetPreview(asset) {
  if (!asset) {
    resetContentAssetPreview();
    return;
  }

  state.editorActiveAssetPath = asset.relativePath || "";
  el.contentAssetPreviewPanel.classList.remove("hidden");
  el.contentAssetPreviewTitle.textContent = asset.name || "자산";
  el.contentAssetPreviewMeta.textContent = `${asset.relativePath || "-"} · ${asset.sizeLabel || formatBytes(asset.size)} · ${(asset.mime || "").replace(/;.*$/, "")}`;
  if (el.copyContentAssetPathBtn) el.copyContentAssetPathBtn.disabled = false;
  if (el.insertContentAssetLinkBtn) el.insertContentAssetLinkBtn.disabled = false;

  const kind = guessAssetKind(asset);
  if (el.insertContentAssetMediaBtn) {
    el.insertContentAssetMediaBtn.disabled = !(
      kind === "image" ||
      kind === "pdf" ||
      kind === "audio" ||
      kind === "video"
    );
    el.insertContentAssetMediaBtn.textContent =
      kind === "image"
        ? "이미지 삽입"
        : kind === "pdf"
          ? "PDF 삽입"
          : kind === "audio"
            ? "오디오 삽입"
            : kind === "video"
              ? "동영상 삽입"
              : "미디어 삽입";
  }
  if (kind === "image") {
    el.contentAssetPreviewBody.innerHTML = `<img src="${escapeAttribute(asset.url || "")}" alt="${escapeAttribute(asset.name || "asset")}" style="display:block;max-width:100%;height:auto;border-radius:16px;" />`;
  } else if (kind === "pdf") {
    el.contentAssetPreviewBody.innerHTML = `<iframe src="${escapeAttribute(asset.url || "")}" title="${escapeAttribute(asset.name || "asset")}" style="width:100%;min-height:420px;border:0;border-radius:12px;background:#fff;"></iframe>`;
  } else if (kind === "audio") {
    el.contentAssetPreviewBody.innerHTML = `<audio controls preload="metadata" style="width:100%;"><source src="${escapeAttribute(asset.url || "")}" /></audio>`;
  } else if (kind === "video") {
    el.contentAssetPreviewBody.innerHTML = `<video controls preload="metadata" style="display:block;width:100%;max-height:420px;border-radius:16px;background:#000;"><source src="${escapeAttribute(asset.url || "")}" /></video>`;
  } else {
    el.contentAssetPreviewBody.innerHTML = `<a href="${escapeAttribute(asset.url || "#")}" target="_blank" rel="noopener">${escapeHtml(asset.name || asset.url || "파일 열기")}</a>`;
  }

  el.contentAssetSnippet.textContent = buildAssetInsertionSnippet(
    asset,
    kind === "image" || kind === "pdf" || kind === "audio" || kind === "video"
      ? "media"
      : "link"
  );
}

function resetContentEmbedPreview() {
  state.editorEmbedSpec = null;
  el.contentEmbedPreviewPanel.classList.add("hidden");
  el.contentEmbedPreviewTitle.textContent = "외부 임베드 미리보기";
  el.contentEmbedPreviewMeta.textContent = "-";
  el.contentEmbedPreviewBody.innerHTML = "";
  el.contentEmbedSnippet.textContent = "";
  if (el.insertContentEmbedBtn) el.insertContentEmbedBtn.disabled = true;
}

function renderContentEmbedPreview(spec) {
  if (!spec || spec.error) {
    resetContentEmbedPreview();
    return;
  }

  state.editorEmbedSpec = spec;
  el.contentEmbedPreviewPanel.classList.remove("hidden");
  el.contentEmbedPreviewTitle.textContent = spec.title || "외부 임베드";
  el.contentEmbedPreviewMeta.textContent = spec.meta || "-";
  el.contentEmbedPreviewBody.innerHTML =
    spec.previewHtml || "<p class=\"muted\">미리보기를 생성할 수 없습니다.</p>";
  el.contentEmbedSnippet.textContent = spec.snippet || "";
  if (el.insertContentEmbedBtn) el.insertContentEmbedBtn.disabled = !spec.snippet;
}

function renderContentAssetList() {
  const assets = Array.isArray(state.editorAssets) ? state.editorAssets : [];
  state.editorAssetMap = new Map(assets.map((asset) => [asset.relativePath, asset]));

  if (!assets.length) {
    el.contentAssetList.innerHTML = "<p class=\"muted\">현재 클립에 등록된 자산이 없습니다.</p>";
    resetContentAssetPreview();
    return;
  }

  el.contentAssetList.innerHTML = assets
    .map((asset) => {
      const kind = guessAssetKind(asset);
      const allowMedia =
        kind === "image" || kind === "pdf" || kind === "audio" || kind === "video";
      const mediaLabel =
        kind === "image"
          ? "이미지 삽입"
          : kind === "pdf"
            ? "PDF 삽입"
            : kind === "audio"
              ? "오디오 삽입"
              : "동영상 삽입";
      return `
        <article class="content-asset-card">
          <div class="content-asset-meta">
            <strong>${escapeHtml(asset.name || "")}</strong>
            <span>${escapeHtml(asset.relativePath || "")}</span>
            <span>${escapeHtml(asset.sizeLabel || formatBytes(asset.size))} · ${escapeHtml(kind.toUpperCase())}</span>
          </div>
          <div class="asset-preview-actions">
            <button type="button" class="practice-mini-btn ghost" data-asset-action="preview" data-asset-path="${escapeAttribute(asset.relativePath || "")}">미리보기</button>
            <button type="button" class="practice-mini-btn ghost" data-default-label="경로 복사" data-asset-action="copy-path" data-asset-path="${escapeAttribute(asset.relativePath || "")}">경로 복사</button>
            <button type="button" class="practice-mini-btn ghost" data-asset-action="insert-link" data-asset-path="${escapeAttribute(asset.relativePath || "")}">링크 삽입</button>
            ${allowMedia ? `<button type="button" class="practice-mini-btn ghost" data-asset-action="insert-media" data-asset-path="${escapeAttribute(asset.relativePath || "")}">${mediaLabel}</button>` : ""}
            <button type="button" class="practice-mini-btn ghost" data-asset-action="delete" data-asset-path="${escapeAttribute(asset.relativePath || "")}">삭제</button>
          </div>
        </article>
      `;
    })
    .join("");

  const activeAsset = state.editorAssetMap.get(state.editorActiveAssetPath) || assets[0];
  renderContentAssetPreview(activeAsset);
}

function applyContentEditorDraft(nextValue, statusMessage = "") {
  const value = String(nextValue || "");
  const liveHtml = editorLiveRenderHtml(value);
  el.contentEditorInput.value = value;
  state.editorDirty = value !== state.editorSourceHtml;
  state.currentVisibleContentHtml = liveHtml;
  renderEditorPreview(value);
  if (state.editModeOpen && state.currentClipKey === state.editorSourceClipKey) {
    renderClipBodyContent(liveHtml, { liveEditEnabled: true });
  }
  if (statusMessage) {
    setEditorStatus(statusMessage);
  } else if (state.editorDirty) {
    setEditorStatus("저장 전 미리보기 상태입니다.");
  } else {
    setEditorStatus("원본과 동일합니다.");
  }
  updateEditorVisibility();
}

function insertIntoContentEditor(snippet) {
  if (!el.contentEditorInput) return;
  const input = el.contentEditorInput;
  const start = Number.isFinite(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : input.value.length;
  const prefix = input.value.slice(0, start);
  const suffix = input.value.slice(end);
  const joinerBefore = prefix && !prefix.endsWith("\n") ? "\n" : "";
  const joinerAfter = suffix && !suffix.startsWith("\n") ? "\n" : "";
  const nextValue = `${prefix}${joinerBefore}${snippet}${joinerAfter}${suffix}`;
  applyContentEditorDraft(nextValue, "에셋 HTML이 편집기에 삽입되었습니다.");
  const cursor = (prefix + joinerBefore + snippet).length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",").pop() : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

function resetContentEditor() {
  state.editModeOpen = false;
  state.editorSourceClipKey = "";
  state.editorSourceHtml = "";
  state.editorDirty = false;
  state.editorAssets = [];
  state.editorAssetMap = new Map();
  state.editorActiveAssetPath = "";
  state.editorEmbedSpec = null;
  if (el.contentEditorInput) el.contentEditorInput.value = "";
  if (el.contentEditorPath) el.contentEditorPath.textContent = "-";
  if (el.contentAssetInput) el.contentAssetInput.value = "";
  updateContentAssetSelectionSummary([]);
  if (el.contentAssetUploadHint) el.contentAssetUploadHint.textContent = "-";
  if (el.contentEmbedUrlInput) el.contentEmbedUrlInput.value = "";
  if (el.contentEmbedTitleInput) el.contentEmbedTitleInput.value = "";
  if (el.contentAssetList) {
    el.contentAssetList.innerHTML = "<p class=\"muted\">업로드된 자산을 불러오면 여기에 표시됩니다.</p>";
  }
  closeInlineQuickEditor();
  el.clipBody?.classList.remove("direct-edit-enabled");
  resetContentAssetPreview();
  resetContentEmbedPreview();
  renderEditorPreview("");
  setEditorStatus("");
  setContentAssetStatus("");
  setContentEmbedStatus("");
}

function currentSidebarDraft() {
  return {
    chapterTitle: normalizeWs(el.sidebarChapterTitleInput?.value || ""),
    chapterTime: normalizeWs(el.sidebarChapterTimeInput?.value || ""),
    clipTitle: normalizeWs(el.sidebarClipTitleInput?.value || ""),
    clipType: normalizeWs(el.sidebarClipTypeInput?.value || "")
  };
}

function currentVisibleSidebarState() {
  const sidebarClip = state.clipMap.get(state.currentClipKey) || null;
  const chapterId = normalizeWs(sidebarClip?.chapterId || state.currentChapterId || "").toLowerCase();
  const chapter = state.chapters.find(
    (item) => normalizeWs(item.chapterId || "").toLowerCase() === chapterId
  );

  return {
    chapterNum: normalizeWs(sidebarClip?.chapterNum || state.currentChapterNum || chapter?.chapterNum || ""),
    chapterTitle: normalizeWs(sidebarClip?.chapterTitle || state.currentChapterTitle || chapter?.title || ""),
    chapterTime: normalizeWs(chapter?.time || sidebarClip?.chapterTime || ""),
    clipTitle: normalizeWs(sidebarClip?.title || ""),
    clipType: normalizeWs(sidebarClip?.type || "")
  };
}

function applySidebarDraftToClientState(draft) {
  const chapterId = normalizeWs(state.currentChapterId || "").toLowerCase();
  const clipKey = normalizeWs(state.currentClipKey || "").toLowerCase();
  if (!chapterId || !clipKey) return;

  state.chapters = state.chapters.map((chapter) => {
    if (normalizeWs(chapter.chapterId || "").toLowerCase() !== chapterId) {
      return chapter;
    }
    return {
      ...chapter,
      title: draft.chapterTitle,
      time: draft.chapterTime,
      clips: Array.isArray(chapter.clips)
        ? chapter.clips.map((clip) =>
          normalizeWs(clip.clipKey || "").toLowerCase() === clipKey
            ? { ...clip, title: draft.clipTitle, type: draft.clipType }
            : clip
        )
        : []
    };
  });

  const sidebarClip = state.clipMap.get(state.currentClipKey);
  if (sidebarClip) {
    state.clipMap.set(state.currentClipKey, {
      ...sidebarClip,
      chapterTitle: draft.chapterTitle,
      chapterTime: draft.chapterTime,
      title: draft.clipTitle,
      type: draft.clipType
    });
  }

  state.currentChapterTitle = draft.chapterTitle;
}

function renderSidebarMetaPreview() {
  const draft = currentSidebarDraft();
  const visible = currentVisibleSidebarState();
  el.sidebarPreviewChapterNum.textContent = visible.chapterNum
    ? visible.chapterNum.replace(/\s+/g, "")
    : "CH00";
  el.sidebarPreviewChapterTitle.textContent = draft.chapterTitle || "챕터 제목";
  el.sidebarPreviewChapterTime.textContent = draft.chapterTime || "-";
  el.sidebarPreviewClipTitle.textContent = draft.clipTitle || "클립 제목";
  el.sidebarPreviewClipType.textContent = draft.clipType || "개념";
}

function resetSidebarEditor() {
  state.sidebarEditOpen = false;
  state.sidebarDirty = false;
  state.sidebarSourceClipKey = "";
  state.sidebarSourceState = null;
  if (el.sidebarEditorPath) el.sidebarEditorPath.textContent = "-";
  if (el.sidebarChapterTitleInput) el.sidebarChapterTitleInput.value = "";
  if (el.sidebarChapterTimeInput) el.sidebarChapterTimeInput.value = "";
  if (el.sidebarClipTitleInput) el.sidebarClipTitleInput.value = "";
  if (el.sidebarClipTypeInput) el.sidebarClipTypeInput.value = "개념";
  renderSidebarMetaPreview();
  setSidebarEditorStatus("");
}

function resetPublishPanel() {
  state.publishPanelOpen = false;
  state.publishStatus = null;
  if (el.publishCommitMessageInput) {
    el.publishCommitMessageInput.value = "";
  }
  renderPublishPanel();
  setPublishPanelStatus("");
}

function renderPublishFileEntries(items, emptyMessage) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  }

  return items
    .map(
      (item) => `
        <div class="publish-file-entry">
          <span class="publish-file-code">${escapeHtml(item.status || "--")}</span>
          <span class="publish-file-path">${escapeHtml(item.path || "-")}</span>
        </div>
      `
    )
    .join("");
}

function renderPublishPanel() {
  const git = state.publishStatus?.git || null;

  if (!git) {
    el.publishBranchSummary.textContent = "-";
    el.publishHeadSummary.textContent = "-";
    el.publishDivergenceSummary.textContent = "-";
    el.publishPendingSummary.textContent = "-";
    el.publishTrackedFiles.innerHTML =
      '<p class="muted">변경 사항을 불러오면 여기에 표시됩니다.</p>';
    el.publishIgnoredFiles.innerHTML =
      '<p class="muted">제외된 항목이 있으면 여기에 표시됩니다.</p>';
    return;
  }

  const branchText = git.branch || "detached";
  const upstreamText = git.upstream ? ` -> ${git.upstream}` : "";
  el.publishBranchSummary.textContent = `${branchText}${upstreamText}`;
  el.publishHeadSummary.textContent = git.head
    ? `${git.head} ${normalizeWs(git.headMessage || "")}`.trim()
    : "-";

  const ahead = Number(git.ahead || 0);
  const behind = Number(git.behind || 0);
  const trackedCount = Number(git.publishable?.trackedCount || 0);
  const untrackedCount = Number(git.publishable?.untrackedCount || 0);
  const ignoredCount = Number(git.publishable?.ignoredCount || 0);
  el.publishDivergenceSummary.textContent = `ahead ${ahead} / behind ${behind}`;
  el.publishPendingSummary.textContent =
    trackedCount || untrackedCount || ignoredCount
      ? `배포 대상 ${trackedCount + untrackedCount}건 · 제외 ${ignoredCount}건`
      : "배포 대상 변경 없음";

  el.publishTrackedFiles.innerHTML = renderPublishFileEntries(
    [
      ...(git.publishable?.tracked || []),
      ...(git.publishable?.untracked || [])
    ],
    "현재 배포 대상 변경 파일이 없습니다."
  );
  el.publishIgnoredFiles.innerHTML = renderPublishFileEntries(
    git.publishable?.ignored || [],
    "제외된 파일이 없습니다."
  );

  if (el.publishCommitMessageInput && !normalizeWs(el.publishCommitMessageInput.value)) {
    el.publishCommitMessageInput.value =
      ahead > 0 && !trackedCount && !untrackedCount
        ? "Push pending root updates"
        : "Publish root editor updates";
  }
}

function isRootAdmin() {
  return Boolean(state.isAdmin && state.user?.accountId === "root");
}

function updateEditorVisibility() {
  // 편집·배포 컨트롤은 관리자(root) 전용 — 강사(승격 계정)는 Wrap-up 기능만 사용
  const showEditorControls = isRootAdmin();
  el.toggleEditModeBtn.classList.toggle("hidden", !showEditorControls);
  el.saveContentEditorTopBtn?.classList.toggle(
    "hidden",
    !showEditorControls || !state.editModeOpen
  );
  if (el.saveContentEditorTopBtn) {
    el.saveContentEditorTopBtn.disabled = !state.editModeOpen || !state.editorDirty;
    el.saveContentEditorTopBtn.title = state.editorDirty
      ? "현재 본문 수정 내용을 저장합니다."
      : "변경된 내용이 없습니다.";
  }
  el.toggleSidebarModeBtn.classList.toggle("hidden", !showEditorControls);
  el.togglePublishModeBtn.classList.toggle("hidden", !showEditorControls);
  el.contentEditorPanel.classList.toggle(
    "hidden",
    !showEditorControls || !state.editModeOpen
  );
  el.sidebarEditorPanel.classList.toggle(
    "hidden",
    !showEditorControls || !state.sidebarEditOpen
  );
  el.publishPanel.classList.toggle(
    "hidden",
    !showEditorControls || !state.publishPanelOpen
  );
  el.toggleEditModeBtn.textContent = state.editModeOpen ? "본문 수정 닫기" : "본문 수정";
  el.toggleSidebarModeBtn.textContent = state.sidebarEditOpen
    ? "사이드바 수정 닫기"
    : "사이드바 수정";
  el.togglePublishModeBtn.textContent = state.publishPanelOpen
    ? "Pages 배포 닫기"
    : "Pages 배포";
}

function openAccountModal() {
  if (!state.user) return;
  el.accountEditId.value = state.user.accountId || "";
  el.accountEditTeamName.value = state.user.teamName || "";
  el.accountEditDisplayName.value = state.user.displayName || "";
  el.accountCurrentPassword.value = "";
  el.accountNewPassword.value = "";
  setAccountStatus("");
  el.accountModal.classList.remove("hidden");
}

function closeAccountModal() {
  el.accountModal.classList.add("hidden");
  setAccountStatus("");
}

function showLoginMode() {
  el.loginForm.classList.remove("hidden");
  el.signupForm.classList.add("hidden");
  el.passwordHelpPanel.classList.add("hidden");
  el.showLoginModeBtn.classList.add("active");
  el.showSignupModeBtn.classList.remove("active");
  setLoginError("");
  setSignupError("");
}

function showSignupMode() {
  el.signupForm.classList.remove("hidden");
  el.loginForm.classList.add("hidden");
  el.passwordHelpPanel.classList.add("hidden");
  el.showSignupModeBtn.classList.add("active");
  el.showLoginModeBtn.classList.remove("active");
  setLoginError("");
  setSignupError("");
}

function showPasswordHelpMode() {
  el.passwordHelpPanel.classList.remove("hidden");
  el.loginForm.classList.add("hidden");
  el.signupForm.classList.add("hidden");
  el.showLoginModeBtn.classList.remove("active");
  el.showSignupModeBtn.classList.remove("active");
  el.passwordHintResult.textContent = "";
  el.passwordRecoverResult.textContent = "";
}

function updateSidePanelUI() {
  state.taskPanelOpen = false;
  const open = state.notePanelOpen;
  el.layout.classList.toggle("with-task-panel", open);
  el.layout.classList.toggle("no-task-panel", !open);

  el.taskPanel.classList.add("collapsed");
  el.notePanel.classList.toggle("collapsed", !state.notePanelOpen);

  renderMiroLaunchButton();
  el.toggleNoteBtn.textContent = state.notePanelOpen ? "메모 닫기" : "메모 펼치기";
}

function miroButtonMarkup({ compact = false } = {}) {
  const badgeClass = compact ? "miro-logo-badge compact" : "miro-logo-badge";
  return `
    <span class="${badgeClass}" aria-hidden="true">
      <svg viewBox="0 0 38 38" focusable="false" aria-hidden="true">
        <path d="M7 8h5l3.8 7-4.3 15H7.4l3.2-15L7 8Z" fill="currentColor"></path>
        <path d="M17 8h5.2l3.6 7-4 15H17.6l3.1-15L17 8Z" fill="currentColor"></path>
        <path d="M27 8h5.4l2.6 7-4.8 15h-5l3.7-15L27 8Z" fill="currentColor"></path>
      </svg>
    </span>
    <span class="miro-btn-label">공유</span>
  `;
}

function renderMiroLaunchButton() {
  if (!el.toggleTaskBtn) return;
  el.toggleTaskBtn.classList.add("miro-launch-btn");
  el.toggleTaskBtn.setAttribute("aria-label", "공유 보드 열기");
  el.toggleTaskBtn.setAttribute("title", "공유 보드 열기");
  el.toggleTaskBtn.innerHTML = miroButtonMarkup();
}

function decorateMiroDemoButtons(root = el.clipBody) {
  if (!root) return;
  root.querySelectorAll(".lms-demo-btn").forEach((button) => {
    const label = normalizeWs(button.textContent || "");
    if (!/^Miro(?:\.공유하기)?$/i.test(label) && label !== "Miro.공유하기") return;
    const compact = button.classList.contains("lms-demo-btn-inline");
    button.classList.add("miro-demo-btn");
    button.setAttribute("aria-label", "공유");
    button.innerHTML = miroButtonMarkup({ compact });
  });
}

function applySidebarCollapsedState() {
  el.layout?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  if (!el.sidebarToggleBtn) return;
  const expanded = !state.sidebarCollapsed;
  el.sidebarToggleBtn.classList.toggle("is-collapsed", state.sidebarCollapsed);
  el.sidebarToggleBtn.setAttribute("aria-expanded", String(expanded));
  el.sidebarToggleBtn.setAttribute("aria-label", expanded ? "목차 접기" : "목차 펼치기");
  el.sidebarToggleBtn.setAttribute("title", expanded ? "목차 접기" : "목차 펼치기");
}

function setSidebarCollapsed(nextValue, { persist = true } = {}) {
  state.sidebarCollapsed = Boolean(nextValue);
  applySidebarCollapsedState();
  if (persist) {
    writeSidebarCollapsedPreference(state.sidebarCollapsed);
  }
}

function onToggleSidebar() {
  setSidebarCollapsed(!state.sidebarCollapsed);
}

function getAllClips() {
  return state.chapters.flatMap((chapter) => chapter.clips);
}

// [HIDDEN] 진도율 계산에서 숨겨진 세션들을 제외합니다.
// 복구 시: 해당 clipKey를 아래 배열에서 삭제하세요.
// - "ch00-clip02": 자사 생성형 AI 서비스 현황
// - "ch03-clip05": 기업 분석 코스: 열린 주제로 해보는 NotebookLM 분석
const HIDDEN_CLIP_KEYS_FROM_PROGRESS = new Set(["ch00-clip02", "ch04-clip05"]);

function updateProgressBadge() {
  const all = getAllClips().filter((clip) => !HIDDEN_CLIP_KEYS_FROM_PROGRESS.has(clip.clipKey));
  const total = all.length;
  const done = all.filter((clip) => state.completedSet.has(clip.clipKey)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  el.progressBadge.textContent = `진도 ${pct}% (${done}/${total})`;
}

function updateMarkCompleteButton() {
  const done = state.completedSet.has(state.currentClipKey);
  el.markCompleteBtn.textContent = done ? "완료 해제" : "학습 완료";
  el.markCompleteBtn.style.background = done ? "linear-gradient(180deg, #8f002e 0%, #7d0028 100%)" : "";
  el.markCompleteBtn.style.borderColor = done ? "#7d0028" : "";
  el.markCompleteBtn.style.boxShadow = done ? "0 10px 20px rgba(125, 0, 40, 0.22)" : "";
  el.markCompleteBtn.style.color = done ? "#ffffff" : "";
}

function clipTypeLabel(clip, chapter) {
  const base = normalizeWs(clip.type);
  const text = `${normalizeWs(clip.title)} ${normalizeWs(chapter.title)}`;
  if (/설정|setup/i.test(text)) return "설정";
  if (base === "개념") return "개념";
  if (base === "실습") return "실습";
  if (base === "플랫폼") return "플랫폼";
  if (base === "개요") return "개요";
  if (base === "참고") return "참고";
  return base || "기타";
}

function clipTypeClass(label) {
  const normalized = normalizeWs(label);
  if (normalized === "개념") return "cat-concept";
  if (normalized === "실습") return "cat-practice";
  if (normalized === "플랫폼") return "cat-platform";
  if (normalized === "설정") return "cat-setup";
  if (normalized === "개요") return "cat-overview";
  if (normalized === "참고") return "cat-reference";
  if (normalized === "팀 토론") return "cat-discussion";
  if (normalized === "통합·저장") return "cat-gate";
  return "cat-default";
}

function compactPart(part) {
  let text = normalizeWs(part);
  text = text.replace(/(AI Assistant)\s*\1/gi, "$1");
  text = text.replace(/(Agentic AI)\s*\1/gi, "$1");
  text = text.replace(/(EXAONE)\s*\1/gi, "$1");
  text = text.replace(/["'“”].*$/, "");
  text = text.split(/[.!?]/)[0];

  const englishPrefix = text.match(/^[A-Za-z0-9&+\- ]{2,40}/);
  if (englishPrefix && englishPrefix[0].trim()) {
    text = englishPrefix[0].trim();
  }

  text = normalizeWs(text);
  if (!text) return "";

  const words = text.split(/\s+/);
  if (words.length > 5) {
    text = words.slice(0, 5).join(" ");
  }

  if (text.length > 24) {
    text = `${text.slice(0, 23)}…`;
  }
  return text;
}

function shortClipTitle(input) {
  let text = normalizeWs(input);
  if (!text) return "섹션";

  if (text.includes("→")) {
    const parts = text.split("→").map(compactPart).filter(Boolean);
    if (parts.length >= 2) {
      const merged = parts.join(" → ");
      if (merged.length <= 46) return merged;
    }
  }

  if (text.length > 30) {
    return `${text.slice(0, 29)}…`;
  }
  return text;
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(input) {
  return escapeHtml(input)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INDUSTRY_LANDSCAPE_SOURCE_MAP = {
  meta: {
    label: "Digiday · 2025.01",
    url: "https://digiday.com/media/meta-enters-ai-licensing-fray-striking-deals-with-people-inc-usa-today-co-and-more/"
  },
  base44: {
    label: "TechCrunch · 2025.06",
    url: "https://techcrunch.com/2025/06/18/6-month-old-solo-owned-vibe-coder-base44-sells-to-wix-for-80m-cash/"
  },
  gartner: {
    label: "Gartner · 2025.08",
    url: "https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025"
  },
  vibeCoding: {
    label: "TechCrunch · 2025.03",
    url: "https://techcrunch.com/2025/03/06/a-quarter-of-startups-in-ycs-current-cohort-have-codebases-that-are-almost-entirely-ai-generated/"
  },
  menlo: {
    label: "Menlo Ventures · 2025.10",
    url: "https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/"
  },
  euAct: {
    label: "EU Commission · 2025.08",
    url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"
  },
  exaone: {
    label: "Korea Herald · 2025.11",
    url: "https://www.koreaherald.com/article/10652980"
  },
  gemini: {
    label: "Google · 2026.02",
    url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/"
  },
  mckinsey: {
    label: "McKinsey · 2025.03",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier"
  },
  healthcare: {
    label: "Healthcare Dive · 2025.12",
    url: "https://www.healthcaredive.com/news/digital-health-funding-2025-boosted-ai-rock-health/809449/"
  },
  lgB2B: {
    label: "Digital Commerce 360 · 2026.01",
    url: "https://www.digitalcommerce360.com/2026/01/08/lg-electronics-b2b-ai-growth-2026/"
  },
  cli: {
    label: "Builder.io · 2026.01",
    url: "https://www.builder.io/blog/cursor-vs-claude-code"
  },
  openai: {
    label: "OpenAI · 2025.09",
    url: "https://openai.com/index/the-state-of-enterprise-ai-2025-report/"
  }
};

// [REFACTOR 3단계] 슬라이드 덱 19종 정의는 public/deck-data.json으로 분리됨 (2026-07-21).
// 문자열의 "__BASE__" 접두는 접근 시 withBase()로 복원된다 (정적 빌드 base path 대응).
// 복구: 이 리팩토링 커밋 직전 git 이력의 STYLE_* 상수·build*Deck 함수 19개·SLIDE_DECK_BUILDERS를
//       되살리고 getSlideDeck을 빌더 호출 방식으로 되돌리면 하드코딩 방식으로 복귀 가능.
let SLIDE_DECK_DATA = null;

function resolveDeckDataValue(value) {
  if (typeof value === "string") {
    return value.startsWith("__BASE__") ? withBase(value.slice(8)) : value;
  }
  if (Array.isArray(value)) return value.map(resolveDeckDataValue);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveDeckDataValue(item);
    }
    return out;
  }
  return value;
}

async function loadSlideDeckData() {
  if (SLIDE_DECK_DATA) return;
  try {
    const response = await fetch(withBase("/deck-data.json"));
    if (!response.ok) throw new Error(`deck-data load failed (${response.status})`);
    const data = await response.json();
    SLIDE_DECK_DATA = data && typeof data === "object" ? data : {};
  } catch {
    SLIDE_DECK_DATA = {};
  }
}

function collectIndustryLandscapeStats() {
  const cards = Array.from(el.clipBody.querySelectorAll(".news-card"));
  const counts = cards.reduce(
    (acc, card) => {
      const category = normalizeWs(card.dataset.cat || "");
      if (category === "business" || category === "technology" || category === "policy") {
        acc[category] += 1;
      }
      return acc;
    },
    { business: 0, technology: 0, policy: 0 }
  );

  return {
    total: cards.length,
    counts
  };
}

function populateSlideDeckDownloadLinks(root = el.clipBody) {
  if (!root) return;
  root.querySelectorAll("[data-slide-deck-download]").forEach((anchor) => {
    const deckId = normalizeWs(anchor.dataset.slideDeckDownload || "");
    const deck = getSlideDeck(deckId);
    if (!deck || !deck.downloadUrl) {
      anchor.classList.add("hidden");
      anchor.removeAttribute("href");
      anchor.removeAttribute("download");
      anchor.removeAttribute("aria-label");
      return;
    }

    anchor.classList.remove("hidden");
    anchor.href = deck.downloadUrl;
    anchor.textContent = anchor.dataset.downloadLabel || deck.downloadLabel || "다운로드";
    anchor.setAttribute("aria-label", `${deck.title || "슬라이드"} 다운로드`);
    if (deck.downloadFilename) {
      anchor.setAttribute("download", deck.downloadFilename);
    } else {
      anchor.setAttribute("download", "");
    }
  });
}

function getSlideDeck(deckId) {
  const raw = SLIDE_DECK_DATA?.[normalizeWs(deckId)];
  if (!raw) return null;
  const deck = resolveDeckDataValue(raw);
  if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) return null;
  return deck;
}

function renderSlideSources(sources) {
  return sources
    .map((source) => {
      const label = escapeHtml(source.label || "출처");
      const href = escapeHtml(source.url || "#");
      return `<a class="slide-source-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    })
    .join("");
}

function renderSlideInfoBlocks(blocks) {
  return (blocks || [])
    .map((block) => {
      const items = Array.isArray(block.items) ? block.items : [];
      return `
        <div class="slide-side-block">
          <div class="slide-side-title">${escapeHtml(block.title || "정보")}</div>
          <ul class="slide-info-list">
            ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");
}

function renderSlidePromptBlocks(blocks, deckId, slideIndex) {
  return (blocks || [])
    .map((block, blockIndex) => {
      const promptId = `slidePrompt-${deckId}-${slideIndex}-${blockIndex}`;
      return `
        <section class="slide-prompt-block">
          <div class="slide-prompt-head">
            <strong>${escapeHtml(block.label || "Prompt")}</strong>
            <button type="button" class="ghost slide-prompt-copy" onclick="copyPrompt(this, '${promptId}')">복사</button>
          </div>
          <pre id="${promptId}" class="slide-prompt-code">${escapeHtml(block.body || "")}</pre>
        </section>
      `;
    })
    .join("");
}

function renderSlideStyleHero(preview, slide) {
  if (!preview) return "";
  const logoHtml = preview.logoSrc
    ? `<img class="slide-style-hero-logo" src="${escapeAttribute(preview.logoSrc)}" alt="${escapeAttribute(preview.logoAlt || "Brand logo reference")}">`
    : "";
  return `
    <section class="slide-style-hero" aria-hidden="true">
      <div class="slide-style-hero-top">
        ${logoHtml}
        <span class="slide-style-hero-chip">${escapeHtml(preview.toneLabel || "")}</span>
        <span class="slide-style-hero-chip">${escapeHtml(preview.grammarLabel || "")}</span>
      </div>
      <div class="slide-style-hero-canvas">
        <div class="slide-style-hero-rail"></div>
        <div class="slide-style-hero-display"></div>
        <div class="slide-style-hero-caption-line"></div>
        <div class="slide-style-hero-panels"><span></span><span></span><span></span></div>
      </div>
      <div class="slide-style-hero-note">${escapeHtml(preview.useCase || slide?.title || "")}</div>
    </section>
  `;
}

function buildDeckPreviewEntries(deck) {
  if (Array.isArray(deck.previewSlides) && deck.previewSlides.length) {
    return deck.previewSlides
      .map((entry, previewIndex) => {
        if (typeof entry === "number") {
          const slide = deck.slides[entry];
          if (!slide) return null;
          return {
            slide,
            slideIndex: entry,
            pageLabel: `${previewIndex + 1}`,
            title: slide.title,
            eyebrow: slide.eyebrow,
            imageAlt: slide.imageAlt
          };
        }

        if (!entry || typeof entry !== "object") return null;
        const slideIndex = Number.isInteger(entry.slideIndex) ? entry.slideIndex : previewIndex;
        const slide = deck.slides[slideIndex];
        if (!slide) return null;

        return {
          slide,
          slideIndex,
          pageLabel: entry.pageLabel || `${previewIndex + 1}`,
          title: entry.title || slide.title,
          eyebrow: entry.eyebrow || slide.eyebrow,
          imageAlt: entry.imageAlt || slide.imageAlt
        };
      })
      .filter(Boolean);
  }

  return deck.slides.map((slide, index) => ({
    slide,
    slideIndex: index,
    pageLabel: `${index + 1}`,
    title: slide.title,
    eyebrow: slide.eyebrow,
    imageAlt: slide.imageAlt
  }));
}

function renderSlideDeckPreviews(root = el.clipBody, options = {}) {
  if (!root) return;
  const editorPreview = Boolean(options.editorPreview);
  root.querySelectorAll("[data-slide-deck-preview]").forEach((container) => {
    const deckId = normalizeWs(container.dataset.slideDeckPreview || "");
    const deck = getSlideDeck(deckId);
    if (!deck) {
      container.classList.remove("single-slide");
      container.classList.remove("immersive-preview");
      container.classList.remove("has-fixed-columns");
      container.style.removeProperty("--slide-preview-columns");
      container.innerHTML = "";
      return;
    }

    const previewEntries = buildDeckPreviewEntries(deck);
    const isSingleSlide = previewEntries.length === 1;
    const isImmersivePreview = isSingleSlide && deck.previewStyle === "immersive";
    const sourceAttrs =
      editorPreview && container.dataset.editorSourceIndex
        ? ` data-editor-source-index="${escapeHtml(container.dataset.editorSourceIndex || "")}" data-editor-source-line="${escapeHtml(container.dataset.editorSourceLine || "")}" data-editor-interactive="1"`
        : editorPreview
          ? ' data-editor-interactive="1"'
          : "";

    container.classList.toggle("single-slide", isSingleSlide);
    container.classList.toggle("immersive-preview", isImmersivePreview);
    container.classList.toggle("has-fixed-columns", Number(deck.previewColumns) > 0);
    if (Number(deck.previewColumns) > 0) {
      container.style.setProperty("--slide-preview-columns", String(deck.previewColumns));
    } else {
      container.style.removeProperty("--slide-preview-columns");
    }

    container.innerHTML = previewEntries
      .map((entry, index) => {
        const slide = entry.slide;
        const previewClass = normalizeWs(deck.previewClass || "");
        if (isImmersivePreview) {
          return `
            <button
              type="button"
              class="slide-preview-card slide-preview-card-wide slide-preview-card-immersive${previewClass ? ` ${escapeHtml(previewClass)}` : ""}"
              data-slide-deck-card="${escapeHtml(deckId)}"
              data-slide-index="${entry.slideIndex}"
              ${sourceAttrs}
              aria-label="${escapeHtml(entry.title || slide.title || `슬라이드 ${index + 1}`)} 크게 보기"
            >
              <span class="slide-preview-page">${escapeHtml(entry.pageLabel)}</span>
              <div class="slide-preview-image-frame">
                <img
                  class="slide-preview-image"
                  src="${escapeHtml(slide.imageSrc || "")}"
                  alt="${escapeHtml(entry.imageAlt || entry.title || slide.title || `슬라이드 ${index + 1}`)}"
                  data-zoom-area="${escapeHtml(slide.zoomArea || "")}"
                  loading="lazy"
                />
              </div>
              <span class="slide-preview-floating-cta">클릭해서 확대</span>
            </button>
          `;
        }

        return `
          <button
            type="button"
            class="slide-preview-card${isSingleSlide ? " slide-preview-card-wide" : ""}${previewClass ? ` ${escapeHtml(previewClass)}` : ""}"
            data-slide-deck-card="${escapeHtml(deckId)}"
            data-slide-index="${entry.slideIndex}"
            ${sourceAttrs}
            aria-label="${escapeHtml(entry.title || slide.title || `슬라이드 ${index + 1}`)} 크게 보기"
          >
            <span class="slide-preview-page">${escapeHtml(entry.pageLabel)}</span>
            <div class="slide-preview-image-frame">
              <img
                class="slide-preview-image"
                src="${escapeHtml(slide.imageSrc || "")}"
                alt="${escapeHtml(entry.imageAlt || entry.title || slide.title || `슬라이드 ${index + 1}`)}"
                data-zoom-area="${escapeHtml(slide.zoomArea || "")}"
                loading="lazy"
              />
            </div>
            <div class="slide-preview-meta">
              <span class="slide-preview-eyebrow">${escapeHtml(entry.eyebrow || `Slide ${index + 1}`)}</span>
              <strong class="slide-preview-title">${escapeHtml(entry.title || "")}</strong>
              <span class="slide-preview-cta">클릭해서 확대</span>
            </div>
          </button>
        `;
      })
      .join("");
  });
}

function wireSlideDeckTriggers(root = el.clipBody, options = {}) {
  if (!root) return;
  const stopPropagation = Boolean(options.stopPropagation);

  root.querySelectorAll("[data-slide-deck]").forEach((button) => {
    if (button.dataset.slideDeckBound === "1") return;
    button.dataset.slideDeckBound = "1";
    button.addEventListener("click", (event) => {
      if (stopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
      const deckId = normalizeWs(button.dataset.slideDeck || "");
      if (!deckId) return;
      openSlideDeck(deckId);
    });
  });

  root.querySelectorAll("[data-slide-deck-card]").forEach((button) => {
    if (button.dataset.slideDeckCardBound === "1") return;
    button.dataset.slideDeckCardBound = "1";
    const openDeckFromCard = (event) => {
      if (stopPropagation && event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const deckId = normalizeWs(button.dataset.slideDeckCard || "");
      const slideIndex = Number(button.dataset.slideIndex || "0");
      if (!deckId) return;
      openSlideDeck(deckId, slideIndex);
    };
    button.addEventListener("click", openDeckFromCard);
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (stopPropagation) {
        event.stopPropagation();
      }
      openDeckFromCard();
    });
  });
}

function renderSlideDeckDots(deck) {
  if (!el.slideDeckDots) return;
  el.slideDeckDots.innerHTML = "";
  deck.slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slides-dot";
    dot.textContent = `${index + 1}`;
    dot.setAttribute("aria-label", `${slide.title} 슬라이드로 이동`);
    if (index === state.activeSlideIndex) {
      dot.classList.add("active");
    }
    dot.addEventListener("click", () => {
      state.activeSlideIndex = index;
      renderActiveSlideDeck();
    });
    el.slideDeckDots.appendChild(dot);
  });
}

function renderActiveSlideDeck() {
  const deck = state.activeSlideDeck;
  if (!deck) return;

  const slides = deck.slides;
  const currentIndex = Math.max(0, Math.min(state.activeSlideIndex, slides.length - 1));
  state.activeSlideIndex = currentIndex;
  const slide = slides[currentIndex];

  el.slideDeckKicker.textContent = deck.kicker || "슬라이드";
  el.slideDeckTitle.textContent = deck.title || "슬라이드";
  el.slideDeckCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  if (el.downloadSlideDeckBtn) {
    if (deck.downloadUrl) {
      el.downloadSlideDeckBtn.classList.remove("hidden");
      el.downloadSlideDeckBtn.href = deck.downloadUrl;
      el.downloadSlideDeckBtn.textContent = deck.downloadLabel || "다운로드";
      el.downloadSlideDeckBtn.setAttribute("aria-label", `${deck.title || "슬라이드"} 다운로드`);
      if (deck.downloadFilename) {
        el.downloadSlideDeckBtn.setAttribute("download", deck.downloadFilename);
      } else {
        el.downloadSlideDeckBtn.setAttribute("download", "");
      }
    } else {
      el.downloadSlideDeckBtn.classList.add("hidden");
      el.downloadSlideDeckBtn.removeAttribute("href");
      el.downloadSlideDeckBtn.removeAttribute("download");
      el.downloadSlideDeckBtn.removeAttribute("aria-label");
    }
  }
  el.slidePrevBtn.disabled = currentIndex === 0;
  el.slideNextBtn.disabled = currentIndex === slides.length - 1;
  const sheetClass = normalizeWs(slide.sheetClass || deck.sheetClass || "");
  if (slide.imageSrc) {
    el.slideDeckStage.innerHTML = `
      <article class="slide-image-sheet${sheetClass ? ` ${escapeHtml(sheetClass)}` : ""}">
        <button
          type="button"
          class="slide-hitbox prev${currentIndex === 0 ? " disabled" : ""}"
          aria-label="이전 슬라이드"
          ${currentIndex === 0 ? "disabled" : ""}
        ></button>
        <button
          type="button"
          class="slide-hitbox next${currentIndex === slides.length - 1 ? " disabled" : ""}"
          aria-label="다음 슬라이드"
          ${currentIndex === slides.length - 1 ? "disabled" : ""}
        ></button>
        <div class="slide-image-meta">
          <span class="slide-kicker">${escapeHtml(slide.eyebrow || `Slide ${currentIndex + 1}`)}</span>
          <span class="slide-source-summary">${escapeHtml(deck.subtitle || "")}</span>
        </div>
        <div class="slide-image-wrap">
          <img
            class="slide-stage-image"
            src="${escapeHtml(slide.imageSrc)}"
            alt="${escapeHtml(slide.imageAlt || slide.title || `슬라이드 ${currentIndex + 1}`)}"
            data-zoom-area="${escapeHtml(slide.zoomArea || "")}"
          />
        </div>
        <div class="slide-sheet-foot">
          <span>${escapeHtml(slide.title || "")}</span>
          <span>좌우 가장자리 클릭 또는 하단 버튼으로 이동</span>
        </div>
      </article>
    `;
  } else {
    const promptBlocksHtml = renderSlidePromptBlocks(slide.promptBlocks || [], deck.id || "deck", currentIndex);
    const styleHeroHtml = renderSlideStyleHero(slide.stylePreview, slide);
    const signalBlockHtml = (slide.signals || []).length
      ? `
            <div class="slide-side-block">
              <div class="slide-side-title">핵심 시그널</div>
              <div class="slide-signal-list">
                ${(slide.signals || []).map((item) => `<span class="slide-signal-chip">${escapeHtml(item)}</span>`).join("")}
              </div>
            </div>
          `
      : "";
    const sourceBlockHtml = (slide.sources || []).length
      ? `
            <div class="slide-side-block">
              <div class="slide-side-title">출처</div>
              <div class="slide-source-list">${renderSlideSources(slide.sources || [])}</div>
            </div>
          `
      : "";
    const infoBlocksHtml = renderSlideInfoBlocks(slide.infoBlocks || []);

    el.slideDeckStage.innerHTML = `
      <article
        class="slide-sheet${sheetClass ? ` ${escapeHtml(sheetClass)}` : ""}${slide.themeTone ? ` style-tone-${escapeHtml(slide.themeTone)}` : ""}${slide.themeGrammar ? ` style-grammar-${escapeHtml(slide.themeGrammar)}` : ""}${slide.stylePreview ? " slide-sheet-style-preview" : ""}"
        style="--slide-accent:${slide.accent || "#245fca"};--slide-accent-soft:${slide.accentSoft || "rgba(58, 126, 242, 0.22)"}"
      >
        <button
          type="button"
          class="slide-hitbox prev${currentIndex === 0 ? " disabled" : ""}"
          aria-label="이전 슬라이드"
          ${currentIndex === 0 ? "disabled" : ""}
        ></button>
        <button
          type="button"
          class="slide-hitbox next${currentIndex === slides.length - 1 ? " disabled" : ""}"
          aria-label="다음 슬라이드"
          ${currentIndex === slides.length - 1 ? "disabled" : ""}
        ></button>
        <div class="slide-sheet-top">
          <span class="slide-kicker">${escapeHtml(slide.eyebrow || `Slide ${currentIndex + 1}`)}</span>
          <span class="slide-source-summary">${escapeHtml(deck.subtitle || "")}</span>
        </div>
        <div class="slide-sheet-grid">
          <section class="slide-main-panel">
            ${styleHeroHtml}
            <h4 class="slide-headline">${escapeHtml(slide.title || "")}</h4>
            <p class="slide-summary">${escapeHtml(slide.summary || "")}</p>
            <ul class="slide-bullet-list">
              ${(slide.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
            ${promptBlocksHtml}
          </section>
          <aside class="slide-side-panel">
            ${signalBlockHtml}
            ${infoBlocksHtml}
            ${sourceBlockHtml}
          </aside>
        </div>
        <div class="slide-sheet-foot">
          <span>좌측 가장자리 클릭: 이전</span>
          <span>우측 가장자리 클릭: 다음</span>
        </div>
      </article>
    `;
  }

  el.slideDeckStage.querySelector(".slide-hitbox.prev")?.addEventListener("click", () => {
    if (state.activeSlideIndex <= 0) return;
    state.activeSlideIndex -= 1;
    renderActiveSlideDeck();
  });

  el.slideDeckStage.querySelector(".slide-hitbox.next")?.addEventListener("click", () => {
    if (state.activeSlideIndex >= slides.length - 1) return;
    state.activeSlideIndex += 1;
    renderActiveSlideDeck();
  });

  renderSlideDeckDots(deck);
}

function openSlideDeck(deckId, initialIndex = 0) {
  const deck = getSlideDeck(deckId);
  if (!deck) {
    showCopyToast("슬라이드 데이터를 찾지 못했습니다", true);
    return;
  }

  state.activeSlideDeck = deck;
  state.activeSlideIndex = Math.max(0, Math.min(Number(initialIndex) || 0, deck.slides.length - 1));
  document.body.classList.add("modal-open");
  el.slideDeckModal.classList.remove("hidden");
  el.slideDeckModal.setAttribute("aria-hidden", "false");
  renderActiveSlideDeck();
}

function closeSlideDeck() {
  state.activeSlideDeck = null;
  state.activeSlideIndex = 0;
  document.body.classList.remove("modal-open");
  el.slideDeckModal.classList.add("hidden");
  el.slideDeckModal.setAttribute("aria-hidden", "true");
  if (el.downloadSlideDeckBtn) {
    el.downloadSlideDeckBtn.classList.add("hidden");
    el.downloadSlideDeckBtn.removeAttribute("href");
    el.downloadSlideDeckBtn.removeAttribute("download");
    el.downloadSlideDeckBtn.removeAttribute("aria-label");
  }
  el.slideDeckStage.innerHTML = "";
  el.slideDeckDots.innerHTML = "";
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/⟦([^⟧]+)⟧/g, '<span class="prompt-fill">[$1]</span>');
  return html;
}

function normalizePromptFillLabel(input) {
  let label = normalizeWs(input || "");
  if (label.startsWith("[") && label.endsWith("]")) {
    label = normalizeWs(label.slice(1, -1));
  }
  return label;
}

function extractPromptMarkdownVariants(sourceElement) {
  if (!sourceElement) {
    return { rawMarkdown: "", previewMarkdown: "" };
  }

  const rawClone = sourceElement.cloneNode(true);
  const previewClone = sourceElement.cloneNode(true);

  rawClone.querySelectorAll(".prompt-fill").forEach((node) => {
    const label = normalizePromptFillLabel(node.textContent || "");
    node.replaceWith(document.createTextNode(`[${label}]`));
  });

  previewClone.querySelectorAll(".prompt-fill").forEach((node) => {
    const label = normalizePromptFillLabel(node.textContent || "");
    node.replaceWith(document.createTextNode(`⟦${label}⟧`));
  });

  const normalize = (value) => String(value || "").replace(/\r/g, "").trimEnd();
  const rawMarkdown = normalize(rawClone.textContent || "");
  const previewMarkdown = normalize(previewClone.textContent || "");

  return {
    rawMarkdown,
    previewMarkdown: previewMarkdown || rawMarkdown
  };
}

function renderSimpleMarkdown(markdownText) {
  const lines = String(markdownText || "").replace(/\r/g, "").split("\n");
  const parts = [];
  let listDepth = 0;

  const closeListsTo = (targetDepth) => {
    while (listDepth > targetDepth) {
      parts.push("</ul>");
      listDepth -= 1;
    }
  };

  for (const lineRaw of lines) {
    const line = lineRaw || "";
    const trimmed = line.trim();

    if (!trimmed) {
      closeListsTo(0);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeListsTo(0);
      const level = headingMatch[1].length;
      parts.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`
      );
      continue;
    }

    const listMatch = line.match(/^(\s*)-\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].replace(/\t/g, "  ").length;
      const nextDepth = Math.floor(indent / 2) + 1;

      while (listDepth < nextDepth) {
        parts.push("<ul>");
        listDepth += 1;
      }
      closeListsTo(nextDepth);

      parts.push(`<li>${renderInlineMarkdown(listMatch[2].trim())}</li>`);
      continue;
    }

    closeListsTo(0);
    parts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeListsTo(0);
  return parts.join("");
}

function renderNotePreview() {
  if (!el.notePreview) return;
  const markdown = String(el.noteText?.value || "");
  if (!normalizeWs(markdown)) {
    el.notePreview.innerHTML =
      "<p class=\"muted\">여기에 Markdown 미리보기가 표시됩니다.</p>";
    return;
  }
  el.notePreview.innerHTML = renderSimpleMarkdown(markdown);
}

function getOrCreateCopyToast() {
  let toast = document.getElementById("copyToast");
  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "copyToast";
  toast.className = "copy-toast";
  document.body.appendChild(toast);
  return toast;
}

function filenameFromContentDisposition(headerValue) {
  const header = String(headerValue || "");
  if (!header) return "";

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = header.match(/filename="([^"]+)"/i);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1];
  }

  return "";
}

function filenameFromUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last);
  } catch {
    return "";
  }
}

function showCopyToast(message, isError = false) {
  const toast = getOrCreateCopyToast();
  toast.textContent = message;
  toast.classList.toggle("error", Boolean(isError));
  toast.classList.add("show");

  if (copyToastTimer) {
    clearTimeout(copyToastTimer);
  }
  copyToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1000);
}

function showCopyButtonState(button, copied, label) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = normalizeWs(button.textContent) || "복사";
  }
  if (!button.dataset.defaultHtml) {
    button.dataset.defaultHtml = button.innerHTML;
  }

  // 260731 복사 성공 시 체크 팝 애니메이션
  if (copied) {
    button.classList.remove("copy-pop");
    void button.offsetWidth;
    button.classList.add("copy-pop");
    button.addEventListener(
      "animationend",
      () => button.classList.remove("copy-pop"),
      { once: true }
    );
  }

  const isResourceCard = button.classList.contains("ref-link-item");
  if (label && isResourceCard) {
    const title = document.createElement("strong");
    title.style.display = "block";
    title.textContent = label;
    const sub = document.createElement("span");
    sub.style.display = "block";
    sub.style.marginTop = "6px";
    sub.style.fontSize = "0.76rem";
    sub.style.color = "inherit";
    sub.style.opacity = "0.92";
    sub.textContent = copied ? "클립보드에 복사되었습니다" : "다시 시도해 주세요";
    button.replaceChildren(title, sub);
  } else {
    button.textContent = label || button.dataset.defaultLabel;
  }
  button.classList.toggle("copied", Boolean(copied));
  button.classList.toggle("failed", !copied && Boolean(label));

  if (!label) return;

  setTimeout(() => {
    if (button.dataset.defaultHtml) {
      button.innerHTML = button.dataset.defaultHtml;
    } else {
      button.textContent = button.dataset.defaultLabel || "복사";
    }
    button.classList.remove("copied");
    button.classList.remove("failed");
  }, COPY_FEEDBACK_MS);
}

async function copyTextWithUiFeedback(button, text) {
  const payload = String(text || "");
  if (!payload) return false;

  try {
    await navigator.clipboard.writeText(payload);
    showCopyButtonState(button, true, "복사됨");
    showCopyToast("클립보드에 복사되었습니다");
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = payload;
    area.setAttribute("readonly", "readonly");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      area.remove();
    }

    if (copied) {
      showCopyButtonState(button, true, "복사됨");
      showCopyToast("클립보드에 복사되었습니다");
      return true;
    }

    showCopyButtonState(button, false, "복사 실패");
    showCopyToast("복사에 실패했습니다", true);
    return false;
  }
}

function setupPromptMarkdownPreview(block) {
  const source = block.querySelector(".prompt-inline-content, .prompt-content");
  if (!source || source.dataset.previewBound === "1") return;

  source.dataset.previewBound = "1";
  const { rawMarkdown, previewMarkdown } = extractPromptMarkdownVariants(source);
  source.dataset.mdRaw = rawMarkdown;
  source.hidden = true;

  const lines = previewMarkdown.split("\n");
  const hasMore = lines.length > PROMPT_PREVIEW_MAX_LINES;
  let expanded = false;

  const preview = document.createElement("div");
  preview.className = "prompt-md-preview";
  block.appendChild(preview);

  let toggleBtn = null;
  if (hasMore) {
    const header = block.querySelector(".prompt-inline-header, .prompt-header");
    const copyBtn = block.querySelector(".copy-btn, .prompt-inline-copy");

    // 복사 버튼과 펼치기 버튼을 하나의 그룹으로 묶어 오른쪽에 나란히 배치
    const btnGroup = document.createElement("div");
    btnGroup.className = "prompt-header-actions";

    if (copyBtn) {
      btnGroup.appendChild(copyBtn);
    }

    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "prompt-expand-toggle";
    btnGroup.appendChild(toggleBtn);

    header?.appendChild(btnGroup);
  }

  const render = () => {
    const visibleMarkdown =
      !hasMore || expanded
        ? previewMarkdown
        : lines.slice(0, PROMPT_PREVIEW_MAX_LINES).join("\n");
    preview.innerHTML = renderSimpleMarkdown(visibleMarkdown);
    preview.classList.toggle("collapsed", hasMore && !expanded);

    if (toggleBtn) {
      toggleBtn.textContent = expanded ? "접기" : "모두 펼치기";
    }
  };

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      render();
    });
  }

  render();
}

function enhancePromptMarkdownBlocks(root = el.clipBody) {
  if (!root) return;
  root
    .querySelectorAll(".prompt-inline-block, .prompt-block")
    .forEach((block) => setupPromptMarkdownPreview(block));
}

function wireMarkdownLiveEditors(root = el.clipBody) {
  if (!root) return;
  root.querySelectorAll(".md-live-editor").forEach((editor) => {
    const input = editor.querySelector(".md-editor-input");
    const preview = editor.querySelector(".md-editor-preview");
    if (!input || !preview) return;

    const render = () => {
      preview.innerHTML = renderSimpleMarkdown(input.value || "");
    };

    input.addEventListener("input", render);
    render();
  });
}

function hydrateContentEditorPreview() {
  if (!el.contentEditorPreview) return;
  populateSlideDeckDownloadLinks(el.contentEditorPreview);
  renderSlideDeckPreviews(el.contentEditorPreview, { editorPreview: true });
  wireSlideDeckTriggers(el.contentEditorPreview, { stopPropagation: true });
  wireMarkdownLiveEditors(el.contentEditorPreview);
  enhancePromptMarkdownBlocks(el.contentEditorPreview);
  enhanceChartBlocks(el.contentEditorPreview);
  enhanceMermaidBlocks(el.contentEditorPreview);
}

function renderSidebar() {
  el.chapterList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const chapter of state.chapters) {
    const chapterCard = document.createElement("section");
    chapterCard.className = "chapter-card";
    const expanded = state.expandedChapters.has(chapter.chapterId);
    chapterCard.classList.toggle("expanded", expanded);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "chapter-header";
    header.innerHTML = `
      <span class="chapter-header-left">
        <span class="chapter-code">${chapter.chapterNum.replace(/\s+/g, "")}</span>
        <span class="chapter-label">${chapter.title}</span>
      </span>
      <span class="chapter-header-right">
        <span class="chapter-time">${chapter.time || ""}</span>
        <span class="chapter-chevron">${expanded ? "▾" : "▸"}</span>
      </span>
    `;

    header.addEventListener("click", () => {
      if (state.expandedChapters.has(chapter.chapterId)) {
        state.expandedChapters.delete(chapter.chapterId);
      } else {
        state.expandedChapters.add(chapter.chapterId);
      }
      renderSidebar();
    });

    const clipList = document.createElement("div");
    clipList.className = "clip-list";
    clipList.classList.toggle("collapsed", !expanded);

    for (const clip of chapter.clips) {
      state.clipMap.set(clip.clipKey, {
        ...clip,
        chapterId: chapter.chapterId,
        chapterNum: chapter.chapterNum,
        chapterTitle: chapter.title
      });

      const label = clipTypeLabel(clip, chapter);
      const btn = document.createElement("button");
      btn.className = "clip-btn";
      btn.dataset.clipKey = clip.clipKey;

      if (state.completedSet.has(clip.clipKey) || clip.completed) {
        btn.classList.add("completed");
      }
      if (clip.clipKey === state.currentClipKey) {
        btn.classList.add("active");
      }

      btn.innerHTML = `
        <span class="clip-main">
          <span class="clip-dot"></span>
          <span class="clip-title">${shortClipTitle(clip.title)}</span>
        </span>
        <span class="clip-type-badge ${clipTypeClass(label)}">${label}</span>
      `;
      btn.addEventListener("click", () => openClip(clip.clipKey, true));
      clipList.appendChild(btn);
    }

    chapterCard.appendChild(header);
    chapterCard.appendChild(clipList);
    fragment.appendChild(chapterCard);
  }

  el.chapterList.appendChild(fragment);
  updateProgressBadge();
  setupScrollSpy();
}

/* 260731 스크롤 스파이 목차: 현재 클립의 구간(❶~❹ phase-banner) 미니 목차를
   좌측 목차의 활성 클립 아래에 표시하고, 스크롤 위치에 따라 현재 구간을 하이라이트.
   구간 클릭 시 해당 위치로 부드럽게 이동. 배너가 2개 미만인 클립에는 표시하지 않음. */
let scrollSpyState = { banners: [], items: [], scroller: null };

function handleScrollSpy() {
  const { banners, items, scroller } = scrollSpyState;
  if (!banners.length || !scroller) return;
  const line = scroller.getBoundingClientRect().top + 90;
  let current = 0;
  banners.forEach((banner, i) => {
    if (banner.getBoundingClientRect().top <= line) current = i;
  });
  items.forEach((item, i) => item.classList.toggle("current", i === current));
}

function teardownScrollSpy() {
  document.querySelectorAll(".scrollspy-list").forEach((node) => node.remove());
  if (scrollSpyState.scroller) {
    scrollSpyState.scroller.removeEventListener("scroll", handleScrollSpy);
  }
  scrollSpyState = { banners: [], items: [], scroller: null };
}

function setupScrollSpy() {
  teardownScrollSpy();
  const banners = Array.from(
    el.clipBody?.querySelectorAll(".phase-banner") || []
  );
  if (banners.length < 2) return;
  const activeBtn = el.chapterList?.querySelector(".clip-btn.active");
  if (!activeBtn) return;
  const list = document.createElement("div");
  list.className = "scrollspy-list";
  const items = banners.map((banner) => {
    const clone = banner.cloneNode(true);
    clone.querySelectorAll(".phase-sub").forEach((sub) => sub.remove());
    const item = document.createElement("button");
    item.type = "button";
    item.className = "scrollspy-item";
    item.textContent = clone.textContent.trim();
    item.addEventListener("click", () =>
      banner.scrollIntoView({ behavior: "smooth", block: "start" })
    );
    list.appendChild(item);
    return item;
  });
  activeBtn.insertAdjacentElement("afterend", list);
  const scroller = document.querySelector(".content-area");
  scrollSpyState = { banners, items, scroller };
  if (scroller) {
    scroller.addEventListener("scroll", handleScrollSpy, { passive: true });
  }
  handleScrollSpy();
}

function renderClipHeader(clip) {
  if (el.clipTitle) {
    el.clipTitle.textContent = clip.title || clip.clipKey;
  }
  if (el.clipOverview) {
    el.clipOverview.textContent = clip.overview || "";
  }
  if (!el.clipBadges) return;
  el.clipBadges.innerHTML = "";

  const chapterBadgePattern = /^CH\s?\d{2}$/i;
  const sourceBadges = Array.isArray(clip.badges) ? clip.badges : [];
  const badges = [];
  let hasChapterBadge = false;

  for (const badge of sourceBadges) {
    if (chapterBadgePattern.test(String(badge || ""))) {
      if (!hasChapterBadge && clip.chapterNum) {
        badges.push(clip.chapterNum);
      }
      hasChapterBadge = true;
      continue;
    }
    badges.push(badge);
  }

  if (!hasChapterBadge && clip.chapterNum) {
    badges.unshift(clip.chapterNum);
  }

  for (const badge of badges) {
    const span = document.createElement("span");
    span.className = "clip-badge";
    span.textContent = badge;
    el.clipBadges.appendChild(span);
  }
}

function enhanceChartBlocks(root = el.clipBody) {
  if (!root) return;
  if (!window.Chart) return;
  root.querySelectorAll(".chart-shell").forEach((shell) => {
    if (shell.dataset.bound === "1") return;
    shell.dataset.bound = "1";
    const source = shell.querySelector(".chart-json");
    const raw = String(source?.textContent || "").trim();
    if (!raw) return;
    let config = null;
    try {
      config = JSON.parse(raw);
    } catch {
      config = null;
    }
    if (!config) return;
    const canvas = document.createElement("canvas");
    canvas.className = "chart-canvas";
    shell.innerHTML = "";
    shell.appendChild(canvas);
    try {
      // eslint-disable-next-line no-new
      new window.Chart(canvas, config);
    } catch {
      const fallback = document.createElement("pre");
      fallback.className = "chart-json";
      fallback.textContent = raw;
      shell.appendChild(fallback);
    }
  });
}

function enhanceMermaidBlocks(root = el.clipBody) {
  if (!root) return;
  if (!window.mermaid) return;
  if (!state.mermaidReady) {
    window.mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" });
    state.mermaidReady = true;
  }
  const nodes = Array.from(root.querySelectorAll(".mermaid"));
  if (!nodes.length) return;
  window.mermaid.run({ nodes }).catch(() => { });
}

function enhanceClipBody() {
  el.clipBody.classList.add("course-content");

  el.clipBody.querySelectorAll(".clip-section").forEach((section, index) => {
    section.classList.add("surface-card");
    section.style.setProperty("--stagger", `${Math.min(index * 35, 280)}ms`);
  });

  el.clipBody.querySelectorAll(".news-card").forEach((card, index) => {
    card.style.setProperty("--stagger", `${Math.min(index * 30, 340)}ms`);
  });

  el.clipBody.querySelectorAll(".concept-card").forEach((card) => {
    if (card.dataset.enhanced === "1") return;
    card.dataset.enhanced = "1";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "카드를 뒤집어 상세 설명 보기");
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.classList.toggle("flipped");
      }
    });
  });

  renderSlideDeckPreviews();
  populateSlideDeckDownloadLinks();
  decorateMiroDemoButtons();
  wireMarkdownLiveEditors();
  enhancePromptMarkdownBlocks();
  enhanceChartBlocks();
  enhanceMermaidBlocks();
}

// [SECURITY 2026-07-23] 음성 공유 업로드 UI 초기화 함수 제거 (Revision v2 보안 조치)

function wireClipInteractions() {
  el.clipBody.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!isPracticeFileHref(href)) return;
    if (anchor.dataset.downloadBound === "1") return;
    anchor.dataset.downloadBound = "1";
    anchor.addEventListener("click", (event) => {
      const nextHref = anchor.getAttribute("href");
      if (!nextHref) return;
      window.downloadFile(nextHref, "", event);
    });
  });

  el.clipBody.querySelectorAll("a[href^='#']").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      const target = normalizeWs(href).replace(/^#/, "");
      if (!target) return;
      event.preventDefault();
      openClip(target, true).catch((error) => alert(error.message));
    });
  });

  wireSlideDeckTriggers(el.clipBody);
}

/* 260731 읽기 진행률 바 + '맨 위로' 플로팅 버튼: 콘텐츠 영역 스크롤에 연동 */
let readingAidsUpdate = null;

function setupReadingAids() {
  if (readingAidsUpdate) {
    readingAidsUpdate();
    return;
  }
  const scroller = document.querySelector(".content-area");
  if (!scroller) return;
  const bar = document.createElement("div");
  bar.id = "readingProgressBar";
  document.body.appendChild(bar);
  const topBtn = document.createElement("button");
  topBtn.id = "backToTopBtn";
  topBtn.type = "button";
  topBtn.title = "맨 위로";
  topBtn.textContent = "↑";
  topBtn.addEventListener("click", () =>
    scroller.scrollTo({ top: 0, behavior: "smooth" })
  );
  document.body.appendChild(topBtn);
  const update = () => {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const ratio = max > 0 ? scroller.scrollTop / max : 0;
    bar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    topBtn.classList.toggle("visible", scroller.scrollTop > 400);
  };
  scroller.addEventListener("scroll", update, { passive: true });
  readingAidsUpdate = update;
  update();
}

/* 260731 체크리스트 완료 카운터: 체크박스 2개 이상인 섹션 제목에 "n/m 완료" 칩 표시.
   CH00처럼 자체 카운터([data-ready-summary])가 있는 섹션은 건너뜀. */
let checklistCounterBound = false;

function updateChecklistCounters() {
  if (!el.clipBody) return;
  el.clipBody.querySelectorAll(".clip-section").forEach((section) => {
    if (section.querySelector("[data-ready-summary]")) return;
    const title = section.querySelector(".clip-section-title");
    const boxes = section.querySelectorAll('input[type="checkbox"]');
    let chip = title ? title.querySelector(".checklist-counter") : null;
    if (!title || boxes.length < 2) {
      if (chip) chip.remove();
      return;
    }
    const done = Array.from(boxes).filter((box) => box.checked).length;
    if (!chip) {
      chip = document.createElement("span");
      chip.className = "checklist-counter";
      title.appendChild(chip);
    }
    chip.textContent =
      done === boxes.length
        ? `✅ ${done}/${boxes.length} 완료`
        : `${done}/${boxes.length} 완료`;
    chip.classList.toggle("done", done === boxes.length);
  });
}

function setupChecklistCounters() {
  if (!checklistCounterBound && el.clipBody) {
    el.clipBody.addEventListener("change", (event) => {
      if (event.target && event.target.matches('input[type="checkbox"]')) {
        updateChecklistCounters();
      }
    });
    checklistCounterBound = true;
  }
  updateChecklistCounters();
  setTimeout(updateChecklistCounters, 800); // 클립 내장 스크립트의 저장값 복원 반영
}

function flashClipArrival() {
  const target =
    el.clipBody?.querySelector(".clip-header") || el.clipBody?.firstElementChild;
  if (!target) return;
  target.classList.remove("clip-arrival-flash");
  void target.offsetWidth; // 연속 이동 시에도 애니메이션이 재시작되도록 리플로우 강제
  target.classList.add("clip-arrival-flash");
  target.addEventListener(
    "animationend",
    () => target.classList.remove("clip-arrival-flash"),
    { once: true }
  );
}

async function openClip(clipKey, updateHash = false) {
  const normalized = normalizeClipKey(clipKey);
  if (!normalized) return;
  if (
    normalized !== state.currentClipKey &&
    state.currentClipKey &&
    ((state.editModeOpen && state.editorDirty) ||
      (state.sidebarEditOpen && state.sidebarDirty)) &&
    !window.confirm("저장되지 않은 수정 내용이 있습니다. 다른 클립으로 이동할까요?")
  ) {
    return;
  }
  closeSlideDeck();

  const rawData = await api(`/api/clips/${encodeURIComponent(normalized)}`);
  const data = await applyRuntimeClipOverride(normalized, rawData);
  const sidebarClip = state.clipMap.get(normalized) || null;
  const clip = applyClientClipDisplay(data.clip, sidebarClip);
  const sourceContentHtml =
    typeof data?.contentHtml === "string" && data.contentHtml.trim()
      ? data.contentHtml
      : clip.contentHtml || "<p>콘텐츠가 없습니다.</p>";
  const visibleContentHtml = rewriteClientClipHtml(normalized, sourceContentHtml);

  state.currentClipKey = normalized;
  // CSS 챕터 스코프용 (예: CH06 가독성 하한선 — styles.css 260810 블록)
  if (el.clipBody) el.clipBody.dataset.clipKey = normalized;
  state.currentChapterId = clip.chapterId || "";
  state.currentChapterNum = clip.chapterNum || "";
  state.currentChapterTitle = clip.chapterTitle || "";
  state.currentVisibleContentHtml = visibleContentHtml;
  if (state.currentChapterId) {
    state.expandedChapters.add(state.currentChapterId);
  }

  if (data.completed) {
    state.completedSet.add(clip.clipKey);
  } else {
    state.completedSet.delete(clip.clipKey);
  }

  renderClipHeader(clip);
  renderClipBodyContent(visibleContentHtml);
  /* [260901] 클립 전환 시 본문을 최상단부터 표시 — 이전 클립의 스크롤 위치가 남는 문제 해소(사용자 요청).
     스크롤 컨테이너는 .content-area(독서 진행바·스크롤스파이와 동일 기준), 창 스크롤 레이아웃 대비 window도 함께 리셋 */
  document.querySelector(".content-area")?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
  flashClipArrival();
  setupChecklistCounters();
  setupReadingAids();
  updateMarkCompleteButton();
  renderSidebar();

  if (state.taskPanelOpen) {
    await loadTaskForCurrentChapter();
  }
  await loadNoteForCurrentClip();
  if (state.editModeOpen && state.isAdmin) {
    await loadEditorSourceForCurrentClip();
  }
  if (state.sidebarEditOpen && state.isAdmin) {
    await loadSidebarSourceForCurrentClip();
  }

  if (updateHash || window.location.hash !== `#${normalized}`) {
    window.location.hash = `#${normalized}`;
  }
}

async function loadChaptersAndDefaultClip() {
  const data = await api("/api/chapters");
  const rawChapters = data.chapters || [];
  // 목차는 서버 카탈로그를 100% 신뢰한다 (구 클라이언트 블루프린트 패치는 2026-08-10 폐기)
  state.catalogPatched = false;
  state.chapters = rawChapters;
  state.clipMap = new Map();
  state.completedSet = new Set();

  const knownClipKeys = new Set();
  for (const chapter of state.chapters) {
    for (const clip of chapter.clips) {
      knownClipKeys.add(clip.clipKey);
      if (clip.completed) {
        state.completedSet.add(clip.clipKey);
      }
    }
  }

  const firstClip = state.chapters[0]?.clips[0]?.clipKey || "";
  const hashClip = normalizeClipKey(window.location.hash.replace(/^#/, ""));

  // [HIDDEN] 숨겨진 클립 해시로 직접 접근 시 '오늘의 핵심 요약' 챕터 첫 클립으로 리다이렉트합니다.
  // 복구 시 이 블록을 제거하세요.
  const isHiddenHashAccess = hashClip && HIDDEN_CLIP_KEYS_REDIRECT_SET.has(hashClip);
  const hiddenRedirectTargetClip = (() => {
    if (!isHiddenHashAccess) return null;
    const targetChapter = state.chapters.find(
      (ch) => normalizeWs(ch.chapterId || "").toLowerCase() === HIDDEN_REDIRECT_TARGET_CHAPTER_ID
    );
    return targetChapter?.clips?.[0]?.clipKey || firstClip;
  })();

  const targetClip = knownClipKeys.has(hashClip)
    ? hashClip
    : (isHiddenHashAccess ? hiddenRedirectTargetClip : firstClip) || firstClip;

  const targetChapter =
    state.chapters.find((chapter) =>
      chapter.clips.some((clip) => clip.clipKey === targetClip)
    ) || state.chapters[0];
  state.expandedChapters = new Set(targetChapter ? [targetChapter.chapterId] : []);

  renderSidebar();
  if (targetClip) {
    await openClip(targetClip);
  }
}

async function loadTaskForCurrentChapter() {
  if (!state.currentChapterId) {
    el.taskChapterContext.textContent = "현재 챕터를 선택해 주세요.";
    el.taskTitle.value = "";
    el.taskReason.value = "";
    el.taskEffect.value = "";
    setTaskStatus("");
    return;
  }

  el.taskChapterContext.textContent = `${state.currentChapterNum} ${state.currentChapterTitle} 과제 제출`;

  try {
    const data = await api(
      `/api/ax-task?chapterId=${encodeURIComponent(state.currentChapterId)}`
    );
    const task = data.axTask || {};
    el.taskTitle.value = task.title || "";
    el.taskReason.value = task.reason || "";
    el.taskEffect.value = task.effect || "";

    if (task.updatedAt) {
      setTaskStatus(`최근 저장: ${new Date(task.updatedAt).toLocaleString()}`);
    } else {
      setTaskStatus("");
    }
  } catch (error) {
    setTaskStatus(error.message, true);
  }
}

function setAuthStorage(user, sessionToken, course) {
  if (user?.accountId) {
    localStorage.setItem(STORAGE_LAST_ID_KEY, user.accountId);
    localStorage.setItem("ax_literacy_account_id", user.accountId);
  }
  if (sessionToken) {
    localStorage.setItem(STORAGE_SESSION_KEY, sessionToken);
  }
  const code = normalizeCourseCode(course?.courseCode || user?.courseCode || "");
  if (code) {
    localStorage.setItem(STORAGE_COURSE_CODE_KEY, code);
  }
}

function clearAuthStorage() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  localStorage.removeItem("ax_literacy_account_id");
  localStorage.removeItem(STORAGE_COURSE_CODE_KEY);
}

function renderCourseOptions() {
  if (!el.courseCodeList) return;
  const options = (state.courses || [])
    .map(
      (course) =>
        `<option value="${escapeHtml(course.courseCode)}">${escapeHtml(
          course.courseName || course.courseCode
        )}</option>`
    )
    .join("");
  el.courseCodeList.innerHTML = options;
}

async function loadCourseDirectory() {
  if (STATIC_MODE) {
    state.courses = [STATIC_PUBLIC_COURSE];
    renderCourseOptions();
    return;
  }

  try {
    const data = await api("/api/courses");
    state.courses = Array.isArray(data.courses) ? data.courses : [];
    renderCourseOptions();
    const queryCourse = normalizeCourseCode(new URLSearchParams(window.location.search).get("course"));
    const preferred =
      queryCourse ||
      normalizeCourseCode(localStorage.getItem(STORAGE_COURSE_CODE_KEY)) ||
      normalizeCourseCode(state.courses[0]?.courseCode || "AXCAMP");
    if (el.loginCourseCode && !normalizeCourseCode(el.loginCourseCode.value)) {
      el.loginCourseCode.value = preferred;
    }
    if (el.signupCourseCode && !normalizeCourseCode(el.signupCourseCode.value)) {
      el.signupCourseCode.value = preferred;
    }
  } catch {
    state.courses = [];
    renderCourseOptions();
  }
}

function renderCurrentCourse() {
  if (!el.currentCourseBadge) return;
  const code = normalizeCourseCode(state.currentCourse?.courseCode || state.user?.courseCode || "");
  if (!code) {
    el.currentCourseBadge.textContent = "코스 -";
    return;
  }
  el.currentCourseBadge.textContent = `코스 ${code}`;
}

function renderCurrentUser() {
  if (!state.user) {
    el.currentUser.textContent = STATIC_MODE ? "Public Viewer" : "-";
    renderCurrentCourse();
    return;
  }
  const team = state.user.teamName ? ` / ${state.user.teamName}` : "";
  el.currentUser.textContent = `${state.user.displayName} (${state.user.accountId}${team})`;
  renderCurrentCourse();
}

function applyStaticPublicModeUI() {
  if (!STATIC_MODE) return;
  el.instructorModeBtn?.classList.remove("hidden");
  el.adminModeBtn?.classList.remove("hidden");
  el.accountSettingsBtn?.classList.add("hidden");
  el.logoutBtn?.classList.add("hidden");
  el.toggleEditModeBtn?.classList.add("hidden");
  el.toggleSidebarModeBtn?.classList.add("hidden");
  el.adminSection?.classList.add("hidden");
}

function updateAdminVisibility() {
  if (isRootAdmin()) {
    el.adminSection.classList.remove("hidden");
  } else {
    el.adminSection.classList.add("hidden");
  }
  el.openWrapupBtn?.classList.toggle("hidden", !state.isAdmin);
  el.instructorDocsBtn?.classList.toggle("hidden", !state.isAdmin);
  updateEditorVisibility();
}

async function loadAdminUsers() {
  if (!state.isAdmin) return;
  setAdminStatus("");
  try {
    const data = await api("/api/admin/users");
    const users = Array.isArray(data.users) ? data.users : [];
    el.adminUsersTbody.innerHTML = "";

    for (const user of users) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(user.letsId || user.accountId)}</td>
        <td>${escapeHtml(user.displayName || "")}</td>
        <td>${escapeHtml(user.teamName || "")}</td>
        <td><code>${escapeHtml(user.password || "")}</code></td>
        <td>${Number(user.completedCount || 0)}</td>
        <td>${Number(user.taskCount || 0)}</td>
        <td>${Number(user.noteCount || 0)}</td>
      `;
      el.adminUsersTbody.appendChild(tr);
    }
    setAdminStatus(`사용자 ${users.length}명`);
  } catch (error) {
    setAdminStatus(error.message, true);
  }
}

async function loadEditorSourceForCurrentClip() {
  if (!state.isAdmin || !state.currentClipKey) return;
  setEditorStatus("원본을 불러오는 중...");
  try {
    const data = await api(`/api/admin/clip-source/${encodeURIComponent(state.currentClipKey)}`);
    state.editorSourceClipKey = data.clip?.clipKey || state.currentClipKey;
    const overridden = await applyRuntimeClipOverride(state.editorSourceClipKey, {
      clip: data.clip || {},
      contentHtml: String(data.source?.contentHtml || "")
    });
    const serverHtml = String(overridden?.contentHtml || data.source?.contentHtml || "");
    const visibleHtml =
      state.currentVisibleContentHtml && state.currentClipKey === state.editorSourceClipKey
        ? state.currentVisibleContentHtml
        : rewriteClientClipHtml(state.editorSourceClipKey, serverHtml);
    state.editorSourceHtml = visibleHtml;
    state.editorDirty = false;
    el.contentEditorInput.value = visibleHtml;
    el.contentEditorPath.textContent = data.source?.contentPath || "-";
    onClearContentEmbed();
    renderEditorPreview(visibleHtml);
    renderClipBodyContent(visibleHtml, { liveEditEnabled: true });
    setEditorStatus("현재 클립 원본을 불러왔습니다.");
    await loadContentAssetsForCurrentClip();
  } catch (error) {
    setEditorStatus(error.message, true);
  }
}

async function loadContentAssetsForCurrentClip() {
  if (!state.isAdmin || !state.currentClipKey) return;
  setContentAssetStatus("클립 자산 목록을 불러오는 중...");
  try {
    const data = await api(`/api/admin/clip-assets/${encodeURIComponent(state.currentClipKey)}`);
    state.editorAssets = Array.isArray(data.assets) ? data.assets : [];
    renderContentAssetList();
    const upload = data.upload || {};
    const extText = Array.isArray(upload.allowedExtensions)
      ? upload.allowedExtensions.join(", ")
      : "-";
    el.contentAssetUploadHint.textContent = `허용 형식: ${extText} · 최대 ${upload.maxBytesLabel || "-"}`;
    setContentAssetStatus(`자산 ${state.editorAssets.length}건을 불러왔습니다.`);
  } catch (error) {
    state.editorAssets = [];
    renderContentAssetList();
    setContentAssetStatus(error.message, true);
  }
}

async function loadSidebarSourceForCurrentClip() {
  if (!state.isAdmin || !state.currentClipKey) return;
  setSidebarEditorStatus("사이드바 메타를 불러오는 중...");
  try {
    const data = await api(`/api/admin/sidebar-source/${encodeURIComponent(state.currentClipKey)}`);
    const sidebar = data.sidebar || {};
    const visible = currentVisibleSidebarState();
    state.sidebarSourceClipKey = data.clip?.clipKey || state.currentClipKey;
    state.sidebarSourceState = {
      chapterTitle: visible.chapterTitle || normalizeWs(sidebar.chapterTitle || ""),
      chapterTime: visible.chapterTime || normalizeWs(sidebar.chapterTime || ""),
      clipTitle: visible.clipTitle || normalizeWs(sidebar.clipTitle || ""),
      clipType: visible.clipType || normalizeWs(sidebar.clipType || "")
    };
    state.sidebarDirty = false;
    el.sidebarChapterTitleInput.value = state.sidebarSourceState.chapterTitle;
    el.sidebarChapterTimeInput.value = state.sidebarSourceState.chapterTime;
    el.sidebarClipTitleInput.value = state.sidebarSourceState.clipTitle;
    el.sidebarClipTypeInput.value = state.sidebarSourceState.clipType || "개념";
    el.sidebarEditorPath.textContent =
      [data.source?.reportPath, data.source?.chapterPath, data.source?.metadataPath]
        .filter(Boolean)
        .join(" | ") || "-";
    renderSidebarMetaPreview();
    setSidebarEditorStatus("현재 화면 기준 사이드바 메타를 불러왔습니다.");
  } catch (error) {
    const visible = currentVisibleSidebarState();
    state.sidebarSourceClipKey = state.currentClipKey || "";
    state.sidebarSourceState = {
      chapterTitle: visible.chapterTitle || normalizeWs(state.currentChapterTitle || ""),
      chapterTime: visible.chapterTime || "",
      clipTitle: visible.clipTitle || "",
      clipType: visible.clipType || "개념"
    };
    el.sidebarChapterTitleInput.value = state.sidebarSourceState.chapterTitle;
    el.sidebarChapterTimeInput.value = state.sidebarSourceState.chapterTime;
    el.sidebarClipTitleInput.value = state.sidebarSourceState.clipTitle;
    el.sidebarClipTypeInput.value = state.sidebarSourceState.clipType;
    el.sidebarEditorPath.textContent = "-";
    renderSidebarMetaPreview();
    setSidebarEditorStatus(error.message, true);
  }
}

async function loadPublishStatus() {
  if (!state.isAdmin) return;
  setPublishPanelStatus("배포 상태를 불러오는 중...");
  try {
    const data = await api("/api/admin/publish-status");
    state.publishStatus = data;
    renderPublishPanel();
    const git = data.git || {};
    const trackedCount = Number(git.publishable?.trackedCount || 0);
    const untrackedCount = Number(git.publishable?.untrackedCount || 0);
    const ahead = Number(git.ahead || 0);
    if (trackedCount || untrackedCount) {
      setPublishPanelStatus(
        `로컬 변경 ${trackedCount + untrackedCount}건이 Pages 미반영 상태입니다. commit + push가 필요합니다.`
      );
    } else if (ahead > 0) {
      setPublishPanelStatus("커밋은 되어 있지만 아직 push되지 않았습니다.");
    } else {
      setPublishPanelStatus("로컬 변경이 없고 원격과 동기화된 상태입니다.");
    }
  } catch (error) {
    setPublishPanelStatus(error.message, true);
  }
}

async function onToggleEditMode() {
  if (!state.isAdmin) return;

  if (state.editModeOpen) {
    if (
      state.editorDirty &&
      !window.confirm("저장되지 않은 수정 내용이 있습니다. 수정 모드를 닫을까요?")
    ) {
      return;
    }
    renderClipBodyContent(
      state.currentVisibleContentHtml ||
      editorLiveRenderHtml(state.editorSourceHtml || el.contentEditorInput?.value || ""),
      { liveEditEnabled: false }
    );
    resetContentEditor();
    updateEditorVisibility();
    return;
  }

  state.editModeOpen = true;
  updateEditorVisibility();
  await loadEditorSourceForCurrentClip();
}

async function onToggleSidebarEditMode() {
  if (!state.isAdmin) return;

  if (state.sidebarEditOpen) {
    if (
      state.sidebarDirty &&
      !window.confirm("저장되지 않은 사이드바 수정 내용이 있습니다. 닫을까요?")
    ) {
      return;
    }
    resetSidebarEditor();
    updateEditorVisibility();
    return;
  }

  state.sidebarEditOpen = true;
  updateEditorVisibility();
  await loadSidebarSourceForCurrentClip();
}

async function onTogglePublishMode() {
  if (!state.isAdmin) return;

  if (state.publishPanelOpen) {
    state.publishPanelOpen = false;
    updateEditorVisibility();
    return;
  }

  state.publishPanelOpen = true;
  updateEditorVisibility();
  await loadPublishStatus();
}

async function reloadEditorSource() {
  if (!state.isAdmin || !state.editModeOpen) return;
  if (
    state.editorDirty &&
    !window.confirm("현재 입력한 수정 내용이 사라집니다. 원본을 다시 불러올까요?")
  ) {
    return;
  }
  await loadEditorSourceForCurrentClip();
}

async function reloadContentAssets() {
  if (!state.isAdmin || !state.editModeOpen) return;
  await loadContentAssetsForCurrentClip();
}

async function uploadContentAssets() {
  if (!state.isAdmin || !state.currentClipKey) return;
  const files = Array.from(el.contentAssetInput?.files || []);
  if (!files.length) {
    setContentAssetStatus("업로드할 파일을 먼저 선택해 주세요.");
    el.contentAssetInput?.click();
    return;
  }

  const uploaded = [];
  setContentAssetStatus(`파일 ${files.length}건 업로드 중...`);

  for (const file of files) {
    const contentBase64 = await readFileAsBase64(file);
    const result = await api(`/api/admin/clip-assets/${encodeURIComponent(state.currentClipKey)}`, {
      method: "POST",
      body: {
        fileName: file.name,
        contentBase64
      }
    });
    if (result.asset) uploaded.push(result.asset);
  }

  if (el.contentAssetInput) {
    el.contentAssetInput.value = "";
  }
  updateContentAssetSelectionSummary([]);
  await loadContentAssetsForCurrentClip();
  const lastUploaded = uploaded[uploaded.length - 1];
  if (lastUploaded) {
    renderContentAssetPreview(lastUploaded);
  }
  setContentAssetStatus(`업로드 완료: ${uploaded.length}건`);
}

async function reloadSidebarSource() {
  if (!state.isAdmin || !state.sidebarEditOpen) return;
  if (
    state.sidebarDirty &&
    !window.confirm("현재 입력한 사이드바 수정 내용이 사라집니다. 원본을 다시 불러올까요?")
  ) {
    return;
  }
  await loadSidebarSourceForCurrentClip();
}

async function saveEditorSource() {
  if (!state.isAdmin || !state.currentClipKey) return;
  const contentHtml = String(el.contentEditorInput.value || "");
  if (!contentHtml.trim()) {
    setEditorStatus("저장할 HTML 내용이 비어 있습니다.", true);
    return;
  }

  if (el.saveContentEditorTopBtn) {
    el.saveContentEditorTopBtn.disabled = true;
  }
  setEditorStatus("저장 중...");
  try {
    const result = await api(`/api/admin/clip-source/${encodeURIComponent(state.currentClipKey)}`, {
      method: "POST",
      body: { contentHtml }
    });
    state.editorSourceHtml = contentHtml;
    state.editorDirty = false;
    await loadChaptersAndDefaultClip();
    renderEditorPreview(contentHtml);
    if (state.editModeOpen && state.currentClipKey === state.editorSourceClipKey) {
      state.currentVisibleContentHtml = editorLiveRenderHtml(contentHtml);
      renderClipBodyContent(state.currentVisibleContentHtml, { liveEditEnabled: true });
    }
    await loadPublishStatus();
    setEditorStatus(
      `저장 완료: ${new Date(result.savedAt).toLocaleString()} · 로컬 원본과 메타는 동기화되었습니다. Pages 반영은 배포 패널에서 commit + push 하세요.`
    );
  } catch (error) {
    setEditorStatus(error.message, true);
  } finally {
    updateEditorVisibility();
  }
}

async function saveSidebarSource() {
  if (!state.isAdmin || !state.currentClipKey) return;
  const draft = currentSidebarDraft();
  if (!draft.chapterTitle) {
    setSidebarEditorStatus("챕터 제목을 입력해 주세요.", true);
    return;
  }
  if (!draft.clipTitle) {
    setSidebarEditorStatus("클립 제목을 입력해 주세요.", true);
    return;
  }

  setSidebarEditorStatus("저장 중...");
  try {
    const result = await api(
      `/api/admin/sidebar-source/${encodeURIComponent(state.currentClipKey)}`,
      {
        method: "POST",
        body: draft
      }
    );
    state.sidebarSourceState = { ...draft };
    state.sidebarDirty = false;
    await loadChaptersAndDefaultClip();
    applySidebarDraftToClientState(draft);
    renderSidebar();
    renderSidebarMetaPreview();
    await loadPublishStatus();
    setSidebarEditorStatus(
      `저장 완료: ${new Date(result.savedAt).toLocaleString()} · 사이드바 카탈로그는 로컬에 반영되었습니다. Pages 반영은 배포 패널에서 commit + push 하세요.`
    );
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("서버 오류")) {
      setSidebarEditorStatus(
        "서버 오류가 발생했습니다. 이동된 클립의 사이드바 저장 로직을 수정했고, 현재 localhost 서버가 예전 코드로 떠 있으면 재시작 후 다시 시도해 주세요.",
        true
      );
      return;
    }
    setSidebarEditorStatus(message, true);
  }
}

async function runPublishRootChanges() {
  if (!state.isAdmin) return;

  const commitMessage = normalizeWs(el.publishCommitMessageInput?.value || "") || "Publish root editor updates";
  setPublishPanelStatus("commit + push 실행 중...");
  try {
    const result = await api("/api/admin/publish", {
      method: "POST",
      body: {
        message: commitMessage
      }
    });
    state.publishStatus = {
      ok: true,
      git: result.git || null
    };
    renderPublishPanel();
    const pushed = Array.isArray(result.operations) ? result.operations.join(" -> ") : "push";
    setPublishPanelStatus(
      `${pushed} 완료: ${result.git?.head || "-"} ${normalizeWs(result.git?.headMessage || "")}`.trim()
    );
  } catch (error) {
    setPublishPanelStatus(error.message, true);
  }
}

async function loadNoteForCurrentClip() {
  if (!state.currentClipKey) {
    el.noteText.value = "";
    renderNotePreview();
    setNoteStatus("");
    return;
  }

  el.noteClipContext.textContent = `${state.currentChapterNum} ${state.currentChapterTitle} / ${state.currentClipKey}`;

  try {
    const data = await api(
      `/api/notes?clipKey=${encodeURIComponent(state.currentClipKey)}`
    );
    const note = data.note || {};
    el.noteText.value = note.content || "";
    renderNotePreview();
    if (note.updatedAt) {
      setNoteStatus(`최근 저장: ${new Date(note.updatedAt).toLocaleString()}`);
    } else {
      setNoteStatus("");
    }
  } catch (error) {
    renderNotePreview();
    setNoteStatus(error.message, true);
  }
}

async function saveCurrentClipNote() {
  if (!state.currentClipKey) return;
  setNoteStatus("");
  try {
    const data = await api(
      `/api/notes?clipKey=${encodeURIComponent(state.currentClipKey)}`,
      {
        method: "POST",
        body: {
          content: el.noteText.value || ""
        }
      }
    );
    const updatedAt = data.note?.updatedAt;
    if (updatedAt) {
      setNoteStatus(`저장 완료: ${new Date(updatedAt).toLocaleString()}`);
    } else {
      setNoteStatus("저장 완료");
    }
  } catch (error) {
    setNoteStatus(error.message, true);
  }
}

function hydrateSession(result) {
  state.guestMode = false;
  el.instructorModeBtn?.classList.add("hidden");
  el.adminModeBtn?.classList.add("hidden");
  el.accountSettingsBtn?.classList.remove("hidden");
  el.logoutBtn?.classList.remove("hidden");
  state.user = result.user || null;
  state.accountId = result.user?.accountId || "";
  state.sessionToken = normalizeWs(result.sessionToken || state.sessionToken);
  state.isAdmin = Boolean(result.user?.isAdmin);
  state.currentCourse = result.course || state.currentCourse || null;
  const activeCourseCode = normalizeCourseCode(
    result.course?.courseCode || result.user?.courseCode || ""
  );
  if (activeCourseCode) {
    if (el.loginCourseCode) el.loginCourseCode.value = activeCourseCode;
    if (el.signupCourseCode) el.signupCourseCode.value = activeCourseCode;
  }
  renderCurrentUser();
  updateAdminVisibility();
  setAuthStorage(result.user, state.sessionToken, result.course);
  if (state.isAdmin) {
    loadAdminUsers().catch((error) => setAdminStatus(error.message, true));
  }
}

async function onLoginSubmit(event) {
  event.preventDefault();
  setLoginError("");

  const accountId = normalizeWs(el.loginAccountId.value);
  const password = String(el.loginPassword.value || "");
  const courseCode = normalizeCourseCode(el.loginCourseCode?.value || "");

  try {
    const result = await api("/api/login", {
      method: "POST",
      body: { accountId, password, courseCode }
    });

    hydrateSession(result);
    showApp();
    await loadChaptersAndDefaultClip();
    if (state.taskPanelOpen) {
      await loadTaskForCurrentChapter();
    }
  } catch (error) {
    setLoginError(error.message);
  }
}

async function onSignupSubmit(event) {
  event.preventDefault();
  setSignupError("");

  const accountId = normalizeWs(el.signupAccountId.value);
  const password = String(el.signupPassword.value || "");
  const teamName = normalizeWs(el.signupTeamName.value);
  const displayName = normalizeWs(el.signupDisplayName.value);
  const courseCode = normalizeCourseCode(el.signupCourseCode?.value || "");

  try {
    const result = await api("/api/signup", {
      method: "POST",
      body: {
        letsId: accountId,
        accountId,
        password,
        teamName,
        displayName,
        courseCode
      }
    });
    hydrateSession(result);
    showApp();
    await loadChaptersAndDefaultClip();
    if (state.taskPanelOpen) {
      await loadTaskForCurrentChapter();
    }
  } catch (error) {
    setSignupError(error.message);
  }
}

async function onPasswordHint() {
  const accountId = normalizeWs(el.helpAccountId.value || el.loginAccountId.value);
  el.passwordHintResult.textContent = "";

  try {
    const result = await api("/api/password-hint", {
      method: "POST",
      body: { accountId }
    });
    el.passwordHintResult.textContent = `힌트: ${result.hint}`;
  } catch (error) {
    el.passwordHintResult.textContent = error.message;
  }
}

async function onPasswordRecover() {
  const accountId = normalizeWs(el.helpAccountId.value || el.loginAccountId.value);
  const teamName = normalizeWs(el.helpTeamName.value);
  el.passwordRecoverResult.textContent = "";

  try {
    const result = await api("/api/password-recover", {
      method: "POST",
      body: { accountId, teamName }
    });
    el.passwordRecoverResult.textContent = `비밀번호: ${result.password}`;
  } catch (error) {
    el.passwordRecoverResult.textContent = error.message;
  }
}

async function onAccountSubmit(event) {
  event.preventDefault();
  setAccountStatus("");

  const accountId = normalizeWs(el.accountEditId.value);
  const displayName = normalizeWs(el.accountEditDisplayName.value);
  const teamName = normalizeWs(el.accountEditTeamName.value);
  const currentPassword = String(el.accountCurrentPassword.value || "");
  const newPassword = String(el.accountNewPassword.value || "");

  try {
    const result = await api("/api/account", {
      method: "POST",
      body: {
        letsId: accountId,
        accountId,
        displayName,
        teamName,
        currentPassword,
        newPassword
      }
    });

    hydrateSession(result);
    el.loginAccountId.value = result.user.accountId || "";
    el.helpAccountId.value = result.user.accountId || "";
    el.accountCurrentPassword.value = "";
    el.accountNewPassword.value = "";
    closeAccountModal();
    showCopyToast("계정 정보가 변경되었습니다");
  } catch (error) {
    setAccountStatus(error.message, true);
  }
}

function applyGuestModeUI() {
  el.accountSettingsBtn?.classList.add("hidden");
  el.logoutBtn?.classList.add("hidden");
  el.instructorModeBtn?.classList.remove("hidden");
  el.adminModeBtn?.classList.remove("hidden");
  el.toggleEditModeBtn?.classList.add("hidden");
  el.toggleSidebarModeBtn?.classList.add("hidden");
  el.togglePublishModeBtn?.classList.add("hidden");
  el.adminSection?.classList.add("hidden");
}

// [Wrapup 1단계] 게스트 모드 — 가입/로그인 없이 학습 화면 진입 (진도·메모는 브라우저 저장)
async function enterGuestMode() {
  state.guestMode = true;
  state.accountId = "guest";
  state.sessionToken = "";
  state.user = { accountId: "guest", displayName: "게스트", teamName: "", courseCode: "AXCAMP" };
  state.isAdmin = false;
  state.currentCourse = state.courses?.[0] || { courseCode: "AXCAMP", courseName: "AXCAMP" };
  renderCurrentUser();
  updateAdminVisibility();
  applyGuestModeUI();
  showApp();
  await loadChaptersAndDefaultClip();
  try {
    for (const key of getStaticCompletedClipKeys()) state.completedSet.add(key);
    renderSidebar();
  } catch { /* ignore */ }
}

// [원격 관리자] 정적 사이트에서 관리자 코드 인증 후 편집 UI 활성화
function enterStaticAdminMode() {
  state.isAdmin = true;
  state.user = { ...STATIC_PUBLIC_USER, accountId: "root", displayName: "관리자(원격)" };
  renderCurrentUser();
  updateAdminVisibility();
  alert("관리자 인증 완료.\n본문 수정·사이드바 수정 저장은 자동으로 커밋·배포되며, 약 3~4분 후 공개 사이트에 반영됩니다.");
}

async function verifyStaticAdminRestore() {
  if (!staticAdminCode()) return;
  try {
    const response = await fetch(`${WRAPUP_REMOTE_API_BASE}/api/wrapup/instructor-verify`, {
      method: "POST",
      headers: { "x-wrapup-instructor": staticAdminCode() }
    });
    const v = await response.json().catch(() => null);
    if (v?.ok && v.role === "admin") {
      state.isAdmin = true;
      state.user = { ...STATIC_PUBLIC_USER, accountId: "root", displayName: "관리자(원격)" };
      renderCurrentUser();
      updateAdminVisibility();
    }
  } catch {
    // 미인증 상태 유지
  }
}

async function tryAutoLogin() {
  await loadSlideDeckData();
  if (STATIC_MODE) {
    state.accountId = STATIC_PUBLIC_USER.accountId;
    state.sessionToken = "";
    state.user = STATIC_PUBLIC_USER;
    state.isAdmin = false;
    state.currentCourse = STATIC_PUBLIC_COURSE;
    renderCurrentUser();
    updateAdminVisibility();
    applyStaticPublicModeUI();
    showApp();
    await loadChaptersAndDefaultClip();
    verifyStaticAdminRestore(); // 저장된 관리자 코드가 있으면 조용히 복원
    return;
  }

  const savedToken = normalizeWs(localStorage.getItem(STORAGE_SESSION_KEY));
  const savedId =
    normalizeWs(localStorage.getItem(STORAGE_LAST_ID_KEY)) ||
    normalizeWs(localStorage.getItem("ax_literacy_account_id"));
  const savedCourseCode = normalizeCourseCode(localStorage.getItem(STORAGE_COURSE_CODE_KEY));
  if (savedId) {
    el.loginAccountId.value = savedId;
    el.helpAccountId.value = savedId;
  }
  if (savedCourseCode) {
    if (el.loginCourseCode) el.loginCourseCode.value = savedCourseCode;
    if (el.signupCourseCode) el.signupCourseCode.value = savedCourseCode;
  }

  if (!savedToken) {
    await enterGuestMode();
    return;
  }

  try {
    state.sessionToken = savedToken;
    const courseQuery = normalizeCourseCode(el.loginCourseCode?.value || "");
    const path = courseQuery
      ? `/api/me?course=${encodeURIComponent(courseQuery)}`
      : "/api/me";
    const result = await api(path);
    hydrateSession(result);
    showApp();
    await loadChaptersAndDefaultClip();
    if (state.taskPanelOpen) {
      await loadTaskForCurrentChapter();
    }
  } catch {
    clearAuthStorage();
    state.accountId = "";
    state.sessionToken = "";
    state.user = null;
    state.isAdmin = false;
    await enterGuestMode();
  }
}

async function onToggleComplete() {
  if (!state.currentClipKey) return;
  const nextValue = !state.completedSet.has(state.currentClipKey);

  try {
    const result = await api("/api/progress", {
      method: "POST",
      body: {
        clipKey: state.currentClipKey,
        completed: nextValue
      }
    });
    state.completedSet = new Set(result.completedClipKeys || []);
    updateMarkCompleteButton();
    renderSidebar();
  } catch (error) {
    alert(error.message);
  }
}

function onToggleTaskPanel() {
  state.taskPanelOpen = false;
  updateSidePanelUI();
  /* [260904] 팀 토론에서 저장된 팀·이름(ax_wrapup_identity)을 공유 보드에 ?name=으로 전달 — 보드 앱이 이름 입력창에 미리 채움(보드 미지원 버전은 무시하므로 무해). 사용자 결정 */
  let boardUrl = AX_TASK_BOARD_URL;
  try {
    const idn = JSON.parse(localStorage.getItem("ax_wrapup_identity") || "null");
    if (idn?.team && idn?.name) {
      boardUrl += (boardUrl.includes("?") ? "&" : "?") + "name=" + encodeURIComponent(idn.team + "팀 " + idn.name);
    }
  } catch (e) {}
  window.open(boardUrl, "_blank", "noopener,noreferrer");
}

function onToggleNotePanel() {
  const willOpen = !state.notePanelOpen;
  state.notePanelOpen = willOpen;
  if (willOpen) {
    state.taskPanelOpen = false;
  }
  updateSidePanelUI();
  if (state.notePanelOpen) {
    loadNoteForCurrentClip().catch((error) => setNoteStatus(error.message, true));
  }
}

async function onCopyNote() {
  await copyTextWithUiFeedback(el.copyNoteBtn, el.noteText.value || "");
}

function activeEditorAsset() {
  return state.editorAssetMap.get(state.editorActiveAssetPath) || null;
}

async function onCopyActiveAssetPath() {
  const asset = activeEditorAsset();
  if (!asset) return;
  await copyTextWithUiFeedback(el.copyContentAssetPathBtn, asset.url || "");
}

function onInsertActiveAssetLink() {
  const asset = activeEditorAsset();
  if (!asset) return;
  insertIntoContentEditor(buildAssetInsertionSnippet(asset, "link"));
}

function onInsertActiveAssetMedia() {
  const asset = activeEditorAsset();
  if (!asset) return;
  insertIntoContentEditor(buildAssetInsertionSnippet(asset, "media"));
}

function onPreviewContentEmbed() {
  const spec = buildExternalEmbedSpec(
    el.contentEmbedUrlInput?.value || "",
    el.contentEmbedTitleInput?.value || ""
  );
  if (spec.error) {
    resetContentEmbedPreview();
    setContentEmbedStatus(spec.error, true);
    return;
  }
  renderContentEmbedPreview(spec);
  setContentEmbedStatus(`${spec.kind === "youtube" ? "YouTube" : spec.meta || "외부 자료"} 미리보기를 준비했습니다.`);
}

function onInsertContentEmbed() {
  if (!state.editorEmbedSpec?.snippet) {
    setContentEmbedStatus("먼저 외부 임베드를 미리보기 해주세요.", true);
    return;
  }
  insertIntoContentEditor(state.editorEmbedSpec.snippet);
  setContentEmbedStatus("외부 임베드 HTML을 편집기에 삽입했습니다.");
}

/* [260731] 라운드 진행 도식(round-flow) 단계 칩 클릭 → 해당 구역으로 스크롤 이동.
   해시 라우팅과 충돌하지 않도록 앵커 링크 대신 JS 스크롤을 사용합니다. */
function scrollToRoundFlowTarget(step) {
  const targetId = step?.getAttribute?.("data-rf-target");
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (!target) return;
  const isField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
  target.scrollIntoView({ behavior: "smooth", block: isField ? "center" : "start" });
}
document.addEventListener("click", (event) => {
  const step = event.target?.closest?.(".rf-step[data-rf-target]");
  if (step) scrollToRoundFlowTarget(step);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const step = event.target?.closest?.(".rf-step[data-rf-target]");
  if (!step) return;
  event.preventDefault();
  scrollToRoundFlowTarget(step);
});

function onClearContentEmbed() {
  if (el.contentEmbedUrlInput) el.contentEmbedUrlInput.value = "";
  if (el.contentEmbedTitleInput) el.contentEmbedTitleInput.value = "";
  resetContentEmbedPreview();
  setContentEmbedStatus("");
}

function onContentAssetListClick(event) {
  const button = event.target.closest("[data-asset-action]");
  if (!button) return;

  const relativePath = normalizeWs(button.dataset.assetPath || "");
  const asset = state.editorAssetMap.get(relativePath);
  if (!asset) return;

  const action = normalizeWs(button.dataset.assetAction || "");
  if (action === "delete") {
    if (!window.confirm(`${asset.name || asset.relativePath} 파일을 삭제할까요?`)) return;
    if (state.editorActiveAssetPath === asset.relativePath) {
      resetContentAssetPreview();
    }
    api(`/api/admin/clip-assets/${encodeURIComponent(state.currentClipKey)}`, {
      method: "DELETE",
      body: { relativePath: asset.relativePath }
    })
      .then(async () => {
        await loadContentAssetsForCurrentClip();
        setContentAssetStatus("자산을 삭제했습니다.");
      })
      .catch((error) => setContentAssetStatus(error.message, true));
    return;
  }

  renderContentAssetPreview(asset);

  if (action === "preview") return;
  if (action === "copy-path") {
    copyTextWithUiFeedback(button, asset.url || "").catch((error) =>
      setContentAssetStatus(error.message, true)
    );
    return;
  }
  if (action === "insert-link") {
    onInsertActiveAssetLink();
    return;
  }
  if (action === "insert-media") {
    onInsertActiveAssetMedia();
    return;
  }
}

async function onTaskSubmit(event) {
  event.preventDefault();
  setTaskStatus("");

  if (!state.currentChapterId) {
    setTaskStatus("현재 챕터를 찾을 수 없습니다.", true);
    return;
  }

  try {
    const result = await api(
      `/api/ax-task?chapterId=${encodeURIComponent(state.currentChapterId)}`,
      {
        method: "POST",
        body: {
          title: el.taskTitle.value,
          reason: el.taskReason.value,
          effect: el.taskEffect.value
        }
      }
    );
    setTaskStatus(
      `${state.currentChapterNum} 저장 완료: ${new Date(
        result.axTask.updatedAt
      ).toLocaleString()}`
    );
  } catch (error) {
    setTaskStatus(error.message, true);
  }
}

async function onLogout() {
  try {
    await api("/api/logout", { method: "POST" });
  } catch {
    // ignore
  }
  clearAuthStorage();
  state.accountId = "";
  state.sessionToken = "";
  state.isAdmin = false;
  state.user = null;
  state.currentCourse = null;
  state.chapters = [];
  state.clipMap = new Map();
  state.completedSet = new Set();
  state.currentClipKey = "";
  state.currentChapterId = "";
  state.currentChapterNum = "";
  state.currentChapterTitle = "";
  state.currentVisibleContentHtml = "";
  state.expandedChapters = new Set();
  closeSlideDeck();
  state.taskPanelOpen = false;
  state.notePanelOpen = false;
  resetContentEditor();
  resetSidebarEditor();
  resetPublishPanel();
  el.adminUsersTbody.innerHTML = "";
  el.noteText.value = "";
  renderNotePreview();
  el.noteClipContext.textContent = "현재 클립";
  closeAccountModal();
  setNoteStatus("");
  setAdminStatus("");
  updateEditorVisibility();

  window.location.hash = "";
  await enterGuestMode();
}

function bindEvents() {
  el.loginForm.addEventListener("submit", onLoginSubmit);
  el.signupForm.addEventListener("submit", onSignupSubmit);
  el.markCompleteBtn.addEventListener("click", onToggleComplete);
  el.taskForm.addEventListener("submit", onTaskSubmit);
  el.toggleTaskBtn.addEventListener("click", onToggleTaskPanel);
  el.toggleNoteBtn.addEventListener("click", onToggleNotePanel);
  el.sidebarToggleBtn?.addEventListener("click", onToggleSidebar);
  el.fontSizeDownBtn?.addEventListener("click", () => changeFontScaleStep(-1));
  el.fontSizeUpBtn?.addEventListener("click", () => changeFontScaleStep(1));
  el.saveNoteBtn.addEventListener("click", () => {
    saveCurrentClipNote().catch((error) => setNoteStatus(error.message, true));
  });
  el.noteText.addEventListener("input", renderNotePreview);
  el.contentEditorInput?.addEventListener("input", () => {
    const currentHtml = String(el.contentEditorInput.value || "");
    state.editorDirty = currentHtml !== state.editorSourceHtml;
    renderEditorPreview(currentHtml);
    if (state.editModeOpen && state.currentClipKey === state.editorSourceClipKey) {
      renderClipBodyContent(editorLiveRenderHtml(currentHtml), { liveEditEnabled: true });
    }
    if (state.editorDirty) {
      setEditorStatus("저장 전 미리보기 상태입니다.");
    } else {
      setEditorStatus("원본과 동일합니다.");
    }
    updateEditorVisibility();
  });
  el.contentEditorInput?.addEventListener("scroll", syncContentEditorScroll);
  el.contentEditorPreview?.addEventListener("click", onContentEditorPreviewClick);
  el.contentEditorPreview?.addEventListener("dblclick", onContentEditorPreviewDoubleClick);
  el.clipBody?.addEventListener("dblclick", onClipBodyDirectEditDoubleClick);
  el.reloadContentAssetsBtn?.addEventListener("click", () => {
    reloadContentAssets().catch((error) => setContentAssetStatus(error.message, true));
  });
  el.chooseContentAssetsBtn?.addEventListener("click", () => {
    el.contentAssetInput?.click();
  });
  el.uploadContentAssetsBtn?.addEventListener("click", () => {
    uploadContentAssets().catch((error) => setContentAssetStatus(error.message, true));
  });
  el.contentAssetInput?.addEventListener("change", () => {
    const files = Array.from(el.contentAssetInput.files || []);
    updateContentAssetSelectionSummary(files);
    if (!files.length) return;
    const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    setContentAssetStatus(`선택됨: ${files.length}건 · ${formatBytes(totalBytes)}`);
  });
  el.contentAssetList?.addEventListener("click", onContentAssetListClick);
  el.copyContentAssetPathBtn?.addEventListener("click", () => {
    onCopyActiveAssetPath().catch((error) => setContentAssetStatus(error.message, true));
  });
  el.insertContentAssetLinkBtn?.addEventListener("click", onInsertActiveAssetLink);
  el.insertContentAssetMediaBtn?.addEventListener("click", onInsertActiveAssetMedia);
  [el.contentEmbedUrlInput, el.contentEmbedTitleInput]
    .filter(Boolean)
    .forEach((field) => {
      field.addEventListener("input", () => {
        state.editorEmbedSpec = null;
        if (el.insertContentEmbedBtn) el.insertContentEmbedBtn.disabled = true;
        if (!el.contentEmbedPreviewPanel?.classList.contains("hidden")) {
          resetContentEmbedPreview();
        }
        if (!normalizeWs(el.contentEmbedUrlInput?.value || "") && !normalizeWs(el.contentEmbedTitleInput?.value || "")) {
          setContentEmbedStatus("");
        } else {
          setContentEmbedStatus("미리보기를 눌러 외부 임베드를 확인하세요.");
        }
      });
    });
  el.previewContentEmbedBtn?.addEventListener("click", onPreviewContentEmbed);
  el.insertContentEmbedBtn?.addEventListener("click", onInsertContentEmbed);
  el.clearContentEmbedBtn?.addEventListener("click", onClearContentEmbed);
  [el.sidebarChapterTitleInput, el.sidebarChapterTimeInput, el.sidebarClipTitleInput, el.sidebarClipTypeInput]
    .filter(Boolean)
    .forEach((field) => {
      field.addEventListener("input", () => {
        const draft = currentSidebarDraft();
        const source = state.sidebarSourceState || {
          chapterTitle: "",
          chapterTime: "",
          clipTitle: "",
          clipType: ""
        };
        state.sidebarDirty =
          draft.chapterTitle !== source.chapterTitle ||
          draft.chapterTime !== source.chapterTime ||
          draft.clipTitle !== source.clipTitle ||
          draft.clipType !== source.clipType;
        renderSidebarMetaPreview();
        if (state.sidebarDirty) {
          setSidebarEditorStatus("저장 전 미리보기 상태입니다.");
        } else {
          setSidebarEditorStatus("원본과 동일합니다.");
        }
      });
    });
  el.copyNoteBtn.addEventListener("click", () => {
    onCopyNote().catch((error) => setNoteStatus(error.message, true));
  });
  el.showLoginModeBtn.addEventListener("click", showLoginMode);
  el.showSignupModeBtn.addEventListener("click", showSignupMode);
  el.showPasswordHelpBtn.addEventListener("click", showPasswordHelpMode);
  el.closePasswordHelpBtn.addEventListener("click", showLoginMode);
  el.passwordHintBtn.addEventListener("click", () => {
    onPasswordHint().catch((error) => {
      el.passwordHintResult.textContent = error.message;
    });
  });
  el.passwordRecoverBtn.addEventListener("click", () => {
    onPasswordRecover().catch((error) => {
      el.passwordRecoverResult.textContent = error.message;
    });
  });
  el.accountSettingsBtn.addEventListener("click", openAccountModal);
  el.closeAccountModalBtn.addEventListener("click", closeAccountModal);
  el.accountForm.addEventListener("submit", onAccountSubmit);
  el.refreshUsersBtn?.addEventListener("click", () => {
    loadAdminUsers().catch((error) => setAdminStatus(error.message, true));
  });
  el.logoutBtn.addEventListener("click", onLogout);

  // [Wrapup 1단계] 게스트 ↔ 관리자 로그인 전환
  // [강사 자료실] 관리자 인증 후에만 버튼 노출 — 문서 자체는 공개판(instructor-docs-files/)
  el.instructorDocsBtn?.addEventListener("click", () => {
    window.open(STATIC_MODE ? "instructor-docs.html" : "/instructor-docs.html", "_blank", "noopener");
  });
  el.openWrapupBtn?.addEventListener("click", () => {
    window.open(STATIC_MODE ? "wrapup.html" : "/wrapup", "_blank", "noopener");
  });
  function openModeLogin(prefillId) {
    if (STATIC_MODE) {
      // [Wrapup 외부접속] 강사 모드 → Wrap-up 보드. [원격 관리자] 관리자 모드 → 코드 인증 후
      // 본문 편집(저장 시 자동 커밋·배포)과 보드 관리까지 사용 가능
      if (prefillId === "instructor") {
        // [강사 모드 게이트] 비밀번호를 Worker 강사 코드로 검증하고, 통과하면 보드가 읽는 저장 키에
        // 코드를 넣어 Wrap-up 보드에 자동 로그인된 상태로 연다 — 이중 로그인 방지
        const pw = window.prompt("강사 비밀코드를 입력하세요");
        if (pw === null || !pw.trim()) return;
        (async () => {
          const verifyCode = async (candidate) => {
            const r = await fetch(`${WRAPUP_REMOTE_API_BASE}/api/wrapup/instructor-verify`, {
              method: "POST",
              headers: { "x-wrapup-instructor": candidate }
            });
            const v = await r.json();
            return v?.ok ? candidate : null;
          };
          try {
            // 입력 그대로 → 실패 시 소문자 재시도 (당일 급하게 대문자로 입력해도 통과)
            let code = await verifyCode(pw.trim());
            if (!code && pw.trim() !== pw.trim().toLowerCase()) {
              code = await verifyCode(pw.trim().toLowerCase());
            }
            if (!code) {
              alert("강사 비밀코드가 올바르지 않습니다.");
              return;
            }
            try {
              localStorage.setItem("ax_wrapup_instructor_code", code);
            } catch {}
            window.open("wrapup.html", "_blank", "noopener");
          } catch {
            alert("인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          }
        })();
        return;
      }
      const saved = staticAdminCode();
      const code = window.prompt("관리자 비밀코드를 입력하세요", saved || "");
      if (!code) return;
      fetch(`${WRAPUP_REMOTE_API_BASE}/api/wrapup/instructor-verify`, {
        method: "POST",
        headers: { "x-wrapup-instructor": code.trim() }
      })
        .then((r) => r.json())
        .then((v) => {
          if (!v?.ok || v.role !== "admin") {
            alert(v?.error || "관리자 코드가 올바르지 않습니다.");
            return;
          }
          try {
            localStorage.setItem("ax_wrapup_instructor_code", code.trim());
          } catch {}
          enterStaticAdminMode();
        })
        .catch(() => alert("인증 서버에 연결할 수 없습니다."));
      return;
    }
    showLogin();
    showLoginMode();
    if (el.loginAccountId) el.loginAccountId.value = prefillId;
    el.loginPassword?.focus();
  }
  el.instructorModeBtn?.addEventListener("click", () => openModeLogin("instructor"));
  el.adminModeBtn?.addEventListener("click", () => openModeLogin("root"));
  el.continueGuestBtn?.addEventListener("click", () => {
    enterGuestMode();
  });

  el.accountModal.addEventListener("click", (event) => {
    if (event.target === el.accountModal) {
      closeAccountModal();
    }
  });

  el.slideDeckModal.addEventListener("click", (event) => {
    if (event.target === el.slideDeckModal) {
      closeSlideDeck();
    }
  });

  el.closeSlideDeckBtn.addEventListener("click", closeSlideDeck);
  el.slidePrevBtn.addEventListener("click", () => {
    if (!state.activeSlideDeck || state.activeSlideIndex <= 0) return;
    state.activeSlideIndex -= 1;
    renderActiveSlideDeck();
  });
  el.slideNextBtn.addEventListener("click", () => {
    if (!state.activeSlideDeck) return;
    const lastIndex = state.activeSlideDeck.slides.length - 1;
    if (state.activeSlideIndex >= lastIndex) return;
    state.activeSlideIndex += 1;
    renderActiveSlideDeck();
  });

  window.addEventListener("hashchange", () => {
    const target = normalizeClipKey(window.location.hash.replace(/^#/, ""));
    if (target && target !== state.currentClipKey) {
      openClip(target).catch((error) => alert(error.message));
    }
  });

  // 260731 텍스트 드래그 복사 보호: 접이식 제목(summary)·체크리스트(label) 위에서
  // 드래그 선택을 마치면 클릭으로 처리되어 토글되며 선택이 풀리는 문제 방지 —
  // 선택된 텍스트가 있을 때는 토글하지 않는다.
  document.addEventListener(
    "click",
    (event) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      if (event.target.closest("summary, label")) {
        event.preventDefault();
      }
    },
    true
  );

  state.taskPanelOpen = false;
  state.notePanelOpen = false;
  setSidebarCollapsed(readSidebarCollapsedPreference(), { persist: false });
  renderSidebarMetaPreview();
  updateEditorVisibility();
  updateSidePanelUI();
  applySidebarCollapsedState();
  renderNotePreview();

  let wasDesktop = window.innerWidth > 1380;
  window.addEventListener("resize", () => {
    const isDesktop = window.innerWidth > 1380;
    if (!isDesktop && wasDesktop) {
      state.taskPanelOpen = false;
      state.notePanelOpen = false;
      updateSidePanelUI();
    }
    wasDesktop = isDesktop;
  });

  window.addEventListener("keydown", (event) => {
    if (state.activeSlideDeck) {
      if (event.key === "Escape") {
        closeSlideDeck();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        const step = Math.max(220, el.slideDeckStage?.clientHeight ? Math.round(el.slideDeckStage.clientHeight * 0.84) : 320);
        el.slideDeckStage?.scrollBy({ top: step, behavior: "smooth" });
        return;
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        const step = Math.max(220, el.slideDeckStage?.clientHeight ? Math.round(el.slideDeckStage.clientHeight * 0.84) : 320);
        el.slideDeckStage?.scrollBy({ top: -step, behavior: "smooth" });
        return;
      }
      if (event.key === "ArrowLeft" && state.activeSlideIndex > 0) {
        state.activeSlideIndex -= 1;
        renderActiveSlideDeck();
        return;
      }
      if (
        event.key === "ArrowRight" &&
        state.activeSlideIndex < state.activeSlideDeck.slides.length - 1
      ) {
        state.activeSlideIndex += 1;
        renderActiveSlideDeck();
        return;
      }
    }

    if (event.key === "Escape" && !el.accountModal.classList.contains("hidden")) {
      closeAccountModal();
    }
  });
}

window.copyPrompt = async function copyPrompt(button, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  await copyTextWithUiFeedback(button, target.textContent || "");
};

window.copyResourceLink = async function copyResourceLink(button, url) {
  await copyTextWithUiFeedback(button, url || "");
};

window.copyResourceText = async function copyResourceText(button, url) {
  try {
    const response = await fetch(resolveRuntimeUrl(url));
    if (!response.ok) {
      throw new Error(`fetch failed (${response.status})`);
    }
    await copyTextWithUiFeedback(button, await response.text());
  } catch {
    showCopyButtonState(button, false, "복사 실패");
    showCopyToast("본문을 불러오지 못했습니다", true);
  }
};

window.copyInlinePrompt = async function copyInlinePrompt(button) {
  const block = button?.closest(".prompt-inline-block, .prompt-block");
  if (!block) return;

  const source = block.querySelector(".prompt-inline-content, .prompt-content");
  const markdown = source?.dataset?.mdRaw || source?.textContent || "";
  await copyTextWithUiFeedback(button, markdown);
};

window.downloadFile = async function downloadFile(url, filename, event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  try {
    const resolvedUrl = resolveRuntimeUrl(url);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`download failed (${response.status})`);
    }

    const blob = await response.blob();
    const resolvedName =
      normalizeWs(filename) ||
      lookupStaticDownloadName(resolvedUrl) ||
      filenameFromContentDisposition(response.headers.get("content-disposition")) ||
      filenameFromUrl(resolvedUrl) ||
      "download";
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = resolvedName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(resolveRuntimeUrl(url), "_blank", "noopener,noreferrer");
  }
};

window.showAssetPreview = async function showAssetPreview(title, url) {
  const panel = document.getElementById("practiceAssetPreviewPanel");
  const titleEl = document.getElementById("practiceAssetPreviewTitle");
  const bodyEl = document.getElementById("practiceAssetPreviewBody");
  const downloadEl = document.getElementById("practiceAssetPreviewDownload");
  if (!panel || !titleEl || !bodyEl || !downloadEl) return;

  titleEl.textContent = normalizeWs(title) || "실습 파일";
  bodyEl.textContent = "불러오는 중...";
  const resolvedUrl = resolveRuntimeUrl(url);
  downloadEl.href = resolvedUrl;
  downloadEl.setAttribute(
    "download",
    lookupStaticDownloadName(resolvedUrl) || filenameFromUrl(resolvedUrl) || ""
  );
  panel.classList.remove("hidden");

  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`preview failed (${response.status})`);
    }
    const text = await response.text();
    bodyEl.textContent = text;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    bodyEl.textContent = "미리보기를 불러오지 못했습니다. 다운로드 버튼으로 파일을 열어 확인해 주세요.";
  }
};

window.hideAssetPreview = function hideAssetPreview() {
  const panel = document.getElementById("practiceAssetPreviewPanel");
  const bodyEl = document.getElementById("practiceAssetPreviewBody");
  if (!panel || !bodyEl) return;
  panel.classList.add("hidden");
  bodyEl.textContent = "";
};

window.copyAssetPreview = async function copyAssetPreview(button) {
  const bodyEl = document.getElementById("practiceAssetPreviewBody");
  if (!bodyEl) return;
  await copyTextWithUiFeedback(button, bodyEl.textContent || "");
};

window.filterNews = function filterNews(category, button) {
  const targetCategory = normalizeWs(category || "all");
  const cards = el.clipBody.querySelectorAll(".news-card");
  const filterButtons = el.clipBody.querySelectorAll(".news-filter-btn");

  cards.forEach((card) => {
    const cardCategory = normalizeWs(card.dataset.cat || "");
    const visible = targetCategory === "all" || targetCategory === cardCategory;
    card.classList.toggle("hidden-by-filter", !visible);
  });

  filterButtons.forEach((btn) => btn.classList.remove("active"));
  if (button) {
    button.classList.add("active");
  }
};

window.filterTools = function filterTools(query) {
  const q = normalizeWs(query || "").toLowerCase();
  const items = el.clipBody?.querySelectorAll(".tool-item") || [];
  items.forEach((item) => {
    const visible = !q || item.textContent.toLowerCase().includes(q);
    item.classList.toggle("hidden-by-filter", !visible);
  });
};

function applyRefFilters() {
  const list = el.clipBody?.querySelector("#refList");
  if (!list) return;
  const cat = normalizeWs(list.dataset.activeCat || "all");
  const search = el.clipBody?.querySelector("#refSearch");
  const q = normalizeWs(search?.value || "").toLowerCase();
  list.querySelectorAll(".ref-link-item").forEach((item) => {
    const catOk = cat === "all" || normalizeWs(item.dataset.cat || "") === cat;
    const textOk = !q || item.textContent.toLowerCase().includes(q);
    item.classList.toggle("hidden-by-filter", !(catOk && textOk));
  });
}

window.filterRefs = function filterRefs() {
  applyRefFilters();
};

window.filterRefCat = function filterRefCat(category, button) {
  const list = el.clipBody?.querySelector("#refList");
  if (list) {
    list.dataset.activeCat = normalizeWs(category || "all");
  }
  const filterButtons = el.clipBody?.querySelectorAll(".news-filter-btn") || [];
  filterButtons.forEach((btn) => btn.classList.remove("active"));
  button?.classList.add("active");
  applyRefFilters();
};

window.toggleContentEditMode = function toggleContentEditMode() {
  onToggleEditMode().catch((error) => setEditorStatus(error.message, true));
};

window.reloadContentEditor = function reloadContentEditor() {
  reloadEditorSource().catch((error) => setEditorStatus(error.message, true));
};

window.saveContentEditor = function saveContentEditor() {
  saveEditorSource().catch((error) => setEditorStatus(error.message, true));
};

window.toggleSidebarEditMode = function toggleSidebarEditMode() {
  onToggleSidebarEditMode().catch((error) => setSidebarEditorStatus(error.message, true));
};

window.reloadSidebarEditor = function reloadSidebarEditor() {
  reloadSidebarSource().catch((error) => setSidebarEditorStatus(error.message, true));
};

window.saveSidebarEditor = function saveSidebarEditor() {
  saveSidebarSource().catch((error) => setSidebarEditorStatus(error.message, true));
};

window.togglePublishMode = function togglePublishMode() {
  onTogglePublishMode().catch((error) => setPublishPanelStatus(error.message, true));
};

window.reloadPublishStatus = function reloadPublishStatus() {
  loadPublishStatus().catch((error) => setPublishPanelStatus(error.message, true));
};

window.publishRootChanges = function publishRootChanges() {
  runPublishRootChanges().catch((error) => setPublishPanelStatus(error.message, true));
};

bindEvents();
applyFontScaleStep(readFontScalePreference()); // 저장된 글자 크기 단계 복원
loadCourseDirectory()
  .catch(() => { })
  .finally(() => {
    tryAutoLogin().catch(() => { });
  });
