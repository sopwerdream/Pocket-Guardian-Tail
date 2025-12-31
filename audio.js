/* =====================================================
   audio.js — Global Audio Module (Reusable)
   FIXED:
   - Slider can animate 0 -> target without triggering "mute at 0" lock
   - Autoplay + Unlock + Fade-in works reliably
   - Play button responsive (locked only during fade)
   ===================================================== */

window.AudioModule = (function () {
  let audio = null;
  let ui = {};
  let opt = {};

  let isFading = false;
  let isInit = false;

  // สำคัญ: กัน event slider ตอนเราอัปเดตด้วยโค้ด (ไม่ให้ handler ไป mute)
  let isProgrammatic = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

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

  // ---------- persistence ----------
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

  // ---------- slider helpers ----------
  function setSliderValue(v, { emit = true } = {}) {
    if (!ui.vol) return;
    const vv = clamp01(v);
    ui.vol.value = String(vv);

    if (emit) {
      // emit เพื่อให้ UI (CSS/logic ที่ฟัง input) อัปเดต แต่ไม่เข้าฝั่ง handler
      isProgrammatic = true;
      ui.vol.dispatchEvent(new Event("input", { bubbles: true }));
      isProgrammatic = false;
    }
  }

  // ---------- gate overlay ----------
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

  // ---------- fade engine (ทำให้ slider วิ่งเนียน) ----------
  function fadeInTo(target, durMs) {
    if (!audio) return;

    isFading = true;

    const tv = clamp01(target);
    const dur = clamp(num(durMs, 2000), 200, 12000);
    const start = performance.now();

    // smoothstep: เนียนกว่า linear
    const ease = (p) => p * p * (3 - 2 * p);

    function tick(t) {
      const raw = (t - start) / dur;
      const p = Math.min(1, Math.max(0, raw));
      const v = tv * ease(p);

      audio.volume = clamp01(v);

      // อัปเดต slider ให้ “วิ่ง” โดยไม่ไป mute ตัวเอง
      setSliderValue(audio.volume, { emit: true });

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        isFading = false;
        // จบแล้วค่อย sync persistence / UI
        savePersisted(audio.volume, audio.muted);
        updateUI();
      }
    }

    requestAnimationFrame(tick);
  }

  // ---------- core autoplay ----------
  async function softAutoplay() {
    if (!audio) return;

    // เริ่มจาก 0 เพื่อให้เห็นวิ่งทุกครั้ง แต่ "ห้าม" ทำให้ mute ค้าง
    audio.volume = 0;
    setSliderValue(0, { emit: true });

    updateUI();

    let ok = await tryPlay();
    if (ok) {
      if (!audio.muted) fadeInTo(opt.targetVol, opt.fadeMs);
      updateUI();
      return;
    }

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

  // ---------- volume setters ----------
  function setVolume(v) {
    if (!audio) return;
    const vv = clamp01(v);

    audio.volume = vv;
    // อัปเดต slider เฉย ๆ (emit เพื่อให้ UI เปลี่ยน)
    setSliderValue(vv, { emit: true });

    // UX: ถ้าผู้ใช้ตั้ง 0 จริง ๆ ให้ mute (แต่เฉพาะ user action)
    audio.muted = vv === 0;
    savePersisted(audio.volume, audio.muted);
    updateUI();
  }

  // ---------- UI bindings ----------
  function bindUI() {
    // Play
    ui.playBtn?.addEventListener("click", async () => {
      if (!audio) return;
      if (isFading) return;

      try {
        if (audio.paused) {
          const ok = await tryPlay();
          if (!ok && opt.showGate) ensureGate();
        } else {
          audio.pause();
        }
      } catch {}
      updateUI();
    });

    // Mute
    ui.muteBtn?.addEventListener("click", () => {
      if (!audio) return;
      audio.muted = !audio.muted;
      savePersisted(audio.volume, audio.muted);
      updateUI();
    });

    // Slider (user input only)
    ui.vol?.addEventListener("input", () => {
      if (!audio) return;
      if (isProgrammatic) return; // ✅ กันตอนเราทำ slider วิ่ง

      // ถ้าผู้ใช้ลากระหว่าง fade → ยกเลิก fade เพื่อให้ user คุมเอง
      if (isFading) isFading = false;

      const vv = clamp01(num(ui.vol.value, audio.volume));
      audio.volume = vv;
      audio.muted = (vv === 0);
      savePersisted(audio.volume, audio.muted);
      updateUI();
    });

    // Vol down/up
    ui.volDown?.addEventListener("click", () => {
      if (!audio) return;
      if (isFading) return;
      setVolume(audio.volume - 0.05);
    });

    ui.volUp?.addEventListener("click", () => {
      if (!audio) return;
      if (isFading) return;
      setVolume(audio.volume + 0.05);
    });
  }

  // ---------- public API ----------
  function init(config) {
    if (isInit) {
      try { audio?.pause(); } catch {}
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
    opt.storagePrefix = opt.storagePrefix || "s8_bgm"; // default
    opt.showGate = opt.showGate !== false;             // default true

    // attach src
    audio.src = config.src;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    // restore persisted
    const persisted = loadPersisted();
    if (persisted) {
      audio.muted = persisted.muted;
      opt.targetVol = clamp01(persisted.vol);

      // ให้ slider แสดงค่าเป้าหมายก่อน (ยังไม่วิ่ง)
      if (ui.vol) ui.vol.value = String(opt.targetVol);
    } else {
      // ถ้าไม่ persist ให้ตั้ง mute = false เป็นค่าเริ่มต้น
      audio.muted = false;
    }

    bindUI();
    updateUI();

    softAutoplay();
  }

  return { init };
})();
