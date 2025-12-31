/* =====================================================
   audio.js — Global Audio Module (Reusable)
   Features:
   - Soft Autoplay (try play immediately)
   - If blocked: "Tap to enable BGM" gate unlock (pointerdown/keydown once)
   - Fade-in volume from 0 -> target (slider animates smoothly)
   - Stable play/pause (locks during fade)
   - Mute + Volume + VolUp/Down controls
   - Optional persistence (volume/mute) via localStorage keys
   Usage:
     AudioModule.init({
       src,
       audio,
       ui: { playBtn, muteBtn, vol, volDown, volUp, fadeMsInput },
       options: { targetVol, fadeMs, persist, storagePrefix, showGate }
     })
   ===================================================== */

window.AudioModule = (function () {
  // -------- internal state --------
  let audio = null;
  let ui = {};
  let opt = {};

  let isFading = false;
  let isInit = false;

  // -------- utils --------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  function dispatchSliderEvents() {
    // ให้ UI range (และสไตล์ที่ฟัง input) อัปเดตเหมือน “วิ่งเอง”
    if (!ui.vol) return;
    ui.vol.dispatchEvent(new Event("input", { bubbles: true }));
    // change ไม่จำเป็นทุกเฟรม แต่ปล่อยไว้เบา ๆ ตอนจบ fade
  }

  function setSliderValue(v) {
    if (!ui.vol) return;
    ui.vol.value = String(clamp01(v));
    dispatchSliderEvents();
  }

  function updateUI() {
    if (!audio) return;
    if (ui.playBtn) ui.playBtn.textContent = audio.paused ? "▶" : "⏸";
    if (ui.muteBtn) ui.muteBtn.textContent = (audio.muted || audio.volume === 0) ? "🔇" : "🔊";
  }

  async function tryPlay() {
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  // -------- persistence --------
  function k(name) {
    const p = opt.storagePrefix || "pgt_audio";
    return `${p}_${name}`;
  }

  function loadPersisted() {
    if (!opt.persist) return null;

    const v = clamp01(num(localStorage.getItem(k("vol")), opt.targetVol));
    const m = localStorage.getItem(k("muted")) === "1";
    return { vol: v, muted: m };
  }

  function savePersisted(volVal, mutedVal) {
    if (!opt.persist) return;
    localStorage.setItem(k("vol"), String(clamp01(volVal)));
    localStorage.setItem(k("muted"), mutedVal ? "1" : "0");
  }

  // -------- gate overlay --------
  function ensureGate() {
    if (!opt.showGate) return null;

    let g = document.getElementById("audioGate");
    if (g) return g;

    g = document.createElement("div");
    g.id = "audioGate";
    g.style.cssText = `
      position:fixed; inset:0; z-index:200000;
      display:grid; place-items:center;
      background:rgba(0,0,0,.25);
      backdrop-filter:blur(6px);
    `;

    g.innerHTML = `
      <div style="
        max-width:520px;margin:0 16px;padding:14px 16px;
        border-radius:16px;border:1px solid rgba(255,255,255,.18);
        background:rgba(0,0,0,.45);
        color:rgba(255,255,255,.92);
        font:600 14px system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans Thai',sans-serif;
        text-align:center;">
        <div style="font-size:16px;font-weight:900;margin-bottom:6px;">Tap to enable BGM</div>
        <div style="opacity:.9">เบราว์เซอร์บล็อกเสียงอัตโนมัติ — คลิก/แตะ 1 ครั้งเพื่อเปิดเพลง</div>
      </div>
    `;
    document.body.appendChild(g);
    return g;
  }

  function removeGate() {
    const g = document.getElementById("audioGate");
    if (g) g.remove();
  }

  // -------- fade engine (slider "วิ่งเนียน ๆ") --------
  function fadeInTo(target, durMs) {
    if (!audio) return;

    isFading = true;

    const tv = clamp01(target);
    const dur = clamp(num(durMs, 2000), 200, 12000);
    const start = performance.now();

    // easing ให้เนียนขึ้นกว่าลิเนียร์ (smoothstep)
    const ease = (p) => p * p * (3 - 2 * p);

    function tick(t) {
      const raw = (t - start) / dur;
      const p = Math.min(1, Math.max(0, raw));
      const v = tv * ease(p);

      audio.volume = clamp01(v);
      setSliderValue(audio.volume); // <<< แถบวิ่งขึ้นเองทุกเฟรม

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        isFading = false;
        // ยิง change ตอนจบทีเดียวพอ
        if (ui.vol) ui.vol.dispatchEvent(new Event("change", { bubbles: true }));
        savePersisted(audio.volume, audio.muted);
        updateUI();
      }
    }

    requestAnimationFrame(tick);
  }

  // -------- core autoplay behavior --------
  async function softAutoplay() {
    if (!audio) return;

    // กำหนดเริ่มจาก 0 เสมอ เพื่อ “เห็นวิ่งจาก 0 → target” ทุกครั้ง
    audio.volume = 0;
    setSliderValue(0);

    updateUI();

    // ลองเล่นทันที
    let ok = await tryPlay();
    if (ok) {
      if (!audio.muted) fadeInTo(opt.targetVol, opt.fadeMs);
      else {
        // mute อยู่ก็ไม่ต้อง fade
        audio.volume = 0;
        setSliderValue(0);
      }
      updateUI();
      return;
    }

    // ถ้าโดนบล็อก → unlock ด้วย gesture
    const gate = ensureGate();

    const unlock = async () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      if (gate) removeGate();

      ok = await tryPlay();
      if (ok) {
        if (!audio.muted) fadeInTo(opt.targetVol, opt.fadeMs);
      }
      updateUI();
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  // -------- UI bindings --------
  function setVolume(v) {
    if (!audio) return;
    const vv = clamp01(v);

    audio.volume = vv;
    setSliderValue(vv);

    // UX: volume 0 => mute
    audio.muted = vv === 0;
    savePersisted(audio.volume, audio.muted);
    updateUI();
  }

  function bindUI() {
    // Play button
    if (ui.playBtn) {
      ui.playBtn.addEventListener("click", async () => {
        if (!audio) return;
        if (isFading) return; // กันแย่ง state ระหว่าง fade

        try {
          if (audio.paused) {
            const ok = await tryPlay();
            if (!ok && opt.showGate) ensureGate();
          } else {
            audio.pause();
          }
        } catch {
          // ignore
        }
        updateUI();
      });
    }

    // Mute button
    if (ui.muteBtn) {
      ui.muteBtn.addEventListener("click", () => {
        if (!audio) return;
        audio.muted = !audio.muted;
        savePersisted(audio.volume, audio.muted);
        updateUI();
      });
    }

    // Slider
    if (ui.vol) {
      ui.vol.addEventListener("input", () => {
        if (!audio) return;
        // ถ้ากำลัง fade แล้ว user ขยับ slider → ยกเลิก fade
        if (isFading) isFading = false;

        const vv = clamp01(num(ui.vol.value, audio.volume));
        audio.volume = vv;
        audio.muted = vv === 0;
        savePersisted(audio.volume, audio.muted);
        updateUI();
      });
    }

    // Vol down/up
    if (ui.volDown) {
      ui.volDown.addEventListener("click", () => {
        if (!audio) return;
        if (isFading) return;
        setVolume(audio.volume - 0.05);
      });
    }

    if (ui.volUp) {
      ui.volUp.addEventListener("click", () => {
        if (!audio) return;
        if (isFading) return;
        setVolume(audio.volume + 0.05);
      });
    }
  }

  // -------- public API --------
  function init(config) {
    if (isInit) {
      // allow re-init (swap track) safely
      try { audio.pause(); } catch {}
      removeGate();
      isFading = false;
    }
    isInit = true;

    audio = config.audio;
    ui = config.ui || {};
    opt = config.options || {};

    // defaults
    opt.targetVol = clamp01(num(opt.targetVol, num(ui.vol?.value, 0.55)));
    opt.fadeMs = clamp(num(opt.fadeMs, num(ui.fadeMsInput?.value, 2000)), 200, 12000);
    opt.persist = opt.persist !== false;               // default true
    opt.storagePrefix = opt.storagePrefix || "s8_bgm"; // default prefix
    opt.showGate = opt.showGate !== false;             // default true

    // attach src
    audio.src = config.src;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    // restore persisted settings
    const persisted = loadPersisted();
    if (persisted) {
      audio.muted = persisted.muted;
      // NOTE: เราจะเริ่มที่ 0 เพื่อให้วิ่งทุกครั้ง แต่ target ใช้ persisted
      opt.targetVol = clamp01(persisted.vol);
      // slider แสดงค่า target ไว้ (ก่อนวิ่ง)
      if (ui.vol) ui.vol.value = String(opt.targetVol);
    }

    bindUI();
    updateUI();

    // start autoplay
    softAutoplay();
  }

  return { init };
})();
