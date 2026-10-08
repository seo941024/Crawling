"""수집 전에 robots.txt가 우리가 수집하는 주소를 허용하는지 확인한다.

허용되지 않거나 robots.txt를 읽지 못하면 0이 아닌 값으로 종료해서, 이후 수집 단계가 실행되지 않게 한다.
(처음 프로젝트에서는 이 확인을 수집한 뒤에 했기 때문에, 지금은 매번 가장 먼저 실행한다.)
"""
import sys
import urllib.robotparser as rp
from urllib.parse import quote

import requests

UA = "*"
TARGETS = {
    "코코재팬": ("https://cocojpmall.com/robots.txt", [
        "https://cocojpmall.com/shop/list.php?ca_id=4010",
        "https://cocojpmall.com/mobile/shop/list_more_ajax.php?ca_id=4010&sort=&sortdr=&page=2",
    ]),
    "엔핍": ("https://nppip.com/robots.txt", [
        "https://nppip.com/shop/list.php?ca_id=s0&sort=it_sum_qty&sortodr=desc&page=1",
    ]),
    "이로이로도쿄": ("https://www.iroirotokyo.net/robots.txt", [
        "https://www.iroirotokyo.net/product-category/" + quote("식품") + "/" + quote("쿠키-스낵-과자") + "/",
    ]),
}


def main():
    # 인자로 쇼핑몰 이름을 주면 그 쇼핑몰만 확인한다(예: python check_robots.py 코코재팬)
    wanted = sys.argv[1:]
    targets = {k: v for k, v in TARGETS.items() if not wanted or k in wanted}
    if wanted and not targets:
        print("알 수 없는 쇼핑몰:", wanted)
        sys.exit(1)
    bad = 0
    for label, (robots_url, urls) in targets.items():
        try:
            res = requests.get(robots_url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        except Exception as e:
            print(f"[확인 실패] {label}: robots.txt를 읽지 못함 ({e})")
            bad += 1
            continue
        parser = rp.RobotFileParser()
        if res.status_code == 200:
            parser.parse(res.text.splitlines())
        elif res.status_code in (404, 410):
            parser.parse([])  # robots.txt가 없으면 제한이 없는 것으로 본다
        else:
            print(f"[확인 실패] {label}: robots.txt 응답코드 {res.status_code}")
            # 차단 원인 확인용 기록: 서버 종류, Cloudflare 요청 번호, 응답 본문 앞부분
            print("  server:", res.headers.get("Server"), "| cf-ray:", res.headers.get("CF-RAY"), "| cf-mitigated:", res.headers.get("cf-mitigated"))
            print("  본문:", " ".join(res.text.split())[:300])
            bad += 1
            continue
        for u in urls:
            ok = parser.can_fetch(UA, u)
            print(("[허용] " if ok else "[금지] ") + label, u)
            if not ok:
                bad += 1
    if bad:
        print(f"\n허용되지 않은 항목 {bad}개: 수집을 중단합니다.")
        sys.exit(1)
    print("\n모든 수집 주소가 robots.txt에서 허용됩니다.")


if __name__ == "__main__":
    main()
