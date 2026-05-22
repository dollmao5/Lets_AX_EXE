# [Project - AGENTS.md] 브라우저 자동화 규칙 (Browser Automation Rules)

## 1. 포트 및 서버 보호 규칙
- `AX_CAMP` 프로젝트의 `4071` 포트는 사용자가 유지하는 보호 포트이므로, 프로세스를 죽이거나 교체(Kill/Restart)하지 말 것.
- **UI 검증 기본값:** 사용자가 로컬에서 `npm start`로 서버를 실행하면, AI는 Playwright를 사용해 해당 로컬 서버 UI에 attach(연결)하는 방식을 기본으로 사용함.

## 2. 서비스별 자동화 운영 가이드
- **NotebookLM:** UI 중심 작업 시 Playwright 사용을 최우선으로 함. 로그인 화면이 나타나면 작업을 멈추고 사용자가 '동일한 Playwright 탭'에서 로그인할 때까지 대기한 후, 이어서 제어를 진행할 것. (대기 상태 유지를 위해 Playwright는 `headless: false` 설정을 기본으로 할 것)
- **Gmail:** 작업 유형에 따라 도구를 이원화함.
  - *Gmail Tool 우선:* 단순 발송, 검색, 초안 생성, 라벨 작업
  - *Playwright 웹 경로 사용:* 첨부파일 포함 발송, Compose UI 검토, 브라우저상 최종 확인이 필요한 경우 (단, '이미 로그인된 동일 Playwright 탭'이 있을 때만 허용)
  - *웹 첨부 발송 검증 범위:* Inbox 진입 ➔ 편지쓰기 ➔ 수신자/제목/본문 입력 ➔ 로컬 파일 첨부 ➔ 실제 발송 단계까지 엄격히 준수.
- **Genspark:** 브라우저 우선 검토 대상으로 유지하되 로그인, 업로드, 생성, 다운로드 등 전 과정이 완벽히 검증되기 전까지는 '후보(Candidate) 상태'로 취급할 것.

## 3. 운영 및 문서화 준수 사항
- 일반 Chrome 브라우저 프로필과 Playwright 프로필을 동시에 공유하여 멀티 프로세스로 운영하는 방식은 기본적으로 금지함.
- **문서화 원칙:** 실제로 성공이 확인된 자동화 경로만 '표준(Standard)'으로 승격하고, 미검증된 흐름은 상용화하지 않고 '후보(Candidate)'로 남겨둘 것.

## 4. 참고 문서 (References)
- 상세 운영 매뉴얼: `docs/BROWSER_AUTOMATION_RUNBOOK.md`
- 전역 반영용 스니펫: `docs/GLOBAL_AGENTS_BROWSER_SNIPPET.md`
*(주의: 로컬 환경에 따라 절대 경로가 다를 수 있으므로, 반드시 현재 워크스페이스 루트를 기준으로 한 상대 경로로 우선 탐색할 것)*