# AX Camp Reproduction Pack

- Source: `https://lg.cmdspace.work/axcamp`
- Exported source snapshot: `2026-02-28T01:54:59.030Z`
- Canonical source catalog: `10 chapters / 44 clips`
- Current runtime catalog: `8 visible chapters / 35 visible clips`

## 핵심 설명

이 폴더는 원본 export를 보존하는 canonical source tree다.

- `chapters/CH02`의 EXAONE 콘텐츠는 폴더상으로 남아 있다.
- 하지만 현재 웹앱 런타임에서는 `CH02` 클립 4개를 제외한다.
- 그 뒤로는 `CH05`와 `CH06`이 합쳐져 `CH04`로 보이고, `CH07`과 `CH08`은 `CH07` 참고자료 라이브러리로 묶인다.
- `CH09`는 `CH06` Key Takeaways & Q/A로 보인다.

즉, 이 폴더의 번호와 실제 웹페이지에 보이는 챕터 번호는 일부 다를 수 있다.

## 현재 매핑

| canonical source | title | visible runtime |
| --- | --- | --- |
| `CH00` | 오늘의 여정 | `CH00` |
| `CH01` | AI 핵심 개념 | `CH01` |
| `CH02` | EXAONE | hidden |
| `CH03` | Gemini & ChatGPT | `CH02` |
| `CH04` | NotebookLM | `CH03` |
| `CH05` + `CH06` | Google AI Studio & Vibe Coding | `CH04` |
| `generated/hid-code/ch05-clip01` | Hi-D Code | `CH05` |
| `CH09` | Key Takeaways & Q/A | `CH06` |
| `CH07` + `CH08` | 참고자료 라이브러리 / Agentic AI | `CH07` |

## Structure

- `chapters/CHxx/...`: canonical clip-by-clip exports
- `export-report.json`: canonical chapter catalog
- `visible-catalog-overrides.json`: runtime visible chapter / clip 제목 보정
- `[공유용] LG 성과향상 with AI 실습자료/`: source practice files
- `practice_zips/`: bundled practice archives
- `generated/`: source tree 안에서 합쳐 쓰는 보조 생성 클립
- `survey/`: linked survey assets

## Per Clip Files

- `content.md`: markdown snapshot
- `content.html`: runtime source body
- `content.txt`: plain text snapshot
- `metadata.json`: links, images, sections, prompts metadata
- `assets/`: root 편집기에서 업로드한 클립 전용 이미지/PDF/오디오/동영상 자료
- `screenshot.png`: exported representative screenshot

## Root 편집기 동기화

- root 계정의 `본문 수정` 저장은 `content.html`을 기준으로 `content.md`, `content.txt`, `metadata.json`을 함께 재생성한다.
- 저장 전 원본은 `.admin-history/` 아래 자동 백업된다.
- root 계정의 자산 업로드는 해당 클립 폴더의 `assets/` 아래 저장되며, 이미지/PDF/오디오/동영상은 미리보기와 HTML 삽입까지 지원한다.
- root 계정의 외부 임베드 보조는 YouTube 주소, 직접 열리는 PDF/이미지/오디오/동영상 URL을 미리보기 후 HTML로 삽입할 수 있다.

## 정리 원칙

- 현재 서비스 런타임의 핵심 입력은 `chapters/`, `generated/`, `export-report.json`, `visible-catalog-overrides.json`이다.
- `external_links/`, `padlet/`, `screenshots/`, `task_check/`, `links-manifest.json`, `verification-report.json` 같은 수집 산출물은 보조 자료이므로 작업 트리에서는 유지하지 않는다.
- 루트의 `content/generated_courses/`는 Builder/생성형 과정 실험용 로컬 출력이며 canonical source tree와 분리해서 관리한다.
