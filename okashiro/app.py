import os
import sqlite3

from flask import Flask, jsonify, render_template, request

from categorize import DISPLAY_ORDER

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("OKASHIRO_DB", os.path.join(BASE, "okashiro.db"))

CHO = set("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
PAGE_SIZE = 40

SORTS = {
    "discount": "discount_pct DESC, sale_price ASC",
    "price_asc": "sale_price ASC",
    "price_desc": "sale_price DESC",
    "name": "name ASC",
}

app = Flask(__name__)


def get_conn():
    # 검색은 읽기 전용이라 요청마다 연결을 새로 열고 바로 닫는다
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def like_escape(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def int_arg(name, default=None, lo=0, hi=10_000_000):
    raw = request.args.get(name, "")
    try:
        return min(max(int(raw), lo), hi)
    except ValueError:
        return default


def build_where(query, sites, min_price, max_price, min_discount, category):
    clauses, params = [], []
    if category:
        clauses.append("main_category = ?")
        params.append(category)
    for token in query.split():
        token = token.lower()
        # 자음만으로 된 단어는 초성 검색, 나머지는 일반 이름 검색
        column = "name_cho" if all(ch in CHO for ch in token) else "name_norm"
        clauses.append(f"{column} LIKE ? ESCAPE '\\'")
        params.append(f"%{like_escape(token)}%")
    if sites:
        clauses.append(f"site IN ({','.join('?' * len(sites))})")
        params.extend(sites)
    if min_price is not None:
        clauses.append("sale_price >= ?")
        params.append(min_price)
    if max_price is not None:
        clauses.append("sale_price <= ?")
        params.append(max_price)
    if min_discount:
        clauses.append("discount_pct >= ?")
        params.append(min_discount)
    where = " AND ".join(clauses) if clauses else "1=1"
    return where, params


def site_stats():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT site, site_label, COUNT(*) AS cnt FROM products GROUP BY site ORDER BY site_label"
        ).fetchall()
    sites = [dict(r) for r in rows]
    return sites, sum(s["cnt"] for s in sites)


def category_stats():
    with get_conn() as conn:
        counts = dict(conn.execute("SELECT main_category, COUNT(*) FROM products GROUP BY main_category").fetchall())
    return [{"name": name, "cnt": counts[name]} for name in DISPLAY_ORDER if counts.get(name)]


@app.route("/")
def index():
    sites, total = site_stats()
    return render_template("index.html", sites=sites, total=total, categories=category_stats())


@app.route("/about")
def about():
    sites, total = site_stats()
    return render_template("about.html", sites=sites, total=total, categories=category_stats())


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "").strip()[:100]
    sort = request.args.get("sort", "discount")
    sites = [s for s in request.args.getlist("site") if s.isalnum()]
    page = int_arg("page", default=1, lo=1, hi=10_000)
    min_price = int_arg("min_price")
    max_price = int_arg("max_price")
    min_discount = int_arg("min_discount", default=0, hi=100)
    category = request.args.get("cat", "")
    if category not in DISPLAY_ORDER:  # 목록에 있는 분류만 허용한다
        category = ""

    order_by = SORTS.get(sort, SORTS["discount"])
    where, params = build_where(query, sites, min_price, max_price, min_discount, category)

    with get_conn() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM products WHERE {where}", params).fetchone()[0]
        pages = max(-(-total // PAGE_SIZE), 1)
        page = min(page, pages)  # 범위를 넘는 페이지는 마지막 페이지로 맞춘다
        rows = conn.execute(
            f"SELECT id, site_label, category, name, orig_price, sale_price, discount_pct, image, url "
            f"FROM products WHERE {where} ORDER BY {order_by} LIMIT ? OFFSET ?",
            params + [PAGE_SIZE, (page - 1) * PAGE_SIZE],
        ).fetchall()

    return jsonify(
        total=total,
        page=page,
        pages=pages,
        items=[dict(r) for r in rows],
    )


if __name__ == "__main__":
    app.run(debug=True)
