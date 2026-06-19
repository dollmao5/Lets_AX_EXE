---
route: "#CH08-clip01"
chapter: "CH06"
title: "Google AI Studio 설정"
source_url: "https://lg.cmdspace.work/axcamp#CH08-clip01"
exported_at: "2026-02-28T01:54:04.171Z"
---
~10분 CH 07 플랫폼

# Google AI Studio 설정

교육 실습에 사용할 GCP(Google Cloud Platform) 무료 계정을 등록하고 AI Studio에 접속합니다.

영상 가이드

영상을 따라하면서 아래 단계를 진행해 주세요

비용 안내

• 신규 가입 시 제공되는 **$300 무료 크레딧**을 사용하므로 개인 비용이 청구되지 않습니다  
• 본인 확인을 위한 신용카드 등록 과정이 있지만, **유료 계정으로 직접 업그레이드하기 전까지는 자동 결제되지 않습니다**

Step 1. 구글 클라우드 접속

구글에 **gcp**를 검색하거나 [cloud.google.com/free](https://cloud.google.com/free)에 접속하여 메인 화면의 '무료로 시작하기' 버튼을 클릭합니다.

![GCP 검색 화면](https://i.imghippo.com/files/sAG9723FZI.jpg)

구글에서 'gcp' 검색 후 최상단 Google Cloud 링크 클릭

![GCP 메인 화면](https://i.imghippo.com/files/fBta2607X.jpg)

'무료로 시작하기' 버튼 클릭

Step 2. 국가 선택 및 약관 동의 (1/2단계)

로그인 후 나오는 첫 번째 화면입니다.

-   **국가:** '대한민국' 확인 (또는 선택)
-   **약관:** 서비스 약관 동의 체크 후 **\[계속\]** 클릭

![국가 선택 및 약관 동의 화면](https://i.imghippo.com/files/zvZ3830NB.jpg)

가입 1단계: 국가 선택 및 약관 동의 체크박스

Step 3. 본인 인증 및 결제 정보 등록 (2/2단계)

계정 유형과 주소, 카드를 등록합니다.

-   **계정 유형:** 개인
-   **주소:** 본인 주소 입력
-   **결제 수단:** 해외 결제 가능한 카드 정보 입력

참고

영상 가이드에서는 개인정보 보호를 위해 상세 입력 과정이 생략되었습니다.

![고객 정보 입력 화면](https://i.imghippo.com/files/aQur3249eQ.jpg)

가입 2단계: 고객 정보 및 결제 정보 입력란

![결제 설정 처리 화면](https://i.imghippo.com/files/zfwb6451X.jpg)

결제 설정 처리 중 로딩 화면

Step 4. 가입 완료 및 콘솔 진입

설문 팝업이 뜨면 답변하거나 건너뛰세요. **'My First Project'**라는 문구와 함께 환영 메시지가 보이면 성공입니다.

![GCP 환영 화면](https://i.imghippo.com/files/daLH2042Y.jpg)

GCP 콘솔 로딩 후 환영 메시지 화면

Step 5. Google AI Studio 접속

주소창에 [**aistudio.google.com**](https://aistudio.google.com)을 입력하여 이동합니다.

![AI Studio 접속 화면](https://i.imghippo.com/files/nzDx9281SrI.jpg)

브라우저 주소창에 aistudio.google.com 입력

Step 6. 좌측 메뉴에서 주요 기능 확인

AI Studio에 접속하면 좌측 사이드바에 다음 메뉴가 표시됩니다:

-   **Home:** AI Studio 대시보드 (시작 화면)
-   **Playground:** AI와 대화하며 파라미터를 조절하는 실험 공간
-   **Build:** 코드 기반 웹앱을 자연어로 생성하는 빌더
-   **Dashboard:** API**API**  
    프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다. 사용량 및 프로젝트 관리
-   **Documentation:** API**API**  
    프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다. 문서 및 가이드

오후 실습 안내

오전에 Gemini**Gemini**  
Google이 만든 AI예요. 텍스트뿐 아니라 이미지, 음성, 영상까지 한꺼번에 이해하고 처리할 수 있습니다. 오늘 실습에서 주로 사용하는 AI예요. 채팅으로 질문/답변을 했다면, 오후에는 AI Studio에서 **직접 앱을 만들고 API**API**  
프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.를 연결**합니다. Playground에서 파라미터를 조절해 보고, Build에서 실제 웹앱을 만들어 봅니다.

[← 실습 시트](#CH04-clip05) [유료 API KEY 발급 →](#CH08-clip02)
