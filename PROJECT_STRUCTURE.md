# AX_CAMP Structure

> 최종 갱신: 2026-07-21 (리팩토링 4단계). 콘텐츠 작성 규칙은 `docs/CONTENT_GUIDE.md` 참조.

## 1) 루트 구조

```text
AX_CAMP/
├─ server.js                     # 단일 파일 Node HTTP 서버 (의존성 0, 포트 4071)
├─ package.json
├─ README.md
├─ PROJECT_STRUCTURE.md
├─ public/                       # 클라이언트 UI (vanilla JS)
│  ├─ app.js
│  ├─ deck-data.json             # 슬라이드 덱 19종 데이터 (리팩토링 3단계에서 app.js로부터 분리)
│  └─ styles.css
├─ data/                         # 로컬 런타임 상태 (users.json 등, gitignore)
├─ content/
│  └─ axcamp/                    # 수업 콘텐츠 원본
├─ scripts/                      # 빌드·정합성 도구
│  ├─ compiler.js                # 카탈로그 컴파일 (getCatalog/buildCatalog)
│  ├─ clip-artifacts.js          # 파생 파일 생성 공유 모듈 (리팩토링 1단계)
│  ├─ regen-clip.js              # content.html → md/txt/metadata 재생성 CLI
│  ├─ lint-content.mjs           # 콘텐츠 정합성 린트 5종 (리팩토링 2단계)
│  ├─ build-pages.mjs            # GitHub Pages용 정적 스냅샷 생성
│  └─ preview-pages.mjs          # 정적 빌드 로컬 프리뷰
├─ docs/                         # 운영 문서 (CONTENT_GUIDE, 브라우저 자동화 런북 등)
├─ _archive/                     # 고아·중복 자산 보관소 (삭제 금지 원칙, 이동 기록은 _archive/README.md)
├─ lecture_note/                 # 강의 시나리오 및 오프닝 멘트 등 강의노트 아카이브
└─ _backup_chapters_original/    # 리팩토링 이전의 구식 원본 chapters 백업
```

## 2) 콘텐츠 구조

```text
content/axcamp/
├─ export-report.json               # 코스 카탈로그 (챕터 순서 + 클립 목록)
├─ visible-catalog-overrides.json   # 표시 제목/시간/클립명 오버라이드
├─ deliverables.json                # 산출물 13종 단일 원장 (lint가 파일명 일치 검사)
├─ README.md
├─ chapters/
│  ├─ CH00/    # 과정 안내 (클립 1)
│  ├─ CH01/    # 리더를 위한 AI 핵심 (클립 4)
│  ├─ CH02/    # 리더 역할 및 역량 점검 — ChatGPT 실습 (클립 4)
│  ├─ CH03/    # 조직(팀) 역량 점검 (클립 2, clip02는 참고_Gemini 및 Gems 소개)
│  ├─ CH04/    # 우리 팀의 성장역량 향상 실천 — NotebookLM (클립 2)
│  ├─ CH05/    # 오늘의 핵심 요약 (클립 2)
│  └─ CH06/    # 참고자료 라이브러리 (클립 11)
├─ [공유용] LG 리더십 향상 with AI 실습자료/
├─ practice_zips/
└─ survey/
```

각 클립 폴더에는 보통 아래 파일이 있다.

- `content.html` — 렌더링 정본. **직접 수정 후 반드시 `npm run regen:clip -- <clipKey>` 실행**
- `content.md` / `content.txt` / `metadata.json` — content.html에서 재생성되는 파생 파일 (직접 수정 금지)
- `screenshot.png` 또는 `screenshots/`
- `assets/` 또는 실습 보조 파일

각 물리 챕터 폴더에는 `chapter.json`이 있으며, root 사이드바 수정 시 이 파일도 함께 갱신된다.

## 3) 서버 로딩 규칙

- 콘텐츠 루트 탐색 우선순위
  1. `AX_CAMP/content/axcamp`
  2. `../axcamp` (fallback)
- 기본 코스 slug: `axcamp`
- 챕터 카탈로그는 `content/axcamp/export-report.json` 기준 (`scripts/compiler.js`가 컴파일·캐시)
- visible 제목/시간/클립명 오버라이드는 `visible-catalog-overrides.json` 기준
- 클립 렌더링은 `content.html` 우선, 없으면 `content.md`/`content.txt` fallback

## 4) 라우트 ↔ 물리 폴더 매핑 (2026-07-21 기준: 26개 클립 전부 1:1)

현재 export-report.json의 모든 클립은 라우트(`#chXX-clipYY`)와 물리 폴더
(`chapters/CHXX/chXX-clipYY`)가 1:1로 일치한다 (총 26개, 불일치 0).

단, **visible↔canonical 매핑 레이어는 여전히 살아 있는 설계**다. `server.js`의
`toVisibleClipKey`/`toVisibleChapterId`와 재작성 함수들은 폴더 재구성 시 기존 링크·저장본을
지키기 위한 간접층이므로, ID가 어긋나 보여도 "고치지" 말 것 (CLAUDE.md 참조).
표시되는 챕터·클립 구성은 파일시스템이 아니라 블루프린트 레이어
(`server.js` 카탈로그 + `public/app.js`의 `CLIENT_CATALOG_BLUEPRINTS` /
`HIDDEN_CLIP_KEYS_REDIRECT_SET`)가 결정한다. 숨김 처리된 항목은 `[HIDDEN]` 주석과
복구 방법이 코드에 남아 있다 (예: ch00-clip02, ch04-clip05, 구 CH05 AI Studio/Vibe Coding 계열).

## 5) 정적/다운로드 라우트

- `/course-files/{courseCode}/{clipKey}/...` -> 각 클립 폴더 내부 리소스
- `/practice-files/{key}` -> `PRACTICE_FILE_MAP`에 정의된 실습 파일 및 zip
- `/deck-data.json` -> 슬라이드 덱 19종 데이터 (app.js가 기동 시 1회 로드)

## 6) 역할 분리

- `server.js`: 저작/운영 API, 로그인, 카탈로그, 저장, 퍼블리시(git push)
- `public/`: 클라이언트 UI
- `content/axcamp/`: 현재 수업 콘텐츠 원본
- `scripts/`: 정적 빌드·파생 파일 재생성·린트 도구

## 7) Secret 관리 원칙

**브라우저로 전달되는 HTML/JS/정적 빌드에는 어떤 형태의 토큰·API key·인증정보도 넣지 않는다.**
난독화(Base64, 문자열 역순 등)는 암호화가 아니므로 금지 우회 수단이 될 수 없다.

- 2026-07-23 보안 조치로 ch02-clip02의 브라우저 업로드 경로와 내장 토큰을 제거했다.
  과거에 사용된 토큰은 폐기(revoke) 대상이다.
- 외부 API 연동이 필요한 기능은 서버 측(server.js)에서 처리하고, 자격증명은
  환경변수 또는 사내 인증 저장소(secret manager)에서 주입한다.
- GitHub 저장소에는 secret scanning·push protection을 활성화하고,
  커밋 전 secret 스캔을 습관화한다.
