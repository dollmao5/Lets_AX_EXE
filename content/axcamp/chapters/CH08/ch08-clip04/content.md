---
route: "#CH08-clip04"
chapter: "CH06"
title: "외부 APIAPI프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다. 연동"
source_url: "https://lg.cmdspace.work/axcamp#CH08-clip04"
exported_at: "2026-02-28T01:54:12.557Z"
---
CH 08 참고

# 외부 API**API**  
프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다. 연동

Build로 만든 앱에 외부 데이터 소스를 연결하여 실시간 정보를 다루는 두 가지 경로를 안내합니다.

이 실습에서는

• 초급(Google Search 그라운딩)과 상급(Firecrawl API**API**  
프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.) 두 경로의 차이를 이해합니다  
• 각 경로의 장단점과 적합한 활용 상황을 파악합니다  
• 본인 수준에 맞는 실습 경로를 선택합니다

초급 vs 상급 경로 비교

<table class="comparison-table"><thead><tr><th></th><th>초급: Google Search 그라운딩</th><th>상급: Firecrawl <span class="glossary-term">API<span class="glossary-tooltip"><strong>API</strong><br>프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.</span></span> 연동</th></tr></thead><tbody><tr><td><strong>사전 준비</strong></td><td>없음 (AI Studio 내장)</td><td>Firecrawl <span class="glossary-term">API<span class="glossary-tooltip"><strong>API</strong><br>프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.</span></span> 키 필요</td></tr><tr><td><strong>검색 범위</strong></td><td>Google 검색 결과 기반</td><td>특정 웹페이지 직접 크롤링</td></tr><tr><td><strong>데이터 깊이</strong></td><td>뉴스 헤드라인·요약 수준</td><td>페이지 전체 콘텐츠 추출</td></tr><tr><td><strong>활용 예시</strong></td><td>경쟁사 뉴스 모니터링</td><td>IR 페이지, 기술 블로그 정밀 분석</td></tr><tr><td><strong>소요 시간</strong></td><td>~15분</td><td>~25분</td></tr></tbody></table>

주요 연동 가능 API**API**  
프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.

-   **Google Search API**API**  
    프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.:** Gemini**Gemini**  
    Google이 만든 AI예요. 텍스트뿐 아니라 이미지, 음성, 영상까지 한꺼번에 이해하고 처리할 수 있습니다. 오늘 실습에서 주로 사용하는 AI예요.의 구글 검색 기능을 앱에 직접 연결 (초급 경로)
-   **Firecrawl:** 웹페이지를 AI가 읽을 수 있는 마크다운으로 변환 (상급 경로)
-   **SerpAPI:** 검색 엔진 결과를 구조화된 데이터로 제공
-   **News API**API**  
    프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다.:** 실시간 뉴스 데이터를 수집하여 분석

초급 / 상급 분기

• **초급반**: 위 메인 프롬프트만 사용 → Google Search 그라운딩으로 기본 리서치 앱 완성 (~15분)  
• **상급반**: 메인 프롬프트 + Firecrawl API**API**  
프로그램끼리 대화하는 통로예요. 마치 레스토랑의 웨이터처럼, 주문(요청)을 주방(서비스)에 전달하고 요리(결과)를 가져다줍니다. 연동 → 직접 크롤링 기능 추가 (~25분)  
• 두 버전 모두 **코딩 없이 프롬프트만으로** 완성됩니다

[← 파라미터 직접 체험](#CH08-clip03) [실습 시트: 앱 만들기 →](#CH08-clip05)
