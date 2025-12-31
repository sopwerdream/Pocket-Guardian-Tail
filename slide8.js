/* Slide 8 — Safe Room System (slide8.js)
   - Bilingual text (TH/EN) compatible with global Language Module (lang.js)
   - Click image popup (modal)
   - Slide 8 only BGM with soft-autoplay + fade-in + "tap to enable" unlock
*/
(function () {
  // =========================
  // Language sync (Global)
  // =========================
  const LANG_KEY = "deckLang"; // align with global lang.js
  let _lang = (localStorage.getItem(LANG_KEY) || "th").toLowerCase(); // "th" | "en"

  function getLang() {
    const v = (localStorage.getItem(LANG_KEY) || "th").toLowerCase();
    return v === "en" ? "en" : "th";
  }

  function applyLang(lang) {
    const attr = lang === "en" ? "data-en" : "data-th";
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const v = el.getAttribute(attr);
      if (v != null) el.textContent = v;
    });
  }

  // global module emits: window.dispatchEvent(new CustomEvent("langchange",{detail:{lang}}))
  window.addEventListener("langchange", (e) => {
    const lang = String(e?.detail?.lang || getLang()).toLowerCase();
    localStorage.setItem(LANG_KEY, lang);
    _lang = lang;
    applyLang(_lang);
    renderThumbs();
    renderStageMeta();
  });

  // =========================
  // Assets
  // =========================
  const ASSETS = {
    keyVisual:
      "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/key%20visual%20Safe%20Room.png",
    rooms: [
      {
        id: "custom",
        th: "Character Customization & Setting",
        en: "Character Customization & Setting",
        src: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Character%20customization%20and%20setting..png",
        footer: "Character customization and setting.",
      },
      {
        id: "craft",
        th: "Craft Room & Equipment",
        en: "Craft Room & Equipment",
        src: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Craft%20room%20And%20wear%20the%20equipment..png",
        footer: "Craft room and wear the equipment.",
      },
      {
        id: "skill",
        th: "Skill Upgrade Room",
        en: "Skill Upgrade Room",
        src: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Enter%20the%20skill%20upgrade%20room..png",
        footer: "Enter the skill upgrade room.",
      },
      {
        id: "map",
        th: "Map & Mission Event Room",
        en: "Map & Mission Event Room",
        src: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/Map%20and%20Mission%20Event%20Room.png",
        footer: "Map and mission event room.",
      },
      {
        id: "storage",
        th: "Storage Room",
        en: "Storage Room",
        src: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/refs/heads/main/assets/key%20visual%20Safe%20Room/storage%20room.png",
        footer: "Storage room.",
      },
    ],
    // raw github mp3
    bgm: "https://raw.githubusercontent.com/sopwerdream/Pocket-Guardian-Tail/main/assets/song/Safe%20Room%20(Loft%20Style).mp3",
  };

  // background key visual
  document.documentElement.style.setProperty(
    "--s8-keyvisual",
    `url("${ASSETS.keyVisual}")`
  );

  // =========================
  // Refs
  // =========================
  const stage = document.getElementById("s8_stage");
  const stageImg = document.getElementById("s8_stageImg");
  const stageTag = document.getElementById("s8_stageTag");
  const stageFooter = document.getElementById("s8_stageFooter");

  const thumbs = document.getElementById("s8_thumbs");
  const prevBtn = document.getElementById("s8_prevRoom");
  const nextBtn = document.getElementById("s8_nextRoom");

  let idx = 0;

  function roomTitle(r) {
    return _lang === "en" ? r.en : r.th;
  }

  function setRoom(i) {
    idx = (i + ASSETS.rooms.length) % ASSETS.rooms.length;
    const r = ASSETS.rooms[idx];

    stageImg.src = r.src;
    stageImg.alt = roomTitle(r);
    renderStageMeta();

    [...thumbs.querySelectorAll(".thumb")].forEach((t, ti) => {
      t.classList.toggle("active", ti === idx);
    });
  }

  function renderStageMeta() {
    const r = ASSETS.rooms[idx];
    stageTag.textContent = roomTitle(r);
    stageFooter.textContent = r.footer || "";
  }

  function renderThumbs() {
    thumbs.innerHTML = "";
    ASSETS.rooms.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "thumb" + (i === idx ? " active" : "");
      el.innerHTML = `
        <img src="${r.src}" alt="${roomTitle(r)}">
        <div class="cap">${roomTitle(r)}</div>
      `;
      el.addEventListener("click", () => setRoom(i));
      thumbs.appendChild(el);
    });
  }

  // =========================
  // Accordion
  // =========================
  function mountAccordion() {
    document.querySelectorAll(".acc .acc-h").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".acc").classList.toggle("open");
      });
    });
  }

  // =========================
  // Image popup
  // =========================
  const modal = document.getElementById("imgModal");
  const modalImg = document.getElementById("imgModalImg");
  const modalCap = document.getElementById("imgModalCap");
  const modalBackdrop = document.getElementById("imgModalBackdrop");
  const modalClose = document.getElementById("imgModalClose");

  function openImg(src, cap) {
    modalImg.src = src;
    modalCap.textContent = cap || "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeImg() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";
  }

  modalBackdrop?.addEventListener("click", closeImg);
  modalClose?.addEventListener("click", closeImg);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImg();
  });

  stage?.addEventListener("click", () => {
    const r = ASSETS.rooms[idx];
    openImg(r.src, roomTitle(r));
  });

  stage?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const r = ASSETS.rooms[idx];
      openImg(r.src, roomTitle(r));
    }
  });

  prevBtn?.addEventListener("click", () => setRoom(idx - 1));
  nextBtn?.addEventListener("click", () => setRoom(idx + 1));

  // =========================
  // Audio (Soft Autoplay)
  // =========================
  const bgm = document.getElementById("s8_bgm");
  const playBtn = document.getElementById("s8_playBtn");
  const muteBtn = document.getElementById("s8_muteBtn");
  const vol = document.getElementById("s8_vol");
  const vd = document.getElementById("s8_volDown");
  const vu = document.getElementById("s8_volUp");
  const fadeMs = document.getElementById("s8_fadeMs");

  const VOL_KEY = "s8_bgm_vol";
  const MUTED_KEY = "s8_bgm_muted";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  function updAudioUI() {
    if (playBtn) playBtn.textContent = bgm.paused ? "▶" : "⏸";
    if (muteBtn) muteBtn.textContent = bgm.muted || bgm.volume === 0 ? "🔇" : "🔊";
  }

  function dispatchSliderEvents() {
    // ให้ UI “เหมือนวิ่งเอง”
    vol?.dispatchEvent(new Event("input", { bubbles: true }));
    vol?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setVol(v) {
    const vv = clamp01(v);
    bgm.volume = vv;

    if (vol) vol.value = String(vv);
    localStorage.setItem(VOL_KEY, String(vv));

    // UX: 0 => mute
    bgm.muted = vv === 0;
    localStorage.setItem(MUTED_KEY, bgm.muted ? "1" : "0");

    dispatchSliderEvents();
    updAudioUI();
  }

  playBtn?.addEventListener("click", async () => {
    try {
      if (bgm.paused) await bgm.play();
      else bgm.pause();
    } catch (e) {}
    updAudioUI();
  });

  muteBtn?.addEventListener("click", () => {
    bgm.muted = !bgm.muted;
    localStorage.setItem(MUTED_KEY, bgm.muted ? "1" : "0");
    updAudioUI();
  });

  vol?.addEventListener("input", () => setVol(num(vol.value, 0.55)));
  vd?.addEventListener("click", () => setVol(num(vol.value, 0.55) - 0.05));
  vu?.addEventListener("click", () => setVol(num(vol.value, 0.55) + 0.05));

  async function tryPlay(audio) {
    try {
      await audio.play();
      return true;
    } catch (e) {
      return false;
    }
  }

  function showAudioGate() {
    let overlay = document.getElementById("s8_audioGate");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "s8_audioGate";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "200000";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.style.background = "rgba(0,0,0,.25)";
    overlay.style.backdropFilter = "blur(6px)";
    overlay.innerHTML = `
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
    document.body.appendChild(overlay);
    return overlay;
  }

  function fadeInTo(audio, target, durMs) {
    const tv = clamp01(target);
    const dur = clamp(num(durMs, 2000), 200, 12000);
    const start = performance.now();

    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      const v = tv * p;
      audio.volume = clamp01(v);

      if (vol) {
        vol.value = String(audio.volume);
        dispatchSliderEvents(); // <<< “แถบวิ่ง”
      }

      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  async function autoplayWithFade() {
    const target = clamp01(num(localStorage.getItem(VOL_KEY), num(vol?.value, 0.55)));
    const muted = localStorage.getItem(MUTED_KEY) === "1";

    bgm.src = ASSETS.bgm;
    bgm.muted = muted;

    // start silent (helps autoplay in some cases)
    bgm.volume = 0;
    if (vol) vol.value = "0";
    dispatchSliderEvents();

    // try immediate autoplay
    let ok = await tryPlay(bgm);
    if (ok) {
      if (!bgm.muted) fadeInTo(bgm, target, fadeMs?.value || 2000);
      updAudioUI();
      return;
    }

    // blocked => unlock on first interaction (click anywhere)
    const gate = showAudioGate();

    const unlock = async () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      gate?.remove();

      ok = await tryPlay(bgm);
      if (ok) {
        if (!bgm.muted) fadeInTo(bgm, target, fadeMs?.value || 2000);
      } else {
        // still blocked -> user can press play button
        bgm.pause();
      }
      updAudioUI();
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    updAudioUI();
  }

  // =========================
  // Init
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    // preload images
    ASSETS.rooms.forEach((r) => {
      const im = new Image();
      im.src = r.src;
    });

    _lang = getLang();
    applyLang(_lang);

    renderThumbs();
    setRoom(0);
    mountAccordion();

    // init persisted volume/mute
    const savedVol = clamp01(num(localStorage.getItem(VOL_KEY), num(vol?.value, 0.55)));
    const savedMuted = localStorage.getItem(MUTED_KEY) === "1";
    bgm.muted = savedMuted;
    if (vol) vol.value = String(savedVol);
    updAudioUI();

    // autoplay (soft)
    autoplayWithFade();
  });
})();
