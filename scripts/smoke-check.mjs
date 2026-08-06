// 정적 빌드 산출물(dist-pages) 스모크 체크 — 리팩토링 5단계 (읽기 전용)
// 사용법: node scripts/smoke-check.mjs [--base-path /Lets_AX_EXE]
// build:pages 직후 실행해 배포 전에 산출물 무결성을 검증한다. 실패 시 exit 1.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist-pages");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base-path");
const expectedBasePath = baseIdx >= 0 ? String(args[baseIdx + 1] || "") : null;

const errors = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  errors.push(msg);
  console.log(`  ✗ ${msg}`);
};

const readJson = (relPath) => {
  const fullPath = path.join(DIST_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relPath} 없음`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${relPath} JSON 파싱 실패: ${error.message}`);
    return null;
  }
};

console.log(`스모크 체크: ${DIST_DIR}`);

// 1. 필수 파일 존재
if (!fs.existsSync(DIST_DIR)) {
  console.error("dist-pages가 없습니다. 먼저 npm run build:pages를 실행하세요.");
  process.exit(1);
}
for (const name of ["index.html", "404.html", ".nojekyll", "static-config.js", "app.js", "styles.css"]) {
  if (fs.existsSync(path.join(DIST_DIR, name))) ok(`${name} 존재`);
  else fail(`${name} 없음`);
}

// 2. static-config: 정적 모드 + base path
const configSource = fs.existsSync(path.join(DIST_DIR, "static-config.js"))
  ? fs.readFileSync(path.join(DIST_DIR, "static-config.js"), "utf8")
  : "";
if (!/"mode"\s*:\s*"static"/.test(configSource)) fail('static-config.js에 mode:"static" 없음');
else ok('static-config.js mode:"static"');
if (expectedBasePath !== null) {
  const match = configSource.match(/"basePath"\s*:\s*"([^"]*)"/);
  const actual = match?.[1] ?? "(없음)";
  if (actual === expectedBasePath) ok(`basePath = ${expectedBasePath}`);
  else fail(`basePath 불일치: 기대 ${expectedBasePath}, 실제 ${actual}`);
}

// 3. index.html 핵심 마커
const indexHtml = fs.existsSync(path.join(DIST_DIR, "index.html"))
  ? fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf8")
  : "";
for (const marker of ["static-config.js", "app.js", "styles.css"]) {
  if (indexHtml.includes(marker)) ok(`index.html이 ${marker} 참조`);
  else fail(`index.html에 ${marker} 참조 없음`);
}

// 4. chapters.json: 챕터·클립 구조
const chaptersData = readJson("data/chapters.json");
const clipKeys = [];
if (chaptersData) {
  const chapters = Array.isArray(chaptersData.chapters) ? chaptersData.chapters : [];
  if (!chapters.length) fail("chapters.json에 챕터 0개");
  else ok(`챕터 ${chapters.length}개`);
  for (const chapter of chapters) {
    const clips = Array.isArray(chapter.clips) ? chapter.clips : [];
    if (!clips.length) fail(`${chapter.chapterId}: 클립 0개`);
    for (const clip of clips) {
      if (clip.clipKey) clipKeys.push(clip.clipKey);
    }
  }
  ok(`클립 키 ${clipKeys.length}개 수집`);
}

// 5. 클립별 스냅샷 JSON: 존재 + contentHtml 비어있지 않음
let clipFailures = 0;
for (const clipKey of clipKeys) {
  const clipData = readJson(`data/clips/${clipKey}.json`);
  if (!clipData) {
    clipFailures++;
    continue;
  }
  const html = String(clipData.clip?.contentHtml || clipData.contentHtml || "");
  if (!html.trim()) {
    fail(`data/clips/${clipKey}.json: contentHtml 비어 있음`);
    clipFailures++;
  }
}
if (clipKeys.length && !clipFailures) ok(`클립 스냅샷 ${clipKeys.length}개 모두 contentHtml 정상`);

// 6. deck-data.json: 덱 19종 + slides 구조 (2026-07-23 보안 조치로 1종 제거, 2026-08-04 ch02-4 업로드 메뉴 덱 1종 추가)
const deckData = readJson("deck-data.json");
if (deckData) {
  const deckIds = Object.keys(deckData);
  if (deckIds.length !== 19) fail(`deck-data.json 덱 수 ${deckIds.length} (기대 19)`);
  else ok("덱 19종 존재");
  const broken = deckIds.filter(
    (id) => !Array.isArray(deckData[id]?.slides) || !deckData[id].slides.length
  );
  if (broken.length) fail(`slides 없는 덱: ${broken.join(", ")}`);
  else ok("모든 덱에 slides 존재");
}

// 7. 정적 자산 디렉터리
for (const dir of ["assets", "course-files", "data/clips"]) {
  const full = path.join(DIST_DIR, dir);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) ok(`${dir}/ 존재`);
  else fail(`${dir}/ 없음`);
}

if (errors.length) {
  console.error(`\n스모크 체크 실패 ✗ (${errors.length}건)`);
  process.exit(1);
}
console.log("\n스모크 체크 통과 ✓ (오류 0건)");
