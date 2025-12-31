/* =====================================================
   audio.js — Global Audio Module (Reusable)
   Version: 1.0.0 (FULL / FIXED)
   FIXED:
   - ✅ No "Maximum call stack size exceeded" (no dispatch input recursion)
   - ✅ Smooth slider animation 0 -> target (fade-in) without locking mute
   - ✅ Autoplay + Unlock Gate (tap to enable) + Fade-in
   - ✅ Playlist (prev/next) + Loop modes: one / all / off
   - ✅ Auto track name from filename (URL)
   - ✅ Buttons auto-disable when playlist missing/only 1 track
   ===================================================== */

window.AudioModule = (function () {
  let audio = null;
  let ui = {};
  let opt = {};

  // state
  let isInit = false;
  let isFading = false;
  let abortFade = false;

  // playlist
  let playlist = [];
  let trackIndex = 0;
  let loopMode = "one"; // "one" | "all" | "off"

  // helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  function decodeTrackName(src) {
    try {
      const file = (src || "").split("?")[0].split("#")[0].split("/").pop() || "BGM";
      const decoded = decodeURIComponent(file);
      return decoded.replace(/\.[^/.]+$/, "");
    } catch {
      return "BGM";
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
    const lm = localStorage.getItem(k("loop")) || "";
    return { vol: v, muted: m, loop: lm };
  }
  function savePersisted(volVal, mutedVal) {
    if (!opt.persist) return;
    localStorage.setItem(k("vol"), String(clamp01(volVal)));
    localStorage.setItem(k("muted"), mutedVal ? "1" : "0");
    localStorage.setItem(k("loop"), loopMode);
  }

  // ---------- UI ----------
  function setSliderValue(v) {
    if (!ui.vol) return;
    ui.vol.value = String(clamp01(v)); // ✅ IMPORTANT: no dispatchEvent -> no recursion
  }

  function updateTrackLabel() {
    if (!ui.trackName) return;
    const src = playlist[trackIndex] || audio?.src || "";
    ui.trackName.textContent = decodeTrackName(src);
  }

  function updateLoopButton() {
    if (!ui.loopBtn) return;
    // You can change icons/text as you like
    ui.loopBtn.textContent = (loopMode === "one") ? "🔁" : (loopMode === "all") ? "🔂" : "➡";
    ui.loopBtn.title = (loopMode === "one") ? "Loop: One" : (loopMode === "all") ? "Loop: All" : "Loop: Off";
  }

  function syncTrackButtons() {
    const hasMany = playlist.length > 1;
    if (ui.prevTrack) ui.prevTrack.disabled = !hasMany;
    if (ui.nextTrack) ui.nextTrack.disabled = !hasMany;
    if (ui.loopBtn) ui.loopBtn.disabled = playlist.length === 0;

    // Optional: add a "disabled" class for styling if you want
    [ui.prevTrack, ui.nextTrack, ui.loopBtn].forEach((b) => {
      if (!b) return;
      b.classList.toggle("is-disabled", b.disabled);
    });
  }

  function updateUI() {
    if (!audio) return;
    if (ui.playBtn) ui.playBtn.textContent = audio.paused ? "▶" : "⏸";
    if (ui.muteBtn) ui.muteBtn.textContent = (audio.muted || audio.volume === 0) ? "🔇" : "🔊";
    setSliderValue(audio.volume);
    updateTrackLabel();
    updateLoopButton();
  }

  async function tryPlay() {
    try {
      await audio.play();
      return true;
    } catch {
      return false;
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

  // ---------- fade engine ----------
  function fadeInTo(target, durMs) {
    if (!audio) return;
    abortFade = false;
    isFading = true;

    const tv = clamp01(target);
    const dur = clamp(num(durMs, 2000), 200, 12000);
    const start = performance.now();

    const ease = (p) => p * p * (3 - 2 * p); // smoothstep

    function tick(t) {
      if (abortFade) {
        isFading = false;
        return;
      }

      const raw = (t - start) / dur;
      const p = Math.min(1, Math.max(0, raw));
      const v = tv * ease(p);

      audio.volume = clamp01(v);
      setSliderValue(audio.volume); // ✅ no event dispatch

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        isFading = false;
        savePersisted(audio.volume, audio.muted);
        updateUI();
      }
    }

    requestAnimationFrame(tick);
  }

  // ---------- playlist / track ----------
  function applyLoopToAudio() {
    if (!audio) return;
    // HTMLAudioElement.loop only supports "one track loop"
    audio.loop = (loopMode === "one");
    updateLoopButton();
    savePersisted(audio.volume, audio.muted);
  }

  function setTrack(i, { autoplay = true } = {}) {
    if (!audio) return;
    if (!playlist.length) return;

    // stop fade
    abortFade = true;
    isFading = false;

    trackIndex = (i + playlist.length) % playlist.length;
    const src = playlist[trackIndex];

    audio.src = src;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.load();

    updateTrackLabel();
    syncTrackButtons();

    if (autoplay) {
      softAutoplay(); // includes fade-in
    } else {
      updateUI();
    }
  }

  // ---------- core autoplay ----------
  async function softAutoplay() {
    if (!audio) return;
    if (!playlist.length && !audio.src) return;

    // Always start from 0 for "slider runs up" effect, but DO NOT force mute
    audio.volume = 0;
    setSliderValue(0);

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

    abortFade = true;
    isFading = false;

    audio.volume = vv;
    setSliderValue(vv);

    // user intent: set 0 => mute
    audio.muted = (vv === 0);
    savePersisted(audio.volume, audio.muted);
    updateUI();
  }

  // ---------- UI bindings ----------
  function bindUI() {
    // Play
    ui.playBtn?.addEventListener("click", async () => {
      if (!audio) return;

      // allow user to interrupt fade by pressing play/pause
      abortFade = true;
      isFading = false;

      try {
        if (audio.paused) {
          const ok = await tryPlay();
          if (!ok && opt.showGate) ensureGate();
          else {
            // if resumed, optionally fade from current slider value
            if (!audio.muted && audio.volume === 0) fadeInTo(opt.targetVol, opt.fadeMs);
          }
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

    // Slider (user input)
    ui.vol?.addEventListener("input", () => {
      if (!audio) return;

      // user drags => cancel fade
      abortFade = true;
      isFading = false;

      const vv = clamp01(num(ui.vol.value, audio.volume));
      audio.volume = vv;
      audio.muted = (vv === 0);
      savePersisted(audio.volume, audio.muted);
      updateUI();
    });

    ui.volDown?.addEventListener("click", () => {
      if (!audio) return;
      setVolume(audio.volume - 0.05);
    });

    ui.volUp?.addEventListener("click", () => {
      if (!audio) return;
      setVolume(audio.volume + 0.05);
    });

    // Prev/Next track
    ui.prevTrack?.addEventListener("click", () => {
      if (playlist.length <= 1) return; // ✅ no freeze
      setTrack(trackIndex - 1);
    });

    ui.nextTrack?.addEventListener("click", () => {
      if (playlist.length <= 1) return; // ✅ no freeze
      setTrack(trackIndex + 1);
    });

    // Loop mode
    ui.loopBtn?.addEventListener("click", () => {
      if (!playlist.length) return;
      loopMode = (loopMode === "one") ? "all" : (loopMode === "all") ? "off" : "one";
      applyLoopToAudio();
      updateUI();
    });

    // When track ends (for loopMode=all/off)
    audio.addEventListener("ended", () => {
      // If one-track loop is enabled, HTML will loop automatically.
      if (loopMode === "all" && playlist.length > 1) {
        setTrack(trackIndex + 1, { autoplay: true });
      } else if (loopMode === "off") {
        // do nothing (stops)
        updateUI();
      }
    });

    // On play/pause update UI
    audio.addEventListener("play", updateUI);
    audio.addEventListener("pause", updateUI);
  }

  // ---------- public API ----------
  function init(config) {
    if (isInit) {
      try { audio?.pause(); } catch {}
      removeGate();
      abortFade = true;
      isFading = false;
    }
    isInit = true;

    audio = config.audio;
    ui = config.ui || {};
    opt = config.options || {};

    // defaults
    opt.targetVol = clamp01(num(opt.targetVol, num(ui.vol?.value, 0.55)));
    opt.fadeMs = clamp(num(opt.fadeMs, 2000), 200, 12000);
    opt.persist = opt.persist !== false;               // default true
    opt.storagePrefix = opt.storagePrefix || "pgt_bgm"; // default
    opt.showGate = opt.showGate !== false;             // default true

    // playlist
    playlist = Array.isArray(config.playlist)
      ? config.playlist.filter(Boolean)
      : (config.src ? [config.src] : []);

    // fallback: config.src only
    if (!playlist.length && config.src) playlist = [config.src];

    // restore persisted state
    const persisted = loadPersisted();
    if (persisted) {
      audio.muted = !!persisted.muted;
      opt.targetVol = clamp01(persisted.vol);

      if (persisted.loop === "one" || persisted.loop === "all" || persisted.loop === "off") {
        loopMode = persisted.loop;
      }
    } else {
      audio.muted = false;
      loopMode = "one";
    }

    // Attach first track
    trackIndex = clamp(trackIndex, 0, Math.max(0, playlist.length - 1));
    if (playlist.length) {
      audio.src = playlist[trackIndex];
    } else if (config.src) {
      audio.src = config.src;
    }

    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    // set slider to target (visual) before fade starts
    if (ui.vol) ui.vol.value = String(opt.targetVol);

    // apply loop setting
    applyLoopToAudio();
    syncTrackButtons();

    // bind UI once per init
    bindUI();
    updateTrackLabel();
    updateUI();

    // start autoplay + fade
    softAutoplay();
  }

  return {
    init,
    // optional helpers if you want to control externally:
    setTrack: (i) => setTrack(i, { autoplay: true }),
    setPlaylist: (list, startIndex = 0) => {
      playlist = Array.isArray(list) ? list.filter(Boolean) : [];
      trackIndex = clamp(startIndex, 0, Math.max(0, playlist.length - 1));
      syncTrackButtons();
      if (playlist.length) setTrack(trackIndex, { autoplay: true });
    },
    getState: () => ({
      trackIndex,
      playlist: [...playlist],
      loopMode,
      volume: audio?.volume ?? 0,
      muted: audio?.muted ?? false,
      paused: audio?.paused ?? true,
    }),
  };
})();
