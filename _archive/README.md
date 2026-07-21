# _archive — 보관 자산 이동 기록

리팩토링 4단계(자산 위생, 2026-07-21)에서 이동한 고아·중복 자산 보관소입니다.
**삭제가 아니라 보관**입니다. 원래 경로 구조를 그대로 유지하므로, 복구는 해당 파일을
같은 상대 경로로 `git mv`로 되돌리면 됩니다.

## 이동 기록 (2026-07-21, 리팩토링 4단계)

| 파일 (원래 경로 기준) | 사유 |
|---|---|
| `content/axcamp/chapters/CH00/ch00-clip01/content (1).txt` | 중복 사본 — 정본은 같은 폴더의 `content.txt` |
| `content/axcamp/chapters/CH00/ch00-clip01/metadata (1).json` | 중복 사본 — 정본은 같은 폴더의 `metadata.json` |
| `content/axcamp/chapters/CH06/ch06-clip10/metadata (1).json` | 중복 사본 — 정본은 같은 폴더의 `metadata.json` |
| `public/runtime-overrides/ch00-clip02.html` (외 2종) | 소비 코드 없음 — `app.js`의 `CLIENT_RUNTIME_CLIP_OVERRIDE_URLS`가 빈 객체로, 어떤 URL도 등록돼 있지 않음 (2026-07-20 감사에서 확인). 오버라이드 메커니즘 자체(`applyRuntimeClipOverride`)는 app.js에 유지됨 |
| `public/assets/notebooklm/concept-foundation/expert-ai-core-concepts-guide - 복사본.png` / `.pptx` | 중복 사본 — 정본은 같은 폴더의 `expert-ai-core-concepts-guide.png` 등. 콘텐츠에서 참조 0건 확인 |

## 복구 방법

```bash
# 예: runtime-overrides 파일 복구
git mv "_archive/public/runtime-overrides/ch01-clip01.html" "public/runtime-overrides/ch01-clip01.html"
```

복구 후 `npm run lint:content`와 로컬 4071 서버 렌더를 확인하세요.
runtime-overrides를 실제로 활성화하려면 `public/app.js`의
`CLIENT_RUNTIME_CLIP_OVERRIDE_URLS`에 `{ "clipKey": "/runtime-overrides/<clipKey>.html" }`
형태로 URL을 등록해야 합니다.

## 규칙

- 이 폴더는 배포 대상이 아닙니다 (`isPublishableGitPath` 허용 목록에 없어 루트 퍼블리시 버튼으로는 스테이징되지 않음).
- 새 자산을 보관할 때는 이 README의 표에 한 줄 추가하고, 원래 경로 구조를 유지해 이동하세요.
