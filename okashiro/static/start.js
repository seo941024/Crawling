// 시작 화면의 상품 카드 3장을 5초마다 무작위 상품으로 바꾼다.
// - 마우스를 올려 두면 멈춘다.
// - 다른 탭에 가 있으면 멈춘다.
// - "움직임 줄이기"를 켠 사용자에게는 자동으로 바꾸지 않는다.
(() => {
  const INTERVAL = 5000;
  const FADE = 350;

  const stage = document.querySelector(".photos");
  const cards = Array.from(document.querySelectorAll(".pcard"));
  if (!stage || !cards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let paused = false;
  let busy = false;
  stage.addEventListener("mouseenter", () => { paused = true; });
  stage.addEventListener("mouseleave", () => { paused = false; });

  const won = (n) => n.toLocaleString("ko-KR") + "원";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // 상품명은 textContent로만 넣는다
    return node;
  }

  function fill(card, item) {
    const thumb = card.querySelector(".thumb");
    thumb.replaceChildren();
    const showNoImage = () => thumb.appendChild(el("span", "noimg", "이미지 없음"));
    if (item.image) {
      const img = document.createElement("img");
      img.src = "/static/" + item.image;
      img.alt = item.name;
      img.onerror = () => { img.remove(); showNoImage(); };
      thumb.appendChild(img);
    } else {
      showNoImage();
    }

    const price = el("div", "price");
    price.appendChild(el("span", "sale", won(item.sale_price)));
    if (item.discount_pct > 0) {
      price.appendChild(el("span", "pct", item.discount_pct + "%"));
      price.appendChild(el("span", "orig", won(item.orig_price)));
    }
    card.querySelector(".info").replaceChildren(el("span", "shop", item.site_label), el("div", "name", item.name), price);
  }

  // 새 이미지가 준비된 뒤에 바꿔서 깜빡임을 줄인다(최대 1.5초 기다린다)
  function preload(items) {
    return Promise.all(items.map((it) => new Promise((resolve) => {
      if (!it.image) return resolve();
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = "/static/" + it.image;
      setTimeout(resolve, 1500);
    })));
  }

  async function tick() {
    if (paused || busy || document.hidden) return;
    busy = true;
    try {
      const res = await fetch("/api/cards", { cache: "no-store" });
      if (!res.ok) return;
      const items = await res.json();
      await preload(items);
      cards.forEach((c) => c.classList.add("swap"));
      await new Promise((resolve) => setTimeout(resolve, FADE));
      cards.forEach((c, i) => { if (items[i]) fill(c, items[i]); });
      cards.forEach((c) => c.classList.remove("swap"));
    } catch (e) {
      /* 네트워크 오류는 무시하고 다음 주기에 다시 시도한다 */
    } finally {
      busy = false;
    }
  }

  setInterval(tick, INTERVAL);
})();
