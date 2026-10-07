# Crawling

일본 과자 직구 쇼핑몰 3곳(코코재팬, 엔핍, 이로이로도쿄)의 상품·가격을 수집하고, 정제·분류해서 검색할 수 있는 사이트(`okashiro/`)를 만드는 프로젝트입니다.
포트폴리오용 비공개 저장소입니다. 수집한 데이터는 개인 학습·시연 용도입니다.

## 구성

| 파일 | 역할 |
|---|---|
| `check_robots.py` | 수집 전 robots.txt 허용 여부 확인(허용되지 않으면 종료 코드 1) |
| `crawl_coco.py` | 코코재팬 수집(정적, 더보기 AJAX 주소 직접 호출) |
| `crawl_nppip.py` | 엔핍 수집(동적, Selenium headless) |
| `crawl_iroiro.py` | 이로이로도쿄 수집(정적, `/page/N/`, 리다이렉트로 종료 감지) |
| `okashiro/build_db.py` | CSV를 합쳐 정제·분류한 SQLite DB 생성 |
| `okashiro/app.py` | Flask 검색 사이트 |
| `.github/workflows/weekly-crawl.yml` | 매주 일요일 새벽 3시(KST) 자동 수집 |

수집 스크립트는 끝까지 성공했을 때만 기존 CSV를 교체합니다. 각 스크립트는 `--out-dir`(저장 폴더)와 `--max-pages`(시험 실행용)를 받습니다.

## 다른 컴퓨터에서 실행

```bash
git clone https://github.com/seo941024/Crawling.git
cd Crawling
pip install -r okashiro/requirements.txt
cd okashiro
python app.py        # http://127.0.0.1:5000
```

- CSV 3개와 `okashiro/okashiro.db`는 저장소에 포함되어 있어 바로 실행됩니다.
- **이미지는 저장소에 없습니다**(용량·저작권). 상품 이미지는 수집 스크립트를 돌리면 받아지고, 없으면 화면에 "이미지 없음"으로 표시됩니다.
- 엔핍 수집에는 Chrome이 필요합니다.

## 주간 자동 수집

GitHub Actions가 쇼핑몰별 robots.txt 확인 → 수집 → 새 DB 생성 → 상품 수 검증 순서로 실행하고(코코재팬은 GitHub 서버 접속이 막혀 건너뛰고 저장소의 CSV를 사용하므로 PC에서 수집해 올림), DB와 CSV를 결과물(Artifacts)로 30일 보관합니다. 상품 수가 3,000개 미만이면 실패 처리합니다. 이미지는 결과물에 포함하지 않습니다.
Actions 화면에서 **Run workflow**로 수동 실행도 할 수 있습니다.

## 주의

- 쇼핑몰 약관이 정보의 복제·제공을 제한할 수 있으므로 공개하지 않습니다.
- 재팬푸드몰(robots.txt가 크롤러를 전부 금지)과 구루메상(운영 중단)은 서비스에서 제외했습니다. 두 곳의 수집 원본 CSV는 기록용으로만 저장소에 있고, 자동 수집과 사이트에는 쓰이지 않습니다.
