/* Slide 8 — Safe Room System (slide8.js)
   - Bilingual text (TH/EN) compatible with global UI
   - Click image popup (modal)
   - Slide 8 only BGM with autoplay + fade-in
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

  // ถ้า ui.js ยิงอีเวนต์นี้มา ก็จับได้ทันที
  window.addEventListener("langchange", (e)=>{
    const lang = String(e.detail || "TH").toUpperCase();
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang);
    renderThumbs();
    renderStageMeta();
  });

  // กันกรณี ui.js เปลี่ยนภาษาแบบไม่ยิง event → เราเช็คเป็นระยะ
  let _lang = getLang();
  setInterval(()=>{
    const now = getLang();
    if(now !== _lang){
      _lang = now;
      applyLang(now);
      renderThumbs();
      renderStageMeta();
    }
  }, 300);

  // ---------- Assets ----------
  const ASSETS = {
    keyVisual: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/key%20visual%20Safe%20Room.png",
    rooms: [
      {
        id:"custom",
        th:"Character Customization & Setting",
        en:"Character Customization & Setting",
        src:"https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Character%20customization%20and%20setting..png",
        footer:"Character customization and setting."
      },
      {
        id:"craft",
        th:"Craft Room & Equipment",
        en:"Craft Room & Equipment",
        src:"https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Craft%20room%20And%20wear%20the%20equipment..png",
        footer:"Craft room and wear the equipment."
      },
      {
        id:"skill",
        th:"Skill Upgrade Room",
        en:"Skill Upgrade Room",
        src:"https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Enter%20the%20skill%20upgrade%20room..png",
        footer:"Enter the skill upgrade room."
      },
      {
        id:"map",
        th:"Map & Mission Event Room",
        en:"Map & Mission Event Room",
        src:"https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Map%20and%20Mission%20Event%20Room.png",
        footer:"Map and mission event room."
      },
      {
        id:"storage",
        th:"Storage Room",
        en:"Storage Room",
        src:"https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/storage%20room.png",
        footer:"Storage room."
      }
    ],
    // (สำคัญ) ใช้ raw github สำหรับ mp3
    bgm: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/main/assets/song/Safe%20Room%20(Loft%20Style).mp3"
  };

  // apply background key visual
  document.documentElement.style.setProperty("--s8-keyvisual", `url("${ASSETS.keyVisual}")`);

  // ---------- Refs ----------
  const stage = document.getElementById("s8_stage");
  const stageImg = document.getElementById("s8_stageImg");
  const stageTag = document.getElementById("s8_stageTag");
  const stageFooter = document.getElementById("s8_stageFooter");

  const thumbs = document.getElementById("s8_thumbs");
  const prevBtn = document.getElementById("s8_prevRoom");
  const nextBtn = document.getElementById("s8_nextRoom");

  let idx = 0;

  function roomTitle(r){
    return (getLang() === "EN") ? r.en : r.th;
  }

  function setRoom(i){
    idx = (i + ASSETS.rooms.length) % ASSETS.rooms.length;
    const r = ASSETS.rooms[idx];

    stageImg.src = r.src;
    stageImg.alt = roomTitle(r);
    renderStageMeta();

    [...thumbs.querySelectorAll(".thumb")].forEach((t, ti)=>{
      t.classList.toggle("active", ti === idx);
    });
  }

  function renderStageMeta(){
    const r = ASSETS.rooms[idx];
    stageTag.textContent = roomTitle(r);
    stageFooter.textContent = r.footer || "";
  }

  function renderThumbs(){
    thumbs.innerHTML = "";
    ASSETS.rooms.forEach((r, i)=>{
      const el = document.createElement("div");
      el.className = "thumb" + (i === idx ? " active" : "");
      el.innerHTML = `
        <img src="${r.src}" alt="${roomTitle(r)}">
        <div class="cap">${roomTitle(r)}</div>
      `;
      el.addEventListener("click", ()=>setRoom(i));
      thumbs.appendChild(el);
    });
  }

  // ---------- Accordion ----------
  function mountAccordion(){
    document.querySelectorAll(".acc .acc-h").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        btn.closest(".acc").classList.toggle("open");
      });
    });
  }

  // ---------- Image popup ----------
  const modal = document.getElementById("imgModal");
  const modalImg = document.getElementById("imgModalImg");
  const modalCap = document.getElementById("imgModalCap");
  const modalBackdrop = document.getElementById("imgModalBackdrop");
  const modalClose = document.getElementById("imgModalClose");

  function openImg(src, cap){
    modalImg.src = src;
    modalCap.textContent = cap || "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
  }
  function closeImg(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    modalImg.src = "";
  }

  modalBackdrop.addEventListener("click", closeImg);
  modalClose.addEventListener("click", closeImg);
  window.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeImg(); });

  stage.addEventListener("click", ()=>{
    const r = ASSETS.rooms[idx];
    openImg(r.src, roomTitle(r));
  });
  stage.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      const r = ASSETS.rooms[idx];
      openImg(r.src, roomTitle(r));
    }
  });

  prevBtn.addEventListener("click", ()=>setRoom(idx-1));
  nextBtn.addEventListener("click", ()=>setRoom(idx+1));

  // ---------- Audio ----------
  const bgm = document.getElementById("s8_bgm");
  const playBtn = document.getElementById("s8_playBtn");
  const muteBtn = document.getElementById("s8_muteBtn");
  const vol = document.getElementById("s8_vol");
  const vd = document.getElementById("s8_volDown");
  const vu = document.getElementById("s8_volUp");
  const fadeMs = document.getElementById("s8_fadeMs");

  const VOL_KEY = "s8_bgm_vol";
  const MUTED_KEY = "s8_bgm_muted";

  function updAudioUI(){
    playBtn.textContent = bgm.paused ? "▶" : "⏸";
    muteBtn.textContent = bgm.muted || bgm.volume === 0 ? "🔇" : "🔊";
  }

  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const num = (v,fb)=>{ const n=Number(v); return Number.isFinite(n)?n:fb; };

  function setVol(v){
    const vv = clamp(v, 0, 1);
    bgm.volume = vv;
    vol.value = String(vv);
    localStorage.setItem(VOL_KEY, String(vv));

    // UX: ถ้า 0 ให้ mute อัตโนมัติ
    bgm.muted = (vv === 0);
    localStorage.setItem(MUTED_KEY, bgm.muted ? "1" : "0");
    updAudioUI();
  }

  playBtn.addEventListener("click", async ()=>{
    try{
      if(bgm.paused) await bgm.play();
      else bgm.pause();
    }catch(e){}
    updAudioUI();
  });

  muteBtn.addEventListener("click", ()=>{
    bgm.muted = !bgm.muted;
    localStorage.setItem(MUTED_KEY, bgm.muted ? "1" : "0");
    updAudioUI();
  });

  vol.addEventListener("input", ()=>setVol(num(vol.value, 0.55)));
  vd.addEventListener("click", ()=>setVol(num(vol.value, 0.55) - 0.05));
  vu.addEventListener("click", ()=>setVol(num(vol.value, 0.55) + 0.05));

  function autoplayWithFade(){
    const target = clamp(num(localStorage.getItem(VOL_KEY), 0.55), 0, 1);
    const muted = (localStorage.getItem(MUTED_KEY) === "1");

    bgm.src = ASSETS.bgm;
    bgm.muted = muted;

    // เริ่มจาก 0 แล้วค่อยเฟสขึ้น
    bgm.volume = 0;
    vol.value = String(target);

    setTimeout(async ()=>{
      try{
        await bgm.play();
        if(!bgm.muted){
          const dur = clamp(num(fadeMs.value, 2000), 200, 12000);
          const start = performance.now();
          const tick = (t)=>{
            const p = Math.min((t-start)/dur, 1);
            bgm.volume = target * p;
            if(p < 1) requestAnimationFrame(tick);
            else updAudioUI();
          };
          requestAnimationFrame(tick);
        }else{
          bgm.volume = 0;
        }
      }catch(e){
        // autoplay อาจโดนบล็อค → ให้ user กด Play เอง
        bgm.volume = target;
      }
      updAudioUI();
    }, 250);
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    // preload images
    ASSETS.rooms.forEach(r=>{ const im = new Image(); im.src = r.src; });

    _lang = getLang();
    applyLang(_lang);

    renderThumbs();
    setRoom(0);
    mountAccordion();

    autoplayWithFade();
    updAudioUI();
  });
})();
