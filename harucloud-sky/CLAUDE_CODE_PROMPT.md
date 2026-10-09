# HaruCloud 하늘 디자인 — Claude Code 적용 안내

이 폴더(`harucloud-sky/`)를 프로젝트 안에 넣은 뒤, Claude Code에 아래 프롬프트를 그대로 붙여넣으세요.

---

## 붙여넣을 프롬프트

```
harucloud-sky/ 폴더에 HaruCloud 메인 화면 디자인 레퍼런스가 있어.
(index.html, styles.css, sky.js — 브라우저로 바로 열어서 볼 수 있는 순수 HTML/CSS/JS)

이 디자인을 우리 프로젝트의 메인(고민 띄우기) 페이지에 적용해줘.

요구사항:
1. 먼저 프로젝트 구조와 프레임워크(React/Next/Vue 등)를 파악하고, 그 방식에 맞게 컴포넌트로 옮겨줘.
   순수 HTML 프로젝트라면 파일을 그대로 써도 돼.
2. 시각 디자인은 레퍼런스와 똑같이 유지해줘 — 색, 그라디언트, 그림자, 폰트(Gowun Batang/Gowun Dodum),
   애니메이션 값(float, twinkle, pulse, shoot)을 바꾸지 마.
3. 낮/밤 전환: 사용자 로컬 시각 06:00–18:59는 낮(3D 구름), 그 외는 밤(빛나는 별).
   body[data-sky] 대신 프레임워크에 맞는 상태/테마 방식으로 바꿔도 되지만 동작은 같게.
   개발 확인용으로 ?sky=day / ?sky=night 쿼리 강제 기능은 유지해줘.
4. 고민 목록은 sky.js의 예시 배열 대신 우리 프로젝트의 실제 데이터(API/스토어)에 연결해줘.
   새 고민을 띄우면 아래에서 떠오르는 등장 애니메이션(.enter)이 나와야 해.
   최대 6개까지 보이고 SLOTS 좌표로 지그재그 배치.
5. 밤하늘의 별(.dot)은 화면 크기에 비례해 랜덤 생성 — 리렌더 때마다 다시 만들지 않게 한 번만 생성.
6. prefers-reduced-motion일 때 애니메이션 끄는 처리, 버튼/라벨 접근성(aria-label, label for)은 유지.
7. 작업 후 낮/밤 두 상태를 모바일(390px)과 데스크톱 폭에서 확인해줘.
```

---

## 공감 버튼 아이콘 적용 프롬프트

고민 상세 페이지의 공감 버튼 두 개에 아이콘을 넣을 때 아래를 붙여넣으세요.

```
harucloud-sky/icons/ 폴더에 고민 상세 페이지 공감 버튼용 SVG 아이콘 6개가 있어.
(preview.html을 로컬 서버로 열면 낮/밤 × 기본/보낸 뒤 모습을 볼 수 있어)

고민 상세 페이지의 두 버튼에 적용해줘:
- "나도 이런 적 있어" → 낮·밤 모두 metoo.svg, 누른 뒤에는 metoo-sent.svg
- "조금 가벼워지길" → 낮에는 lighten-day.svg (둥실 구름), 밤에는 lighten-night.svg (두 별 친구)
  누른 뒤에는 각각 lighten-day-sent.svg / lighten-night-sent.svg
- 낮/밤 판단은 메인 화면과 같은 로직(06:00–18:59 낮)을 공유해줘.

구현 규칙:
1. SVG는 <img>가 아니라 인라인(또는 React 컴포넌트)으로 넣어줘. 선과 눈은 currentColor,
   하트 색은 CSS 변수 --hc-heart / --hc-heart-sent 를 써서 테마별로 바뀌어야 하거든.
2. 아이콘 크기 28px, 글자와 간격 8px. 아이콘 색: 낮 #3B4A63, 밤 #1A1838.
   밤에는 버튼 영역에 --hc-heart: #F6C35B 를 지정해서 하트를 노란색으로.
3. 버튼 상태는 aria-pressed로 관리하고, 누르면 아이콘이 -sent 버전으로 바뀌고 문구도 바꿔줘:
   "나도 이런 적 있어" → "나도 그랬어요", "조금 가벼워지길" → "마음 보냈어요".
4. 누른 상태 버튼 스타일 — 낮: 배경 #E9E5FB, 테두리 #C9C2F0, 글자 #463C9E
   밤: 배경 #F3D98B, 테두리 없음, 글자 #1A1838, box-shadow 0 0 22px rgba(240,200,110,.35)
   (기본 상태 스타일과 미리보기 CSS는 icons/preview.html 참고)
5. 아이콘이 바뀔 때 살짝 커졌다 돌아오는 짧은 애니메이션(150~250ms)을 넣어주고,
   prefers-reduced-motion이면 생략.
6. 공감 전송은 기존 API가 있으면 연결하고, 없으면 TODO로 남겨줘.
```

---

## 파일 구성

| 파일 | 내용 |
|---|---|
| `index.html` | 마크업: 낮/밤 배경 레이어, 헤더, 고민 영역, 입력창 |
| `styles.css` | 디자인 전체 — 상단 `:root`에 색 토큰 정리 |
| `sky.js` | 시간대별 낮/밤 판단, 고민 렌더링, 별 생성, 새 고민 추가 |

## 디자인 토큰 요약

**낮** — 하늘 `#B4C6F4 → #D8CDF4 → #F4D6E6 → #FCEEE6`, 제목 `#26244D`, 보조 텍스트 `#4B4880`, 버튼 `#5A4FBF → #7A5BC4`
**밤** — 하늘 `#070B24 → #121A44 → #251F55 → #3A2A62`, 제목 `#F6F4FF`, 보조 텍스트 `#AEB8E2`, 버튼 `#FBEBB8 → #E9C06C`
**폰트** — 제목 Gowun Batang 700, 본문 Gowun Dodum (Google Fonts)

## 미리보기

`index.html`을 브라우저로 열면 됩니다. 낮/밤 강제: `index.html?sky=day`, `index.html?sky=night`
