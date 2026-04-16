const STORAGE_SESSION_KEY = "ax_literacy_session_token";
const STORAGE_LAST_ID_KEY = "ax_literacy_last_lets_id";
const STORAGE_COURSE_CODE_KEY = "ax_literacy_course_code";
const STORAGE_SIDEBAR_COLLAPSED_KEY = "ax_literacy_sidebar_collapsed";
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
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
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
    return localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED_KEY) === "1";
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

const CLIENT_CATALOG_BLUEPRINTS = [
  {
    chapterId: "ch00",
    chapterCode: "CH00",
    chapterNum: "CH 00",
    title: "과정 안내",
    time: "08:30",
    clips: [
      { clipKey: "ch00-clip01", title: "오늘의 시간표", type: "개요" },
      { clipKey: "ch00-clip02", title: "자사 생성형 AI 서비스 현황", type: "개요" }
    ]
  },
  {
    chapterId: "ch01",
    chapterCode: "CH01",
    chapterNum: "CH 01",
    title: "AI 핵심 개념",
    time: "08:50",
    clips: [
      { clipKey: "ch01-clip01", title: "AI 트렌드", type: "참고" },
      { clipKey: "ch01-clip02", title: "Assistant에서 Agentic AI로", type: "개념" },
      { clipKey: "ch01-clip03", title: "기술 활용 로드맵", type: "개념" },
      { clipKey: "ch01-clip04", title: "개념 다지기", type: "참고" }
    ]
  },
  {
    chapterId: "ch02",
    chapterCode: "CH02",
    chapterNum: "CH 02",
    title: "Gemini & ChatGPT",
    time: "09:30",
    clips: [
      { clipKey: "ch02-clip01", title: "Gemini 소개 및 접속 방법", type: "플랫폼" },
      { clipKey: "ch02-clip02", title: "프롬프팅 기초", type: "실습" },
      { clipKey: "ch02-clip03", title: "비지니스 프롬프팅: AI 회의록", type: "실습" },
      { clipKey: "ch02-clip04", title: "Gems 소개: AI 비서 만들기", type: "실습" },
      { clipKey: "ch02-clip05", title: "ChatGPT 및 GPTs 소개", type: "플랫폼" }
    ]
  },
  {
    chapterId: "ch03",
    chapterCode: "CH03",
    chapterNum: "CH 03",
    title: "NotebookLM",
    time: "13:00",
    clips: [
      { clipKey: "ch03-clip01", title: "NotebookLM 소개 및 문서 기반 AI 연구 도우미", type: "플랫폼" },
      { clipKey: "ch03-clip02", title: "문서 기반 AI 리서치: CIQO와 LG 스타일 브리핑", type: "실습" },
      { clipKey: "ch03-clip03", title: "기업 분석 코스: 열린 주제로 해보는 NotebookLM 분석", type: "실습" }
    ]
  },
  {
    chapterId: "ch04",
    chapterCode: "CH04",
    chapterNum: "CH 04",
    title: "Google AI Studio",
    time: "14:10",
    clips: [
      { clipKey: "ch04-clip01", title: "Google AI Studio 소개 및 접속 방법", type: "설정" },
      { clipKey: "ch04-clip02", title: "바이브 코딩이란", type: "개념" },
      { clipKey: "ch04-clip03", title: "바이브 코딩으로 웹앱 제작하기", type: "실습" }
    ]
  }
];

const CLIENT_RUNTIME_CLIP_OVERRIDE_URLS = {
  "ch00-clip02": "/runtime-overrides/ch00-clip02.html",
  "ch01-clip01": "/runtime-overrides/ch01-clip01.html",
  "ch01-clip02": "/runtime-overrides/ch01-clip02.html"
};

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

function cloneChapter(chapter) {
  return {
    ...chapter,
    clips: Array.isArray(chapter?.clips) ? chapter.clips.map((clip) => ({ ...clip })) : []
  };
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

function buildClientVisibleCatalog(rawChapters) {
  const chapters = Array.isArray(rawChapters) ? rawChapters : [];
  const chapterMap = new Map(
    chapters.map((chapter) => [normalizeWs(chapter.chapterId).toLowerCase(), cloneChapter(chapter)])
  );
  const clipMap = new Map();

  for (const chapter of chapters) {
    for (const clip of chapter.clips || []) {
      clipMap.set(normalizeClipKey(clip.clipKey), { ...clip });
    }
  }

  const customChapterIds = new Set(
    CLIENT_CATALOG_BLUEPRINTS.map((chapter) => normalizeWs(chapter.chapterId).toLowerCase())
  );
  const nextChapters = [];

  for (const blueprint of CLIENT_CATALOG_BLUEPRINTS) {
    const baseChapter = chapterMap.get(normalizeWs(blueprint.chapterId).toLowerCase()) || {};
    const clips = blueprint.clips
      .map((clipBlueprint) => {
        const baseClip = clipMap.get(normalizeClipKey(clipBlueprint.clipKey));
        if (!baseClip) return null;
        return {
          ...baseClip,
          clipKey: clipBlueprint.clipKey,
          title: clipBlueprint.title || baseClip.title,
          type: clipBlueprint.type || baseClip.type,
          chapterId: blueprint.chapterId,
          chapterCode: blueprint.chapterCode || baseChapter.chapterCode || baseClip.chapterCode,
          chapterNum: blueprint.chapterNum || baseChapter.chapterNum || baseClip.chapterNum,
          chapterTitle: blueprint.title || baseChapter.title || baseClip.chapterTitle,
          chapterTime: blueprint.time || baseChapter.time || baseClip.chapterTime || ""
        };
      })
      .filter(Boolean);

    nextChapters.push({
      ...baseChapter,
      chapterId: blueprint.chapterId,
      chapterCode: blueprint.chapterCode || baseChapter.chapterCode,
      chapterNum: blueprint.chapterNum || baseChapter.chapterNum,
      title: blueprint.title || baseChapter.title,
      time: blueprint.time || baseChapter.time || "",
      clips
    });
  }

  for (const chapter of chapters) {
    if (customChapterIds.has(normalizeWs(chapter.chapterId).toLowerCase())) continue;
    const clonedChapter = cloneChapter(chapter);
    if (normalizeWs(clonedChapter.chapterId).toLowerCase() === "ch07") {
      clonedChapter.clips = (clonedChapter.clips || []).filter((clip) => {
        const title = normalizeWs(clip?.title);
        return !["Copilot 참고자료", "실습용 컨텍스트 파일", "AI Readiness 분석"].includes(title);
      });
    }
    nextChapters.push(clonedChapter);
  }

  return nextChapters;
}

function needsClientCatalogPatch(rawChapters) {
  const chapters = Array.isArray(rawChapters) ? rawChapters : [];
  const chapterMap = new Map(
    chapters.map((chapter) => [normalizeWs(chapter.chapterId).toLowerCase(), chapter])
  );
  const ch00 = chapterMap.get("ch00");
  const ch01 = chapterMap.get("ch01");
  const ch02 = chapterMap.get("ch02");
  const ch03 = chapterMap.get("ch03");
  const ch04 = chapterMap.get("ch04");
  const ch01ClipTitles = Array.isArray(ch01?.clips)
    ? ch01.clips.map((clip) => normalizeWs(clip.title))
    : [];
  const ch02ClipTitles = Array.isArray(ch02?.clips)
    ? ch02.clips.map((clip) => normalizeWs(clip.title))
    : [];
  const ch03ClipTitles = Array.isArray(ch03?.clips)
    ? ch03.clips.map((clip) => normalizeWs(clip.title))
    : [];
  const ch04ClipTitles = Array.isArray(ch04?.clips)
    ? ch04.clips.map((clip) => normalizeWs(clip.title))
    : [];
  const ch02PromptingIndex = ch02ClipTitles.findIndex(
    (title) => title === "프롬프팅 기초"
  );
  const ch02BusinessIndex = ch02ClipTitles.findIndex(
    (title) => title === "Gems 소개: AI 비서 만들기"
  );
  const ch02StructuredIndex = ch02ClipTitles.findIndex(
    (title) => title === "비지니스 프롬프팅: AI 회의록"
  );

  return Boolean(
    (Array.isArray(ch00?.clips) && ch00.clips.length !== 2) ||
      (Array.isArray(ch01?.clips) && ch01.clips.length > 4) ||
      (Array.isArray(ch02?.clips) && ch02.clips.length < 5) ||
      (Array.isArray(ch03?.clips) && ch03.clips.length !== 3) ||
      (Array.isArray(ch04?.clips) && ch04.clips.length !== 3) ||
      normalizeWs(ch01?.clips?.[0]?.title) !== "AI 트렌드" ||
      normalizeWs(ch00?.clips?.[1]?.title) !== "자사 생성형 AI 서비스 현황" ||
      ch02ClipTitles.includes("프롬프트 엔지니어링 4가지 원칙") ||
      ch04ClipTitles.includes("경쟁사 리서치 대시보드") ||
      ch01ClipTitles.includes("프롬프트 구조화 하기") ||
      normalizeWs(ch03?.title) !== "NotebookLM" ||
      normalizeWs(ch04?.title) !== "Google AI Studio" ||
      !ch03ClipTitles.includes("문서 기반 AI 리서치: CIQO와 LG 스타일 브리핑") ||
      !ch04ClipTitles.includes("바이브 코딩으로 웹앱 제작하기") ||
      !ch02ClipTitles.includes("비지니스 프롬프팅: AI 회의록") ||
      ch02StructuredIndex !== ch02PromptingIndex + 1 ||
      ch02BusinessIndex !== ch02StructuredIndex + 1
  );
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

    const titleNode = doc.querySelector(".clip-header .clip-title");
    if (titleNode && sidebarClip.title) {
      titleNode.textContent = sidebarClip.title;
    }

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

  if (needsTimetableFix) {
    const timetableAnchors = Array.from(doc.querySelectorAll(".comparison-table tbody a"));
    timetableAnchors.forEach((anchor) => {
      const text = String(anchor.textContent || "").replace(/\s+/g, " ").trim();
      if (text === "CH02: NotebookLM" || text === "CH03: NotebookLM") {
        anchor.setAttribute("href", "#ch03-clip01");
        anchor.textContent = "CH03: NotebookLM";
        return;
      }
      if (text === "CH03: Google AI Studio" || text === "CH04: Google AI Studio") {
        anchor.setAttribute("href", "#ch04-clip01");
        anchor.textContent = "CH04: Google AI Studio";
        return;
      }
      if (text === "CH04: Hi-D Code" || text === "CH05: Hi-D Code") {
        anchor.setAttribute("href", "#ch05-clip01");
        anchor.textContent = "CH05: Hi-D Code";
        return;
      }
      if (text === "CH04: Key Takeaways & Q/A" || text === "CH06: Key Takeaways & Q/A") {
        anchor.setAttribute("href", "#ch06-clip01");
        anchor.textContent = "CH06: Key Takeaways & Q/A";
        return;
      }
      if (text === "CH07: 참고자료 라이브러리" || text === "CH08: 참고자료 라이브러리") {
        anchor.setAttribute("href", "#ch07-clip09");
        anchor.textContent = "CH07: 참고자료 라이브러리";
      }
    });
  }

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
  if (STATIC_MODE) {
    return apiStatic(path, options);
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

async function apiStatic(path, options = {}) {
  const normalizedPath = String(path || "");
  const method = String(options.method || "GET").toUpperCase();

  const fetchJson = async (url) => {
    const response = await fetch(resolveRuntimeUrl(url));
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
  el.clipBody.classList.toggle("direct-edit-enabled", liveEditEnabled);
  if (liveEditEnabled) {
    annotateLiveEditorNodes(el.clipBody, html);
  }
  enhanceClipBody();
  wireClipInteractions();
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

function onClipBodyDirectEditDoubleClick(event) {
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

function updateEditorVisibility() {
  const showEditorControls = Boolean(state.isAdmin);
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

function updateProgressBadge() {
  const all = getAllClips();
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

const STYLE_TONE_PRESETS = {
  minimal: {
    label: "Minimal",
    accent: "#35517f",
    accentSoft: "rgba(53, 81, 127, 0.18)",
    identity: "절제된 무채색, 얇은 선, 조용한 업무용 화면",
    defaultPalette: "white, off-white, blue gray, muted navy",
    colorTip:
      "색을 따로 요청하지 않으면 white / off-white / blue-gray 기반의 절제된 팔레트를 쓰고, 포인트는 1개만 둔다."
  },
  scandinavian: {
    label: "Scandinavian",
    accent: "#b58957",
    accentSoft: "rgba(181, 137, 87, 0.22)",
    identity: "웜 뉴트럴, 부드러운 카드, 생활 브랜드 같은 안정감",
    defaultPalette: "warm white, oatmeal, sand, muted brown",
    colorTip:
      "색을 따로 지정하지 않으면 warm white / sand / muted brown 중심으로 간다. 브랜드 색을 넣더라도 톤은 부드럽게 유지합니다."
  },
  brutal: {
    label: "Neo Brutal",
    accent: "#111111",
    accentSoft: "rgba(255, 87, 179, 0.22)",
    identity: "두꺼운 보더, 평면 색 블록, 공격적인 대비",
    defaultPalette: "yellow, cyan, lime, black, hot pink",
    colorTip:
      "Neo Brutal은 기본적으로 원색 대비를 전제합니다. 색을 따로 말하지 않으면 yellow / cyan / lime / black 계열을 과감하게 쓴다."
  },
  poster: {
    label: "Poster",
    accent: "#f2f2f2",
    accentSoft: "rgba(255, 255, 255, 0.16)",
    identity: "다크 바탕, 에디토리얼 타이포, 강한 명암과 장면 연출",
    defaultPalette: "black, charcoal, white, one bold accent",
    colorTip:
      "Poster 계열은 다크 배경과 강한 명암이 기본입니다. 색을 별도 요청하지 않으면 black / charcoal / white 중심에 포인트 1개만 얹는다."
  },
  lg: {
    label: "LG Style",
    accent: "#a50034",
    accentSoft: "rgba(165, 0, 52, 0.16)",
    identity: "화이트 기반, 회색 중심 타이포, 절제된 LG red 포인트, 엔터프라이즈 기술 브랜드 톤",
    defaultPalette: "white, light gray, charcoal, LG red accent",
    colorTip:
      "색을 따로 요청하지 않으면 white / light gray / charcoal을 기본으로 두고, LG red는 CTA와 핵심 강조 1~2곳에만 제한적으로 쓰는 편이 안정적입니다."
  }
};

const STYLE_GRAMMAR_PRESETS = {
  grid: {
    label: "Grid",
    structure: "strict aligned grid, table-like sections, even gutters, disciplined spacing",
    outcome: "숫자와 비교표가 많은 보고서형 화면"
  },
  system: {
    label: "System",
    structure: "modular cards, side navigation or utility rail, panels that feel like a real work tool",
    outcome: "사내 포털과 업무 앱에 가까운 도구형 화면"
  },
  pop: {
    label: "Pop",
    structure: "high-emphasis hero, CTA-led blocks, obvious focal points, quick demo readability",
    outcome: "데모, 프로토타입, 이벤트형 앱에 강한 강조형 화면"
  },
  stage: {
    label: "Stage",
    structure: "large editorial type, scene-like composition, dramatic section breaks, presentation-first hierarchy",
    outcome: "메시지와 장면 연출이 먼저 읽히는 발표형 화면"
  }
};

const STYLE_PROMPT_MATRIX_LIBRARY = [
  {
    title: "Minimal Grid",
    tone: "minimal",
    grammar: "grid",
    useCase: "임원용 경쟁사 대시보드",
    cues: ["흰 배경", "얇은 규칙선", "정렬된 KPI와 표"],
    avoid: ["장식용 일러스트", "과한 그라데이션"]
  },
  {
    title: "Minimal System",
    tone: "minimal",
    grammar: "system",
    useCase: "사내 분석 도구와 운영 포털",
    cues: ["모듈 카드", "조용한 내비게이션", "기능 중심 패널"],
    avoid: ["불필요한 모션", "과도한 브랜드 장식"]
  },
  {
    title: "Minimal Pop",
    tone: "minimal",
    grammar: "pop",
    useCase: "핵심 KPI를 빠르게 보여주는 데모 앱",
    cues: ["포인트 CTA 1개", "절제된 배경", "핵심 카드 강조"],
    avoid: ["색상 남용", "복잡한 장식 패턴"]
  },
  {
    title: "Minimal Stage",
    tone: "minimal",
    grammar: "stage",
    useCase: "발표 첫 화면과 비전 소개용 웹 화면",
    cues: ["큰 타이포", "넓은 여백", "담백한 히어로"],
    avoid: ["과장된 3D 그래픽", "잡다한 보조 정보"]
  },
  {
    title: "Scandinavian Grid",
    tone: "scandinavian",
    grammar: "grid",
    useCase: "따뜻한 톤의 리서치 보드",
    cues: ["웜 뉴트럴", "소프트 룰", "리포트 감성"],
    avoid: ["차가운 네온톤", "딱딱한 금속 질감"]
  },
  {
    title: "Scandinavian System",
    tone: "scandinavian",
    grammar: "system",
    useCase: "생활 브랜드 같은 내부 업무 도구",
    cues: ["부드러운 카드", "자연스러운 간격", "편안한 사용감"],
    avoid: ["위협적인 대비", "공격적 CTA"]
  },
  {
    title: "Scandinavian Pop",
    tone: "scandinavian",
    grammar: "pop",
    useCase: "온화하지만 산뜻한 서비스 소개형 앱",
    cues: ["웜 포인트 컬러", "친근한 버튼", "부드러운 대비"],
    avoid: ["브루탈식 검은 보더", "광고 같은 과장 문구"]
  },
  {
    title: "Scandinavian Stage",
    tone: "scandinavian",
    grammar: "stage",
    useCase: "브랜드 비전과 스토리텔링 발표 화면",
    cues: ["따뜻한 히어로", "넓은 숨", "차분한 서사"],
    avoid: ["극단적 명암", "딱딱한 데이터 보드"]
  },
  {
    title: "Neo Brutal Grid",
    tone: "brutal",
    grammar: "grid",
    useCase: "교육용 실습 대시보드",
    cues: ["두꺼운 경계", "선명한 블록", "데이터 펀치감"],
    avoid: ["얇은 회색 선", "무난한 회사 템플릿"]
  },
  {
    title: "Neo Brutal System",
    tone: "brutal",
    grammar: "system",
    useCase: "데모용 관리 앱과 운영 콘솔",
    cues: ["굵은 유틸리티", "평면 색", "강한 CTA"],
    avoid: ["잔잔한 뉴트럴", "은은한 그림자 중심 UI"]
  },
  {
    title: "Neo Brutal Pop",
    tone: "brutal",
    grammar: "pop",
    useCase: "짧고 강한 메시지의 이벤트형 앱",
    cues: ["검은 보더", "강한 대비", "직설적 CTA"],
    avoid: ["얌전한 톤다운", "세밀한 장식"]
  },
  {
    title: "Neo Brutal Stage",
    tone: "brutal",
    grammar: "stage",
    useCase: "런칭형 히어로와 충격적인 첫 화면",
    cues: ["대문짝 타이포", "굵은 프레임", "무대감"],
    avoid: ["잔잔한 정보 위계", "작은 본문 위주 구성"]
  },
  {
    title: "Poster Grid",
    tone: "poster",
    grammar: "grid",
    useCase: "시연용 브리핑 보드",
    cues: ["큰 대비", "구조화된 정보 보드", "포스터형 제목"],
    avoid: ["밋밋한 중간톤", "평범한 SaaS 카드"]
  },
  {
    title: "Poster System",
    tone: "poster",
    grammar: "system",
    useCase: "기능과 메시지를 함께 밀어야 하는 에디토리얼 앱",
    cues: ["에디토리얼 UI", "다크 베이스", "서사형 블록"],
    avoid: ["흔한 관리도구 느낌", "밝은 저대비 테마"]
  },
  {
    title: "Poster Pop",
    tone: "poster",
    grammar: "pop",
    useCase: "제품 데모와 이벤트용 마이크로 앱",
    cues: ["광고형 문구", "강한 포인트 색", "빠른 임팩트"],
    avoid: ["설명 위주 장문", "조용한 화면 전개"]
  },
  {
    title: "Poster Stage",
    tone: "poster",
    grammar: "stage",
    useCase: "런칭형 마이크로사이트와 강한 시연 화면",
    cues: ["대형 타이포", "강한 블록", "몰입형 장면"],
    avoid: ["잔잔한 비즈니스 카드", "얇은 보고서형 배치"]
  },
  {
    title: "LG Style",
    tone: "lg",
    grammar: "system",
    useCase: "임원용 AI 브리핑 대시보드와 사내 포털",
    cues: ["LG red accent", "gray-led typography", "restrained enterprise cards"],
    avoid: ["네온 글로우", "과한 브루탈 보더"]
  }
];

function buildWebStylePromptSlide(entry, index) {
  const tone = STYLE_TONE_PRESETS[entry.tone];
  const grammar = STYLE_GRAMMAR_PRESETS[entry.grammar];
  const cuesText = entry.cues.join(", ");
  const avoidText = entry.avoid.join(", ");
  const isLgTone = entry.tone === "lg";
  const quickPrompt = isLgTone
    ? "LG Style로, 임원용 AI 브리핑 대시보드를 만들어줘. 흰 배경과 밝은 회색 베이스를 유지하고, 타이포는 회색 중심으로 정돈하며, LG red는 CTA와 핵심 강조에만 제한적으로 써줘. 카드 간 간격은 넉넉하게 두고, 과한 네온 효과·브루탈 보더·스타트업식 장식은 피해서 엔터프라이즈 기술 브랜드처럼 정리해줘."
    : `${entry.title} 스타일로 ${entry.useCase} 웹 화면을 만들어줘. ${cuesText}를 먼저 보이게 하고, ${avoidText}는 피해서 정리해줘. 색은 따로 지정하지 않으면 ${tone.defaultPalette} 톤으로 잡아줘.`;
  const fullPrompt = isLgTone
    ? [
        "Create a polished responsive enterprise web interface for an internal AI briefing dashboard.",
        "",
        "Brand interpretation",
        "- Overall style: LG Style",
        `- Tone family: ${tone.label} (${tone.identity})`,
        `- Layout grammar: ${grammar.label} (${grammar.structure})`,
        "- Treat the LG logo only as a reference for brand character, not as a giant hero graphic.",
        "- The interface should feel like a credible internal product used by executives and strategy teams.",
        "",
        "Visual direction",
        "- Use a white or very light gray base with charcoal and gray-led typography.",
        "- Use LG red (#a50034) only for CTA, progress, status, or one focal accent at a time.",
        "- Prefer clean cards, generous whitespace, thin borders, and subtle shadows over flashy visual tricks.",
        `- Visual cues to emphasize: ${cuesText}`,
        `- Avoid: ${avoidText}`,
        "",
        "Layout requirements",
        `- Make the structure clearly read as ${grammar.outcome}.`,
        "- Use a clean header, one focused working area, and restrained support panels.",
        "- Keep copy concise, executive-friendly, and easy to scan in three seconds.",
        "- Make the page feel like a production-minded React or HTML/CSS/JS app, not a poster-only mockup.",
        "",
        "Color guidance",
        `- If I do not specify colors, default to ${tone.defaultPalette}.`,
        "- Keep the palette mostly neutral and let LG red appear only as a controlled accent.",
        "- Do not flood the background with saturated red.",
        "",
        "Output guidance",
        "- Return a distinctive but restrained enterprise UI concept.",
        "- The first impression should read as LG-style technology brand, not generic SaaS or startup demo."
      ].join("\n")
    : [
        `Create a polished responsive web interface for ${entry.useCase}.`,
        "",
        `Style direction`,
        `- Overall style: ${entry.title}`,
        `- Tone family: ${tone.label} (${tone.identity})`,
        `- Layout grammar: ${grammar.label} (${grammar.structure})`,
        `- Visual cues to emphasize: ${cuesText}`,
        `- Avoid: ${avoidText}`,
        "",
        `Layout requirements`,
        `- Keep the page usable as a realistic web app, not a poster-only mockup.`,
        `- Use a clear header, one main working area, and support panels that match ${grammar.outcome}.`,
        `- Make the hierarchy obvious within 3 seconds when the screen first loads.`,
        `- Keep copy concise and executive-friendly.`,
        "",
        `Color guidance`,
        `- If I do not specify brand colors, use the default ${tone.label} palette: ${tone.defaultPalette}.`,
        `- If brand colors are required, keep them constrained so the ${tone.label} mood still survives.`,
        "",
        `Output guidance`,
        `- Return a production-minded web UI concept that could be implemented in HTML/CSS/JS or React.`,
        `- Make the interface feel intentional and visually distinctive instead of generic SaaS.`,
        `- The first impression should clearly read as ${entry.title}.`
      ].join("\n");
  const infoBlocks = isLgTone
    ? [
        {
          title: "색상 팁",
          items: [
            tone.colorTip,
            "로고의 빨간색을 화면 전체 배경으로 확장하지 말고, CTA와 핵심 상태 강조에만 쓰는 편이 더 LG답습니다."
          ]
        },
        {
          title: "브랜드 해석",
          items: [
            "사내 브리핑과 엔터프라이즈 제품 같은 신뢰감을 먼저 보여주세요.",
            "회색 중심 타이포, 얇은 선, 넓은 여백, 절제된 카드 구조가 기본입니다."
          ]
        },
        {
          title: "언제 쓰나",
          items: [
            "임원용 AI 대시보드, 전략 브리핑, 내부 포털처럼 브랜드 신뢰감이 중요한 화면일 때",
            "4×4 매트릭스로 구조를 고른 뒤 마지막 브랜드 모드로 마감하고 싶을 때"
          ]
        }
      ]
    : [
        {
          title: "색상 팁",
          items: [
            tone.colorTip,
            "브랜드 컬러를 강하게 써야 할 때만 추가로 색을 지정하고, 그렇지 않으면 톤 패밀리 기본 팔레트를 믿는 편이 안정적입니다."
          ]
        },
        {
          title: "언제 쓰나",
          items: [
            `${entry.useCase}처럼 화면 목적이 분명할 때`,
            `${grammar.label} 문법을 먼저 고르고 톤은 ${tone.label}로 확정하고 싶을 때`
          ]
        }
      ];

  return {
    eyebrow: `${String(index + 1).padStart(2, "0")} / ${entry.title}`,
    title: entry.title,
    summary: isLgTone
      ? "LG 로고와 브랜드 톤을 참고해, 임원용 브리핑 화면과 사내 포털에 바로 쓸 수 있는 브랜드 프롬프트로 정리한 버전입니다."
      : `${entry.useCase}에 바로 적용할 수 있는 ${tone.label} × ${grammar.label} prompt. 카드에서 보이는 프리뷰 구성을 실제 화면 프롬프트로 풀어쓴 버전입니다.`,
    themeTone: entry.tone,
    themeGrammar: entry.grammar,
    stylePreview: {
      toneLabel: tone.label,
      grammarLabel: grammar.label,
      useCase: entry.useCase,
      logoSrc: isLgTone ? withBase("/assets/reference/lg-logo.png") : "",
      logoAlt: isLgTone ? "LG logo reference" : ""
    },
    bullets: [
      `Tone family: ${tone.label} — ${tone.identity}`,
      `Layout grammar: ${grammar.label} — ${grammar.outcome}`,
      `Visual cues: ${cuesText}`,
      `Avoid: ${avoidText}`
    ],
    signals: isLgTone ? [tone.label, grammar.label, "LG red", "Enterprise", "White base"] : [tone.label, grammar.label, ...entry.cues],
    infoBlocks,
    promptBlocks: [
      { label: "바로 써보는 예제 프롬프트", body: quickPrompt },
      { label: "Gemini / ChatGPT Full Prompt", body: fullPrompt }
    ],
    accent: tone.accent,
    accentSoft: tone.accentSoft
  };
}


const SLIDE_DECK_BUILDERS = {
  "agentic-physical-ecosystem": buildAgenticPhysicalEcosystemDeck,
  "industry-landscape": buildIndustryLandscapeDeck,
  "assistant-agentic-spectrum": buildAssistantAgenticSpectrumDeck,
  "prompt-context-workflow": buildPromptContextWorkflowDeck,
  "tech-utilization-roadmap": buildTechUtilizationRoadmapDeck,
  "concept-foundation-guide": buildConceptFoundationGuideDeck,
  "gemini-access-roadshow": buildGeminiAccessRoadshowDeck,
  "gemini-screen-quick-tour": buildGeminiScreenQuickTourDeck,
  "business-prompting-workshop": buildBusinessPromptingWorkshopDeck,
  "gemini-gems-roadshow": buildGeminiGemsRoadshowDeck,
  "gems-create-steps": buildGemsCreateStepsDeck,
  "ciqo-executive-briefing": buildCiqoExecutiveBriefingDeck,
  "enterprise-research-workflow": buildEnterpriseResearchWorkflowDeck,
  "ai-studio-api-principles": buildAiStudioApiPrinciplesDeck,
  "vibe-coding-shift": buildVibeCodingShiftDeck,
  "executive-app-build-sprint": buildExecutiveAppBuildSprintDeck,
  "web-style-prompt-library": buildWebStylePromptLibraryDeck
};

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

function buildIndustryLandscapeDeck() {
  const basePath = withBase("/assets/notebooklm/industry-briefing");

  return {
    id: "industry-landscape",
    kicker: "NotebookLM PDF",
    title: "2026 LG AX Strategic Briefing",
    subtitle: "NotebookLM에서 생성한 슬라이드 PDF 다운로드본",
    downloadUrl: withBase("/assets/notebooklm/2026-lg-ax-strategic-briefing.pdf"),
    downloadFilename: "2026-lg-ax-strategic-briefing.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "00 / Cover",
        title: "2026 엔터프라이즈 AI 산업동향 및 LG AX 전략 브리핑",
        imageSrc: `${basePath}/slide-1.jpg`,
        imageAlt: "NotebookLM 슬라이드 표지"
      },
      {
        eyebrow: "01 / Executive Thesis",
        title: "Executive Thesis",
        imageSrc: `${basePath}/slide-2.jpg`,
        imageAlt: "Executive Thesis 슬라이드"
      },
      {
        eyebrow: "02 / ROI Gap",
        title: "ROI Gap",
        imageSrc: `${basePath}/slide-3.jpg`,
        imageAlt: "ROI Gap 슬라이드"
      },
      {
        eyebrow: "03 / Business Reset",
        title: "Business Reset",
        imageSrc: `${basePath}/slide-4.jpg`,
        imageAlt: "Business Reset 슬라이드"
      },
      {
        eyebrow: "04 / Agent/Vibe Coding Shift",
        title: "Agent/Vibe Coding Shift",
        imageSrc: `${basePath}/slide-5.jpg`,
        imageAlt: "Agent and Vibe Coding Shift 슬라이드"
      },
      {
        eyebrow: "05 / Model Race",
        title: "Model Race",
        imageSrc: `${basePath}/slide-6.jpg`,
        imageAlt: "Model Race 슬라이드"
      },
      {
        eyebrow: "06 / Governance & AI Literacy",
        title: "Governance & AI Literacy",
        imageSrc: `${basePath}/slide-7.jpg`,
        imageAlt: "Governance and AI Literacy 슬라이드"
      },
      {
        eyebrow: "07 / Next 90 Days",
        title: "Next 90 Days",
        imageSrc: `${basePath}/slide-8.jpg`,
        imageAlt: "Next 90 Days 슬라이드"
      }
    ]
  };
}

function buildAgenticPhysicalEcosystemDeck() {
  const basePath = withBase("/assets/notebooklm/ch00-ai-ecosystem");
  const accent = "#a50034";
  const accentSoft = "rgba(165, 0, 52, 0.16)";

  const sources = {
    reutersShow: {
      label: "Reuters | 춘절 로봇 공연",
      url: "https://www.reuters.com/business/media-telecom/chinas-humanoid-robots-ready-lunar-new-year-showtime-2026-02-16/"
    },
    reutersVideo: {
      label: "Reuters Video | 춘절 로봇 영상",
      url: "https://www.reuters.com/video/watch/idRW638718022026RP1/"
    },
    youtubeSpring: {
      label: "YouTube | 춘절 갈라",
      url: "https://www.youtube.com/watch?v=XYAbHFcq5yw"
    },
    googleGemini: {
      label: "Google | Gemini 3.1 Pro",
      url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/"
    },
    googleFlow: {
      label: "Google | Flow + Veo",
      url: "https://blog.google/innovation-and-ai/products/google-flow-veo-ai-filmmaking-tool/"
    },
    nvidiaGr00t: {
      label: "NVIDIA | Isaac GR00T N1",
      url: "https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks"
    },
    nvidiaRobotics: {
      label: "NVIDIA | Physical AI 생태계",
      url: "https://nvidianews.nvidia.com/news/nvidia-and-global-robotics-leaders-take-physical-ai-to-the-real-world"
    },
    nvidiaCosmos: {
      label: "NVIDIA | Cosmos World Foundation Models",
      url: "https://developer.nvidia.com/blog/scale-synthetic-data-and-physical-ai-reasoning-with-nvidia-cosmos-world-foundation-models/"
    },
    mckinseyGenai: {
      label: "McKinsey | GenAI 경제성",
      url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier"
    },
    walmartAgentic: {
      label: "Walmart | Agentic Future",
      url: "https://corporate.walmart.com/news/2025/05/29/inside-walmarts-strategy-for-building-an-agentic-future"
    },
    walmartGoogle: {
      label: "Walmart x Google",
      url: "https://corporate.walmart.com/news/2026/01/11/walmart-and-google-turn-ai-discovery-into-effortless-shopping-experiences"
    },
    eyCeo: {
      label: "EY | CEO Outlook 2026",
      url: "https://www.ey.com/en_no/ceo/ceo-outlook-global-report"
    },
    eyAgentic: {
      label: "EY | Agentic AI in Retail",
      url: "https://www.ey.com/en_id/insights/retail/how-consumer-products-and-retail-players-can-lead-with-agentic-ai"
    },
    koreaHeraldExaone: {
      label: "Korea Herald | EXAONE",
      url: "https://www.koreaherald.com/article/10652980"
    },
    digitalCommerceLg: {
      label: "Digital Commerce 360 | LG B2B AI",
      url: "https://www.digitalcommerce360.com/2026/01/08/lg-electronics-b2b-ai-growth-2026/"
    },
    tcVibeAcquisition: {
      label: "TechCrunch | Base44",
      url: "https://techcrunch.com/2025/06/18/6-month-old-solo-owned-vibe-coder-base44-sells-to-wix-for-80m-cash/"
    },
    tcYcAiCode: {
      label: "TechCrunch | YC AI Codebases",
      url: "https://techcrunch.com/2025/03/06/a-quarter-of-startups-in-ycs-current-cohort-have-codebases-that-are-almost-entirely-ai-generated/"
    },
    builderCli: {
      label: "Builder.io | AI coding tools",
      url: "https://www.builder.io/blog/cursor-vs-claude-code"
    },
    menloGenai: {
      label: "Menlo Ventures | Enterprise GenAI",
      url: "https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/"
    }
  };

  const slide = (eyebrow, title, summary, bullets, slideSources, infoBlocks = []) => ({
    eyebrow,
    title,
    summary,
    bullets,
    sources: slideSources,
    infoBlocks,
    accent,
    accentSoft
  });

  return {
    id: "agentic-physical-ecosystem",
    kicker: "NotebookLM Source-Grounded Deck",
    title: "AI로 진화하는 산업 생태계",
    subtitle: "Agentic에서 Physical까지, 2026년 초 산업 변화를 리더 관점으로 읽는 22장 브리핑",
    downloadUrl: `${basePath}/agentic-to-physical-ai.pdf`,
    downloadFilename: "agentic-to-physical-ai.pdf",
    downloadLabel: "다운로드",
    previewColumns: 1,
    previewClass: "preview-theme-lg-ecosystem",
    sheetClass: "deck-theme-lg-ecosystem",
    previewSlides: [
      {
        slideIndex: 0,
        pageLabel: "22장",
        eyebrow: "리더 브리핑",
        title: "AI로 진화하는 산업 생태계: Agentic에서 Physical까지",
        imageAlt: "AI로 진화하는 산업 생태계 슬라이드 표지"
      }
    ],
    slides: [
      {
        eyebrow: "01 / Cover",
        title: "AI로 진화하는 산업 생태계",
        imageSrc: `${basePath}/slide-01.jpg`,
        imageAlt: "NotebookLM에서 내려받은 AI로 진화하는 산업 생태계 표지 슬라이드"
      },
      slide(
        "02 / Why Now",
        "왜 지금 리더가 이 흐름을 읽어야 할까요",
        "AI는 더 이상 모델 성능 경쟁만의 이슈가 아닙니다. 제품, 조직, 고객 접점, 물리 세계까지 산업의 운영체계를 다시 쓰고 있습니다.",
        [
          "2026년 초 신호는 Agentic AI와 Physical AI가 동시에 전면화되고 있음을 보여줍니다.",
          "차별화 포인트는 범용 모델 그 자체보다 데이터, 도메인 지식, 실행력으로 이동하고 있습니다.",
          "지금 필요한 결정은 도입 여부가 아니라 무엇을 내재화하고 어디서 속도를 낼지입니다."
        ],
        [sources.mckinseyGenai, sources.eyCeo],
        [{ title: "리더 질문", items: ["우리는 어디에서 AI를 비용 절감이 아닌 구조 혁신에 연결할 것인가", "우리 데이터와 현장 지식은 어디까지 전략 자산으로 보호되고 있는가"] }]
      ),
      slide(
        "03 / February 2026",
        "2026년 2월, AI는 어떤 장면으로 등장했을까요",
        "한 달 안에 휴머노이드 공연, 고도화된 추론 모델, 멀티모달 제작 도구, 에이전트형 업무 재설계가 한 화면에 겹쳐 나타났습니다.",
        [
          "Physical AI는 공연과 시연을 통해 대중 전면으로 올라왔습니다.",
          "멀티모달 모델은 영화와 콘텐츠 생산방식을 다시 묻기 시작했습니다.",
          "기업 현장에서는 Agentic AI를 업무 흐름에 넣으려는 압력이 동시에 커졌습니다."
        ],
        [sources.reutersShow, sources.googleGemini, sources.googleFlow],
        [{ title: "핵심 시그널", items: ["보여주기 단계가 아니라 사업 운영 단계로 이동 중입니다", "소프트웨어와 로보틱스가 같은 서사로 묶이기 시작했습니다"] }]
      ),
      slide(
        "04 / Humanoid Moment",
        "춘절 공연의 휴머노이드는 왜 상징적일까요",
        "중국 춘절 무대에서 인간 공연자와 자연스럽게 어우러지는 휴머노이드 장면은 Physical AI가 대중의 상상에서 현실의 제품 경험으로 넘어가고 있음을 상징합니다.",
        [
          "로봇은 더 이상 공장 안 기계가 아니라 미디어 이벤트의 주연으로 등장했습니다.",
          "사람은 로봇의 성능보다 자연스러운 협업 장면에 더 크게 반응했습니다.",
          "리더에게 중요한 것은 기술 그 자체보다 사회가 받아들이는 임계점입니다."
        ],
        [sources.reutersShow, sources.reutersVideo, sources.youtubeSpring],
        [{ title: "리더 포인트", items: ["시장 전환은 성능 수치보다 경험 장면이 만듭니다", "Physical AI는 브랜드와 서비스 전략까지 바꿀 수 있습니다"] }]
      ),
      slide(
        "05 / Long Arc",
        "하지만 이것은 갑자기 생긴 일이 아닙니다",
        "휴머노이드 장면은 10년 이상 누적된 로보틱스 투자, 시뮬레이션, 제어, 센서, 데이터 축적의 결과입니다.",
        [
          "Physical AI의 도약은 긴 투자 주기를 견딘 기업에게 먼저 돌아갑니다.",
          "로보틱스는 시연이 반복될수록 실제 활용을 위한 데이터와 운영 노하우가 쌓입니다.",
          "지속 투자와 기술 내재화가 결국 진입장벽이 됩니다."
        ],
        [sources.nvidiaGr00t, sources.nvidiaRobotics],
        [{ title: "보는 관점", items: ["화려한 데모보다 축적된 인프라를 보셔야 합니다", "10년을 견딘 투자만이 Physical AI의 출발점이 됩니다"] }]
      ),
      slide(
        "06 / CES to Ecosystem",
        "CES와 NVIDIA가 보여준 것은 제품이 아니라 생태계입니다",
        "휴머노이드 로봇, 월드 모델, 시뮬레이터, 합성 데이터가 한 세트로 묶이면서 Physical AI는 단일 제품이 아니라 학습 생태계로 진화하고 있습니다.",
        [
          "Foundation model과 simulator, synthetic data가 함께 움직입니다.",
          "로보틱스 경쟁력은 하드웨어 단독이 아니라 학습 파이프라인에서 나옵니다.",
          "Physical AI는 제조, 물류, 서비스 현장을 연결하는 플랫폼 경쟁이 됩니다."
        ],
        [sources.nvidiaGr00t, sources.nvidiaRobotics, sources.nvidiaCosmos],
        [{ title: "산업 해석", items: ["하드웨어 기업도 데이터 기업이 되어야 합니다", "디지털 인프라와 물리 인프라가 같은 전략 언어로 묶입니다"] }]
      ),
      slide(
        "07 / Agentic Shock",
        "Agentic AI는 소프트웨어 산업에 어떤 충격을 주고 있을까요",
        "AI가 답변을 넘어서 계획하고 실행하는 단계로 가면서, 기존 SaaS의 일부는 기능이 아니라 워크플로 자체를 다시 증명해야 하는 상황에 놓였습니다.",
        [
          "단순 기능형 소프트웨어는 에이전트 안으로 흡수될 위험이 커지고 있습니다.",
          "기업 고객은 툴 하나보다 목표 달성형 자동화를 기대하기 시작했습니다.",
          "SaaS의 경쟁축은 화면 수가 아니라 업무 대행 수준으로 이동합니다."
        ],
        [sources.walmartAgentic, sources.eyAgentic, sources.menloGenai],
        [{ title: "리더 질문", items: ["우리 서비스는 기능을 제공하는가, 결과를 내는가", "고객이 AI 에이전트로 대체할 수 있는 영역은 어디인가"] }]
      ),
      slide(
        "08 / Vibe Coding",
        "바이브 코딩은 개발자의 역할을 어떻게 바꾸고 있을까요",
        "비전문가도 언어 모델과 대화하며 코드를 만들기 시작했고, 개발자의 역할은 구현자만이 아니라 방향 설정자, 품질 판단자, 최종 책임자로 더 선명해지고 있습니다.",
        [
          "속도는 비약적으로 빨라졌지만 품질 판단과 책임은 더 중요해졌습니다.",
          "아이디어를 바로 앱으로 검증하는 조직이 실험 속도에서 앞서갑니다.",
          "개발자는 코드를 모두 쓰는 사람이 아니라 좋은 시스템을 설계하는 사람으로 이동합니다."
        ],
        [sources.tcVibeAcquisition, sources.tcYcAiCode, sources.builderCli],
        [{ title: "조직 변화", items: ["업무와 개발의 경계가 빠르게 낮아집니다", "리더는 실험 수를 늘리되 품질 게이트를 더 명확히 해야 합니다"] }]
      ),
      slide(
        "09 / Multimodal Content",
        "멀티모달 생성은 영화와 콘텐츠 산업을 왜 긴장시키고 있을까요",
        "짧은 자연어 명령만으로 영상 장면을 설계하고 제작하는 흐름이 현실화되면서, 제작 프로세스의 비용 구조와 역할 분담이 빠르게 재편되고 있습니다.",
        [
          "콘텐츠 제작의 병목이 촬영보다 기획과 판단으로 이동합니다.",
          "소규모 팀도 이전보다 훨씬 큰 표현력을 확보할 수 있습니다.",
          "브랜드는 제작 능력보다 세계관과 품질 기준을 더 분명히 가져야 합니다."
        ],
        [sources.googleFlow],
        [{ title: "임원 관점", items: ["콘텐츠 조직은 제작 인력 구조보다 편집 판단 체계를 먼저 재정의해야 합니다", "생성 속도가 빨라질수록 브랜드 리스크 관리가 중요해집니다"] }]
      ),
      slide(
        "10 / Model Ecosystem",
        "모델 생태계는 경쟁만이 아니라 협력도 함께 커지고 있습니다",
        "기업들은 자체 모델을 강화하는 동시에 타사 모델을 제품 안에 넣는 협력도 병행하고 있습니다. 전략은 단일 모델 승부보다 조합 설계로 이동합니다.",
        [
          "자체 모델은 주권과 차별화의 수단이 됩니다.",
          "외부 모델 협력은 속도와 시장 대응력을 높여줍니다.",
          "결국 중요한 것은 모델 하나보다 어떤 경험과 운영체계를 조합하느냐입니다."
        ],
        [sources.googleGemini, sources.walmartGoogle, sources.koreaHeraldExaone],
        [{ title: "핵심 포인트", items: ["경쟁과 협력이 동시에 일어나는 구조입니다", "리더는 무엇을 직접 만들고 무엇을 연결할지 정해야 합니다"] }]
      ),
      slide(
        "11 / Early Field Adoption",
        "산업 현장의 AI Agent 적용은 아직 초기 단계입니다",
        "열기는 크지만 실제 현장에서는 여전히 PoC, 파일럿, 제한된 워크플로 도입이 중심입니다. 그래서 지금이 표준을 선점할 기회가 됩니다.",
        [
          "많은 조직이 아직 업무 재설계보다 실험 검증 단계에 머물러 있습니다.",
          "현장 확산을 막는 요인은 기술보다 데이터, 책임 구조, 운영 설계입니다.",
          "초기 단계이기 때문에 지금의 실행 경험이 곧 내일의 격차가 됩니다."
        ],
        [sources.menloGenai, sources.eyCeo, sources.walmartAgentic],
        [{ title: "실행 포인트", items: ["PoC를 끝내고 업무 단위 확장 기준을 만드세요", "도입 속도보다 적용 책임과 성과 정의가 중요합니다"] }]
      ),
      slide(
        "12 / Human Intent",
        "인간의 의지는 어떻게 AI 단계로 번역될까요",
        "인간은 사물을 인식하고, 무언가를 만들고, 대신 행동하게 하고, 결국 현실 세계에서 물리적 결과를 기대합니다. AI의 진화도 같은 순서로 이어집니다.",
        [
          "인식형 AI는 무엇인지 말합니다.",
          "생성형 AI는 무언가를 만듭니다.",
          "에이전트형 AI는 다음 행동을 대신 수행합니다."
        ],
        [sources.googleGemini, sources.nvidiaRobotics],
        [{ title: "다음 단계", items: ["Physical AI는 현실의 물체와 환경까지 다룹니다", "이 단계 구분은 투자 우선순위를 정리하는 데 유용합니다"] }]
      ),
      slide(
        "13 / Evolution Ladder",
        "인식 → 생성 → 에이전트 → Physical",
        "AI는 점점 더 많은 의사결정과 실행 책임을 맡아가고 있습니다. 이 사다리를 이해하면 어디서 어떤 데이터와 제어가 필요한지 선명해집니다.",
        [
          "인식: 무엇을 보는지 이해합니다.",
          "생성: 결과물을 만들어냅니다.",
          "에이전트: 도구를 써서 목표를 수행합니다.",
          "Physical: 실제 환경에서 움직이고 조작합니다."
        ],
        [sources.googleGemini, sources.nvidiaGr00t, sources.nvidiaCosmos],
        [{ title: "리더 질문", items: ["우리 조직은 지금 어느 단계의 AI를 쓰고 있는가", "다음 단계로 가기 위해 부족한 데이터와 제어는 무엇인가"] }]
      ),
      slide(
        "14 / Data First",
        "데이터가 모델을 만듭니다",
        "원하는 AI는 원하는 데이터에서 나옵니다. 학습 데이터는 모델의 지식과 경험이며, 결국 무엇을 보게 했는지가 무엇을 하게 하는지를 결정합니다.",
        [
          "좋은 모델은 좋은 데이터에서만 나옵니다.",
          "데이터 설계 없이 모델만 바꿔서는 원하는 성능이 나오지 않습니다.",
          "AI 전략의 출발점은 모델 선정이 아니라 데이터 전략이어야 합니다."
        ],
        [sources.mckinseyGenai, sources.nvidiaCosmos],
        [{ title: "한 줄 메시지", items: ["콩 심은 데 콩 납니다", "학습 데이터의 수준이 AI 모델의 수준을 결정합니다"] }]
      ),
      slide(
        "15 / Manufacturing Data",
        "제조 현장의 데이터는 왜 특별할까요",
        "제조 AI는 범용 웹 데이터만으로는 완성되지 않습니다. 공정, 품질, 설비, 검사, 운영 맥락이 담긴 현장 데이터가 성능 차이를 만듭니다.",
        [
          "제조 데이터는 희소하고 맥락 의존적이며, 수집 난도가 높습니다.",
          "품질 예측, 불량 검출, 공정 운영 최적화는 현장 데이터 없이는 고도화되기 어렵습니다.",
          "현장 데이터는 AI 경쟁력과 직결되는 전략 자산입니다."
        ],
        [sources.koreaHeraldExaone, sources.digitalCommerceLg],
        [{ title: "현장 의미", items: ["제조 AI는 일반 LLM 적용보다 데이터 준비가 더 중요합니다", "협력사와 현장 조직을 포함한 데이터 생태계가 필요합니다"] }]
      ),
      slide(
        "16 / Expert Knowledge",
        "좋은 모델은 결국 좋은 전문가를 키우는 과정과 닮아 있습니다",
        "데이터 수집, 정답 정의, 반복 학습, 테스트를 완성도 있게 가져가려면 현장을 이해하고 좋은 기준을 제시할 수 있는 전문가가 필요합니다.",
        [
          "데이터는 AI의 지식과 경험입니다.",
          "전문가의 기준이 없으면 모델은 그럴듯하지만 신뢰하기 어려운 결과를 냅니다.",
          "암묵지를 디지털 학습 자산으로 바꾸는 과정이 AX의 핵심입니다."
        ],
        [sources.koreaHeraldExaone, sources.mckinseyGenai],
        [{ title: "비유", items: ["학습용 데이터는 횟감입니다", "최종 요리보다 싱싱하고 다양한 원재료가 먼저 중요합니다"] }]
      ),
      slide(
        "17 / Digital Twin vs World Model",
        "Digital Twin과 World Model은 무엇이 다를까요",
        "Digital Twin은 현실을 복제하는 데 강하고, World Model은 세상을 이해하고 다음 행동의 결과를 예측하는 데 강합니다. Physical AI는 이 둘을 연결하며 성장합니다.",
        [
          "Digital Twin은 상태를 비추는 거울에 가깝습니다.",
          "World Model은 보이지 않는 변화와 다음 결과를 추론합니다.",
          "리더는 복제형 투자와 행동형 투자 중 어디를 강화할지 구분해야 합니다."
        ],
        [sources.nvidiaCosmos, sources.nvidiaRobotics],
        [{ title: "전략 포인트", items: ["운영 가시화만으로는 부족합니다", "예측과 행동까지 연결될 때 Physical AI의 가치가 커집니다"] }]
      ),
      slide(
        "18 / Physical AI Learning",
        "Physical AI는 어떻게 학습될까요",
        "Physical AI는 real-world teleoperation, robot trajectory, simulator, synthetic data를 함께 써서 실제 행동 능력을 끌어올립니다.",
        [
          "현실 데이터는 비싸지만 반드시 필요합니다.",
          "시뮬레이터와 합성 데이터는 학습 규모를 빠르게 키워줍니다.",
          "핵심은 현실과 가상의 학습 루프를 어떻게 연결하느냐입니다."
        ],
        [sources.nvidiaGr00t, sources.nvidiaCosmos],
        [{ title: "산업 의미", items: ["데이터 수집 체계가 곧 경쟁력입니다", "로봇 학습은 설비 투자와 데이터 투자가 동시에 필요합니다"] }]
      ),
      slide(
        "19 / LG AI",
        "LG의 AI는 왜 자체 모델과 산업 특화 전략을 함께 가져가야 할까요",
        "EXAONE은 단순한 범용 모델 경쟁이 아니라 데이터 주권과 산업 적용을 위한 전략 자산입니다. 동시에 LG는 전문 영역별 AI 포트폴리오를 넓혀야 합니다.",
        [
          "자체 모델은 데이터와 노하우를 지키는 기반이 됩니다.",
          "산업 특화 AI는 실행 가능한 가치를 만들고 차별화를 만듭니다.",
          "범용 fast follower를 넘어 산업형 Agentic AI 리더로 가야 합니다."
        ],
        [sources.koreaHeraldExaone, sources.digitalCommerceLg],
        [{ title: "메시지", items: ["범용 모델 하나보다 산업 실행 포트폴리오가 중요합니다", "AI 주권은 기술과 데이터 모두를 포함합니다"] }]
      ),
      slide(
        "20 / LG Use Cases",
        "LG의 산업 적용 사례는 무엇을 시사할까요",
        "제조, 소재, 바이오, 운영 최적화처럼 현장 문제를 풀기 위해서는 범용 LLM보다 산업 데이터와 업무 맥락을 결합한 AI가 더 중요합니다.",
        [
          "품질 예측, 검사 자동화, 스케줄링 최적화, 신물질 탐색은 모두 도메인 데이터가 핵심입니다.",
          "현장 문제를 푸는 AI는 조직 안의 지식 구조를 함께 바꿉니다.",
          "실제 가치 창출은 현장 워크플로에 들어갈 때 시작됩니다."
        ],
        [sources.digitalCommerceLg, sources.koreaHeraldExaone],
        [{ title: "리더 포인트", items: ["AX는 도구 도입보다 업무 재설계 프로젝트입니다", "현장 팀과 데이터 팀의 공동 설계가 필요합니다"] }]
      ),
      slide(
        "21 / AX Questions",
        "AX 시대, 리더가 고민해야 할 방향은 무엇일까요",
        "모델 학습 과정에서 데이터가 넘어가면 장기적으로 노하우도 함께 넘어갈 수 있습니다. 그래서 데이터 주권, 기술 내재화, 실행 속도의 균형이 중요합니다.",
        [
          "범용 모델 활용만으로는 차별화가 점점 어려워집니다.",
          "무엇을 자체화하고 무엇을 연결할지 명확한 원칙이 필요합니다.",
          "늦어 보이는 지금도 AI 개화기이기 때문에 후발 기회는 여전히 존재합니다."
        ],
        [sources.koreaHeraldExaone, sources.eyCeo, sources.mckinseyGenai],
        [{ title: "오늘의 질문", items: ["우리에게 꼭 남겨야 할 데이터와 노하우는 무엇인가", "속도를 내면서도 주권을 지키는 운영 원칙은 무엇인가"] }]
      ),
      slide(
        "22 / Conclusion",
        "새로운 기회는 대부분 혼란한 상황 속에서 열립니다",
        "2030년까지 연구개발, 제조, 조직, 업무 분장, 산업 구조는 크게 바뀔 가능성이 높습니다. 다크 팩토리, 연구개발 자동화, 조직 역할 재설계는 이미 시작된 흐름입니다.",
        [
          "소멸하는 역할과 지속되는 역할, 새로 생기는 역할이 동시에 나타날 것입니다.",
          "AI 전환의 핵심은 기술 채택이 아니라 사업 운영 방식을 다시 설계하는 것입니다.",
          "지금의 혼란은 뒤처짐의 신호가 아니라 새로운 기회의 창이기도 합니다."
        ],
        [sources.mckinseyGenai, sources.eyCeo, sources.nvidiaRobotics],
        [{ title: "마무리 메시지", items: ["Agentic에서 Physical까지 흐름을 읽는 것이 곧 전략입니다", "리더의 역할은 기술 선택보다 방향 설정과 실행 설계입니다"] }]
      )
    ]
  };
}

function buildAssistantAgenticSpectrumDeck() {
  const imagePath = withBase("/assets/notebooklm/assistant-agentic/ai-utilization-evolution-roadmap.png");

  return {
    id: "assistant-agentic-spectrum",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "AI 활용의 진화 로드맵",
    subtitle: "현재 페이지와 공식 자료 8건을 바탕으로 만든 1장 concept map",
    downloadUrl: imagePath,
    downloadFilename: "ai-utilization-evolution-roadmap.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Infographic",
        title: "AI 활용의 진화 로드맵",
        imageSrc: imagePath,
        imageAlt: "AI가 비서형에서 대리인형을 거쳐 자율 협업형으로 진화하는 세 단계를 비교한 인포그래픽 로드맵"
      }
    ]
  };
}

function buildPromptContextWorkflowDeck() {
  const imagePath = withBase("/assets/notebooklm/prompt-context/prompt-context-workflow-strategy.png");

  return {
    id: "prompt-context-workflow",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "프롬프트 엔지니어링에서 컨텍스트 엔지니어링으로",
    subtitle: "현재 페이지와 공식 자료 6건을 바탕으로 만든 1장 concept map",
    downloadUrl: imagePath,
    downloadFilename: "prompt-context-workflow-strategy.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Infographic",
        title: "AI 성과를 결정짓는 3단계 진화 전략",
        imageSrc: imagePath,
        imageAlt: "프롬프트 엔지니어링에서 컨텍스트 기반 워크플로우로 진화하는 AI 성과 창출 전략의 3단계를 설명하는 인포그래픽"
      }
    ]
  };
}

function buildTechUtilizationRoadmapDeck() {
  const basePath = withBase("/assets/notebooklm/tech-roadmap");

  return {
    id: "tech-utilization-roadmap",
    kicker: "NotebookLM Slide Deck",
    title: "Enterprise AI Roadmap",
    subtitle: "NotebookLM Studio에서 내려받은 실제 3장 슬라이드",
    downloadUrl: `${basePath}/enterprise-ai-roadmap-2.pdf`,
    downloadFilename: "enterprise-ai-roadmap-2.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 Gemini/ChatGPT (챗봇)",
        title: "질문-리서치-초안-수정의 협업 루프",
        imageSrc: `${basePath}/slide-1.png`,
        imageAlt: "Enterprise AI Roadmap 슬라이드 1장. Chat UI 단계에서 질문, 리서치, 초안 작성, 수정 요청을 반복하는 흐름을 설명합니다."
      },
      {
        eyebrow: "02 AI Studio (바이브코딩)",
        title: "AI가 개발을 돕고 앱이 다시 AI를 호출하는 구조",
        imageSrc: `${basePath}/slide-2.png`,
        imageAlt: "Enterprise AI Roadmap 슬라이드 2장. AI Studio Build와 API를 활용해 앱을 만들고 서비스가 다시 AI를 호출하는 구조를 설명합니다."
      },
      {
        eyebrow: "03 Hi-D Code (Agent)",
        title: "Codex와 Cline으로 시연하는 에이전틱 워크플로우",
        imageSrc: `${basePath}/slide-3.png`,
        imageAlt: "Enterprise AI Roadmap 슬라이드 3장. Codex와 Cline을 통해 계획, 도구 호출, 실행, 검증을 잇는 CLI Agent 단계를 설명합니다."
      }
    ]
  };
}

function buildConceptFoundationGuideDeck() {
  const imagePath = withBase("/assets/notebooklm/concept-foundation/expert-ai-core-concepts-guide2.png");

  return {
    id: "concept-foundation-guide",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "전문가용 AI 핵심 개념 가이드",
    subtitle: "NotebookLM에서 내려받은 세로형 개념 인포그래픽",
    downloadUrl: imagePath,
    downloadFilename: "expert-ai-core-concepts-guide2.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Infographic",
        title: "오늘 수업을 관통하는 AI 핵심 용어 지도",
        imageSrc: imagePath,
        imageAlt: "전문가용 AI 핵심 개념 가이드 세로 인포그래픽. 멀티모달, 컨텍스트 엔지니어링, RAG, MCP, Agentic AI 등 핵심 개념을 한 장으로 정리합니다."
      }
    ]
  };
}

function buildGeminiAccessRoadshowDeck() {
  const basePath = withBase("/assets/notebooklm/ch02-structured-prompting/gemini-business-engine");

  return {
    id: "gemini-access-roadshow",
    kicker: "NotebookLM Slide Deck",
    title: "Gemini Business Engine",
    subtitle: "Gemini를 단순 채팅이 아니라 멀티모달 비즈니스 엔진으로 쓰는 흐름",
    downloadUrl: `${basePath}/Gemini-Business-Engine.pdf`,
    downloadFilename: "Gemini-Business-Engine.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Orientation",
        title: "Gemini 실습 오리엔테이션",
        imageSrc: `${basePath}/slide-01.png`,
        imageAlt: "단순한 챗봇을 넘어선 멀티모달 비즈니스 분석 엔진을 주제로 한 LG 임원진 대상 Gemini 실습 오리엔테이션 슬라이드입니다."
      },
      {
        eyebrow: "02 / Multimodal",
        title: "텍스트·이미지·PDF·음성을 한 대화창에서",
        imageSrc: `${basePath}/slide-02.png`,
        imageAlt: "텍스트, 이미지, PDF, 음성 등 다양한 데이터를 하나의 대화창에서 처리하여 업무 혁신을 이루는 Gemini의 멀티모달 기능을 설명합니다."
      },
      {
        eyebrow: "03 / Executive Use",
        title: "임원 의사결정을 돕는 세 가지 핵심 요소",
        imageSrc: `${basePath}/slide-03.png`,
        imageAlt: "임원진의 의사결정을 돕는 세 가지 핵심 요소로 직관적 접근, 실무적 확장, 연속적 심화를 제시합니다."
      },
      {
        eyebrow: "04 / Onboarding",
        title: "접속부터 후속 질문까지 6단계 시작법",
        imageSrc: `${basePath}/slide-04.png`,
        imageAlt: "gemini.google.com 접속부터 후속 질문까지 Gemini 사용을 시작하는 6단계 과정을 설명하는 타임라인입니다."
      },
      {
        eyebrow: "05 / Interface",
        title: "표 구조화, 요약, 초안 작성까지 한 화면에서",
        imageSrc: `${basePath}/slide-05.png`,
        imageAlt: "표 구조화, 핵심 요약, 초안 작성 등 모든 분석 작업이 하나의 직관적인 인터페이스에서 가능함을 보여줍니다."
      }
    ]
  };
}

function buildGeminiScreenQuickTourDeck() {
  const basePath = withBase("/assets/gemini/ch02");

  return {
    id: "gemini-screen-quick-tour",
    previewColumns: 3,
    kicker: "Gemini Practice",
    title: "Gemini 화면 간단 소개",
    subtitle: "실습에 들어가기 전 먼저 볼 3가지 화면",
    slides: [
      {
        eyebrow: "01 / Home",
        title: "홈 화면",
        imageSrc: `${basePath}/gemini-home.png`,
        imageAlt: "Gemini 홈 화면",
        summary: "왼쪽에는 대화 이력과 Gems, 아래에는 입력창과 파일 첨부 버튼이 있습니다. 오늘 대부분의 실습은 이 화면에서 시작합니다."
      },
      {
        eyebrow: "02 / Mode",
        title: "모드 선택 메뉴",
        imageSrc: `${basePath}/gemini-mode-menu.png`,
        imageAlt: "Gemini 모드 선택 메뉴",
        summary: "빠른 답이 필요한 작업과 더 깊은 추론이 필요한 작업을 구분해 모델 사용 감각을 잡는 화면입니다."
      },
      {
        eyebrow: "03 / Upload",
        title: "파일 업로드 메뉴",
        imageSrc: `${basePath}/gemini-upload-menu.png`,
        imageAlt: "Gemini 파일 업로드 메뉴",
        summary: "문서, 데이터, 코드 파일, Drive 자료를 붙여서 컨텍스트를 키우면 결과 품질이 확 달라집니다."
      }
    ]
  };
}

function buildBusinessPromptingWorkshopDeck() {
  const imagePath =
    withBase("/assets/notebooklm/ch02-structured-prompting/business-prompting-workshop-infographic.png");

  return {
    id: "business-prompting-workshop",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "비즈니스 프롬프트 업무 위임 가이드",
    subtitle: "비즈니스 프롬프트 4종과 회의 분석 흐름을 한 장에 압축한 실습용 인포그래픽",
    downloadUrl: imagePath,
    downloadFilename: "business-prompting-workshop-infographic.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Infographic",
        title: "비즈니스 프롬프트를 실무 업무로 바꾸는 구조",
        imageSrc: imagePath,
        imageAlt: "비즈니스 프롬프트의 세 가지 활용 사례와 데이터 기반 워크플로우 및 작성 원칙을 요약한 인포그래픽입니다."
      }
    ]
  };
}

function buildGeminiGemsRoadshowDeck() {
  const basePath = withBase("/assets/notebooklm/ch02-structured-prompting/gemini-business-engine");

  return {
    id: "gemini-gems-roadshow",
    kicker: "NotebookLM Slide Deck",
    title: "Gemini 확장 기능: Deep Research와 Gems",
    subtitle: "멀티턴 분석에서 맞춤형 AI 비서 만들기로 넘어가는 후반부 슬라이드",
    downloadUrl: `${basePath}/Gemini-Business-Engine.pdf`,
    downloadFilename: "Gemini-Business-Engine.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "09 / Extensions",
        title: "Deep Research와 Gems로 역할 확장",
        imageSrc: `${basePath}/slide-09.png`,
        imageAlt: "광범위한 리서치를 돕는 Deep Research와 맞춤형 AI 파트너인 Gems 기능을 소개합니다."
      },
      {
        eyebrow: "10 / Blueprint",
        title: "질문에서 문서 분석, Gems 활용까지의 청사진",
        imageSrc: `${basePath}/slide-10.png`,
        imageAlt: "질문 입력에서 시작해 문서 분석과 멀티턴 대화를 거쳐 맞춤형 비서 활용까지 이어지는 실습 전체 과정의 청사진입니다."
      },
      {
        eyebrow: "11 / Start",
        title: "직접 구조화된 프롬프팅을 시작하는 단계",
        imageSrc: `${basePath}/slide-11.png`,
        imageAlt: "구조화된 프롬프팅을 통해 직접 비즈니스 분석을 시작하도록 독려하는 실습 시작 안내 슬라이드입니다."
      }
    ]
  };
}

function buildGemsCreateStepsDeck() {
  const basePath = withBase("/assets/gems/ch03-clip03");

  return {
    id: "gems-create-steps",
    previewColumns: 3,
    kicker: "Gemini Practice",
    title: "Gems 만들기 3단계",
    subtitle: "세 장의 이미지를 클릭하면 확대되어 보이며, 좌우 가장자리나 화살표 키로 넘길 수 있습니다.",
    slides: [
      {
        eyebrow: "Step 1 / 탐색",
        title: "Gems 메뉴로 이동",
        imageSrc: `${basePath}/step-1-gems-menu.png`,
        imageAlt: "Gemini 사이드바에서 Gems 메뉴로 이동하는 화면"
      },
      {
        eyebrow: "Step 2 / 생성",
        title: "새 Gem 만들기",
        imageSrc: `${basePath}/step-2-new-gem.png`,
        imageAlt: "새 Gem을 만드는 설정 화면"
      },
      {
        eyebrow: "Step 3 / 검증",
        title: "인스트럭션 붙여넣기와 테스트",
        imageSrc: `${basePath}/step-3-system-instruction.png`,
        imageAlt: "시스템 인스트럭션을 붙여넣고 저장하는 화면"
      }
    ]
  };
}

function buildCiqoExecutiveBriefingDeck() {
  const basePath = withBase("/assets/notebooklm/ch03-notebooklm/ciqo-lg-executive-briefing");

  return {
    id: "ciqo-executive-briefing",
    kicker: "NotebookLM Slide Deck",
    title: "Global Talent and Luxury Strategy",
    subtitle: "CIQO 기반 교차 분석을 LG 스타일로 재구성한 7장 브리핑",
    downloadUrl: withBase("/assets/notebooklm/ch03-notebooklm/ciqo-lg-executive-briefing.pdf"),
    downloadFilename: "ciqo-lg-executive-briefing.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Cover",
        title: "경영진 브리핑의 시작점",
        imageSrc: `${basePath}/slide-1.png`,
        imageAlt: "LG 스타일 경영진 브리핑 표지 슬라이드"
      },
      {
        eyebrow: "02 / Context",
        title: "노동과 소비 지형을 동시에 읽는 문제 정의",
        imageSrc: `${basePath}/slide-2.png`,
        imageAlt: "업로드한 보고서들의 문제 정의와 핵심 배경을 설명하는 슬라이드"
      },
      {
        eyebrow: "03 / Signals",
        title: "WEF와 Deloitte가 교차로 보여주는 변화 신호",
        imageSrc: `${basePath}/slide-3.png`,
        imageAlt: "WEF와 Deloitte 소스의 핵심 신호를 교차 분석한 슬라이드"
      },
      {
        eyebrow: "04 / CIQO",
        title: "좋은 컨텍스트가 브리핑 품질을 끌어올리는 구조",
        imageSrc: `${basePath}/slide-4.png`,
        imageAlt: "CIQO 관점에서 문서 기반 리서치 품질을 설명하는 슬라이드"
      },
      {
        eyebrow: "05 / LG Lens",
        title: "LG 관점에서 다시 읽은 시사점",
        imageSrc: `${basePath}/slide-5.png`,
        imageAlt: "LG 경영진 관점으로 재해석한 전략 시사점 슬라이드"
      },
      {
        eyebrow: "06 / Action",
        title: "경영진 액션 아이템",
        imageSrc: `${basePath}/slide-6.png`,
        imageAlt: "다음 실행 항목과 우선순위를 요약한 슬라이드"
      },
      {
        eyebrow: "07 / So What",
        title: "So What과 다음 액션",
        imageSrc: `${basePath}/slide-7.png`,
        imageAlt: "최종 요약과 다음 액션을 정리한 마무리 슬라이드"
      }
    ]
  };
}

function buildEnterpriseResearchWorkflowDeck() {
  const imagePath = withBase("/assets/notebooklm/ch03-notebooklm/enterprise-research-workflow.png");

  return {
    id: "enterprise-research-workflow",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "AI 기반 기업 분석 워크플로",
    subtitle: "Gems에서 NotebookLM과 슬라이드 산출물까지 잇는 실습 흐름도",
    downloadUrl: imagePath,
    downloadFilename: "enterprise-research-workflow.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Workflow",
        title: "기업 분석 코스를 한 장에 정리한 인포그래픽",
        imageSrc: imagePath,
        imageAlt:
          "Gems로 자료 수집 기준을 만들고 NotebookLM으로 다중 소스를 분석한 뒤 슬라이드와 인포그래픽을 만드는 기업 분석 실습 워크플로 인포그래픽"
      }
    ]
  };
}

function buildAiStudioApiPrinciplesDeck() {
  const basePath = withBase("/assets/notebooklm/ch04-ai-studio-api-essentials");

  return {
    id: "ai-studio-api-principles",
    kicker: "NotebookLM Slide Deck",
    title: "AI API Essentials",
    subtitle: "AI Studio Build 앱, API key, quota, billing 원리를 설명하는 6장 브리핑",
    downloadUrl: `${basePath}/ai-api-essentials.pdf`,
    downloadFilename: "ai-api-essentials.pdf",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Architecture",
        title: "AI Studio와 API의 연결 구조",
        imageSrc: `${basePath}/slide-1.jpg`,
        imageAlt:
          "AI Studio와 API가 사용자 인터페이스를 원격 구글 제미나이 모델과 연결하는 구조를 설명하는 슬라이드"
      },
      {
        eyebrow: "02 / Runtime Flow",
        title: "사용자 입력에서 응답 반환까지의 흐름",
        imageSrc: `${basePath}/slide-2.jpg`,
        imageAlt:
          "사용자 입력부터 구글 인프라의 모델 추론 및 결과 반환까지의 API 기반 앱 작동 흐름을 보여주는 슬라이드"
      },
      {
        eyebrow: "03 / API Key",
        title: "API key의 역할과 보관 원칙",
        imageSrc: `${basePath}/slide-3.jpg`,
        imageAlt:
          "원격 모델 접속을 위한 디지털 출입증인 API key의 주요 역할과 보관 방법을 설명하는 슬라이드"
      },
      {
        eyebrow: "04 / Cost & Quota",
        title: "왜 비용과 quota가 생기는가",
        imageSrc: `${basePath}/slide-4.jpg`,
        imageAlt:
          "LLM 서비스 이용 시 토큰 처리와 추론 연산 등 자원 소모가 비용과 쿼터 제한을 발생시킴을 설명하는 슬라이드"
      },
      {
        eyebrow: "05 / Setup Checklist",
        title: "배포 전 확인해야 할 설정",
        imageSrc: `${basePath}/slide-5.jpg`,
        imageAlt:
          "앱 배포 전 설정해야 할 모델 선택, API key 인증, 데이터 보안, 사용량 통제 등 필수 요소를 안내하는 슬라이드"
      },
      {
        eyebrow: "06 / Operating Principle",
        title: "로컬 앱도 결국 클라우드 호출입니다",
        imageSrc: `${basePath}/slide-6.jpg`,
        imageAlt:
          "로컬 앱의 클라우드 의존성, API key의 필요성, 자원 소모에 따른 비용 관리의 중요성을 강조하는 슬라이드"
      }
    ]
  };
}

function buildVibeCodingShiftDeck() {
  const imagePath = withBase("/assets/notebooklm/ch05-vibe-coding/vibe-coding-shift-infographic.png");

  return {
    id: "vibe-coding-shift",
    previewStyle: "immersive",
    kicker: "NotebookLM Infographic",
    title: "바이브 코딩과 개발 패러다임 전환",
    subtitle: "리더가 목표를 정의하고 AI가 초안을 만들며 대화로 완성도를 끌어올리는 흐름을 설명하는 인포그래픽",
    downloadUrl: imagePath,
    downloadFilename: "vibe-coding-shift-infographic.png",
    downloadLabel: "다운로드",
    slides: [
      {
        eyebrow: "01 / Infographic",
        title: "아이디어에서 앱까지, 대화형 개발 루프",
        imageSrc: imagePath,
        imageAlt:
          "바이브 코딩이 기존 개발과 어떻게 다른지, 사람과 AI의 역할 분담, 반복 피드백 루프를 설명하는 NotebookLM 인포그래픽"
      }
    ]
  };
}

function buildExecutiveAppBuildSprintDeck() {
  const basePath = withBase("/assets/notebooklm/ch05-executive-app-build-sprint");

  return {
    id: "executive-app-build-sprint",
    kicker: "NotebookLM Slide Deck",
    title: "임원용 경쟁사 리서치 대시보드 구축 실습",
    subtitle: "Gems로 초안 프롬프트를 만들고 AI Studio Build에서 경쟁사 리서치 대시보드를 생성·고도화·브랜딩·확장하는 흐름을 정리한 7장 deck",
    downloadUrl: `${basePath}/executive-ai-dashboard-sprint.pdf`,
    downloadFilename: "executive-ai-dashboard-sprint.pdf",
    downloadLabel: "다운로드",
    previewColumns: 3,
    previewSlides: [
      { slideIndex: 1, pageLabel: "1", eyebrow: "Step 0 / Gems", title: "Gems로 Build용 초안 프롬프트 만들기" },
      { slideIndex: 2, pageLabel: "2", eyebrow: "Step 1 / Build", title: "리서치 대시보드 초안 생성" },
      { slideIndex: 3, pageLabel: "3", eyebrow: "Step 2 / Refinement", title: "리서치 카드와 분석 흐름 고도화" },
      { slideIndex: 4, pageLabel: "4", eyebrow: "Step 3 / Style", title: "LG 스타일과 웹 스타일 요청 적용" },
      { slideIndex: 5, pageLabel: "5", eyebrow: "Step 4 / API", title: "외부 API로 데이터 소스 확장" },
      { slideIndex: 6, pageLabel: "6", eyebrow: "Step 5 / Share", title: "공유 링크와 발표 준비 마무리" }
    ],
    slides: [
      {
        eyebrow: "00 / Workshop",
        title: "임원용 경쟁사 리서치 대시보드 구축 실습",
        imageSrc: `${basePath}/slide-1.jpg`,
        imageAlt: "임원용 경쟁사 리서치 대시보드 구축 실습의 주제를 소개하는 NotebookLM 표지 슬라이드"
      },
      {
        eyebrow: "01 / Gems",
        title: "Gems로 Build용 초안 프롬프트 만들기",
        imageSrc: `${basePath}/slide-2.jpg`,
        imageAlt: "Gems를 활용해 실습용 Build 초안 프롬프트를 만드는 흐름을 설명하는 NotebookLM 슬라이드"
      },
      {
        eyebrow: "02 / Build",
        title: "리서치 대시보드 초안 생성",
        imageSrc: `${basePath}/slide-3.jpg`,
        imageAlt: "경쟁사 리서치 대시보드의 첫 React 초안을 생성하는 과정을 정리한 슬라이드"
      },
      {
        eyebrow: "03 / Refinement",
        title: "리서치 카드와 분석 흐름 고도화",
        imageSrc: `${basePath}/slide-4.jpg`,
        imageAlt: "검색 결과 카드와 분석 흐름을 refinement하는 프롬프트 과정을 설명하는 슬라이드"
      },
      {
        eyebrow: "04 / Style",
        title: "LG 스타일과 웹 스타일 요청 적용",
        imageSrc: `${basePath}/slide-5.jpg`,
        imageAlt: "LG 스타일과 웹 스타일 프롬프트를 적용해 화면 위계를 정리하는 슬라이드"
      },
      {
        eyebrow: "05 / API",
        title: "외부 API로 데이터 소스 확장",
        imageSrc: `${basePath}/slide-6.jpg`,
        imageAlt: "Firecrawl 같은 외부 API를 붙여 데이터 수집 범위를 넓히는 실습 확장 흐름을 보여주는 슬라이드"
      },
      {
        eyebrow: "06 / Share",
        title: "공유 링크와 발표 준비 마무리",
        imageSrc: `${basePath}/slide-7.jpg`,
        imageAlt: "완성한 앱을 공유하고 발표 가능한 상태로 마무리하는 과정을 정리한 슬라이드"
      }
    ]
  };
}

function buildWebStylePromptLibraryDeck() {
  return {
    id: "web-style-prompt-library",
    kicker: "Prompt Deck",
    title: "웹 스타일 Prompt Library",
    subtitle: "Gemini / ChatGPT에 바로 붙여 넣을 수 있는 스타일별 full prompt 예제",
    downloadUrl: "",
    slides: STYLE_PROMPT_MATRIX_LIBRARY.map((entry, index) => buildWebStylePromptSlide(entry, index))
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
  const builder = SLIDE_DECK_BUILDERS[normalizeWs(deckId)];
  if (!builder) return null;
  const deck = builder();
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
    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "prompt-expand-toggle";
    header?.appendChild(toggleBtn);
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
  window.mermaid.run({ nodes }).catch(() => {});
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
  state.catalogPatched = needsClientCatalogPatch(rawChapters);
  state.chapters = state.catalogPatched
    ? buildClientVisibleCatalog(rawChapters)
    : rawChapters;
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
  const targetClip = knownClipKeys.has(hashClip) ? hashClip : firstClip;

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
  el.accountSettingsBtn?.classList.add("hidden");
  el.logoutBtn?.classList.add("hidden");
  el.toggleEditModeBtn?.classList.add("hidden");
  el.toggleSidebarModeBtn?.classList.add("hidden");
  el.adminSection?.classList.add("hidden");
}

function updateAdminVisibility() {
  if (state.isAdmin) {
    el.adminSection.classList.remove("hidden");
  } else {
    el.adminSection.classList.add("hidden");
  }
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

async function tryAutoLogin() {
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
    showLogin();
    showLoginMode();
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
    showLogin();
    showLoginMode();
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
  window.open(AX_TASK_BOARD_URL, "_blank", "noopener,noreferrer");
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
  showLogin();
  showLoginMode();
  renderCurrentUser();
}

function bindEvents() {
  el.loginForm.addEventListener("submit", onLoginSubmit);
  el.signupForm.addEventListener("submit", onSignupSubmit);
  el.markCompleteBtn.addEventListener("click", onToggleComplete);
  el.taskForm.addEventListener("submit", onTaskSubmit);
  el.toggleTaskBtn.addEventListener("click", onToggleTaskPanel);
  el.toggleNoteBtn.addEventListener("click", onToggleNotePanel);
  el.sidebarToggleBtn?.addEventListener("click", onToggleSidebar);
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
loadCourseDirectory()
  .catch(() => {})
  .finally(() => {
    tryAutoLogin().catch(() => {});
  });
