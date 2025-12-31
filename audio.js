/* =====================================================
   Global Audio Module
   - Soft Autoplay (with unlock)
   - Fade In
   - Stable Play/Pause
   - Reusable across slides
   ===================================================== */

window.AudioModule = (function () {
  let audio, ui;
  let isFading = false;
  let isUnlocked = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  function dispatchSlider(el) {
    el?.dispatchEvent(new Event("input", { bubbles: true }));
    el?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function tryPlay() {
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  function fadeIn(target, durMs) {
    isFading = true;
    const tv = clamp01(target);
    const dur = clamp(num(durMs, 2000), 200, 12000);
    const start = performance.now();

    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      audio.volume = tv * p;

      if (ui.vol) {
        ui.vol.value = String(audio.volume);
        dispatchSlider(ui.vol);
      }

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        isFading = false;
        isUnlocked = true;
        updateUI();
      }
    }
    requestAnimationFrame(tick);
  }

  function showGate() {
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
        padding:14px 16px; border-radius:16px;
        background:rgba(0,0,0,.45);
        border:1px solid rgba(255,255,255,.2);
        color:#fff; text-align:center;
        font:600 14px system-ui;">
        <div style="font-size:16px;font-weight:900">Tap to enable BGM</div>
        <div style="opacity:.85">คลิกหนึ่งครั้งเพื่อเปิดเสียง</div>
      </div>`;
    document.body.appendChild(g);
    return g;
  }

  function updateUI() {
    if (!ui) return;
    ui.playBtn.textContent = audio.paused ? "▶" : "⏸";
    ui.muteBtn.textContent =
      audio.muted || audio.volume === 0 ? "🔇" : "🔊";
  }

  async function autoplay() {
    audio.volume = 0;
    if (ui.vol) {
      ui.vol.value = "0";
      dispatchSlider(ui.vol);
    }

    let ok = await tryPlay();
    if (ok) {
      fadeIn(ui.targetVol, ui.fadeMs);
      updateUI();
      return;
    }

    const gate = showGate();
    const unlock = async () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      gate.remove();

      ok = await tryPlay();
      if (ok) fadeIn(ui.targetVol, ui.fadeMs);
      updateUI();
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  function bindUI() {
    ui.playBtn?.addEventListener("click", async () => {
      if (isFading) return;
      if (audio.paused) {
        await tryPlay();
        isUnlocked = true;
      } else {
        audio.pause();
      }
      updateUI();
    });

    ui.muteBtn?.addEventListener("click", () => {
      audio.muted = !audio.muted;
      updateUI();
    });

    ui.vol?.addEventListener("input", () => {
      audio.volume = clamp01(num(ui.vol.value, audio.volume));
      audio.muted = audio.volume === 0;
      updateUI();
    });

    ui.volDown?.addEventListener("click", () => {
      audio.volume = clamp01(audio.volume - 0.05);
      if (ui.vol) ui.vol.value = audio.volume;
      updateUI();
    });

    ui.volUp?.addEventListener("click", () => {
      audio.volume = clamp01(audio.volume + 0.05);
      if (ui.vol) ui.vol.value = audio.volume;
      updateUI();
    });
  }

  return {
    init(config) {
      audio = config.audio;
      ui = config.ui;

      ui.targetVol = clamp01(num(ui.targetVol, 0.55));
      ui.fadeMs = num(ui.fadeMs, 2000);

      audio.src = config.src;
      audio.preload = "auto";
      audio.muted = false;

      bindUI();
      autoplay();
    },
  };
})();
