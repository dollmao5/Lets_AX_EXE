# AX_CAMP Structure

## 1) 루트 구조

```text
AX_CAMP/
├─ server.js
├─ package.json
├─ README.md
├─ PROJECT_STRUCTURE.md
├─ public/
├─ data/
├─ content/
│  └─ axcamp/
└─ scripts/
```

## 2) 콘텐츠 구조

```text
content/axcamp/
├─ export-report.json
├─ visible-catalog-overrides.json
├─ README.md
├─ chapters/
│  ├─ CH00/
│  ├─ CH01/
│  ├─ CH02/
│  ├─ CH03/
│  ├─ CH04/
│  ├─ CH05/
│  ├─ CH06/
│  └─ CH07/
├─ [공유용] LG 성과향상 with AI 실습자료/
├─ practice_zips/
└─ survey/
```

각 클립 폴더에는 보통 아래 파일이 있다.

- `content.html`
- `content.md`
- `content.txt`
- `metadata.json`
- `screenshot.png` 또는 `screenshots/`
- `assets/` 또는 실습 보조 파일

각 물리 챕터 폴더에는 `chapter.json`이 있으며, root 사이드바 수정 시 이 파일도 함께 갱신된다.

## 3) 서버 로딩 규칙

- 콘텐츠 루트 탐색 우선순위
  1. `AX_CAMP/content/axcamp`
  2. `../axcamp` (fallback)
- 기본 코스 slug: `axcamp`
- 챕터 카탈로그는 `content/axcamp/export-report.json` 기준
- visible 제목/시간/클립명 오버라이드는 `visible-catalog-overrides.json` 기준
- 클립 렌더링은 `content.html` 우선, 없으면 `content.md`/`content.txt` fallback

## 4) 현재 서비스 챕터와 물리 폴더

- `CH00` 오늘의 여정 -> `chapters/CH00`
- `CH01` AI 핵심 개념 -> `chapters/CH01`
- `CH02` Gemini & ChatGPT -> `chapters/CH02`
- `CH03` NotebookLM -> `chapters/CH03`
- `CH04` Google AI Studio & Vibe Coding -> `chapters/CH04`
- `CH05` Hi-D Code -> `chapters/CH05`
- `CH06` Key Takeaways & Q/A -> `chapters/CH06`
- `CH07` 참고자료 라이브러리 -> `chapters/CH07`

일부 canonical route id는 과거 export와의 호환성 때문에 유지된다. 예를 들어 `chapters/CH02` 내부 파일은 현재 visible `CH02`이지만 route는 `#ch03-clip01` 같은 값을 가질 수 있다.

## 5) 정적/다운로드 라우트

- `/course-files/{courseCode}/{clipKey}/...` -> 각 클립 폴더 내부 리소스
- `/practice-files/{key}` -> `PRACTICE_FILE_MAP`에 정의된 실습 파일 및 zip

## 6) 역할 분리

- `server.js`: 저작/운영 API, 로그인, 카탈로그, 저장
- `public/`: 클라이언트 UI
- `content/axcamp/`: 현재 수업 콘텐츠 원본
- `scripts/build-pages.mjs`: GitHub Pages용 정적 스냅샷 생성
