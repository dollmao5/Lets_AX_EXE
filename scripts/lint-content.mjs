#!/usr/bin/env node
/**
 * [리팩토링 2단계] 콘텐츠 정합성 린트 (읽기 전용)
 *
 * 검사 항목:
 *  1. 산출물 파일명 ↔ 원장(content/axcamp/deliverables.json) 일치 — 유령/오타 검출
 *  2. 내부 내비게이션 href(#chXX-clipYY) 실존 — 깨진 링크 검출
 *  3. 이미지 src 실존 (/assets/, /course-files/) — 깨진 이미지 검출
 *  4. 금칙어 — CH00~CH05 본문의 잔존 구(舊) 표현 (참고 클립 ch03-clip02 제외)
 *  5. 파생 파일 신선도 (경고만) — content.html ↔ md/txt/metadata 동기화 여부
 *  6. chapter.json 유령 클립 — 선언된 folder가 실제로 존재하는지 (260810 감사 재발 방지)
 *  7. visible-catalog-overrides.json stale 키 — 존재하지 않는 클립/챕터 오버라이드
 *  8. PRACTICE_FILE_MAP 실존 — server.js 실습파일 매핑이 디스크와 일치하는지
 *
 * 종료 코드: 오류 발견 시 1, 아니면 0 (신선도는 경고로만 출력)
 * 사용법: npm run lint:content
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHAPTERS_DIR = path.join(ROOT, "content", "axcamp", "chapters");
const PUBLIC_DIR = path.join(ROOT, "public");
const REGISTRY_FILE = path.join(ROOT, "content", "axcamp", "deliverables.json");

const errors = [];
const warnings = [];

/* ---------- 준비: 클립 목록, 원장 ---------- */
const clipDirs = new Map(); // 폴더명(clipKey) -> dir
for (const chapter of fs.readdirSync(CHAPTERS_DIR)) {
  const chapterDir = path.join(CHAPTERS_DIR, chapter);
  if (!fs.statSync(chapterDir).isDirectory()) continue;
  for (const clip of fs.readdirSync(chapterDir)) {
    const clipDir = path.join(chapterDir, clip);
    if (fs.statSync(clipDir).isDirectory() && fs.existsSync(path.join(clipDir, "content.html"))) {
      clipDirs.set(clip.toLowerCase(), clipDir);
    }
  }
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
const registryFilenames = new Set(
  registry.deliverables.map((d) => d.filename).filter(Boolean)
);

// href 유효 대상: 실제 클립 폴더명 (canonical). visible 키도 현재 1:1이라 동일 집합.
const validClipAnchors = new Set([...clipDirs.keys()].map((k) => `#${k}`));

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

/* ---------- 클립별 검사 ---------- */
for (const [clipKey, clipDir] of clipDirs) {
  const rel = path.relative(ROOT, clipDir).replace(/\\/g, "/");
  const rawHtml = fs.readFileSync(path.join(clipDir, "content.html"), "utf8");
  const html = stripComments(rawHtml); // [HIDDEN] 주석 블록은 검사 제외

  /* 1. 산출물 파일명 ↔ 원장 (260810: 하이픈 포함 — CH04_R1-3_… 검사 사각지대 해소) */
  const mentions = html.match(/(CH[0-9]{2}_[A-Za-z가-힣0-9_\-]+\.(?:md|txt)|[0-9]+조_[A-Za-z가-힣0-9_\-]+\.(?:m4a|txt|mp3|wav))/g) || [];
  for (const m of new Set(mentions)) {
    // 팀 파일은 조 번호를 1조 기준으로 정규화해 대조
    const normalized = m.replace(/^[0-9]+조_/, "1조_");
    if (!registryFilenames.has(normalized)) {
      errors.push(`[파일명] ${rel}: 원장에 없는 산출물 "${m}" (deliverables.json 확인)`);
    }
  }

  /* 2. 내부 내비게이션 href — suffix route(ch02-clip03b 등) 포함 */
  const hrefs = html.match(/href="#ch[0-9]{2}-clip[0-9]{2}[a-z]*"/g) || [];
  for (const h of new Set(hrefs)) {
    const anchor = h.slice(6, -1);
    if (!validClipAnchors.has(anchor)) {
      errors.push(`[링크] ${rel}: 존재하지 않는 클립으로 연결 ${anchor}`);
    }
  }

  /* 3. 이미지 src 실존 */
  const srcs = html.match(/src="\/(assets|course-files)\/[^"]+"/g) || [];
  for (const s of new Set(srcs)) {
    const url = s.slice(5, -1);
    let filePath = null;
    if (url.startsWith("/assets/")) {
      filePath = path.join(PUBLIC_DIR, url.replace(/^\//, ""));
    } else if (url.startsWith("/course-files/")) {
      const parts = url.split("/").filter(Boolean); // course-files, courseCode, clipKey, ...rest
      const targetDir = clipDirs.get((parts[2] || "").toLowerCase());
      if (targetDir) filePath = path.join(targetDir, ...parts.slice(3).map(decodeURIComponent));
    }
    if (filePath && !fs.existsSync(filePath)) {
      errors.push(`[이미지] ${rel}: 파일 없음 ${url}`);
    }
  }

  /* 4. 금칙어 (CH00~CH05, 참고 클립 ch03-clip02 제외)
     — 네비 푸터(clip-nav-footer)는 카탈로그 제목을 그대로 미러하므로 검사에서 제외.
       (선택 참고 클립 제목의 "Gemini" 등 정당한 링크 라벨까지 차단하지 않기 위함) */
  const chapterNo = Number((clipKey.match(/^ch(\d{2})/) || [])[1]);
  if (chapterNo <= 5 && clipKey !== "ch03-clip02") {
    let htmlSansNav = html.replace(/<div class="clip-nav-footer"[\s\S]*?<\/div>/g, "");
    // 공인 참고 클립(ch03-clip02)을 가리키는 제목·시간표 라벨은 금칙어 검사에서 제외
    const REF_CLIP_LABELS = [
      "선택 참고: Gemini 및 Gems 소개",
      "참고_Gemini Overview (Gems 소개)",
      "참고_Gemini Overview",
      "Gemini 접속 방법 및 Gems 소개"
    ];
    /* NotebookLM의 공식 리브랜딩 명칭 "Gemini Notebook"은 챗봇 Gemini와 무관한 별개 제품명 — 금칙어 예외
       (ch04-clip01 리브랜딩 각주·공식 도움말 링크 라벨에서 사용) */
    const ALLOWED_PHRASES = ["Gemini Notebook"];
    for (const label of [...REF_CLIP_LABELS, ...ALLOWED_PHRASES]) htmlSansNav = htmlSansNav.split(label).join("");
    const banned = [
      [/Gemini/, "Gemini (도구 전환 완료 — 참고 클립 외 금지)"],
      [/전사 텍스트/, "전사 텍스트 (정본 용어: 토론 대화문)"],
      [/Preview 창/, "Preview 창 (정본: 같은 채팅에서 테스트)"],
      [/Workflow Re-design|Workflow 파일럿/, "구(舊) CH03 Workflow 산출물 참조"],
      [/AI협업_업무재설계|AI업무재설계/, "유령 산출물(업무재설계) 참조"]
    ];
    for (const [re, label] of banned) {
      if (re.test(htmlSansNav)) errors.push(`[금칙어] ${rel}: ${label}`);
    }
  }
}

/* 5. 파생 파일 신선도 (경고만 — 일괄 정규화는 regen:clip --all) */
try {
  const { stripHtmlToText, buildMarkdownDocument, buildMetadataFromHtml } = require("../server.js");
  let staleCount = 0;
  const staleList = [];
  for (const [clipKey, clipDir] of clipDirs) {
    const html = fs.readFileSync(path.join(clipDir, "content.html"), "utf8");
    const metadataPath = path.join(clipDir, "metadata.json");
    const mdPath = path.join(clipDir, "content.md");
    const txtPath = path.join(clipDir, "content.txt");
    const existingMetadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath, "utf8")) : {};
    const clip = {
      clipKey,
      route: existingMetadata.route || `#${clipKey}`,
      chapterId: path.basename(path.dirname(clipDir)).toLowerCase(),
      chapterCode: path.basename(path.dirname(clipDir))
    };
    const freshMd = buildMarkdownDocument(clip, fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : "", html);
    const freshTxt = `${stripHtmlToText(html)}\n`;
    const freshMeta = JSON.stringify(buildMetadataFromHtml(clip, existingMetadata, html), null, 2);
    const stale =
      (!fs.existsSync(mdPath) || fs.readFileSync(mdPath, "utf8") !== freshMd) ||
      (!fs.existsSync(txtPath) || fs.readFileSync(txtPath, "utf8") !== freshTxt) ||
      (!fs.existsSync(metadataPath) || fs.readFileSync(metadataPath, "utf8") !== freshMeta);
    if (stale) { staleCount += 1; staleList.push(clipKey); }
  }
  if (staleCount) {
    warnings.push(`[신선도] 파생 파일이 낡은 클립 ${staleCount}개: ${staleList.join(", ")} → "npm run regen:clip -- --all"로 정규화 가능`);
  }
} catch (e) {
  warnings.push(`[신선도] 검사 실패(무시됨): ${e.message}`);
}

/* 6. chapter.json 유령 클립 — 선언 folder가 실제 폴더로 존재해야 함 */
for (const chapter of fs.readdirSync(CHAPTERS_DIR)) {
  const chapterJsonPath = path.join(CHAPTERS_DIR, chapter, "chapter.json");
  if (!fs.existsSync(chapterJsonPath)) continue;
  try {
    const chapterJson = JSON.parse(fs.readFileSync(chapterJsonPath, "utf8"));
    for (const clip of chapterJson.clips || []) {
      const folder = String(clip.folder || "");
      if (folder && !fs.existsSync(path.join(ROOT, "content", "axcamp", folder))) {
        errors.push(`[유령클립] ${chapter}/chapter.json: 폴더 없는 클립 선언 "${clip.route || folder}"`);
      }
    }
  } catch (e) {
    errors.push(`[유령클립] ${chapter}/chapter.json 파싱 실패: ${e.message}`);
  }
}

/* 7. overrides stale 키 */
try {
  const overrides = JSON.parse(
    fs.readFileSync(path.join(ROOT, "content", "axcamp", "visible-catalog-overrides.json"), "utf8")
  );
  const chapterIds = new Set(
    fs.readdirSync(CHAPTERS_DIR).filter((d) => fs.statSync(path.join(CHAPTERS_DIR, d)).isDirectory())
      .map((d) => d.toLowerCase())
  );
  for (const key of Object.keys(overrides.chapters || {})) {
    if (!chapterIds.has(key.toLowerCase())) {
      errors.push(`[오버라이드] 존재하지 않는 챕터 키 "${key}" (visible-catalog-overrides.json)`);
    }
  }
  for (const key of Object.keys(overrides.clips || {})) {
    if (!clipDirs.has(key.toLowerCase())) {
      errors.push(`[오버라이드] 존재하지 않는 클립 키 "${key}" (visible-catalog-overrides.json)`);
    }
  }
} catch (e) {
  warnings.push(`[오버라이드] 검사 실패(무시됨): ${e.message}`);
}

/* 8. PRACTICE_FILE_MAP 실존 */
try {
  const { PRACTICE_FILE_MAP } = require("../server.js");
  for (const [key, rel] of Object.entries(PRACTICE_FILE_MAP || {})) {
    if (!fs.existsSync(path.join(ROOT, "content", "axcamp", rel))) {
      errors.push(`[실습파일] PRACTICE_FILE_MAP "${key}" → 파일 없음: ${rel}`);
    }
  }
} catch (e) {
  warnings.push(`[실습파일] 검사 실패(무시됨): ${e.message}`);
}

/* ---------- 결과 ---------- */
console.log(`콘텐츠 린트: 클립 ${clipDirs.size}개, 원장 산출물 ${registry.deliverables.length}종 검사`);
if (warnings.length) {
  console.log(`\n경고 ${warnings.length}건:`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log(`\n오류 ${errors.length}건:`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log("\n린트 실패 — 위 오류를 수정한 뒤 다시 실행하세요.");
  process.exit(1);
}
console.log("\n린트 통과 ✓ (오류 0건)");
