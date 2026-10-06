"""코코재팬 상품 수집 (정적 사이트: requests + BeautifulSoup, 더보기는 AJAX 주소를 직접 호출)

all_crawling.ipynb의 crawl_coco를 서버에서 주기적으로 돌릴 수 있게 스크립트로 옮긴 것이다.
노트북과 다른 점: 페이지 수를 고정하지 않고 상품이 없거나 새 상품이 없으면 멈춘다.
수집 결과는 끝까지 성공했을 때만 기존 CSV를 교체한다.
"""
import argparse
import csv
import os
import random
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.174 Safari/537.36'}
HOME = "https://cocojpmall.com"
FIRST_PAGE = HOME + "/shop/list.php?ca_id=4010"
AJAX_PAGE = HOME + "/mobile/shop/list_more_ajax.php?ca_id=4010&sort=&sortdr=&page={page}"
HEADER = ["제품명", "정가", "할인가", "이미지URL", "상품링크"]
HARD_LIMIT = 150  # 종료 조건이 작동하지 않을 때의 안전장치 (2026-10 기준 실제 마지막 페이지는 88)


def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def parse_card(product):
    name = product.find('div', attrs={'class': 'sct_txt'}).get_text().strip()
    price = product.find('span', attrs={'class': 'coco2-was'})
    price = price.get_text().strip() if price else 'NoDiscount'
    dis_price = product.find('span', attrs={'class': 'coco2-now'})
    dis_price = dis_price.get_text().strip() if dis_price else 'NoSale'
    imgurl = product.find('img').get('src')
    link = urljoin(HOME, product.find('a').get('href'))
    return name, price, dis_price, imgurl, link


def main(out_dir, max_pages):
    img_dir = os.path.join(out_dir, "CocoJapanImages")
    csv_path = os.path.join(out_dir, "Coco_Product_Information.csv")
    os.makedirs(img_dir, exist_ok=True)
    tmp_path = csv_path + ".tmp"

    seen = set()
    with open(tmp_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        page = 1
        while page <= HARD_LIMIT:
            if max_pages and page > max_pages:
                break
            url = FIRST_PAGE if page == 1 else AJAX_PAGE.format(page=page)
            res = requests.get(url, headers=HDR, timeout=30)
            time.sleep(random.randint(2, 4))
            if res.status_code != 200:
                print(f"{page}페이지 응답코드 {res.status_code} -> 종료", flush=True)
                break
            soup = BeautifulSoup(res.text, "lxml")
            cards = soup.find_all('li', attrs={'class': 'sct_li'})
            cards = [p for p in cards if p.find('span', attrs={'class': 'best_icon'}) is None]  # BEST 캐러셀 중복 제외
            items = [parse_card(p) for p in cards]
            new = [it for it in items if it[4] not in seen]
            print(f"코코재팬 {page}페이지: 카드 {len(cards)}개, 새 상품 {len(new)}개", flush=True)
            if not new:
                break  # 상품이 없거나 같은 상품만 반복되면 마지막 페이지다

            for name, price, dis_price, imgurl, link in new:
                seen.add(link)
                img_path = os.path.join(img_dir, safe_filename(name) + ".jpg")
                if not os.path.isfile(img_path):
                    r = requests.get(imgurl, headers=HDR, timeout=30)
                    time.sleep(random.randint(1, 2))
                    with open(img_path, "wb") as out:
                        out.write(r.content)
                writer.writerow([name, price, dis_price, imgurl, link])
            f.flush()
            page += 1

    if not seen:
        raise SystemExit("수집된 상품이 0개라서 기존 CSV를 유지합니다.")
    os.replace(tmp_path, csv_path)
    print("완료. 코코재팬 상품", len(seen), flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="코코재팬 상품 수집")
    ap.add_argument("--out-dir", default=BASE_DIR, help="CSV와 이미지를 저장할 폴더")
    ap.add_argument("--max-pages", type=int, default=0, help="최대 페이지(시험 실행용)")
    a = ap.parse_args()
    main(a.out_dir, a.max_pages)
