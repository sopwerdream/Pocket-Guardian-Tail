/* Slide 9 — Monster Ecosystem (slide9.js)
   - Auto carousel for 4 specific images (in order)
   - Click to expand (lightbox)
   - TH/EN bilingual via data-th/data-en (sync with ui.js)
   - Auto highlight/messaging by current image type (Native/Elite/Small/Corrupted)
*/
(function(){
  // ---------- Language sync ----------
  const POSSIBLE_LANG_KEYS = ["lang", "PGT_LANG", "deckLang"];
  function detectLangKey(){
    for(const k of POSSIBLE_LANG_KEYS){
      if(localStorage.getItem(k)) return k;
    }
    return "lang";
  }
  const LANG_KEY = detectLangKey();

  function getLang(){
    const v = (localStorage.getItem(LANG_KEY) || "TH").toUpperCase();
    return (v === "EN") ? "EN" : "TH";
  }
  function applyLang(lang){
    document.querySelectorAll("[data-th][data-en]").forEach(el=>{
      el.textContent = (lang === "EN") ? el.dataset.en : el.dataset.th;
    });
  }

  // ui.js may dispatch this
  window.addEventListener("langchange", (e)=>{
    const lang = String(e.detail || "TH").toUpperCase();
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang);
    // also update dynamic labels
    renderCaption();
    renderBadges();
  });

  let _lang = getLang();
  setInterval(()=>{
    const now = getLang();
    if(now !== _lang){
      _lang = now;
      applyLang(now);
      renderCaption();
      renderBadges();
    }
  }, 300);

  // ---------- DOM refs ----------
  const mainImg = document.getElementById("s9MainImg");
  const caption = document.getElementById("s9Caption");
  const dotsWrap = document.getElementById("s9Dots");
  const prevBtn = document.getElementById("s9Prev");
  const nextBtn = document.getElementById("s9Next");
  const stage = document.getElementById("s9Stage");

  const badgeA = document.getElementById("s9BadgeA");
  const badgeB = document.getElementById("s9BadgeB");

  const secNative = document.getElementById("secNative");
  const secCorrupt = document.getElementById("secCorrupt");
  const nativeMsg = document.getElementById("nativeMsg");
  const corruptMsg = document.getElementById("corruptMsg");

  const lb = document.getElementById("s9Lightbox");
  const lbImg = document.getElementById("s9LightboxImg");
  const lbCap = document.getElementById("s9LightboxCap");
  const lbClose = document.getElementById("s9Close");

  if(!mainImg || !dotsWrap) return;

  // ---------- Config ----------
  const INTERVAL_MS = 2800; // ✅ ปรับความเร็วเลื่อนอัตโนมัติได้ตรงนี้

  const RAW_BASE = "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/main/";
  const FOLDER = "assets/Concept Art Monster/";

  // helper: encode filename safely (keep folder path separate)
  const rawUrl = (filename) => RAW_BASE + "assets/Concept%20Art%20Monster/" + encodeURIComponent(filename).replace(/%2F/g,"/");

  // IMPORTANT: filenames must match repo EXACTLY
  const ITEMS = [
    { key:"pebble", type:"native",  title:"Pebble Golem",                        file:"Pebble Golem.png",
      thBadgeA:"NATIVE", enBadgeA:"NATIVE", thBadgeB:"สนามฝึก", enBadgeB:"Training" },

    { key:"elite",  type:"native-elite", title:"Pebble Golem – Elite Variant v1", file:"Pebble Golem – Elite Variant v1.png",
      thBadgeA:"NATIVE • ELITE", enBadgeA:"NATIVE • ELITE", thBadgeB:"กดดันขึ้น", enBadgeB:"Higher pressure" },

    { key:"small",  type:"native-small", title:"Small Monster",                  file:"Small Monster.png",
      thBadgeA:"NATIVE • MINION", enBadgeA:"NATIVE • MINION", thBadgeB:"สอนระบบ", enBadgeB:"Teaches basics" },

    { key:"corrupt",type:"corrupted",    title:"corrupted Small Monster",        file:"corrupted Small Monster.png",
      thBadgeA:"ALIEN CORRUPTED", enBadgeA:"ALIEN CORRUPTED", thBadgeB:"บททดสอบ", enBadgeB:"Strategic test" },
  ];

  let idx = 0;
  let timer = null;

  // ---------- UI helpers ----------
  function setActiveSection(type){
    // default: highlight Native unless corrupted
    const isCorrupt = (type === "corrupted");
    secNative.classList.toggle("isActive", !isCorrupt);
    secCorrupt.classList.toggle("isActive", isCorrupt);

    // update callouts a bit by context (optional)
    if(!nativeMsg || !corruptMsg) return;

    if(type === "native-elite"){
      nativeMsg.dataset.th = "Elite Variant คือ “จังหวะท้าทายแบบอ่านง่าย” ยกระดับความลึกโดยยังไม่ทำให้ผู้เล่นท้อ";
      nativeMsg.dataset.en = "Elite variants add readable challenge—more depth without heavy frustration.";
    }else if(type === "native-small"){
      nativeMsg.dataset.th = "Minion คือ “ตัวสอนระบบ” ที่ทำให้ผู้เล่นลองสกิล/ยืนตำแหน่งได้อย่างมั่นใจ";
      nativeMsg.dataset.en = "Minions are the ‘tutorial opponents’ that encourage confident experimentation.";
    }else{
      nativeMsg.dataset.th = "Native Monsters คือ “สนามฝึก” ที่ทำให้ผู้เล่นอยากเล่นต่อ ไม่รู้สึกกดดัน";
      nativeMsg.dataset.en = "Native monsters are the ‘training ground’ that keeps players engaged without pressure.";
    }

    if(isCorrupt){
      corruptMsg.dataset.th = "Corrupted Monsters คือ “แรงกดดันเชิงกลยุทธ์” ที่บังคับให้ผู้เล่นวางแผนจริง";
      corruptMsg.dataset.en = "Corrupted monsters apply strategic pressure—forcing real planning.";
    }else{
      corruptMsg.dataset.th = "Alien Corrupted Monsters คือ “บททดสอบ” ที่ทำให้เกมมีความลึกและคุณค่าเชิงกลยุทธ์";
      corruptMsg.dataset.en = "Alien corrupted monsters are the ‘strategic test’ that adds depth and value.";
    }

    applyLang(getLang());
  }

  function renderDots(){
    dotsWrap.innerHTML = "";
    ITEMS.forEach((_,i)=>{
      const d = document.createElement("div");
      d.className = "s9Dot" + (i===idx ? " isActive":"");
      d.onclick = ()=>go(i, true);
      dotsWrap.appendChild(d);
    });
  }

  function renderCaption(){
    const it = ITEMS[idx];
    const lang = getLang();
    caption.textContent = (lang === "EN") ? it.title : it.title; // ชื่อเหมือนกัน (ตามที่คุณให้)
  }

  function renderBadges(){
    const it = ITEMS[idx];
    const lang = getLang();
    badgeA.textContent = (lang === "EN") ? it.enBadgeA : it.thBadgeA;
    badgeB.textContent = (lang === "EN") ? it.enBadgeB : it.thBadgeB;
  }

  function preload(src){
    return new Promise((res, rej)=>{
      const im = new Image();
      im.onload = ()=>res(true);
      im.onerror = ()=>rej(false);
      im.src = src;
    });
  }

  async function go(i, userAction=false){
    idx = (i + ITEMS.length) % ITEMS.length;
    const it = ITEMS[idx];
    const src = rawUrl(it.file);

    try{
      await preload(src);
      mainImg.src = src;
      mainImg.alt = it.title;
    }catch(e){
      // fallback: show caption error (ไม่ throw)
      mainImg.removeAttribute("src");
      caption.textContent = "Image not found: " + it.file;
    }

    renderDots();
    renderCaption();
    renderBadges();
    setActiveSection(it.type);

    if(userAction) restart();
  }

  function next(){ go(idx+1, true); }
  function prev(){ go(idx-1, true); }

  function start(){
    stop();
    timer = setInterval(()=>go(idx+1,false), INTERVAL_MS);
  }
  function stop(){
    if(timer){ clearInterval(timer); timer=null; }
  }
  function restart(){ start(); }

  // ---------- Lightbox ----------
  function openLB(){
    const it = ITEMS[idx];
    const src = rawUrl(it.file);
    lbImg.src = src;
    lbCap.textContent = it.title;
    lb.classList.add("isOpen");
    lb.setAttribute("aria-hidden","false");
  }
  function closeLB(){
    lb.classList.remove("isOpen");
    lb.setAttribute("aria-hidden","true");
    lbImg.src = "";
  }

  stage.addEventListener("click", openLB);
  stage.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){ e.preventDefault(); openLB(); }
  });

  lbClose && (lbClose.onclick = closeLB);
  lb.addEventListener("click", (e)=>{ if(e.target === lb) closeLB(); });
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeLB(); });

  // Buttons
  prevBtn && (prevBtn.onclick = prev);
  nextBtn && (nextBtn.onclick = next);

  // Hover pause
  const visual = document.querySelector(".s9-visual");
  if(visual){
    visual.addEventListener("mouseenter", stop);
    visual.addEventListener("mouseleave", start);
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    _lang = getLang();
    applyLang(_lang);

    // preload all
    ITEMS.forEach(it=>{ const im=new Image(); im.src = rawUrl(it.file); });

    go(0);
    start();
  });
})();
