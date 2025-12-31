/* =========================================
   Global Language Module
   - Standalone
   - Emits `langchange`
   ========================================= */
(function(){
  const KEY = "deckLang";
  const DEFAULT_LANG = "en";

  function getLang(){
    return localStorage.getItem(KEY) || DEFAULT_LANG;
  }

  function setLang(lang){
    localStorage.setItem(KEY, lang);

    // broadcast to all slides
    window.dispatchEvent(
      new CustomEvent("langchange", {
        detail: { lang }
      })
    );

    updateUI(lang);
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
    th.textContent = "TH";
    th.dataset.lang = "th";

    const en = document.createElement("button");
    en.textContent = "EN";
    en.dataset.lang = "en";

    th.onclick = ()=> setLang("th");
    en.onclick = ()=> setLang("en");

    ctl.append(th, en);
    document.body.appendChild(ctl);

    const current = getLang();
    updateUI(current);

    // แจ้งภาษาเริ่มต้นให้ทุกหน้า
    window.dispatchEvent(
      new CustomEvent("langchange", {
        detail: { lang: current }
      })
    );
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
