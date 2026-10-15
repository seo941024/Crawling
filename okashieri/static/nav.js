(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  function setNav(open) {
    nav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }

  navToggle.addEventListener("click", () => setNav(!nav.classList.contains("open")));

  // 현재 주소의 필터(검색어와 페이지 제외)가 메뉴 링크와 같으면 강조한다
  function normalized(search) {
    const p = new URLSearchParams(search);
    p.delete("q");
    p.delete("page");
    return Array.from(p.entries()).map(([k, v]) => k + "=" + v).sort().join("&");
  }

  window.updateNavActive = function () {
    const here = location.pathname + "?" + normalized(location.search);
    document.querySelectorAll("a[data-nav]").forEach((a) => {
      const u = new URL(a.href);
      const same = u.pathname + "?" + normalized(u.search) === here;
      a.classList.toggle("active", same);
      if (same) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  };
  window.updateNavActive();
})();
