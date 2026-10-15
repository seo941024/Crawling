// =====================================================================
// 포트폴리오 v2: 발표자 없이 읽히는 문서형. 대본(슬라이드 노트) 없음.
// 장마다: 배경(필요) → 수행 → 판단(검토한 대안·결정·근거) → 결과 → 한계
// =====================================================================

function kv(s, label, value, x, y, wl, wv, size, h) {
  T(s, label, { x, y, w: wl, h: h || 0.38, fontSize: size || 14, bold: true, color: C.text2 });
  T(s, value, { x: x + wl, y, w: wv, h: h || 0.38, fontSize: size || 14, color: C.text1 });
}
function slot(s, x, y, w, h, label) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { type: "none" }, line: { color: HEX.line, width: 1 }, objectName: "slot-" + label });
  T(s, label, { x, y, w, h, fontSize: 13, color: "ADB5BD", align: "center", valign: "middle" });
}
function lab(s, text, y, x, w) {
  T(s, text, { x: x === undefined ? LM : x, y, w: w || 4, h: 0.32, fontSize: 14, bold: true, color: HEX.teal });
}
function para(s, text, y, h, fs, x, w) {
  T(s, text, { x: x === undefined ? LM : x, y, w: w || CW, h, fontSize: fs || 15, color: C.text1 });
}
function cap(s, text, x, y, w) {
  T(s, text, { x, y, w, h: 0.55, fontSize: 12, color: C.text2 });
}

//@@COVER
STAGE = "";
{
  pres.addSection({ title: "표지" });
  const s = newSlide("TITLE", "표지", "표지");
  s.addText("오카시에리", { placeholder: "title" });
  s.addText(["일본 과자 직구 쇼핑몰 가격 비교 서비스", "お菓子(과자) + おかえり(어서 와) = 과자야, 어서 와"].join("\n"), { placeholder: "body" });
}

//@@TOC
STAGE = "";
{
  const s = content("목차", null);
  const items = [
    ["1", "프로젝트 개요", "소개, 이력"],
    ["2", "배경과 목표", "문제 정의, 서비스 범위"],
    ["3", "데이터 파이프라인과 기술 스택", "수집 → 검증·정제 → 저장·서비스, 사용 도구"],
    ["4", "수집", "수집 방식 설계, 수집 허용 범위 확인"],
    ["5", "검증·정제", "수집 데이터의 검증과 수정, 정제와 분류"],
    ["6", "저장·서비스", "저장과 조회 쿼리, 서비스 화면, 자동 수집"],
    ["7", "범위와 한계", ""],
  ];
  items.forEach((r, i) => {
    const y = 1.75 + i * 0.72;
    T(s, r[0], { x: LM, y, w: 0.6, h: 0.6, fontSize: 26, bold: true, color: HEX.teal, valign: "middle" });
    T(s, r[1], { x: LM + 0.8, y, w: 5.6, h: 0.7, fontSize: 22, bold: true, color: C.text1, valign: "middle" });
    T(s, r[2], { x: LM + 6.5, y, w: 5.6, h: 0.7, fontSize: 16, color: C.text2, valign: "middle" });
  });
}

//@@OVERVIEW
STAGE = "";
{
  const s = content("오카시에리 · 일본 과자 가격 비교 서비스", null);
  slot(s, LM, 1.7, 1.45, 1.8, "사진");
  const lx = LM + 1.7;
  kv(s, "이름", "[입력]", lx, 1.7, 1.1, 3.2);
  kv(s, "생년월일", "[입력]", lx, 2.07, 1.1, 3.2);
  kv(s, "학력", "[입력]", lx, 2.44, 1.1, 3.2);
  kv(s, "연락처", "[입력]", lx, 2.81, 1.1, 3.2);
  kv(s, "이메일", "[입력]", lx, 3.18, 1.1, 3.2);
  const rx = LM + 6.5;
  kv(s, "GitHub", "github.com/seo941024/Crawling", rx, 1.7, 1.4, 4.2);
  kv(s, "주요 경력", "[입력]", rx, 2.07, 1.4, 4.2);
  kv(s, "자격증", "[입력]", rx, 2.44, 1.4, 4.2);

  T(s, "프로젝트 개요", { x: LM, y: 3.8, w: 4, h: 0.42, fontSize: 16, bold: true, color: HEX.teal });
  const px = LM, pw = 1.45, pv = 5.7;
  kv(s, "프로젝트명", "오카시에리: 일본 과자 가격 비교 서비스", px, 4.3, pw, pv, 15);
  kv(s, "목적", "대행구매 쇼핑몰 가격의 한곳 검색·비교", px, 4.75, pw, pv, 15);
  kv(s, "핵심 역량", "구조 분석 · 검증·정제 · 쿼리 설계", px, 5.2, pw, pv, 15);
  kv(s, "개발환경", "Python 3.10 · Anaconda · VS Code · Windows", px, 5.65, pw, pv, 15);
  kv(s, "활용 도구", "requests · BeautifulSoup · Selenium · SQLite · Flask · GitHub Actions · Claude Code", px, 6.1, pw, pv, 15, 0.7);
  slot(s, LM + 7.6, 3.85, 4.5, 2.95, "예시 화면 (시작 화면 캡처 삽입)");
}

//@@BACKGROUND
STAGE = "";
{
  const s = content("배경과 목표", null);
  lab(s, "문제", 1.65);
  para(s, "일본 과자 대행구매 쇼핑몰이 여러 곳이며, 같은 과자도 쇼핑몰마다 가격·표기·분류 기준이 달라 구매 전 사이트별 개별 검색과 비교가 필요함", 1.98, 0.7, 17);
  lab(s, "목표", 2.95);
  para(s, "서비스 대상 쇼핑몰 3곳의 상품·가격을 한곳에서 검색·비교하고, 선택한 상품의 해당 쇼핑몰 페이지로 이동", 3.28, 0.7, 17);
  lab(s, "범위와 결과", 4.25);
  plainTable(s, [
    ["구분", "내용"],
    ["수집", "쇼핑몰 5곳, 원본 6,901건 (코코재팬 2,092 · 이로이로도쿄 2,181 · 엔핍 1,318 · 재팬푸드몰 703 · 구루메상 607)"],
    ["서비스", "쇼핑몰 3곳, DB 5,585건 (재팬푸드몰: robots.txt 전면 불허, 구루메상: 운영 중단·더미 상품으로 제외)"],
    ["설계 방침", "최저가 추천 대신 비교 정보 제공: 동일 상품 판별 오류 시 잘못된 추천 위험 → 선택은 이용자"],
  ], 4.6, [1.7, 10.433], 14);
}

//@@PIPELINE
STAGE = "";
{
  const s = content("데이터 파이프라인", null);
  para(s, "각 단계는 앞 단계의 결과를 입력으로 받으며, 단계마다 대안을 비교한 판단 기록을 이후 장에 정리함", 1.62, 0.45, 15);
  plainTable(s, [
    ["단계", "처리 내용", "입력 → 출력", "핵심 판단"],
    ["수집", "사이트 구조 분석, 정적·동적 구분, 사이트별 이동 방식 파악, 수집 허용 범위 확인", "쇼핑몰 5곳 → 원본 CSV 6,901건", "수집 도구 구분, robots.txt 확인"],
    ["검증·정제", "수집 오류 확인·수정, 가격 정수화, 중복·비과자 제거, 키워드 규칙 분류", "원본 CSV → DB 5,585건 (서비스 3곳)", "종료 조건, 키워드 규칙 분류"],
    ["저장·서비스", "SQLite 저장, 파라미터 쿼리 조회, Flask JSON API, 화면, 주 1회 자동 수집", "DB → 검색·비교 사이트", "SQLite 선택, GitHub Actions 운영"],
  ], 2.3, [1.7, 5.0, 3.0, 2.433], 14);
  para(s, "화면 흐름: 시작 화면 → 상품 목록(이름·초성 검색, 분류·가격대·할인율·쇼핑몰 필터, 정렬) → 해당 쇼핑몰 상품 페이지", 5.3, 0.6, 15);
}

//@@STACK
STAGE = "";
{
  const s = content("기술 스택", null);
  plainTable(s, [
    ["영역", "도구 (버전)", "사용 범위"],
    ["수집", "requests (2.34)", "GET 요청, User-Agent, 요청 간 지연, 응답코드 확인"],
    ["", "BeautifulSoup (4.15) + lxml (6.1)", "클래스 기준 요소 선택, 텍스트·속성(src, href) 추출"],
    ["", "Selenium (4.49)", "헤드리스 Chrome, 렌더링 대기 후 page_source 파싱"],
    ["저장", "csv 모듈", "원본 저장(utf-8-sig), 성공 시에만 파일 교체"],
    ["", "SQLite (3.53)", "UNIQUE 제약, 파라미터 바인딩, 읽기 전용 연결"],
    ["조회·화면", "Flask (3.1)", "라우트 5개, JSON 응답, Jinja2 템플릿"],
    ["", "JavaScript · HTML/CSS", "fetch API 호출, DOM 렌더링, 검색 디바운스"],
    ["자동화", "GitHub Actions", "cron 예약·수동 실행, 수집 → 검증 → 보관 단계 구성"],
    ["환경", "Python 3.10 · Anaconda · Git / GitHub", "가상환경 구성, 코드 버전 관리"],
    ["", "Claude Code", "코드 작성·수정 보조"],
  ], 1.65, [1.5, 3.8, 6.833], 13);
}

//@@COLLECT
STAGE = "수집";
{
  const s = content("수집 방식 설계", null);
  para(s, "코드 작성 전 사이트별로 같은 순서(① 접근 가능 여부 ② 정적·동적 구분 ③ 페이지 이동 방식)를 확인해 수집 방식을 결정함", 1.62, 0.72, 15);
  plainTable(s, [
    ["쇼핑몰", "구분", "수집 방식", "판단 근거"],
    ["코코재팬", "정적", "requests + BeautifulSoup, '더보기'는 AJAX 내부 주소 직접 호출", "원본 HTML에 상품 요소 존재, 더보기 응답이 HTML 조각이라 같은 파서 사용"],
    ["이로이로도쿄", "정적", "requests + BeautifulSoup, /page/N/ 반복", "목록 HTML에 상품 80개 존재, 이미지는 지연 로딩이라 data-src 사용"],
    ["엔핍", "동적", "Selenium 렌더링 후 page_source 파싱", "requests 결과 상품 0개, Selenium 결과 20개"],
    ["재팬푸드몰", "정적", "requests + BeautifulSoup (수집만 수행)", "robots.txt 전면 불허로 서비스 제외"],
    ["구루메상", "정적", "requests + BeautifulSoup (수집만 수행)", "운영 중단·더미 상품으로 서비스 제외"],
  ], 2.35, [1.9, 0.9, 4.4, 4.933], 12);
  lab(s, "검토한 대안", 5.45);
  para(s, "전체 Selenium: 정적 사이트에서 브라우저 구동으로 속도·자원 부담 증가   |   전체 requests: 동적 사이트에서 빈 데이터 수집   →   원본 HTML의 상품 요소 유무로 구분", 5.78, 0.65, 14);
  para(s, "페이지 수 고정 대신 '상품 없는 페이지에서 종료' 조건 사용: 코코재팬 88페이지, 엔핍 66페이지에서 종료", 6.35, 0.4, 14);
}

//@@PERMIT
STAGE = "수집";
{
  const s = content("수집 허용 범위 확인", null);
  para(s, "접속 가능 여부(상태코드 200)만 확인했을 때 모든 사이트가 통과했으나, robots.txt와 이용약관을 확인하자 판단이 달라짐", 1.62, 0.72, 15);
  plainTable(s, [
    ["확인 항목", "결과", "조치"],
    ["접속 가능 여부 (상태코드)", "수집 대상 사이트 모두 200 응답", "수집 허용의 근거로 사용하지 않음"],
    ["robots.txt", "코코재팬·엔핍·이로이로도쿄: 수집 대상 주소 허용 / 재팬푸드몰: Disallow: / (전면 불허)", "재팬푸드몰 서비스 제외, 원본 파일은 로컬에만 보관"],
    ["운영 상태", "구루메상: 품절·더미·스팸 게시물 다수", "서비스 제외"],
    ["이용약관", "4곳 모두 크롤링을 직접 언급하지 않으나 정보의 복제·제공 제한 조항 존재", "공개 배포는 사전 허락 후, 현재는 로컬 시연 중심"],
    ["서버 부담", "-", "요청 간 2~4초 지연"],
  ], 2.35, [2.8, 5.4, 3.933], 13);
}

//@@VERIFY1
STAGE = "검증·정제";
{
  const s = content("수집 데이터의 검증과 수정", null);
  para(s, "수집 직후 저장 데이터와 응답을 직접 확인해 오류 5건을 발견하고, 고정값 대신 응답 기반 종료 조건으로 수정함", 1.62, 0.72, 15);
  plainTable(s, [
    ["발견한 오류 (쇼핑몰)", "원인", "수정"],
    ["일부만 수집: 192건 (코코재팬)", "페이지 수 고정값 8, 시험 수집에서 실제 88페이지 확인", "상품 없는 페이지에서 종료, 전체 재수집 (2,092건)"],
    ["198페이지까지 반복 (이로이로도쿄)", "마지막 페이지 이후 404가 아닌 메인 페이지로 이동", "응답 주소 비교, 새 상품 없으면 종료"],
    ["빈 이미지 주소 (이로이로도쿄)", "지연 로딩으로 실제 주소는 data-src", "data-src 우선 조회"],
    ["상품이 아닌 배지 이미지 약 140개 (엔핍)", "카드 첫 이미지가 BEST 배지", "상품 페이지의 대표 이미지(og:image)로 교체"],
    ["BEST 상품 중복 (코코재팬)", "BEST 목록이 같은 클래스 사용", "BEST 표시 상품 제외"],
  ], 2.35, [3.9, 4.4, 3.833], 13);
  lab(s, "공통 원인과 대응", 5.45);
  para(s, "오류 대부분이 '사이트가 예상대로 동작한다'는 가정에서 발생: 실행 결과(건수·이미지·반복 여부)를 수집 직후 확인하는 절차로 대응", 5.78, 0.65, 14);
}

//@@VERIFY2
STAGE = "검증·정제";
{
  const s = content("정제와 분류", null);
  para(s, "쇼핑몰 간 가격의 비교·정렬·필터가 가능하도록 문자열 가격의 정수화, 중복·비과자 제거, 공통 분류 부여를 수행함 (서비스 3곳 5,591건 → DB 5,585건)", 1.62, 0.65, 15);
  plainTable(s, [
    ["판단 사항", "검토한 대안", "결정과 근거"],
    ["분류 방식", "머신러닝 · 쇼핑몰 원본 분류", "정답 라벨 부재, 원본 분류 기준 상이, 오분류 원인 설명 필요 → 키워드 규칙 (10개 분류, 미분류 2건)"],
    ["동일 상품 처리", "이름 유사도 자동 묶기", "표기 차이로 오매칭 위험 → 자동 묶기 보류, 판매가순 정렬로 비교"],
    ["가격 기준", "할인율 · 판매가", "쇼핑몰별 정가 기준 상이 → 판매가"],
    ["기본 정제", "-", "가격 정수화, 상품 주소(site, url) 기준 중복 제거, 화장품·양말·파우치 등 비과자 제외"],
  ], 2.4, [2.0, 3.4, 6.733], 13);
  lab(s, "분류 규칙의 검증", 5.2);
  para(s, "키워드 확장 중 '우니', '이카', '아이스' 등 넓은 키워드가 오분류를 유발 → 해당 키워드 삭제, 분류 결과를 확인하며 규칙 조정 (예외 상품은 개별 지정)", 5.53, 0.65, 14);
  para(s, "한계: 이름 키워드 기반이라 새 상품명에는 규칙 추가 필요", 6.2, 0.4, 14);
}

//@@SERVICE1
STAGE = "저장·서비스";
{
  const s = content("저장과 조회 쿼리", null);
  para(s, "수집·정제한 상품을 SQLite에 저장하고, 검색어·쇼핑몰·가격 조건을 하나의 쿼리로 조회 (UNIQUE(site, url) 제약으로 중복 저장 방지)", 1.62, 0.72, 15);
  const half = 5.9;
  lab(s, "저장 (INSERT)", 2.3, LM, half);
  T(s, [
    "INSERT INTO products",
    "  (site, name, orig_price, sale_price,",
    "   discount_pct, image, url,",
    "   name_norm, name_cho)   -- 일부 컬럼 생략",
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
  ].join("\n"), { x: LM, y: 2.65, w: half, h: 1.5, fontSize: 13, fontFace: "Consolas", color: C.text1 });
  const x2 = LM + half + 0.3;
  lab(s, "호출 (SELECT)", 2.3, x2, half);
  T(s, [
    "SELECT name, sale_price, discount_pct, url",
    "FROM products",
    "WHERE name_cho LIKE ?      -- 초성 검색",
    "  AND site IN (?, ?)       -- 쇼핑몰",
    "  AND sale_price <= ?      -- 가격대",
    "ORDER BY discount_pct DESC -- 정렬",
    "LIMIT 40 OFFSET 0;         -- 40개씩",
  ].join("\n"), { x: x2, y: 2.65, w: half, h: 1.85, fontSize: 13, fontFace: "Consolas", color: C.text1 });
  plainTable(s, [
    ["설계 (검토한 대안)", "결정과 근거"],
    ["SQLite (PostgreSQL · MySQL · CSV 직접 조회)", "서버 설치 불필요, 읽기 위주, 상품 수천 건 → 파일형 DB (규모 확대 시 서버형 DB 전환)"],
    ["값 전체의 ? 파라미터 전달 (문자열 결합)", "검색어에 SQL이 섞여도 실행되지 않음 (SQL 주입 방지)"],
    ["초성·정규화 이름의 컬럼 저장 (검색 시 계산)", "저장 시 1회 계산, 검색은 LIKE로 바로 조회"],
    ["LIMIT·OFFSET 40개 단위", "전체 대신 필요한 만큼만 조회"],
  ], 4.5, [5.2, 6.933], 12);
}

//@@SERVICE2
STAGE = "저장·서비스";
{
  const s = content("서비스 화면", null);
  const w = 3.85, gap = 0.29, y = 1.65;
  const files = ["01_list_desktop.png", "02_search_choseong.png", "03_filter_combo.png"];
  const caps = [
    "① 상품 목록: 쇼핑몰별 상품·판매가·할인율 표시, 40개 단위 조회",
    "② 초성 검색: 초성 입력(예: ㄱㅇㅈㄹ)으로 상품명 검색",
    "③ 필터 조합: 분류·가격대·할인율·쇼핑몰 조건의 동시 적용",
  ];
  let hmax = 0;
  files.forEach((f, i) => { hmax = Math.max(hmax, shot(s, f, LM + i * (w + gap), y, w)); });
  caps.forEach((c, i) => cap(s, c, LM + i * (w + gap), y + hmax + 0.12, w));
  const ty = y + hmax + 0.85;
  if (ty > 4.6) warnings.push(`슬라이드 ${cur.n}: 이미지 높이 ${hmax.toFixed(2)}in, 아래 표 시작 y ${ty.toFixed(2)}`);
  plainTable(s, [
    ["구성", "내용"],
    ["API", "GET /api/search (검색어·분류·쇼핑몰·가격대·정렬·페이지) → JSON 응답"],
    ["화면", "JavaScript fetch로 API 호출, textContent 렌더링(스크립트 삽입 방지), 해당 쇼핑몰 상품 페이지는 새 탭으로 이동"],
  ], ty, [1.6, 10.533], 12);
}

//@@OPS
STAGE = "저장·서비스";
{
  const s = content("서비스 구성과 자동 수집", null);
  para(s, "데이터의 최신 상태 유지를 위해 주 1회 자동 수집을 GitHub Actions로 구성하고, 수집 실패 시 기존 데이터가 유지되도록 설계함", 1.62, 0.72, 15);
  plainTable(s, [
    ["판단 사항", "검토한 대안", "결정과 근거"],
    ["서버 구성", "Streamlit · Gradio · Flask", "화면·API 구조의 직접 설계 → Flask(JSON API) + JavaScript(fetch)"],
    ["수집 실행 위치", "PC 스케줄러 · 별도 서버 · GitHub Actions", "서버 불필요, 주 1회 실행 → GitHub Actions (이용자 증가 시 서버로 확장)"],
    ["접근 제약 대응", "GitHub에서 코코재팬 수집 시도 · PC 수집 분리", "Cloudflare 봇 확인 챌린지(403) → 우회 없이 코코재팬만 PC 수집"],
    ["실패 대비", "-", "임시 파일에 수집 후 성공 시에만 CSV 교체, DB 상품 수 3,000건 미만이면 중단"],
    ["안전 장치", "-", "파라미터 바인딩 · 읽기 전용 연결 · textContent 출력"],
  ], 2.35, [2.0, 3.8, 6.333], 13);
  lab(s, "접근 제약의 원인 확인", 5.4);
  para(s, "GitHub 서버에서만 코코재팬 robots.txt가 403 → 확인용 기록 추가 후 재실행: cf-mitigated: challenge, 본문 'Just a moment...' = Cloudflare 봇 확인 챌린지 (PC에서는 User-Agent와 무관하게 200). 우회하지 않고 PC 수집으로 분리", 5.73, 0.8, 14);
  para(s, "규명하지 못한 점: GitHub 서버만 챌린지 대상이 된 이유 (Cloudflare 내부 판단)", 6.5, 0.35, 14);
}

//@@LESSON
STAGE = "";
{
  const s = content("범위와 한계", null);
  plainTable(s, [
    ["항목", "내용"],
    ["서비스 범위", "수집 5곳 중 3곳(코코재팬·엔핍·이로이로도쿄)의 5,585건 제공"],
    ["제외", "재팬푸드몰(robots.txt 전면 불허), 구루메상(운영 중단·더미 상품)"],
    ["가격 이력", "DB를 수집 때마다 새로 생성하므로 시점별 가격 변화는 미제공"],
    ["동일 상품 비교", "자동 묶기를 보류하여 쇼핑몰 간 같은 상품의 직접 대응은 미제공 (판매가순 정렬로 비교)"],
    ["공개 배포", "약관상 사전 허락이 필요하여 현재는 로컬 시연"],
  ], 1.8, [2.8, 9.333], 15);
}
