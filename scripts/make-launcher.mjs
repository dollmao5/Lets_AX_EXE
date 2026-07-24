// AXCAMP_시작.bat 생성기 — 강사 배포용 원클릭 실행 파일
// 사용: node scripts/make-launcher.mjs
// 로컬 토큰 파일(Github_Fine-grained*.txt)에서 토큰을 읽어 bat에 내장한다.
// 생성물(AXCAMP_시작.bat)은 토큰을 포함하므로 gitignore 대상이며 사내 채널로만 배포한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadToken() {
  const files = fs.readdirSync(ROOT).filter((f) => /^Github_Fine-grained.*\.txt$/i.test(f));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(ROOT, file), "utf8");
    const match = raw.match(/github_pat_[A-Za-z0-9_]+/);
    if (match) return match[0];
  }
  return "";
}

const token = loadToken();
if (!token) {
  console.error("토큰 파일(Github_Fine-grained*.txt)을 찾을 수 없습니다. bat에 데이터 저장소 접근 토큰을 내장할 수 없습니다.");
  process.exit(1);
}

const bat = `@echo off
chcp 65001 >nul
title AXCAMP - 리더십 향상 with AI (교육장 서버)
setlocal
set "HERE=%~dp0"

echo.
echo  ============================================
echo   AXCAMP 리더십 향상 with AI - 교육장 서버
echo  ============================================
echo.

rem ---- 1. Node.js 확인 ----
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] Node.js가 설치되어 있지 않습니다.
  echo      설치 페이지를 엽니다. LTS 버전을 설치한 뒤 이 파일을 다시 실행하세요.
  start https://nodejs.org/ko/download
  pause
  exit /b 1
)

rem ---- 2. 과정 앱 폴더 확인 (bat이 폴더 안에 있으면 그대로, 밖이면 클론) ----
if exist "%HERE%server.js" (
  set "APP=%HERE%"
) else (
  set "APP=%HERE%Lets_AX_EXE"
)

where git >nul 2>nul
if errorlevel 1 (
  if exist "%APP%\\server.js" (
    echo  [i] git이 없어 갱신을 건너뜁니다. 현재 폴더 그대로 실행합니다.
    goto :run
  )
  echo  [!] git이 설치되어 있지 않습니다. 설치 페이지를 엽니다.
  start https://git-scm.com/download/win
  pause
  exit /b 1
)

if exist "%APP%\\server.js" (
  echo  [1/3] 과정 앱 최신화...
  git -C "%APP%" pull --ff-only 2>nul
) else (
  echo  [1/3] 과정 앱 내려받는 중... (1~2분)
  git clone https://github.com/dollmao5/Lets_AX_EXE.git "%APP%"
  if errorlevel 1 ( echo  [!] 내려받기에 실패했습니다. 네트워크를 확인하세요. & pause & exit /b 1 )
)

rem ---- 3. 누적 데이터(프라이빗) 동기화 ----
if exist "%APP%\\data\\wrapup\\.git" (
  echo  [2/3] 누적 데이터 갱신...
  git -C "%APP%\\data\\wrapup" pull 2>nul
) else (
  echo  [2/3] 누적 데이터 내려받는 중...
  git clone https://x-access-token:${token}@github.com/dollmao5/Lets_AX_Wrapup_DATA.git "%APP%\\data\\wrapup" 2>nul
  if errorlevel 1 echo  [i] 누적 데이터가 아직 없거나 접근할 수 없습니다. 새로 시작합니다.
)

:run
rem ---- 4. 서버 시작 (이미 실행 중이면 브라우저만) ----
netstat -ano | findstr /R /C:":4071 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo  [i] 서버가 이미 실행 중입니다. 브라우저를 엽니다.
  start http://localhost:4071
  start http://localhost:4071/wrapup
  pause
  exit /b 0
)

echo  [3/3] 서버를 시작합니다. 이 창을 닫으면 서버가 종료됩니다.
echo        아래에 표시되는 '교육생 접속 주소'를 화이트보드에 적어주세요.
echo.
start http://localhost:4071/wrapup
cd /d "%APP%"
node server.js
pause
`;

const out = path.join(ROOT, "AXCAMP_시작.bat");
fs.writeFileSync(out, bat.replace(/\n/g, "\r\n"), "utf8");
console.log("생성 완료:", out);
console.log("주의: 이 파일에는 데이터 저장소 토큰이 들어 있습니다. 사내 채널로만 전달하세요. (gitignore 등록됨)");
