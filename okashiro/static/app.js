const qInput = document.getElementById("q");
const sortSelect = document.getElementById("sort");
const results = document.getElementById("results");
const statusEl = document.getElementById("status");
const pagerEl = document.getElementById("pager");
const siteBoxes = Array.from(document.querySelectorAll('input[name="site"]'));
const priceRadios = Array.from(document.querySelectorAll('input[name="price"]'));
const discRadios = Array.from(document.querySelectorAll('input[name="disc"]'));
const catRadios = Array.from(document.querySelectorAll('input[name="cat"]'));
const allCats = catRadios.map((r) => r.value).filter(Boolean);

const allSites = siteBoxes.map((b) => b.value);
// 가격대는 겹치지 않게 나눈다: 5천원 이하 / 5천 초과~1만 미만 / 1만원 이상
const PRICE = { low: [null, 5000], mid: [5001, 9999], high: [10000, null] };
const DISCOUNTS = ["10", "30", "50"];
const DEFAULT_SORT = "discount";

const state = { q: "", sort: DEFAULT_SORT, price: "", disc: "", cat: "", page: 1, sites: new Set(allSites) };

let timer = null;
let requestId = 0;

function won(n) {
  return n.toLocaleString("ko-KR") + "원";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildCard(item) {
  const card = el("a", "card");
  card.href = item.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const thumb = el("div", "thumb");
  const showNoImage = () => thumb.appendChild(el("span", "noimg", "이미지 없음"));
  if (item.image) {
    const img = document.createElement("img");
    img.src = "/static/" + item.image;
    img.alt = item.name;
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
      showNoImage();
    };
    thumb.appendChild(img);
  } else {
    showNoImage();
  }

  const info = el("div", "info");
  info.appendChild(el("span", "shop", item.site_label));
  info.appendChild(el("div", "name", item.name));

  const price = el("div", "price");
  price.appendChild(el("span", "sale", won(item.sale_price)));
  if (item.discount_pct > 0) {
    price.appendChild(el("span", "pct", item.discount_pct + "%"));
    price.appendChild(el("span", "orig", won(item.orig_price)));
  }
  info.appendChild(price);

  card.append(thumb, info);
  const li = document.createElement("li");
  li.appendChild(card);
  return li;
}

/* ---------- 페이지 번호 ---------- */
const PAGE_GROUP = 10; // 번호를 10개씩 묶어서 보여준다

function pageButton(label, target, { current = false, disabled = false, aria = label } = {}) {
  const b = el("button", "pg" + (current ? " current" : ""), String(label));
  b.type = "button";
  b.disabled = disabled;
  b.setAttribute("aria-label", aria);
  if (current) b.setAttribute("aria-current", "page");
  if (!disabled && !current) b.addEventListener("click", () => goPage(target));
  return b;
}

function renderPager(totalPages) {
  pagerEl.replaceChildren();
  pagerEl.hidden = totalPages <= 1;
  if (totalPages <= 1) return;
  const cur = state.page;
  const first = Math.floor((cur - 1) / PAGE_GROUP) * PAGE_GROUP + 1; // 현재 묶음의 첫 번호
  const last = Math.min(first + PAGE_GROUP - 1, totalPages);
  pagerEl.appendChild(pageButton("«", 1, { disabled: cur <= 1, aria: "첫 페이지" }));
  pagerEl.appendChild(pageButton("‹", first - PAGE_GROUP, { disabled: first <= 1, aria: `이전 ${PAGE_GROUP}페이지` }));
  for (let n = first; n <= last; n++) {
    pagerEl.appendChild(pageButton(n, n, { current: n === cur, aria: `${n}페이지` }));
  }
  pagerEl.appendChild(pageButton("›", first + PAGE_GROUP, { disabled: last >= totalPages, aria: `다음 ${PAGE_GROUP}페이지` }));
  pagerEl.appendChild(pageButton("»", totalPages, { disabled: cur >= totalPages, aria: "마지막 페이지" }));
}

function goPage(n) {
  state.page = n;
  search(false, true);
}

/* ---------- 주소(URL)와 화면 상태 동기화 ---------- */
function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  const sort = p.get("sort");
  state.sort = Array.from(sortSelect.options).some((o) => o.value === sort) ? sort : DEFAULT_SORT;
  state.price = PRICE[p.get("price")] ? p.get("price") : "";
  state.disc = DISCOUNTS.includes(p.get("disc")) ? p.get("disc") : "";
  state.cat = allCats.includes(p.get("cat")) ? p.get("cat") : "";
  const sites = p.getAll("site").filter((s) => allSites.includes(s));
  state.sites = new Set(sites.length ? sites : allSites);
  state.page = Math.max(parseInt(p.get("page"), 10) || 1, 1);
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.sort !== DEFAULT_SORT) p.set("sort", state.sort);
  if (state.price) p.set("price", state.price);
  if (state.disc) p.set("disc", state.disc);
  if (state.cat) p.set("cat", state.cat);
  if (state.sites.size !== allSites.length) allSites.forEach((s) => state.sites.has(s) && p.append("site", s));
  if (state.page > 1) p.set("page", state.page);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  if (window.updateNavActive) window.updateNavActive();
}

function applyToControls() {
  qInput.value = state.q;
  sortSelect.value = state.sort;
  priceRadios.forEach((r) => (r.checked = r.value === state.price));
  discRadios.forEach((r) => (r.checked = r.value === state.disc));
  catRadios.forEach((r) => (r.checked = r.value === state.cat));
  siteBoxes.forEach((b) => (b.checked = state.sites.has(b.value)));
}

/* ---------- 검색 ---------- */
// resetPage: 필터나 검색어가 바뀌면 1페이지로 돌아간다. scrollTop: 페이지 번호를 눌렀을 때 목록 맨 위로 올라간다.
async function search(resetPage, scrollTop = false) {
  if (resetPage) state.page = 1;
  if (state.sites.size === 0) {
    results.replaceChildren();
    pagerEl.hidden = true;
    statusEl.textContent = "쇼핑몰을 하나 이상 선택해 주십시오.";
    writeUrl();
    return;
  }

  const params = new URLSearchParams({ q: state.q, sort: state.sort, page: state.page });
  state.sites.forEach((s) => params.append("site", s));
  if (state.price) {
    const [min, max] = PRICE[state.price];
    if (min !== null) params.set("min_price", min);
    if (max !== null) params.set("max_price", max);
  }
  if (state.disc) params.set("min_discount", state.disc);
  if (state.cat) params.set("cat", state.cat);

  const myId = ++requestId;
  let data;
  try {
    const res = await fetch("/api/search?" + params);
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (e) {
    if (myId === requestId) statusEl.textContent = "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주십시오.";
    return;
  }
  if (myId !== requestId) return; // 더 최신 검색이 있으면 이전 응답은 버린다

  state.page = data.page; // 서버가 범위를 넘는 페이지를 마지막 페이지로 맞춰 준다
  results.replaceChildren(...data.items.map(buildCard));
  statusEl.textContent =
    data.total === 0
      ? "조건에 맞는 상품이 없습니다. 필터를 줄여 보십시오."
      : `총 ${data.total.toLocaleString("ko-KR")}개 · ${data.page} / ${data.pages} 페이지`;
  renderPager(data.pages);
  writeUrl();
  if (scrollTop) window.scrollTo({ top: 0 });
}

/* ---------- 입력 이벤트 ---------- */
qInput.addEventListener("input", () => {
  state.q = qInput.value.trim();
  clearTimeout(timer);
  timer = setTimeout(() => search(true), 250);
});
qInput.form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(timer);
  state.q = qInput.value.trim();
  search(true);
});
sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  search(true);
});
priceRadios.forEach((r) => r.addEventListener("change", () => { state.price = r.value; search(true); }));
discRadios.forEach((r) => r.addEventListener("change", () => { state.disc = r.value; search(true); }));
catRadios.forEach((r) => r.addEventListener("change", () => { state.cat = r.value; search(true); }));
siteBoxes.forEach((b) =>
  b.addEventListener("change", () => {
    b.checked ? state.sites.add(b.value) : state.sites.delete(b.value);
    search(true);
  })
);

document.getElementById("reset").addEventListener("click", () => {
  state.sort = DEFAULT_SORT;
  state.price = "";
  state.disc = "";
  state.cat = "";
  state.sites = new Set(allSites);
  applyToControls();
  search(true);
});

/* ---------- 모바일 필터 서랍 ---------- */
const openBtn = document.getElementById("open-filters");
const closeBtn = document.getElementById("close-filters");
const overlay = document.getElementById("overlay");

function setFilters(open) {
  document.body.classList.toggle("filters-open", open);
  openBtn.setAttribute("aria-expanded", String(open));
  (open ? closeBtn : openBtn).focus();
}
openBtn.addEventListener("click", () => setFilters(true));
closeBtn.addEventListener("click", () => setFilters(false));
overlay.addEventListener("click", () => setFilters(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("filters-open")) setFilters(false);
});
window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
  if (e.matches) document.body.classList.remove("filters-open");
});

readUrl();
applyToControls();
search(false); // 주소에 page가 있으면 그 페이지부터 보여준다
