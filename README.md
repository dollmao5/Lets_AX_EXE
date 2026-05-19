# AX Camp for Leaders

AXCAMP 학습 포털 웹앱이다.

- 앱 루트: `AX_CAMP/`
- 저작/운영 서버: `server.js`
- 프론트엔드: `public/`
- 강의 콘텐츠 원본: `content/axcamp/`
- GitHub Pages 정적 빌드 스크립트: `scripts/build-pages.mjs`

## 로컬 실행

```bash
npm install
npm start
```

브라우저: `http://localhost:4071/`

## 현재 서비스 구조

현재 화면에는 아래 8개 챕터, 21개 클립만 노출된다.

1. `CH00` 오늘의 여정
2. `CH01` AI 핵심 개념
3. `CH02` Gemini & ChatGPT
4. `CH03` NotebookLM
5. `CH04` Google AI Studio & Vibe Coding
6. `CH05` Hi-D Code
7. `CH06` Key Takeaways & Q/A
8. `CH07` 참고자료 라이브러리

`content/axcamp/chapters/` 아래에는 현재 본 수업에 실제로 사용하는 폴더만 남겨 두었다.

- `CH00` 오늘의 여정
- `CH01` AI 핵심 개념
- `CH02` Gemini & ChatGPT
- `CH03` NotebookLM
- `CH04` Google AI Studio & Vibe Coding
- `CH05` Hi-D Code
- `CH06` Key Takeaways & Q/A
- `CH07` 참고자료 라이브러리

호환성 때문에 `export-report.json`과 각 `chapter.json` 안에는 일부 기존 canonical route id가 유지된다.
예를 들면 실제 폴더는 `chapters/CH02/ch02-clip01`이지만, 내부 route는 `#ch03-clip01`을 유지할 수 있다.
이 구조 덕분에 기존 링크 rewrite, root 편집기 저장, 정적 Pages 변환 로직을 깨지 않고 폴더만 현재 수업 기준으로 정리할 수 있다.

## Root 편집기 반영 범위

- `본문 수정` 저장은 `content.html` 기준으로 `content.md`, `content.txt`, `metadata.json`을 함께 갱신한다.
- `사이드바 수정` 저장은 `visible-catalog-overrides.json`, `export-report.json`, 각 챕터의 `chapter.json`, 해당 클립 `metadata.json`을 갱신한다.
- 이 변경은 `npm start` 런타임과 `npm run build:pages -- --base-path /Lets_AX_EXE` 정적 빌드에 모두 반영된다.

## GitHub Pages 빌드

정적 산출물 생성:

```bash
npm run build:pages -- --base-path /Lets_AX_EXE
```

생성 결과:

- 출력 폴더: `dist-pages/`
- 엔트리 파일: `dist-pages/index.html`, `dist-pages/404.html`
- 정적 데이터: `dist-pages/data/chapters.json`, `dist-pages/data/clips/*.json`
- 복사 자산: `dist-pages/assets/`, `dist-pages/course-files/`, `dist-pages/practice-files/`

정적 배포본에서는 다음이 유지된다.

- 챕터/클립 구조와 hash navigation
- 슬라이드 preview / modal / 다운로드
- 이미지, PDF, 오디오, 동영상, YouTube iframe
- 실습 자료 다운로드와 미리보기

정적 배포본에서는 다음이 비활성화된다.

- 로그인/회원가입
- root 본문 수정 / 사이드바 수정 / 자산 업로드
- 서버 저장형 과제/관리 기능

## Publish

workflow 파일:

- `.github/workflows/pages.yml`

동작 방식:

1. `main` 브랜치 push 또는 수동 실행
2. `npm install`
3. `npm run build:pages -- --base-path "/${repoName}"`
4. `dist-pages/`를 Pages artifact로 업로드
5. GitHub Pages에 배포

배포 URL:

- `https://dollmao5.github.io/Lets_AX_EXE/`

## 폴더 구조

```text
AX_CAMP/
├─ .github/workflows/pages.yml
├─ scripts/build-pages.mjs
├─ server.js
├─ package.json
├─ public/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ content/
│  └─ axcamp/
│     ├─ export-report.json
│     ├─ visible-catalog-overrides.json
│     ├─ chapters/
│     ├─ [공유용] LG AX Camp For Leaders 실습자료/
│     ├─ practice_zips/
│     └─ survey/
└─ README.md
```

## 참고 문서

- [content/axcamp/README.md](content/axcamp/README.md)
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
