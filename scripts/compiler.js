const fs = require("node:fs/promises");
const path = require("node:path");

const VISIBLE_CATALOG_OVERRIDES_FILE = "visible-catalog-overrides.json";
const EXCLUDED_CLIP_KEYS = new Set([]); // 이제 기획 외 미사용 클립이 삭제되어 제외 목록은 비어있습니다.

function normalizeWs(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function formatChapterNum(index) {
  return `CH ${String(index).padStart(2, "0")}`;
}

function clipKeyFromRoute(route) {
  return String(route || "").replace(/^#/, "").trim().toLowerCase();
}

function chapterCodeFromId(chapterId) {
  return String(chapterId || "").toUpperCase();
}

async function readJsonFileSafe(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function readVisibleCatalogOverrides(sourceRoot) {
  const filePath = path.join(sourceRoot, VISIBLE_CATALOG_OVERRIDES_FILE);
  const payload = await readJsonFileSafe(filePath, { chapters: {}, clips: {} });
  return {
    chapters: payload?.chapters || {},
    clips: payload?.clips || {}
  };
}

function deriveClipTitle(metadata, fallback = "") {
  const raw = String(metadata?.clipTitle || fallback || "").trim();
  return normalizeWs(raw);
}

async function buildSyntheticClip(sourceRootDir, spec, chapterId, chapterTitle, chapterNum) {
  const folderAbsolute = path.resolve(sourceRootDir, spec.folderRelative || "");
  const metadataPath = path.join(folderAbsolute, "metadata.json");
  const metadata = await readJsonFileSafe(metadataPath, null);

  const clipKey = normalizeWs(spec.clipKey).toLowerCase();
  const cleanTitle = deriveClipTitle(metadata, spec.title || metadata?.clipTitle || clipKey);
  const cleanType = normalizeWs(spec.type || metadata?.type || "");

  // Phase 3: metadata.json 유효성 검증
  if (metadata) {
    if (!metadata.route) {
      throw new Error(`[Validation Error] 'route' is missing in metadata.json: ${metadataPath}`);
    }
    if (!String(metadata.route).startsWith("#")) {
      throw new Error(`[Validation Error] 'route' must start with '#' in metadata.json: ${metadataPath}`);
    }
    if (!metadata.clipTitle) {
      throw new Error(`[Validation Error] 'clipTitle' is missing in metadata.json: ${metadataPath}`);
    }
  }

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

async function buildCatalog(sourceRoot) {
  const reportFile = path.join(sourceRoot, "export-report.json");
  const report = await readJsonFileSafe(reportFile, null);
  const overrides = await readVisibleCatalogOverrides(sourceRoot);
  if (!report || !Array.isArray(report.chapters)) {
    throw new Error(`Cannot load chapter catalog: ${reportFile}`);
  }

  const canonicalChaptersById = new Map();
  const canonicalClipsByKey = new Map();

  // 1. Canonical 챕터 및 클립 메타데이터 로드
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
      if (!clipKey || EXCLUDED_CLIP_KEYS.has(clipKey)) continue;

      const absoluteClipDir = path.resolve(sourceRoot, clip.folder || "");
      const metadataPath = path.join(absoluteClipDir, "metadata.json");
      const metadata = await readJsonFileSafe(metadataPath, null);

      // Phase 3: metadata.json 유효성 검증
      if (metadata) {
        if (!metadata.route) {
          throw new Error(`[Validation Error] 'route' is missing in metadata.json: ${metadataPath}`);
        }
        if (!String(metadata.route).startsWith("#")) {
          throw new Error(`[Validation Error] 'route' must start with '#' in metadata.json: ${metadataPath}`);
        }
        if (!metadata.clipTitle) {
          throw new Error(`[Validation Error] 'clipTitle' is missing in metadata.json: ${metadataPath}`);
        }
      }

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

  // 2. 가시적 챕터 노출용 블루프린트 설정 정의
  const visibleBlueprints = [
    {
      visibleChapterId: "ch00",
      title: "과정 안내",
      time: "08:30",
      sourceChapterIds: ["ch00"],
      clipKeys: ["ch00-clip01"]
    },
    {
      visibleChapterId: "ch01",
      title: "리더를 위한 AI 핵심",
      time: "08:45",
      sourceChapterIds: ["ch01"],
      // [260826] 진단(폴더 ch01-clip04)을 CH01 맨 앞으로 이동 — 사전 진단 취지에 맞춘 피드백 반영.
      // visible 번호는 이 순서대로 자동 재부여된다: 진단=#ch01-clip01 · AI 트렌드=#ch01-clip02
      // · Assistant=#ch01-clip03 · 개념 다지기=#ch01-clip04 (폴더/canonical 키는 그대로).
      // 복구: 배열을 ["ch01-clip01", "ch01-clip02", "ch01-clip03", "ch01-clip04"]로 되돌린다.
      clipKeys: ["ch01-clip04", "ch01-clip01", "ch01-clip02", "ch01-clip03"]
    },
    {
      visibleChapterId: "ch02",
      title: "리더 역할 및 역량 점검",
      time: "09:40",
      sourceChapterIds: ["ch02"],
      // [Revision v2] Round 2(ch02-clip03b)·Output Gate(ch02-clip05)는
      // 명시적 visibleClipKey로 suffix route를 보존한다 (순번 자동 부여 비적용).
      clipKeys: [
        "ch02-clip01",
        "ch02-clip02",
        "ch02-clip03",
        { clipKey: "ch02-clip03b", visibleClipKey: "ch02-clip03b" },
        "ch02-clip04",
        { clipKey: "ch02-clip05", visibleClipKey: "ch02-clip05" }
      ]
    },
    {
      visibleChapterId: "ch03",
      title: "조직(팀) 성장역량과 일하는 방식 점검",
      time: "13:30",
      sourceChapterIds: ["ch03"],
      // [Revision v2] Round 3(ch03-clip01b)·통합 저장 Gate(ch03-clip01c) suffix 보존.
      clipKeys: [
        "ch03-clip01",
        { clipKey: "ch03-clip01b", visibleClipKey: "ch03-clip01b" },
        { clipKey: "ch03-clip01c", visibleClipKey: "ch03-clip01c" },
        "ch03-clip02"
      ]
    },
    {
      visibleChapterId: "ch04",
      title: "우리 팀의 성장역량 향상 실천",
      time: "15:30",
      sourceChapterIds: ["ch04"],
      clipKeys: ["ch04-clip01", "ch04-clip02"]
    },
    {
      visibleChapterId: "ch05",
      title: "오늘의 핵심 요약",
      time: "16:50",
      sourceChapterIds: ["ch05"],
      clipKeys: ["ch05-clip01", "ch05-clip02"]
    },
    {
      visibleChapterId: "ch06",
      title: "참고자료 라이브러리",
      time: "17:20",
      sourceChapterIds: ["ch06"],
      clipKeys: [
        "ch06-clip01",
        "ch06-clip02",
        "ch06-clip03",
        "ch06-clip04",
        "ch06-clip05",
        "ch06-clip06",
        "ch06-clip07",
        "ch06-clip08",
        "ch06-clip09",
        "ch06-clip10",
        "ch06-clip11"
      ]
    }
  ];

  // 3. 반환용 자료 구조 및 맵 레지스트리 준비
  const chapters = [];
  const clipsByKey = new Map();
  const visibleClipsByKey = new Map();
  const canonicalVisibleClipsByKey = new Map();
  const visibleChapterIdByCanonicalId = new Map();
  const canonicalChapterIdByVisibleId = new Map();
  const visibleClipKeyByCanonicalKey = new Map();
  const sourceChapterIdsByVisibleId = new Map();

  // 클립 메타데이터를 통합 레지스트리 Map들에 일괄 등록하는 헬퍼 함수
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

  // 4. 블루프린트를 순회하며 최종 챕터 및 클립 리바인딩 수행
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

    // 블루프린트에 등록된 클립 목록을 단일 명세(Specs) 리스트로 통합
    // [Revision v2] 문자열(기존 방식: 순번 자동 부여) 또는
    // { clipKey, visibleClipKey } 객체(명시적 visible 키 — suffix route 보존)를 허용한다.
    const clipSpecs = [];
    for (const clipKeyOrSpec of blueprint.clipKeys || []) {
      if (typeof clipKeyOrSpec === "string") {
        clipSpecs.push({ clipKey: clipKeyOrSpec, synthetic: false });
      } else if (clipKeyOrSpec && typeof clipKeyOrSpec === "object") {
        clipSpecs.push({ ...clipKeyOrSpec, synthetic: false });
      }
    }
    for (const syntheticClip of blueprint.syntheticClips || []) {
      clipSpecs.push({ ...syntheticClip, synthetic: true });
    }

    // 각 클립 명세를 순회하여 visible 기준 클립 오브젝트 빌드
    let visibleClipCounter = 0;
    for (const clipSpec of clipSpecs) {
      let clipObj = null;

      if (clipSpec.synthetic) {
        visibleClipCounter++;
        const clipSuffix = String(visibleClipCounter).padStart(2, "0");
        const visibleClipKey = `${visibleChapterId}-clip${clipSuffix}`;
        // 합성 클립 빌드 및 키 오버라이드
        const rawSynthetic = await buildSyntheticClip(
          sourceRoot,
          clipSpec,
          visibleChapterId,
          chapterObj.title,
          visibleChapterNum
        );
        clipObj = {
          ...rawSynthetic,
          clipKey: visibleClipKey,
          route: `#${visibleClipKey}`,
          canonicalClipKey: visibleClipKey,
          canonicalRoute: `#${visibleClipKey}`
        };
      } else {
        // 기존(Canonical) 클립 리바인딩
        const sourceClipKey = normalizeWs(clipSpec.clipKey).toLowerCase();
        const sourceClip = canonicalClipsByKey.get(sourceClipKey);
        if (!sourceClip) continue;

        // [Revision v2] 명시적 visibleClipKey가 있으면 순번 자동 부여보다 우선한다.
        // 이때 순번 카운터는 증가시키지 않아 기존 숫자 route가 밀리지 않는다.
        let visibleClipKey;
        if (clipSpec.visibleClipKey) {
          visibleClipKey = normalizeWs(clipSpec.visibleClipKey).toLowerCase();
        } else {
          visibleClipCounter++;
          const clipSuffix = String(visibleClipCounter).padStart(2, "0");
          visibleClipKey = `${visibleChapterId}-clip${clipSuffix}`;
        }

        const overrideTitle = blueprint.clipTitles?.[clipSpec.clipKey] || clipSpec.title || sourceClip.title;
        clipObj = {
          ...sourceClip,
          clipKey: visibleClipKey,
          route: `#${visibleClipKey}`,
          chapterId: visibleChapterId,
          canonicalChapterId: sourceClip.canonicalChapterId,
          chapterCode: visibleChapterCode,
          chapterNum: visibleChapterNum,
          chapterTitle: chapterObj.title,
          title: normalizeWs(overrideTitle),
          canonicalClipKey: sourceClip.canonicalClipKey,
          canonicalRoute: sourceClip.canonicalRoute
        };
      }

      if (!clipObj) continue;

      // JSON 오버라이드 설정에 따른 메타데이터 덮어쓰기 적용
      const clipOverride = overrides.clips?.[clipObj.canonicalClipKey] || {};
      if (clipOverride.title) {
        clipObj.title = clipOverride.title;
      }
      if (clipOverride.type) {
        clipObj.type = clipOverride.type;
      }

      // 최종 클립 객체 레지스트리 등록 및 챕터 추가
      registerClipObject(clipObj);
      chapterObj.clipObjects.push(clipObj);
    }

    // 유효한 클립이 포함된 챕터만 최종 챕터 리스트에 취합
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

    let maxMtime = 0;
    try {
      const chaptersDir = path.join(sourceRoot, "chapters");
      const chapters = await fs.readdir(chaptersDir);
      for (const ch of chapters) {
        const chPath = path.join(chaptersDir, ch);
        const chStat = await fs.stat(chPath);
        if (chStat.isDirectory()) {
          const clips = await fs.readdir(chPath);
          for (const clip of clips) {
            const clipPath = path.join(chPath, clip);
            const clipStat = await fs.stat(clipPath);
            if (clipStat.isDirectory()) {
              for (const file of ["content.html", "metadata.json"]) {
                const filePath = path.join(clipPath, file);
                try {
                  const fStat = await fs.stat(filePath);
                  if (fStat.mtimeMs > maxMtime) {
                    maxMtime = fStat.mtimeMs;
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch {}
    parts.push(`chaptersMtime:${maxMtime}`);

    return parts.join("|");
  } catch {
    return "missing";
  }
}

const cache = new Map();
async function getCatalog(sourceRoot) {
  const key = path.resolve(sourceRoot);
  const version = await readCatalogVersion(key);
  if (cache.has(key)) {
    const entry = cache.get(key);
    if (entry.version === version) {
      return entry.data;
    }
  }
  const data = await buildCatalog(key);
  cache.set(key, { version, data });
  return data;
}

module.exports = {
  getCatalog,
  buildCatalog,
  readCatalogVersion,
  readVisibleCatalogOverrides,
  deriveClipTitle
};
