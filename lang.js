/* =========================================
   Global Language Module (Standalone)
   - Mount TH|EN buttons (outside #pageRoot)
   - Apply language to DOM via [data-th]/[data-en]
   - Emit `langchange` for slide-specific hooks
   ========================================= */
(function(){
  const KEY = "deckLang";
  const DEFAULT_LANG = "th"; // จะให้เริ่มไทยก็ได้ เปลี่ยนเป็น "en" ได้

  function getLang(){
    return localStorage.getItem(KEY) || DEFAULT_LANG;
  }

  function applyToDOM(lang){
    // ตั้งค่าให้ CSS/SEO ใช้ได้ด้วย
    document.documentElement.lang = (lang === "th") ? "th" : "en";
    document.documentElement.dataset.lang = lang;

    const attr = (lang === "th") ? "data-th" : "data-en";
    document.querySelectorAll(`[${attr}]`).forEach(el=>{
      const v = el.getAttribute(attr);
      if (v != null) el.textContent = v;
    });
  }

  function broadcast(lang){
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  function setLang(lang){
    localStorage.setItem(KEY, lang);
    applyToDOM(lang);
    updateUI(lang);
    broadcast(lang);
  }

  function updateUI(lang){
    document.querySelectorAll(".langCtl button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  function mount(){
    if(document.getElementById("langCtl")) return;

    const ctl = document.createElement("div");
    ctl.className = "langCtl";
    ctl.id = "langCtl";

    const th = document.createElement("button");
    th.type = "button";
    th.textContent = "TH";
    th.dataset.lang = "th";

    const en = document.createElement("button");
    en.type = "button";
    en.textContent = "EN";
    en.dataset.lang = "en";

    th.addEventListener("click", ()=> setLang("th"));
    en.addEventListener("click", ()=> setLang("en"));

    ctl.append(th, en);
    document.body.appendChild(ctl);

    const current = getLang();
    applyToDOM(current);
    updateUI(current);
    broadcast(current);
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
