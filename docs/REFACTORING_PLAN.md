# 개발자료 관리/운영 리팩토링 계획 (v2)

> 수립일: 2026-07-20 · 상태: **계획 확정, 실행 보류** (필요 시 지시로 착수)
> 근거: 2026-07-20 전 과정 정합성 감사(4-에이전트 병렬)에서 실증된 관리 부담 분석

## 1. 진단 — 실증된 관리 부담 5가지

| # | 문제 | 실제 발생 사례 |
|---|------|---------------|
| P1 | 파생 파일 동기화 수단 부재 — content.html 직접 수정 시 md/txt/metadata가 낡은 채 방치 | ch06-clip09 툴팁 오염, ch01-clip01/03 옛 버전 잔존 (임시 스크립트로 수동 해결) |
| P2 | 참조 체인이 전부 자유 텍스트 — 산출물 파일명·클립 제목·내비 링크가 15개 클립에 복붙되어 드리프트 | 정합성 감사에서 불일치 54곳 (유령 산출물, 파일명 오류, 깨진 링크 `#ch01-clip05`) |
| P3 | 검증 자동화 전무 — 테스트/린터 없음, 배포 전 확인은 수작업 | 매 수정마다 curl+grep 수동 검증 반복 |
| P4 | 거대 단일 파일 — app.js 6,687줄(슬라이드 덱 19개 하드코딩), server.js 3,869줄 | 덱 1개 추가에 app.js 코드 수정 필요 |
| P5 | 고아·중복 자산 누적 — `metadata (1).json`, 미사용 `public/runtime-overrides/`, `복사본` 파일 | 감사 시 판별 비용 발생 (runtime-overrides 소비 코드 없음 확인됨) |

## 2. 리팩토링 원칙 (저장소 철학 유지)

- 의존성 0, 단일 파일 Node 서버 구조는 **유지** — 프레임워크 도입 없음
- **비파괴** — 삭제 대신 `_archive/` 이동 + 복구 주석 (기존 `[HIDDEN]`/복구 규약 준수)
- visible↔canonical 매핑, 숨김 블루프린트 레이어는 **비접촉**
- 모든 개선은 "스크립트 1개 추가" 수준의 작은 단위, 단계별 커밋

## 3. 공통 실행 프로토콜 (전 단계 적용)

```
[Safe Apply]  합의된 Diff 파일만 수정. server.js 코어 로직·기존 예외 처리·
              [HIDDEN]/복구 주석·visible↔canonical 매핑은 절대 비접촉
[Verify]      수정 직후 → node --check (문법) → 실행 중인 4071 서버에 curl 테스트
              (서버는 node --watch 자동 재시작 — 프로세스는 절대 kill 하지 않음)
[Rollback]    검증 실패 시 즉시 git checkout -- <해당 파일> 원복 → 에러 로그 보고
[Report]      매 단계: [수정 완료 파일] / [빌드 및 검증 결과] / [Git 상태] 3종 보고
[Commit]      단계별 커밋(승인 후), 푸시는 지시 시
```

## 4. 단계별 계획

### 1단계: 파생 파일 재생성 도구 정식화 — P1 해결 (효과 大, 위험 小, ~1시간)

| 항목 | 내용 |
|------|------|
| Diff 범위 | ① `scripts/clip-artifacts.js` 신규 — server.js의 `stripHtmlToText`(L1533)·`buildMarkdownDocument`(L1841)·`buildMetadataFromHtml`(L1865) 및 내부 의존 함수를 추출한 공유 모듈 ② `server.js` — 함수 정의부를 require 호출로 대체하는 최소 diff (로직 이동만, 수정 없음) ③ `package.json` — `regen:clip` 스크립트 1줄 |
| 비접촉 보존 | server.js 라우팅 if-체인, 인증, publish 로직 전체 |
| 검증 | `node --check` → 4071 자동 재시작 후 `/api/chapters` 200 → `/api/clips/ch02-clip01` 응답 리팩토링 전과 바이트 동일 비교 → `regen:clip` 실행 결과가 기존 산출물과 diff 없음 |
| 롤백 기준 | 서버 기동 실패, API 응답 1바이트라도 변화 시 |

### 2단계: 콘텐츠 린트 — P2·P3 해결 (핵심, ~2시간)

| 항목 | 내용 |
|------|------|
| Diff 범위 | ① `content/axcamp/deliverables.json` 신규 — 산출물 단일 원장 (2026-07-20 감사로 확정: 필수 8종 + 권장 1종 `CH03_우리팀_성과구조와_행동역량_종합본`) ② `scripts/lint-content.mjs` 신규 (읽기 전용) ③ `package.json` 1줄 ④ (승인 시) `.github/workflows/pages.yml`에 lint 게이트 |
| 검사 항목 | 파일명↔원장 일치 / 내비 href 실존(노출 클립 기준) / 이미지 src 실존 / 금칙어(CH00~05 본문의 Gemini·전사·Preview 창 — ch03-clip02 참고클립 예외) / html↔metadata 신선도(해시) |
| 검증 | 현 저장소 lint 0건 통과가 기대값 → 오타 1개 주입 → 검출 확인 → 원복 |
| 롤백 기준 | 읽기 전용이라 콘텐츠 위험 없음. pages.yml 수정 실패 시만 원복 |

### 3단계: app.js 덱 데이터 분리 — P4 완화 (2단계 안정 후, ~2시간)

| 항목 | 내용 |
|------|------|
| Diff 범위 | ① `public/deck-data.json` 신규 (덱 19개 정의 이동) ② `app.js` 빌더 함수 → JSON 로더 대체 (약 −1,500줄) |
| 비접촉 보존 | `CLIENT_CATALOG_BLUEPRINTS`, `HIDDEN_CLIP_KEYS_REDIRECT_SET`, 라우팅·DOM 로직 전체 |
| 검증 | 덱 사용 클립 6종 갤러리 렌더·확대 모달·다운로드 동작 + `npm run build:pages` 통과 |
| 롤백 기준 | 갤러리 1개라도 미표시 시 전체 원복 (부분 적용 금지) |

### 4단계: 자산 위생·기준 문서 — P5 해결 (~반나절)

| 항목 | 내용 |
|------|------|
| Diff 범위 | ① `_archive/`로 git mv: `metadata (1).json`, `복사본` 파일, 미사용 runtime-overrides (+이동 기록) ② `PROJECT_STRUCTURE.md` 갱신 — CH01 canonical 7↔visible 4 매핑표, 토큰 정책 ③ `docs/CONTENT_GUIDE.md` 신규 — 용어 사전(토론 대화문/비서 프롬프트/GPTs 사용·생성), 프롬프트 배지 5종 정의 정본, 산출물 명명 규칙 |
| 검증 | 이동 후 4071 전 클립 200 + 정적 빌드 통과 |
| 롤백 기준 | 어떤 클립이든 렌더 변화 발생 시 |

### 5단계: 운영 자동화 (여유 시, ~1시간)

- `scripts/smoke-check.mjs`: build:pages 산출물의 chapters.json·핵심 마커 자동 검증 → pages.yml 연결
- GitHub 토큰(fine-grained, Lets_AX_EXE 한정·contents만) **만료 2026-12-31** — 갱신 절차: 신규 발급 → ch02-clip02 난독화 교체(역순+Base64) → 배포 확인 → 구 토큰 폐기

## 5. 우선순위 요약

| 단계 | 효과 | 위험 | 권장 시점 |
|------|------|------|----------|
| 1. regen 도구화 | ★★★ | 낮음 | 우선 |
| 2. 콘텐츠 린트 | ★★★ | 낮음 | 우선 (1과 병행 가능) |
| 3. 덱 데이터 분리 | ★★ | 중간 | 1·2 안정 후 |
| 4. 자산 위생·문서 | ★★ | 낮음 | 1·2와 병행 가능 |
| 5. 운영 자동화 | ★ | 낮음 | 여유 시 |
