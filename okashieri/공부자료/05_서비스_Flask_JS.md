# 05. 서비스: Flask 서버와 화면 (`app.py`, `static/app.js`, 템플릿)

## 1. 구조
```
브라우저 ──(1) GET /shop ─────────▶ Flask: HTML 틀 전달 (index.html)
브라우저 ──(2) GET /api/search?... ▶ Flask: DB 조회 → JSON 응답
브라우저(JavaScript)가 JSON을 받아 화면(상품 카드)을 그림
```
- **서버(Flask)**: DB에서 데이터를 꺼내 JSON으로 돌려줌
- **화면(JavaScript)**: JSON을 받아서 HTML 요소로 만들어 그림
- 둘을 나눈 이유: 검색·필터를 바꿀 때 **페이지 전체를 새로고침하지 않고** 목록만 갱신하려고.

### JSON이란
데이터를 주고받는 글자 형식입니다. 파이썬의 딕셔너리·리스트와 거의 같게 생겼습니다.
```json
{"total": 120, "page": 1, "pages": 3,
 "items": [{"name": "카루비 감자칩", "sale_price": 1900, "discount_pct": 24, ...}]}
```

### "REST API인가?"
이 프로젝트의 `/api/search`는 **GET으로 JSON을 돌려주는 조회 API**입니다. 자원을 URL로 표현하고 GET/POST/PUT/DELETE를 구분하는 엄격한 REST 설계(상품 등록·수정·삭제 등)까지 쓰지는 않았습니다. "JSON 조회 API"라고 부르는 것이 정확합니다.

## 2. Flask 기본
```python
app = Flask(__name__)

@app.route("/shop")          # 이 주소로 오면 아래 함수를 실행
def index():
    return render_template("index.html", ...)   # templates/ 폴더의 HTML에 값을 끼워 넣어 반환
```
- `@app.route`: 주소와 함수를 연결 (데코레이터)
- `render_template`: Jinja2 템플릿 엔진으로 HTML 생성
- `jsonify(...)`: 딕셔너리를 JSON 응답으로 변환

### 라우트 5개
| 주소 | 역할 |
|---|---|
| `/` | 시작 화면 (쇼핑몰별 무작위 상품 카드) |
| `/shop` | 상품 검색 화면 |
| `/about` | 소개 |
| `/api/search` | 검색 JSON API |
| `/api/cards` | 시작 화면 카드를 5초마다 갱신하는 JSON |

## 3. 검색 API 해설 (`/api/search`)
요청 예: `/api/search?q=ㅋㅋ&site=coco&cat=초콜릿&min_price=1000&sort=price_asc&page=2`

```python
query = request.args.get("q", "").strip()[:100]       # 검색어, 최대 100자
sites = [s for s in request.args.getlist("site") if s.isalnum()]
page = int_arg("page", default=1, lo=1, hi=10_000)    # 숫자로 바꾸되 범위 제한
```
**입력은 믿지 않는다**가 원칙입니다. 사용자가 주소창을 직접 고쳐서 이상한 값을 보낼 수 있기 때문입니다.
- `int_arg`: 숫자가 아니면 기본값, 범위를 벗어나면 최솟값·최댓값으로 자름
- 분류(`cat`)는 `DISPLAY_ORDER` 목록에 있는 값만 허용
- 정렬(`sort`)은 미리 정한 딕셔너리에서만 선택:
  ```python
  SORTS = {"discount": "discount_pct DESC, sale_price ASC", "price_asc": "sale_price ASC", ...}
  order_by = SORTS.get(sort, SORTS["discount"])
  ```
  `ORDER BY`에는 `?` 바인딩을 쓸 수 없어서(SQL 구문이라), 사용자 값을 그대로 넣지 않고 **허용 목록에서 고르는** 방식으로 SQL 주입을 막습니다.

### 조건 조립 `build_where`
```python
for token in query.split():                    # 검색어를 공백 기준 단어로 분리
    column = "name_cho" if all(ch in CHO for ch in token) else "name_norm"
    clauses.append(f"{column} LIKE ? ESCAPE '\\'")
    params.append(f"%{like_escape(token)}%")
```
- 단어가 전부 자음(ㄱ~ㅎ)이면 초성 칼럼으로, 아니면 이름 칼럼으로 검색. "ㅋㅋ 초코"처럼 섞어도 됨.
- 단어마다 `AND`로 연결 → 모든 단어가 포함된 상품.
- `like_escape`: 검색어에 `%`나 `_`가 있으면 LIKE의 와일드카드로 해석되므로 `\%`, `\_`로 바꿈.
- 조건은 `clauses`(SQL 조각)와 `params`(값)로 따로 모아 마지막에 합칩니다 → 값은 항상 바인딩.

### 페이지 처리
```python
total = conn.execute(f"SELECT COUNT(*) FROM products WHERE {where}", params).fetchone()[0]
pages = max(-(-total // PAGE_SIZE), 1)        # 올림 나눗셈 (-(-a//b) 트릭)
page = min(page, pages)                        # 범위 넘는 페이지는 마지막으로
... LIMIT ? OFFSET ?    # (PAGE_SIZE=40, (page-1)*40)
```

### 읽기 전용 연결
```python
conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
```
`mode=ro`: 읽기 전용. 웹 요청이 실수로 DB를 바꾸지 못함. 요청마다 열고 닫음.

## 4. 화면 코드 (`static/app.js`)
- **상태 객체** `state = {q, sort, price, disc, cat, page, sites}`: 현재 검색 조건을 한곳에 보관.
- 조건이 바뀌면 `fetch("/api/search?...")`로 서버에 요청 → JSON을 받아 카드를 다시 그림.
- **주소(URL)와 상태 동기화**: 검색 조건을 주소에 반영(`?q=...&cat=...`) → 새로고침·링크 공유해도 같은 검색 결과. (`readUrl`)
- **검색 디바운스**: 글자를 칠 때마다 요청하지 않고, 타이핑이 잠깐 멈추면 요청 (`timer`). 서버 요청 낭비 방지.
- **`requestId`**: 응답이 늦게 도착한 오래된 요청이 최신 결과를 덮어쓰지 않게 번호로 구분.
- **가격대 필터**: 겹치지 않게 5천원 이하 / 5천 초과~1만 미만 / 1만원 이상.
- **페이지 번호**: 10개씩 묶어 표시(`PAGE_GROUP = 10`), 이전/다음 묶음 이동. "더보기" 대신 번호 방식 — 68페이지처럼 많을 때 원하는 곳으로 바로 갈 수 있고 주소에 남아 공유 가능.

### 화면 그리기와 보안: `textContent`
```js
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;     // innerHTML이 아님
  return node;
}
```
- `innerHTML`에 상품명을 넣으면 상품명에 `<script>` 같은 코드가 있을 때 **실행**될 수 있음(XSS).
- `textContent`는 항상 **글자로만** 취급 → 안전.
- 카드는 `<a href=상품주소 target="_blank" rel="noopener noreferrer">` → 클릭하면 **해당 쇼핑몰 상품 페이지가 새 탭**으로 열림(`noopener`는 새 탭이 원래 탭을 조작하지 못하게 함).
- 이미지 로드 실패 시(`img.onerror`) "이미지 없음" 문구를 대신 표시. (다른 PC에서 이미지 폴더가 없을 때도 안전)
- `img.loading = "lazy"`: 화면에 보일 때 이미지를 불러 속도 개선.

## 5. 반응형
화면 폭 900px 아래에서는 필터 사이드바가 서랍으로, 메뉴가 햄버거 버튼으로 바뀝니다(`style.css`의 미디어 쿼리, `nav.js`).
필터는 사이드바 한곳에만 둡니다. 상단 메뉴에 같은 필터를 중복해서 두었다가 헷갈릴 수 있어 뺐습니다.

## 6. 시작 화면
`/` → `start.html` + `start.css` + `start.js`.
- 서버가 쇼핑몰마다 이미지 있는 상품을 **무작위로 1개씩** 뽑아 `random_cards()`로 전달
  ```sql
  SELECT ... FROM products WHERE site = ? AND image IS NOT NULL ORDER BY RANDOM() LIMIT 1
  ```
- `start.js`가 5초마다 `/api/cards`를 호출해 카드를 교체. `Cache-Control: no-store`로 브라우저가 이전 응답을 재사용하지 않게 함.
- 우측 붉은 면은 CSS `clip-path`로 만든 직선 경계.
- 한글 줄바꿈: `word-break: keep-all`(단어 중간에서 끊지 않음) + `text-wrap: balance`(줄 길이를 고르게).
- 로고는 `url_for('start')`로 연결되고, 메뉴의 "상품"은 `/shop`.

## 7. 실행 방법
```
cd okashieri
python app.py          # http://127.0.0.1:5000
```
(환경변수 `OKASHIERI_DB`로 다른 DB 파일을 지정할 수 있음.)
`debug=True`는 개발용입니다. 공개 서버에서는 꺼야 합니다.

## 8. Flask를 고른 이유
| 대안 | 판단 |
|---|---|
| Streamlit / Gradio | 데이터 화면을 빠르게 만들 수 있으나 화면·API 구조를 직접 설계하기 어렵고, 서비스 구조를 보여 주기엔 제한적 |
| Django | 기능이 많아 이 규모엔 과함 |
| **Flask** | 가볍고, 라우트·API·템플릿 구조를 직접 설계 가능 |
프론트는 빌드 도구가 필요한 프레임워크(React 등) 없이 **순수 HTML/CSS/JS**: 화면이 단순해서 과하다고 판단.
