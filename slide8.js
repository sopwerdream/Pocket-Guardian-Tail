/* Slide 8 — Safe Room System (slide8.js)
   - Language sync (TH/EN) compatible with your global lang system
   - Rooms thumbs + stage switch
   - Image popup (modal)
   - BGM: soft-autoplay + fade-in + unlock on first interaction
   - Fix: play button responsiveness + no negative volume
*/
(function(){
  // ---------- Language sync (keep your original behavior) ----------
  const POSSIBLE_LANG_KEYS = ["lang", "PGT_LANG", "deckLang"];
  function detectLangKey(){
    for(const k of POSSIBLE_LANG_KEYS){
      if(localStorage.getItem(k)) return k;
    }
    return "deckLang"; // fallback ให้ตรง global มากขึ้น
  }
  const LANG_KEY = detectLangKey();

  function getLang(){
    const raw = (localStorage.getItem(LANG_KEY) || "TH");
    const v = String(raw).toUpperCase();
    return (v === "EN" || v === "en") ? "EN" : "TH";
  }
  function applyLang(lang){
    document.querySelectorAll("[data-th][data-en]").forEach(el=>{
      el.textContent = (lang === "EN") ? el.dataset.en : el.dataset.th;
    });
  }

  // รับ event จาก global ถ้ามี
  window.addEventListener("langchange", (e)=>{
    // รองรับทั้ง {detail:{lang:"th"}} และ {detail:"EN"}
    let v = e?.detail?.lang ?? e?.detail ?? "TH";
    v = String(v).toUpperCase();
    const lang = (v === "EN") ? "EN" : "TH";
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang);
    renderThumbs();
    renderStageMeta();
  });

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

  // ---------- Audio (Improved soft-autoplay + unlock + stable play) ----------
  const bgm = document.getElementById("s8_bgm");
  const playBtn = document.getElementById("s8_playBtn");
  const muteBtn = document.getElementById("s8_muteBtn");
  const vol = document.getElementById("s8_vol");
  const vd = document.getElementById("s8_volDown");
  const vu = document.getElementById("s8_volUp");
  const fadeMs = document.getElementById("s8_fadeMs");

  const VOL_KEY = "s8_bgm_vol";
  const MUTED_KEY = "s8_bgm_muted";

  let isFading = false;

  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const clamp01 = (v)=>clamp(v,0,1);
  const num = (v,fb)=>{ const n=Number(v); return Number.isFinite(n)?n:fb; };

  function updAudioUI(){
    playBtn.textContent = bgm.paused ? "▶" : "⏸";
    muteBtn.textContent = (bgm.muted || bgm.volume === 0) ? "🔇" : "🔊";
  }

  function setVol(v){
    const vv = clamp01(v);
    bgm.volume = vv;
    vol.value = String(vv);
    localStorage.setItem(VOL_KEY, String(vv));

    // UX: 0 => mute
    bgm.muted = (vv === 0);
    localStorage.setItem(MUTED_KEY, bgm.muted ? "1" : "0");

    // ให้ UI “ขยับเอง” แบบที่คุณเคยเห็น
    vol.dispatchEvent(new Event("input",{bubbles:true}));
    vol.dispatchEvent(new Event("change",{bubbles:true}));

    updAudioUI();
  }

  async function tryPlay(){
    try{ await bgm.play(); return true; }
    catch(e){ return false; }
  }

  function ensureGate(){
    let g = document.getElementById("s8_audioGate");
    if(g) return g;

    g = document.createElement("div");
    g.id = "s8_audioGate";
    g.style.position = "fixed";
    g.style.inset = "0";
    g.style.zIndex = "200000";
    g.style.display = "grid";
    g.style.placeItems = "center";
    g.style.background = "rgba(0,0,0,.25)";
    g.style.backdropFilter = "blur(6px)";
    g.innerHTML = `
      <div style="
        max-width:520px;margin:0 16px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(255,255,255,.18);
        background:rgba(0,0,0,.45);color:rgba(255,255,255,.92);
        font:600 14px system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans Thai',sans-serif;
        text-align:center;">
        <div style="font-size:16px;font-weight:900;margin-bottom:6px;">Tap to enable BGM</div>
        <div style="opacity:.9">เบราว์เซอร์บล็อกเสียงอัตโนมัติ — คลิก/แตะ 1 ครั้งเพื่อเปิดเพลง</div>
      </div>
    `;
    document.body.appendChild(g);
    return g;
  }

  function fadeInTo(target, dur){
    isFading = true;
    const tv = clamp01(target);
    const ms = clamp(num(dur, 2000), 200, 12000);
    const start = performance.now();

    function tick(t){
      const p = Math.min(1, (t - start)/ms);
      bgm.volume = tv * p;

      // ให้ slider วิ่งตาม fade-in
      vol.value = String(bgm.volume);
      vol.dispatchEvent(new Event("input",{bubbles:true}));

      if(p < 1) requestAnimationFrame(tick);
      else {
        isFading = false;
        updAudioUI();
      }
    }
    requestAnimationFrame(tick);
  }

  async function autoplayWithFade(){
    // เตรียมค่า
    const target = clamp01(num(localStorage.getItem(VOL_KEY), num(vol.value, 0.55)));
    const muted = (localStorage.getItem(MUTED_KEY) === "1");

    bgm.src = ASSETS.bgm;
    bgm.preload = "auto";
    bgm.crossOrigin = "anonymous";
    bgm.muted = muted;

    // เริ่มจาก 0 เพื่อช่วยให้ autoplay ผ่านในบางกรณี
    bgm.volume = 0;
    vol.value = "0";
    updAudioUI();

    // ลองเล่นทันที
    const ok = await tryPlay();
    if(ok){
      if(!bgm.muted) fadeInTo(target, fadeMs?.value || 2000);
      return;
    }

    // ถ้าโดนบล็อก → unlock ด้วย gesture ครั้งเดียว
    const gate = ensureGate();
    const unlock = async ()=>{
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      gate.remove();

      const ok2 = await tryPlay();
      if(ok2){
        if(!bgm.muted) fadeInTo(target, fadeMs?.value || 2000);
      }
      updAudioUI();
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  // ปุ่ม Play/Pause (แก้อาการไม่ตอบสนอง)
  playBtn.addEventListener("click", async ()=>{
    if(isFading) return; // กันแย่ง state ระหว่าง fade
    try{
      if(bgm.paused) await bgm.play();
      else bgm.pause();
    }catch(e){
      // ถ้ายังโดนบล็อก ให้แสดง gate แล้วคลิก 1 ครั้ง
      ensureGate();
    }
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

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    // preload images
    ASSETS.rooms.forEach(r=>{ const im = new Image(); im.src = r.src; });

    const lang = getLang();
    applyLang(lang);

    renderThumbs();
    setRoom(0);
    mountAccordion();

    autoplayWithFade();
    updAudioUI();
  });
})();
