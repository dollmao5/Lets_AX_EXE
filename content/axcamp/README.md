# AX Camp Content Source Tree

- 현행 과정: **팀장 리더십 향상 with AI** (1일 과정)
- 현행 카탈로그: **7 chapters / 30 clips** (CH00~CH06)
- 카탈로그 원천: `export-report.json` + `visible-catalog-overrides.json` (2026-08-10 감사로 현행화)

> 구(舊) 문서 안내: 이 README의 이전 버전은 원본 export(10챕터/44클립, EXAONE·Google AI Studio 체계)를
> 설명했으나, 해당 체계는 폐기되었습니다. 과거 매핑이 필요하면 git 이력을 참고하세요.

## 현행 챕터 구성

| 챕터 | 제목 (chapter.json 기준) | 클립 수 |
| --- | --- | --- |
| `CH00` | 과정 안내 | 1 |
| `CH01` | 리더를 위한 AI 핵심 | 4 |
| `CH02` | 리더 역할 및 역량 점검 | 6 |
| `CH03` | 조직(팀) 성장역량과 일하는 방식 점검 | 4 |
| `CH04` | 우리 팀의 성장역량 향상 실천 | 2 |
| `CH05` | 오늘의 핵심 요약 | 2 |
| `CH06` | 참고자료 라이브러리 | 11 |

- 사이드바 표시 제목은 `visible-catalog-overrides.json`의 짧은 제목, 본문 헤더는 원본 긴 제목을 유지한다 (KEEP-ORIGINAL-TITLE 원칙).
- 클립 폴더 id와 화면 route id는 다를 수 있으며(canonical/visible 매핑) 이는 의도된 설계다.

## Structure

- `chapters/CHxx/...`: canonical clip-by-clip sources (`chapter.json` + 클립 폴더)
- `export-report.json`: chapter/clip catalog (제목·순서·시간 — 계량치는 2026-02-28 스냅샷이라 낡음)
- `visible-catalog-overrides.json`: runtime visible chapter/clip 제목·타입 보정
- `deliverables.json`: 산출물 파일명 원장 — 본문 파일명과 글자 단위 일치, `npm run lint:content`가 검사
- `[공유용] LG 리더십 향상 with AI 실습자료/`: source practice files (`server.js`의 `PRACTICE_FILE_MAP`으로 배포)
- `practice_zips/`: bundled practice archives
- `generated/`: source tree 안에서 합쳐 쓰는 보조 생성 클립
- `survey/`: linked survey assets

## Per Clip Files

- `content.html`: runtime source body (정본)
- `content.md` / `content.txt`: content.html에서 재생성되는 파생 스냅샷 (`npm run regen:clip -- --all`)
- `metadata.json`: links, images, sections, prompts metadata
- `assets/`: root 편집기에서 업로드한 클립 전용 이미지/PDF/오디오/동영상 자료
- `screenshot.png`: exported representative screenshot (일부 클립에는 없음)

## Root 편집기 동기화

- root 계정의 `본문 수정` 저장은 `content.html`을 기준으로 `content.md`, `content.txt`, `metadata.json`을 함께 재생성한다.
- 저장 전 원본은 `.admin-history/` 아래 자동 백업된다.
- root 계정의 자산 업로드는 해당 클립 폴더의 `assets/` 아래 저장되며, 이미지/PDF/오디오/동영상은 미리보기와 HTML 삽입까지 지원한다.
- root 계정의 외부 임베드 보조는 YouTube 주소, 직접 열리는 PDF/이미지/오디오/동영상 URL을 미리보기 후 HTML로 삽입할 수 있다.

## 정리 원칙

- 현재 서비스 런타임의 핵심 입력은 `chapters/`, `generated/`, `export-report.json`, `visible-catalog-overrides.json`이다.
- `external_links/`, `padlet/`, `screenshots/`, `task_check/`, `links-manifest.json`, `verification-report.json` 같은 수집 산출물은 보조 자료이므로 작업 트리에서는 유지하지 않는다.
- 루트의 `content/generated_courses/`는 Builder/생성형 과정 실험용 로컬 출력이며 canonical source tree와 분리해서 관리한다.
