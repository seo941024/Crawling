import csv
import os
import random
import re
import time
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE_DIR, "IroiroImages")
CSV_PATH = os.path.join(BASE_DIR, "IroiroTokyo_Product_Information.csv")
MAX_PAGES = 0  # 0이면 제한 없음. 시험 실행에서만 --max-pages로 제한한다

HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.174 Safari/537.36'}

ROOT = "https://www.iroirotokyo.net/product-category/식품/"
CATEGORIES = {
    "쿠키스낵과자": "쿠키-스낵-과자",
    "초콜릿사탕젤리껌": "초콜릿-사탕-젤리-껌",
    "곤약젤리": "곤약젤리-무료배송-식품",
    "견과건과안주": "견과-건과-안주",
}
HEADER = ["카테고리", "제품명", "정가", "할인가", "이미지URL", "상품링크"]


def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def won(text):
    digits = re.sub(r'[^\d]', '', text or '')
    return f"{int(digits):,}원" if digits else None


def parse_card(card):
    link_tag = card.select_one("p.name a") or card.find("a")
    name = link_tag.get_text().strip()
    link = link_tag.get("href")

    # 이미지가 지연 로딩이라 src는 빈 SVG이고 실제 주소는 data-src에 있다
    img = card.find("img")
    imgurl = (img.get("data-src") or img.get("src")) if img else None
    if imgurl and imgurl.startswith("data:"):
        imgurl = None

    prices = card.select("span.price .woocommerce-Price-amount")
    # 할인 상품은 정가(del)와 판매가(ins)가 함께 나온다
    del_tag = card.select_one("span.price del .woocommerce-Price-amount")
    ins_tag = card.select_one("span.price ins .woocommerce-Price-amount")
    if del_tag and ins_tag:
        orig, sale = won(del_tag.get_text()), won(ins_tag.get_text())
    elif prices:
        orig, sale = "NoDiscount", won(prices[0].get_text())
    else:
        orig, sale = None, None

    return name, orig, sale, imgurl, link


def load_old_rows():
    # 이전 실행에서 받은 상품은 이미지를 다시 받지 않고 재사용한다
    if not os.path.exists(CSV_PATH):
        return {}
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        return {row["상품링크"]: row for row in csv.DictReader(f)}


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    old = load_old_rows()
    tmp_path = CSV_PATH + ".tmp"  # 끝까지 성공했을 때만 기존 CSV를 교체한다(중간에 실패해도 이전 CSV 유지)
    f = open(tmp_path, "w", encoding="utf-8-sig", newline="")
    writer = csv.writer(f)
    writer.writerow(HEADER)

    seen = set()
    for cat_name, slug in CATEGORIES.items():
        page = 1
        while True:
            if MAX_PAGES and page > MAX_PAGES:
                break
            url = ROOT + slug + "/" + ("" if page == 1 else f"page/{page}/")
            res = requests.get(url, headers=HDR, timeout=30)
            time.sleep(random.randint(2, 4))
            if res.status_code != 200:
                break
            # 마지막 페이지를 넘기면 404가 아니라 메인 페이지로 리다이렉트된다. 주소가 바뀌었으면 끝난 것이다.
            if unquote(res.url).rstrip("/") != unquote(url).rstrip("/"):
                print(cat_name, f"{page}페이지부터 리다이렉트 -> 카테고리 끝", flush=True)
                break

            soup = BeautifulSoup(res.text, "lxml")
            cards = soup.find_all("div", class_="type-product")
            cards = [c for c in cards if "outofstock" not in c.get("class", [])]  # 품절은 제외
            parsed = [parse_card(c) for c in cards]
            new = [p for p in parsed if p[4] not in seen]
            print(cat_name, page, f"카드 {len(cards)}개, 새 상품 {len(new)}개", flush=True)
            if not new:
                break  # 새 상품이 하나도 없으면 같은 페이지를 반복하는 것이다

            for name, orig, sale, imgurl, link in new:
                seen.add(link)
                if not sale or not imgurl:
                    continue
                img_path = os.path.join(IMG_DIR, safe_filename(name) + ".jpg")
                if link in old and os.path.isfile(img_path):
                    writer.writerow([cat_name, name, orig, sale, imgurl, link])
                    continue
                try:
                    r = requests.get(imgurl, headers=HDR, timeout=30)
                    time.sleep(random.randint(1, 2))
                    with open(img_path, "wb") as out:
                        out.write(r.content)
                except Exception as e:
                    print("  이미지 실패:", name, e, flush=True)
                    continue
                writer.writerow([cat_name, name, orig, sale, imgurl, link])
            f.flush()
            page += 1

    f.close()
    os.replace(tmp_path, CSV_PATH)
    print("완료. 상품", len(seen), flush=True)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="이로이로도쿄 상품 수집")
    ap.add_argument("--out-dir", default=BASE_DIR, help="CSV와 이미지를 저장할 폴더")
    ap.add_argument("--max-pages", type=int, default=0, help="카테고리별 최대 페이지(시험 실행용)")
    args = ap.parse_args()
    IMG_DIR = os.path.join(args.out_dir, "IroiroImages")
    CSV_PATH = os.path.join(args.out_dir, "IroiroTokyo_Product_Information.csv")
    MAX_PAGES = args.max_pages
    os.makedirs(args.out_dir, exist_ok=True)
    main()
