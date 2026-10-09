// HaruCloud — 낮엔 구름, 밤엔 별
// 낮/밤은 사용자의 현재 시각으로 결정합니다 (06:00–18:59 낮). ?sky=day / ?sky=night 로 강제 가능.

(function () {
  const DAY_START = 6;
  const NIGHT_START = 19;

  const COPY = {
    day: {
      title: '오늘 하늘에 뜬 고민',
      sub: '구름은 하루가 지나면 흩어져요',
      label: '마음속 고민을 하늘에 띄워보세요',
    },
    night: {
      title: '오늘 밤 반짝이는 고민',
      sub: '별이 된 고민은 아침이 오면 잠들어요',
      label: '잠들기 전, 고민을 별로 띄워보세요',
    },
  };

  // 예시 고민 — 실제 서비스에서는 API 데이터로 교체
  const worries = [
    '내일 발표 잘 할 수 있을까',
    '친구한테 먼저 연락해도 될까',
    '요즘 너무 지치는 것 같아',
    '이사 갈지 말지',
  ];

  // 고민이 놓이는 자리 (left %, top px) — 지그재그로 배치
  const SLOTS = [
    { x: 4, y: 10 },
    { x: 30, y: 118 },
    { x: 2, y: 226 },
    { x: 30, y: 322 },
    { x: 10, y: 420 },
    { x: 32, y: 512 },
  ];
  const MAX_VISIBLE = SLOTS.length;

  const body = document.body;
  const listEl = document.getElementById('worries');
  const form = document.getElementById('composer');
  const input = document.getElementById('worry');

  function currentSky() {
    const forced = new URLSearchParams(location.search).get('sky');
    if (forced === 'day' || forced === 'night') return forced;
    const h = new Date().getHours();
    return h >= DAY_START && h < NIGHT_START ? 'day' : 'night';
  }

  function renderHeader(sky) {
    const d = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    document.getElementById('date').textContent =
      `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
    document.getElementById('title').textContent = COPY[sky].title;
    document.getElementById('sub').textContent = COPY[sky].sub;
    document.getElementById('composer-label').textContent = COPY[sky].label;
    document.title = `HaruCloud · ${COPY[sky].title}`;
  }

  function cloudEl(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cloud3d';
    b.innerHTML = '<span class="p base"></span><span class="p a"></span><span class="p b"></span><span class="p c"></span><span class="t"></span>';
    b.querySelector('.t').textContent = text;
    return b;
  }

  function starEl(text) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wish';
    b.innerHTML = '<span class="orb"></span><span class="lbl"></span>';
    b.querySelector('.lbl').textContent = text;
    return b;
  }

  function renderWorries(sky, newIndex) {
    listEl.innerHTML = '';
    const visible = worries.slice(-MAX_VISIBLE);
    visible.forEach((text, i) => {
      const el = sky === 'day' ? cloudEl(text) : starEl(text);
      const slot = SLOTS[i];
      el.style.left = `${slot.x}%`;
      el.style.top = `${slot.y}px`;
      el.setAttribute('aria-label', `고민: ${text}`);
      if (i === newIndex) el.classList.add('enter');
      else el.style.animationDelay = `${-i * 1.5}s`;
      listEl.appendChild(el);
    });
    listEl.style.minHeight = `${SLOTS[visible.length - 1].y + 130}px`;
  }

  function renderStars() {
    const wrap = document.getElementById('stars');
    if (wrap.childElementCount) return;
    const n = Math.round((window.innerWidth * window.innerHeight) / 3500);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const big = Math.random() > 0.88;
      const s = document.createElement('div');
      const r = big ? 2.5 : (Math.random() > 0.5 ? 1.5 : 1);
      s.className = 'dot';
      s.style.cssText =
        `left:${Math.random() * 100}%;top:${Math.random() * 88}%;width:${r}px;height:${r}px;` +
        `opacity:${(0.3 + Math.random() * 0.7).toFixed(2)};` +
        `box-shadow:0 0 ${big ? 8 : 3}px ${big ? 1 : 0}px rgba(210,220,255,.7);` +
        `animation-delay:${(-Math.random() * 3.4).toFixed(2)}s`;
      frag.appendChild(s);
    }
    wrap.appendChild(frag);
  }

  function apply() {
    const sky = currentSky();
    if (body.dataset.sky !== sky || !listEl.childElementCount) {
      body.dataset.sky = sky;
      renderHeader(sky);
      renderWorries(sky);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    worries.push(text);
    input.value = '';
    const sky = body.dataset.sky;
    renderWorries(sky, Math.min(worries.length, MAX_VISIBLE) - 1);
    // TODO: 서버에 저장 (예: POST /api/worries)
  });

  renderStars();
  apply();
  setInterval(apply, 60 * 1000); // 1분마다 낮/밤 확인
})();
