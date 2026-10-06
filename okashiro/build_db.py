import collections
import csv
import hashlib
import os
import random
import re
import shutil
import sqlite3
import time
from urllib.parse import parse_qs, urlparse

import sys

import requests

from categorize import categorize, is_excluded

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(BASE)
IMG_OUT = os.path.join(BASE, "static", "images")
CACHE_DIR = os.path.join(BASE, "image_cache")  # 뱃지 대신 받아 온 대표 이미지를 상품 주소 기준으로 보관
os.makedirs(CACHE_DIR, exist_ok=True)
# 다른 경로를 인자로 주면 운영 DB를 건드리지 않고 시험용 DB를 만들 수 있다
DB_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "okashiro.db")

HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.174 Safari/537.36'}

# 재팬푸드몰(japanfoodmall.com)은 robots.txt가 일반 크롤러를 전부 금지(Disallow: /)해서 서비스에서 제외했다.
SITES = [
    {"key": "coco", "label": "코코재팬", "csv": "Coco_Product_Information.csv", "img_dir": "CocoJapanImages"},
    {"key": "nppip", "label": "엔핍", "csv": "Nppip_Product_Information.csv", "img_dir": "NppipImages"},
    {"key": "iroiro", "label": "이로이로도쿄", "csv": "IroiroTokyo_Product_Information.csv", "img_dir": "IroiroImages"},
]

CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"


def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def to_initials(text):
    out = []
    for ch in text:
        code = ord(ch) - 0xAC00
        out.append(CHO[code // 588] if 0 <= code <= 11171 else ch)
    return "".join(out)


def normalize(text):
    return re.sub(r'\s+', '', text).lower()


def parse_price(text):
    digits = re.sub(r'[^\d]', '', text or '')
    return int(digits) if digits else None


def canon_url(site_key, url):
    if site_key == "nppip":
        it_id = parse_qs(urlparse(url).query).get("it_id", [None])[0]
        if it_id:
            return f"https://nppip.com/shop/item.php?it_id={it_id}"
    return url


def fetch_og_image(url):
    r = requests.get(url, headers=HDR, timeout=20)
    m = re.search(r'<meta property="og:image" content="([^"]+)"', r.text)
    return m.group(1) if m else None


def load_rows(site):
    path = os.path.join(SRC, site["csv"])
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if site["key"] == "jfmall":
        # 신규상품은 다른 카테고리와 중복되므로 마지막에 처리해서 구체적인 카테고리를 우선한다
        rows.sort(key=lambda r: r["카테고리"] == "신규상품")
    return rows


def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site TEXT NOT NULL,
            site_label TEXT NOT NULL,
            category TEXT,
            main_category TEXT NOT NULL,
            name TEXT NOT NULL,
            orig_price INTEGER NOT NULL,
            sale_price INTEGER NOT NULL,
            discount_pct INTEGER NOT NULL,
            image TEXT,
            url TEXT NOT NULL,
            name_norm TEXT NOT NULL,
            name_cho TEXT NOT NULL,
            UNIQUE(site, url)
        )
    """)

    stats = {}
    for site in SITES:
        seen = set()
        kept = dup = bad_price = img_missing = img_fixed = excluded = 0
        rows = load_rows(site)
        urls_by_name = collections.defaultdict(set)
        for r in rows:
            urls_by_name[r["제품명"].strip()].add(r["이미지URL"])
        ambiguous_names = {n for n, u in urls_by_name.items() if len(u) > 1}  # 이름은 같은데 사진이 다른 상품
        for row in rows:
            name = row["제품명"].strip()
            if is_excluded(name):  # 화장품, 양말 같은 과자가 아닌 상품
                excluded += 1
                continue
            url = canon_url(site["key"], row["상품링크"])
            if url in seen:
                dup += 1
                continue
            seen.add(url)

            sale = parse_price(row["할인가"])
            orig = parse_price(row["정가"])
            if sale is None:
                sale = orig
            if orig is None:
                orig = sale
            if not sale or sale <= 0:
                bad_price += 1
                continue
            if orig < sale:
                orig = sale
            pct = round((orig - sale) / orig * 100)

            conn.execute(
                "INSERT INTO products (site, site_label, category, main_category, name, orig_price, sale_price, discount_pct, image, url, name_norm, name_cho) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (site["key"], site["label"], row.get("카테고리", ""), categorize(name, row.get("카테고리", "")), name,
                 orig, sale, pct, None, url, normalize(name), normalize(to_initials(name))),
            )
            pid = conn.execute("SELECT id FROM products WHERE site=? AND url=?", (site["key"], url)).fetchone()[0]
            rel_path = f"images/{site['key']}_{pid}.jpg"
            dst = os.path.join(BASE, "static", rel_path)

            is_badge = "/data/badge/" in row["이미지URL"]
            src_file = os.path.join(SRC, site["img_dir"], safe_filename(name) + ".jpg")
            if is_badge or name in ambiguous_names:
                # 뱃지 그림이 저장된 경우는 상품 페이지의 대표 이미지로, 이름이 같은 상품은 자기 이미지 주소로 다시 받는다
                # (수집할 때 이미지 파일을 이름으로 저장해서 같은 이름끼리 덮어써졌다).
                # DB 번호(id)는 사이트 구성이 바뀌면 달라지므로, 이 이미지는 상품 주소로 만든 키로 캐시한다.
                cache = os.path.join(CACHE_DIR, hashlib.md5(url.encode()).hexdigest() + ".jpg")
                try:
                    if not os.path.isfile(cache):
                        og = fetch_og_image(url) if is_badge else row["이미지URL"]
                        time.sleep(random.randint(1, 2))
                        if not og:
                            raise ValueError("og:image 없음")
                        img = requests.get(og, headers=HDR, timeout=20)
                        time.sleep(random.randint(1, 2))
                        with open(cache, "wb") as out:
                            out.write(img.content)
                        img_fixed += 1
                    shutil.copyfile(cache, dst)
                except Exception as e:
                    print("  이미지 복구 실패:", name, e, flush=True)
                    rel_path = None
                    img_missing += 1
            elif os.path.isfile(src_file):
                shutil.copyfile(src_file, dst)
            else:
                rel_path = None
                img_missing += 1

            conn.execute("UPDATE products SET image=? WHERE id=?", (rel_path, pid))
            kept += 1

        conn.commit()
        stats[site["label"]] = dict(저장=kept, 중복제외=dup, 상품아님제외=excluded, 가격이상=bad_price, 이미지복구=img_fixed, 이미지없음=img_missing)
        print(site["label"], stats[site["label"]], flush=True)

    if len(sys.argv) == 1:  # 시험용 DB를 만들 때는 운영 이미지를 지우지 않는다
        used = {os.path.basename(r[0]) for r in conn.execute("SELECT image FROM products WHERE image IS NOT NULL")}
        removed = 0
        for fname in os.listdir(IMG_OUT):
            if fname not in used:  # 제외된 사이트나 빠진 상품의 이미지 파일
                os.remove(os.path.join(IMG_OUT, fname))
                removed += 1
        print("정리한 이미지 파일:", removed, flush=True)

    total = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    print("전체 상품:", total, flush=True)
    conn.close()


if __name__ == "__main__":
    main()
