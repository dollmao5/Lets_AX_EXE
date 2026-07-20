#!/usr/bin/env node
/**
 * [리팩토링 1단계] 클립 파생 파일 재생성 CLI
 *
 * content.html을 직접 수정한 뒤 content.md / content.txt / metadata.json을
 * 루트 편집기 저장(POST /api/admin/clip-source)과 동일한 로직으로 재생성한다.
 * 로직은 server.js가 export하는 함수를 그대로 사용하므로 결과가 항상 일치한다.
 *
 * 사용법:
 *   npm run regen:clip -- ch02-clip01            # 클립 1개 (폴더명 기준)
 *   npm run regen:clip -- ch02-clip01 ch03-clip01 # 여러 개
 *   npm run regen:clip -- --all                   # 전체 클립
 *   npm run regen:clip -- --check ch02-clip01     # 재생성 없이 신선도만 확인(차이 있으면 exit 1)
 */
const fs = require("fs");
const path = require("path");

// require이므로 서버는 기동되지 않는다 (server.js의 require.main 가드 참조)
const { stripHtmlToText, buildMarkdownDocument, buildMetadataFromHtml } = require("../server.js");

const ROOT = path.resolve(__dirname, "..");
const CHAPTERS_DIR = path.join(ROOT, "content", "axcamp", "chapters");

function findClipDirs() {
  const result = new Map(); // clipKey(폴더명) -> 절대경로
  for (const chapter of fs.readdirSync(CHAPTERS_DIR)) {
    const chapterDir = path.join(CHAPTERS_DIR, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const clip of fs.readdirSync(chapterDir)) {
      const clipDir = path.join(chapterDir, clip);
      if (!fs.statSync(clipDir).isDirectory()) continue;
      if (fs.existsSync(path.join(clipDir, "content.html"))) {
        result.set(clip.toLowerCase(), clipDir);
      }
    }
  }
  return result;
}

function regenOne(clipKey, clipDir, checkOnly) {
  const htmlPath = path.join(clipDir, "content.html");
  const mdPath = path.join(clipDir, "content.md");
  const txtPath = path.join(clipDir, "content.txt");
  const metadataPath = path.join(clipDir, "metadata.json");

  const html = fs.readFileSync(htmlPath, "utf8");
  const existingMetadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
    : {};
  const existingMarkdown = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : "";

  // 기존 metadata의 route(canonical)를 보존한다 — visible/canonical 매핑 비접촉 원칙
  const chapterCode = path.basename(path.dirname(clipDir));
  const clip = {
    clipKey,
    route: existingMetadata.route || `#${clipKey}`,
    chapterId: chapterCode.toLowerCase(),
    chapterCode
  };

  const nextMetadata = buildMetadataFromHtml(clip, existingMetadata, html);
  const nextMarkdown = buildMarkdownDocument(clip, existingMarkdown, html);
  const nextText = `${stripHtmlToText(html)}\n`;
  // 서버의 writeJsonFile과 동일 형식(끝 개행 없음) — 루트 편집기 저장과 바이트 일치 보장
  const nextMetadataJson = JSON.stringify(nextMetadata, null, 2);

  const dirty =
    (!fs.existsSync(mdPath) || fs.readFileSync(mdPath, "utf8") !== nextMarkdown) ||
    (!fs.existsSync(txtPath) || fs.readFileSync(txtPath, "utf8") !== nextText) ||
    (!fs.existsSync(metadataPath) || fs.readFileSync(metadataPath, "utf8") !== nextMetadataJson);

  if (checkOnly) {
    console.log(`${dirty ? "STALE" : "FRESH"}  ${clipKey}`);
    return dirty;
  }

  if (!dirty) {
    console.log(`SKIP   ${clipKey} (이미 최신)`);
    return false;
  }

  fs.writeFileSync(mdPath, nextMarkdown, "utf8");
  fs.writeFileSync(txtPath, nextText, "utf8");
  fs.writeFileSync(metadataPath, nextMetadataJson, "utf8");
  console.log(`REGEN  ${clipKey} (md/txt/metadata 갱신)`);
  return true;
}

function main() {
  const args = process.argv.slice(2).filter(Boolean);
  const checkOnly = args.includes("--check");
  const all = args.includes("--all");
  const keys = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

  const dirs = findClipDirs();
  const targets = all ? [...dirs.keys()] : keys;

  if (!targets.length) {
    console.log("사용법: npm run regen:clip -- <clipKey...> | --all [--check]");
    console.log(`발견된 클립 ${dirs.size}개:`, [...dirs.keys()].join(", "));
    process.exit(1);
  }

  let anyDirty = false;
  for (const key of targets) {
    const dir = dirs.get(key);
    if (!dir) {
      console.error(`ERROR  ${key}: 클립 폴더를 찾을 수 없습니다`);
      process.exitCode = 1;
      continue;
    }
    if (regenOne(key, dir, checkOnly)) anyDirty = true;
  }

  if (checkOnly && anyDirty) process.exitCode = 1;
}

main();
