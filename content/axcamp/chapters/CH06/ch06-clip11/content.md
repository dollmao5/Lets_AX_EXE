---
route: "#CH06-clip11"
chapter: "ch06"
title: "웹 스타일 프롬프트 가이드"
source_url: "https://lg.cmdspace.work/axcamp#CH06-clip11"
---

CH 06
참고

# 웹 스타일 프롬프트 가이드

앱을 만들기 전에 구조와 표현법을 같이 지정하면 결과가 훨씬 안정적입니다. 이 가이드는 4개의 톤 패밀리와 4개의 레이아웃 문법을 조합해 16개의 스타일 방향을 빠르게 고를 수 있게 정리한 레퍼런스입니다.

## 4×4 스타일 매트릭스

스타일을 요청할 때는 하나의 이름만 던지기보다 **톤 패밀리 + 레이아웃 문법 + 용도 + 피할 요소**를 함께 말해주는 것이 좋습니다. 아래 매트릭스는 그 조합이 16가지 방향으로 펼쳐질 수 있음을 보여줍니다. **각 카드를 누르면 Gemini·ChatGPT에 바로 붙여 넣을 수 있는 full prompt deck**이 열립니다.

Tone family: Minimal / Scandinavian / Neo Brutal / Poster
Layout grammar: Grid / System / Pop / Stage

### 이전 4개 예제는 대각선 축입니다

**Minimal Grid**, **Scandinavian System**, **Neo Brutal Pop**, **Poster Stage**는 가장 이해하기 쉬운 대표 조합입니다. 하지만 실제 실습에서는 그 사이 조합이 더 유용할 때가 많습니다.

Grid

정렬, 표, 규칙선이 먼저 보이는 보고서형 문법

System

모듈 카드와 유틸리티 패널이 중심인 도구형 문법

Pop

CTA, 포인트 컬러, 데모성이 먼저 읽히는 강조형 문법

Stage

큰 타이포와 장면 연출로 메시지를 먼저 세우는 발표형 문법

Minimal × Grid

Minimal Grid

백색 기반, 얇은 선, 정렬 중심. 임원 보고용 대시보드와 리서치 화면에 가장 무난하다.

White baseThin rulesStrict grid

“Minimal Grid 스타일로, 흰 배경·얇은 선·정렬된 표 중심으로 구성하고 장식 그래픽은 줄여줘.”

Minimal × System

Minimal System

모듈형 카드와 조용한 인터페이스. 사내 포털, 분석 도구, 관리형 앱에 잘 맞습니다.

Modular cardsQuiet UIDense utility

“Minimal System 스타일로, 기능 카드 간 간격을 일정하게 두고 조용한 사내 도구처럼 정리해줘.”

Minimal × Pop

Minimal Pop

대체로 절제되어 있지만, 한두 개의 포인트 컬러와 CTA로 핵심 메시지를 밀어준다.

Single accentClean CTASparse motion

“Minimal Pop으로, 전체는 절제하되 핵심 버튼과 KPI 카드만 강하게 띄워줘.”

Minimal × Stage

Minimal Stage

큰 타이포와 넓은 여백을 쓰지만 과장되지는 않는다. 메시지 중심의 단일 화면에 적합합니다.

Big typeWide spaceQuiet hero

“Minimal Stage로, 큰 타이포와 여백은 쓰되 과장된 그래픽 없이 담백한 발표 첫 화면처럼 만들어줘.”

Scandinavian × Grid

Scandinavian Grid

따뜻한 중성톤과 정돈된 표 구성. 숫자는 많지만 차갑게 보이고 싶지 않을 때 좋습니다.

Warm neutralSoft ruleReport feel

“Scandinavian Grid 느낌으로, 웜 뉴트럴 톤의 리서치 보드처럼 정리해줘.”

Scandinavian × System

Scandinavian System

부드러운 카드, 생활 브랜드 같은 균형. 서비스 소개형 앱이나 깔끔한 내부 포털에 적합합니다.

Soft cardsNatural gapUsable calm

“Scandinavian System으로, 생활가전 브랜드처럼 차분하고 따뜻한 내부 도구 느낌을 줘.”

Scandinavian × Pop

Scandinavian Pop

온화한 바탕 위에 산뜻한 포인트를 얹는다. 임원용이지만 너무 딱딱하지 않게 만들 때 좋습니다.

Warm accentFriendly CTASoft contrast

“Scandinavian Pop으로, 차분한 톤을 유지하되 버튼과 핵심 카드에는 산뜻한 포인트를 줘.”

Scandinavian × Stage

Scandinavian Stage

편안한 색감과 넓은 여백을 쓰는 발표형 스타일. 서비스 비전 소개나 브랜드 톤 설명에 적합합니다.

Warm heroSoft focusCalm narrative

“Scandinavian Stage로, 부드러운 톤의 발표용 비전 화면처럼 만들어줘.”

Neo Brutal × Grid

Neo Brutal Grid

표와 카드 구조는 유지하되 보더와 대비를 세게 준다. 교육용 실습 대시보드에 잘 맞습니다.

Heavy borderSharp blocksData punch

“Neo Brutal Grid로, 데이터 보드는 유지하되 두꺼운 경계와 강한 컬러 블록을 써줘.”

Neo Brutal × System

Neo Brutal System

기능 구조는 사내 앱처럼 두되, 시각 톤은 대담하게 끌어올린다. 데모용 관리 앱에 효과적입니다.

Bold utilityFlat colorStrong CTA

“Neo Brutal System으로, 기능 화면은 유지하되 시각적 임팩트가 강한 데모 앱처럼 바꿔줘.”

Neo Brutal × Pop

Neo Brutal Pop

두꺼운 보더, 큰 대비, 직설적인 CTA. 짧고 강한 메시지나 교육용 데모 앱에 가장 잘 먹힌다.

BorderPunchCTA

“Neo Brutal Pop 스타일로, 두꺼운 검은 보더와 큰 제목, 직설적 버튼을 써줘.”

Neo Brutal × Stage

Neo Brutal Stage

포스터 같은 대형 문구를 쓰되, 브루탈 톤으로 더 공격적으로 밀어붙이는 런칭형 화면입니다.

Huge headlineThick frameShowtime

“Neo Brutal Stage로, 포스터형 대문짝 타이포와 보더 중심의 강한 히어로를 만들어줘.”

Poster × Grid

Poster Grid

정보 보드 구조는 유지하면서도 타이포와 명암을 포스터처럼 크게 다룹니다. 시연용 브리핑에 좋습니다.

Big contrastStructured boardHero headline

“Poster Grid로, 정보는 표와 카드로 유지하되 제목과 대비는 포스터처럼 강하게 잡아줘.”

Poster × System

Poster System

서비스형 구조에 에디토리얼한 타이포를 얹는다. 메시지와 기능을 동시에 강조해야 할 때 유용합니다.

Editorial UIDark baseNarrative blocks

“Poster System으로, 기능 앱 구조는 유지하되 에디토리얼 타이포와 다크 배경을 써줘.”

Poster × Pop

Poster Pop

광고처럼 큰 메시지와 강한 포인트 컬러를 전면에 둔다. 제품 데모나 이벤트용 앱에 맞다.

Ad-likeBold accentQuick impact

“Poster Pop으로, 광고 같은 큰 메시지와 포인트 컬러가 먼저 보이게 만들어줘.”

Poster × Stage

Poster Stage

대형 타이포, 강한 블록, 몰입형 구성이 중심입니다. 런칭형 마이크로사이트나 강한 시연 화면에 적합합니다.

MassContrastDirection

“Poster Stage로, 큰 타이포와 검은 배경, 포스터 같은 섹션 분할로 메시지를 전면에 세워줘.”

브랜드 모드: LG Style

실무에서는 4×4 매트릭스로 구조를 먼저 고른 뒤, 마지막에 **LG Style** 같은 브랜드 모드를 얹어 마감하면 훨씬 안정적입니다. 아래 카드는 LG 로고와 브랜드 톤을 참고해 만든 실무형 프롬프트 프리셋입니다.

![LG 로고 참고 이미지](/assets/reference/lg-logo.png)

Brand overlay

LG Style × System

LG Style

흰 배경, 회색 중심 타이포, 절제된 LG red 포인트를 쓰는 엔터프라이즈 기술 브랜드 프리셋입니다. 임원용 AI 브리핑, 사내 포털, 전략 대시보드에 잘 맞습니다.

LG red accentGray-led typeEnterprise calm

“LG Style로, 흰 배경·밝은 회색 베이스·회색 중심 타이포·절제된 LG red 포인트를 사용하고, 과장된 스타트업 감성은 피해서 임원용 AI 대시보드처럼 만들어주세요.”

### General Prompt 공식

기본 공식은 **X(톤 패밀리) + Y(레이아웃 문법) + Z(색상 모드) + 용도 + 보이는 단서 3개 + 피할 요소 1~2개**입니다. 예: “**X1 + Y2 + Z1** 느낌으로, 임원용 경쟁사 대시보드를 만들어주세요. 흰 배경, 얇은 선, 조용한 유틸리티 패널을 쓰고 장식 그래픽과 과한 그라데이션은 줄여주세요.”

Prompt Code Book

`X/Y/Z` 조합으로 프롬프트를 짜면 화면 톤과 구조를 빠르게 통제할 수 있습니다. 기본 4×4 매트릭스에 색상 축 `Z`를 더하면 **4 × 4 × 6 = 96가지** 방향이 생기고, 여기에 LG Style 같은 브랜드 모드를 얹으면 실무형 변주가 더 늘어납니다.

Prompt = X + Y + Z + Use case + 3 cues + 1~2 avoids
`X2 + Y4 + Z2 + executive research briefing + warm neutral / calm hierarchy / big title + avoid neon`

X · Tone family

| 코드 | 의미 | 핵심 신호 |
| --- | --- | --- |
| X1 | Minimal | 무채색, 얇은 선, 정돈된 정보 위계 |
| X2 | Scandinavian | 웜 뉴트럴, 부드러운 카드, 생활 브랜드 감성 |
| X3 | Neo Brutal | 굵은 보더, 원색 블록, 즉각적 임팩트 |
| X4 | Poster | 다크 베이스, 에디토리얼 타이포, 강한 명암 |
| X+ | Brand overlay | LG Style처럼 마지막에 브랜드 톤을 덧입히는 모드 |
Y · Layout grammar

| 코드 | 의미 | 주요 쓰임 |
| --- | --- | --- |
| Y1 | Grid | 표, 비교, KPI, 보고서형 화면 |
| Y2 | System | 도구형 앱, 사내 포털, 분석 콘솔 |
| Y3 | Pop | 데모, CTA 중심 마이크로 앱, 이벤트 화면 |
| Y4 | Stage | 히어로, 메시지 강조, 발표형 장면 구성 |
Z · Color mode

| 코드 | 의미 | 색감 방향 |
| --- | --- | --- |
| Z0 | Auto | 톤 패밀리 기본 팔레트를 그대로 사용 |
| Z1 | Cool tech | blue / slate / navy 계열로 차갑고 정제된 느낌 |
| Z2 | Warm neutral | sand / oatmeal / brown 계열로 부드럽고 편안한 느낌 |
| Z3 | Bold accent | 원색 또는 포인트 색 1~2개로 강한 강조 |
| Z4 | Dark contrast | charcoal / black / white 중심의 명확한 대비 |
| Z5 | Brand locked | LG red처럼 브랜드 포인트를 제한적으로 적용 |
조합 예시

X1 + Y2 + Z1

차분한 내부 분석 포털

Minimal System에 cool tech palette를 얹어 사내 분석 도구처럼 정리합니다.

X2 + Y4 + Z2

웜 톤 전략 브리핑

Scandinavian Stage와 warm neutral 조합으로 차분한 비전 화면을 만듭니다.

X3 + Y3 + Z3

실습용 데모 마이크로앱

Neo Brutal Pop에 bold accent를 얹어 시선이 즉시 가는 실습 앱을 만듭니다.

X4 + Y1 + Z4

강한 시연용 브리핑 보드

Poster Grid와 dark contrast 조합으로 데이터도 강하게 읽히는 브리핑 보드를 만듭니다.

X1 + Y2 + Z5 + LG

LG 스타일 AI 대시보드

Minimal/System 기반 위에 LG Style overlay를 얹어 브랜드 신뢰감을 더합니다.

X2 + Y3 + Z3

생활형 서비스 데모

Scandinavian Pop으로 친근함과 CTA를 동시에 살린 서비스 소개형 앱입니다.

대표 스타일 브랜드 레퍼런스

직접 복제하라는 뜻이 아니라, 화면이 주는 **결**을 떠올리기 위한 참고 리스트입니다.

Minimal

Apple, Braun, Stripe Docs

Scandinavian

Muji, IKEA, HAY

Neo Brutal

실험적 Figma community demos, Gumroad-era brutal pages, event microsites

Poster

Nike campaign pages, A24, Spotify Wrapped

System grammar

Notion workspace, Atlassian admin, Google Admin

LG Style overlay

LG, LG Display, LG CNS 같은 엔터프라이즈 기술 브랜드 톤

### 색상은 선택 파라미터다

보통은 **톤 패밀리만 말해도 색감 방향**이 같이 결정된다. 브랜드 컬러를 꼭 써야 하거나, 포인트 색을 제한하고 싶거나, 다크 네이비처럼 특정 무드를 원할 때만 색상을 추가로 지정하면 된다.
