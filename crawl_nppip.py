"""엔핍(nppip) 상품 수집 (동적 사이트: Selenium으로 렌더링한 뒤 BeautifulSoup으로 파싱)

all_crawling.ipynb의 crawl_nppip을 서버에서 주기적으로 돌릴 수 있게 스크립트로 옮긴 것이다.
노트북과 다른 점: 화면 없이(headless) 실행하고, 페이지 수(66)를 고정하지 않고
상품이 없거나 새 상품이 없으면 멈춘다. 끝까지 성공했을 때만 기존 CSV를 교체한다.
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
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.174 Safari/537.36'}
LIST_URL = "https://nppip.com/shop/list.php?ca_id=s0&sort=it_sum_qty&sortodr=desc&page={page}"
HEADER = ["제품명", "정가", "할인가", "이미지URL", "상품링크"]
HARD_LIMIT = 150  # 종료 조건이 작동하지 않을 때의 안전장치


def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def make_driver():
    opt = Options()
    opt.add_argument("--headless=new")
    opt.add_argument("--no-sandbox")  # 서버(리눅스) 환경에서 필요
    opt.add_argument("--disable-dev-shm-usage")
    opt.add_argument("--window-size=1400,1000")
    opt.add_argument("--lang=ko-KR")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opt)


def parse_card(product, url_page):
    name = product.find('div', attrs={'class': 'item-name'}).find('b').get_text().strip()
    price = product.find('span', attrs={'class': 'original-price'})
    price = price.get_text().strip() if price else 'NoDiscount'
    dis_price = product.find('span', attrs={'class': 'sale-price'})
    dis_price = dis_price.get_text().strip() if dis_price else 'NoSale'
    imgurl = product.find('img').get('src')
    link = urljoin(url_page, product.find('a').get('href'))
    return name, price, dis_price, imgurl, link


def item_key(link):
    m = re.search(r'it_id=(\d+)', link)
    return m.group(1) if m else link  # 페이지 번호가 달라도 같은 상품은 같은 키


def main(out_dir, max_pages):
    img_dir = os.path.join(out_dir, "NppipImages")
    csv_path = os.path.join(out_dir, "Nppip_Product_Information.csv")
    os.makedirs(img_dir, exist_ok=True)
    tmp_path = csv_path + ".tmp"

    driver = make_driver()
    seen = set()
    try:
        with open(tmp_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(HEADER)
            page = 1
            while page <= HARD_LIMIT:
                if max_pages and page > max_pages:
                    break
                url_page = LIST_URL.format(page=page)
                driver.get(url_page)
                time.sleep(3)  # 자바스크립트 렌더링 대기
                soup = BeautifulSoup(driver.page_source, "lxml")
                cards = soup.find_all('div', attrs={'class': 'item-row'})
                items = [parse_card(p, url_page) for p in cards]
                new = [it for it in items if item_key(it[4]) not in seen]
                print(f"엔핍 {page}페이지: 카드 {len(cards)}개, 새 상품 {len(new)}개", flush=True)
                if not new:
                    break  # 상품이 없거나 같은 상품만 반복되면 마지막 페이지다

                for name, price, dis_price, imgurl, link in new:
                    seen.add(item_key(link))
                    img_path = os.path.join(img_dir, safe_filename(name) + ".jpg")
                    if not os.path.isfile(img_path):
                        r = requests.get(imgurl, headers=HDR, timeout=30)
                        time.sleep(random.randint(1, 2))
                        with open(img_path, "wb") as out:
                            out.write(r.content)
                    writer.writerow([name, price, dis_price, imgurl, link])
                f.flush()
                page += 1
    finally:
        driver.quit()

    if not seen:
        raise SystemExit("수집된 상품이 0개라서 기존 CSV를 유지합니다.")
    os.replace(tmp_path, csv_path)
    print("완료. 엔핍 상품", len(seen), flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="엔핍 상품 수집")
    ap.add_argument("--out-dir", default=BASE_DIR, help="CSV와 이미지를 저장할 폴더")
    ap.add_argument("--max-pages", type=int, default=0, help="최대 페이지(시험 실행용)")
    a = ap.parse_args()
    main(a.out_dir, a.max_pages)
