/* =====================================================
   audio.js — Global Audio Module (Reusable)
   FEATURES:
   - Slider animates 0 -> target without "mute at 0" lock
   - Autoplay + Unlock + Fade-in works reliably
   - Play button responsive (locked only during fade)
   - ✅ Playlist (multi tracks) + Next/Prev + continuous play
   - ✅ Loop modes: off / one / all (button)
   - ✅ Track name display
   - ✅ Optional Equalizer (WebAudio) via ui.eqRoot
   Backward compatible:
     - You can still call init({ src, audio, ui, options })
     - Or new: init({ playlist:[{src,titleTH,titleEN,title}], ... })
   ===================================================== */

window.AudioModule = (function () {
  // ---------- core state ----------
  let audio = null;
  let ui = {};
  let opt = {};

  let isFading = false;
  let isInit = false;

  // สำคัญ: กัน event slider ตอนเราอัปเดตด้วยโค้ด (ไม่ให้ handler ไป mute)
  let isProgrammatic = false;

  // ---------- playlist state ----------
  let playlist = [];     // [{src, titleTH, titleEN, title}]
  let trackIndex = 0;    // current index
  let loopMode = "all";  // "off" | "one" | "all"
  let endedBound = false;

  // ---------- equalizer state (optional) ----------
  let ctx = null;
  let mediaSrc = null;
  let eqConnected = false;
  let eqFilters = []; // biquad filters
  let eqUIBound = false;

  // ---------- utils ----------
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
    updateLoopUI();
    updateTrackUI();
  }

  async function tryPlay() {
    // ถ้ามี EQ และ ctx ถูก suspend ต้อง resume ก่อน
    if (ctx && ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }

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
    const lm = localStorage.getItem(k("loopMode")) || null;
    const ti = localStorage.getItem(k("trackIndex"));
    const savedIndex = (ti !== null) ? Number(ti) : null;
    return {
      vol: v,
      muted: m,
      loopMode: (lm === "off" || lm === "one" || lm === "all") ? lm : null,
      trackIndex: Number.isFinite(savedIndex) ? savedIndex : null
    };
  }

  function savePersisted(volVal, mutedVal) {
    if (!opt.persist) return;
    localStorage.setItem(k("vol"), String(clamp01(volVal)));
    localStorage.setItem(k("muted"), mutedVal ? "1" : "0");
    localStorage.setItem(k("loopMode"), loopMode);
    localStorage.setItem(k("trackIndex"), String(trackIndex));
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
        savePersisted(audio.volume, audio.muted);
        updateUI();
      }
    }

    requestAnimationFrame(tick);
  }

  // ---------- playlist helpers ----------
  function normalizePlaylist(config) {
    // New: playlist array
    if (Array.isArray(config.playlist) && config.playlist.length > 0) {
      return config.playlist
        .map((t) => {
          if (!t) return null;
          if (typeof t === "string") return { src: t };
          return {
            src: t.src,
            titleTH: t.titleTH ?? t.th ?? t.title,
            titleEN: t.titleEN ?? t.en ?? t.title,
            title: t.title
          };
        })
        .filter((t) => t && t.src);
    }

    // Backward: single src
    if (config.src) return [{ src: config.src }];
    return [];
  }

  function getTrackTitle(track) {
    if (!track) return "";
    // ถ้ามี lang system ในโปรเจกต์คุณ ให้ส่ง "getLang" มาใน options ได้
    // options.getLang() -> "TH"/"EN"
    const lang = (typeof opt.getLang === "function") ? String(opt.getLang()).toUpperCase() : null;
    if (lang === "EN") return track.titleEN || track.title || "BGM";
    if (lang === "TH") return track.titleTH || track.title || "BGM";
    return track.title || track.titleTH || track.titleEN || "BGM";
  }

  function updateTrackUI() {
    if (!ui.trackName) return;
    const track = playlist[trackIndex];
    ui.trackName.textContent = getTrackTitle(track);
  }

  function updateLoopUI() {
    if (!ui.loopBtn) return;
    // 🔁 all, 🔂 one, ⏹ off
    ui.loopBtn.textContent = (loopMode === "one") ? "🔂" : (loopMode === "all" ? "🔁" : "⏹");
  }

  function setLoopMode(mode) {
    loopMode = (mode === "off" || mode === "one" || mode === "all") ? mode : "all";
    if (audio) audio.loop = (loopMode === "one");
    savePersisted(audio?.volume ?? 0, audio?.muted ?? false);
    updateLoopUI();
  }

  async function setTrack(i, { autoplay = true, doFade = false } = {}) {
    if (!audio || playlist.length === 0) return;

    trackIndex = (i + playlist.length) % playlist.length;
    const track = playlist[trackIndex];

    // เปลี่ยนเพลง
    audio.src = track.src;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    // loop one ใช้ native loop ได้
    audio.loop = (loopMode === "one");

    updateTrackUI();

    if (!autoplay) {
      updateUI();
      savePersisted(audio.volume, audio.muted);
      return;
    }

    // พยายามเล่น (ถ้าโดนบล็อคจะไป gate)
    const ok = await tryPlay();
    if (ok) {
      if (doFade && !audio.muted) {
        // วิ่ง 0 -> target อีกรอบ (เหมือนเข้า slide ครั้งแรก)
        audio.volume = 0;
        setSliderValue(0, { emit: true });
        fadeInTo(opt.targetVol, opt.fadeMs);
      }
    } else {
      if (opt.showGate) ensureGate();
    }

    updateUI();
    savePersisted(audio.volume, audio.muted);
  }

  function nextTrack({ autoplay = true } = {}) {
    return setTrack(trackIndex + 1, { autoplay, doFade: false });
  }

  function prevTrack({ autoplay = true } = {}) {
    return setTrack(trackIndex - 1, { autoplay, doFade: false });
  }

  function bindEndedOnce() {
    if (endedBound || !audio) return;
    endedBound = true;

    audio.addEventListener("ended", () => {
      // ถ้า loop one จะไม่เข้ามา (เพราะ audio.loop = true)
      if (loopMode === "off") return;

      if (loopMode === "all") {
        // ไปเพลงถัดไป (วน)
        setTrack(trackIndex + 1, { autoplay: true, doFade: false });
      }
    });
  }

  // ---------- Equalizer (optional) ----------
  function setupEQIfNeeded() {
    // ถ้าไม่มี ui.eqRoot หรือไม่ต้องการ EQ ก็ข้าม
    if (!ui.eqRoot) return;

    // Browser ไม่รองรับ WebAudio
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    // init audio context once
    if (!ctx) ctx = new AC();

    // IMPORTANT: createMediaElementSource ได้ครั้งเดียวต่อ audio element
    if (!mediaSrc) {
      try {
        mediaSrc = ctx.createMediaElementSource(audio);
      } catch (e) {
        // ถ้าถูกสร้างไปแล้วจากที่อื่น เราจะไม่ทำให้พังระบบเพลง
        return;
      }
    }

    // สร้าง filters ครั้งเดียว
    if (!eqFilters || eqFilters.length === 0) {
      const bands = [
        { id: "eq60",  f: 60,    type: "lowshelf" },
        { id: "eq170", f: 170,   type: "peaking", q: 1.0 },
        { id: "eq350", f: 350,   type: "peaking", q: 1.0 },
        { id: "eq1k",  f: 1000,  type: "peaking", q: 1.0 },
        { id: "eq3k",  f: 3500,  type: "peaking", q: 1.0 },
        { id: "eq10k", f: 10000, type: "highshelf" },
      ];

      eqFilters = bands.map(b => {
        const f = ctx.createBiquadFilter();
        f.type = b.type;
        f.frequency.value = b.f;
        f.gain.value = 0;
        if (b.type === "peaking") f.Q.value = b.q ?? 1.0;
        return { ...b, node: f };
      });
    }

    // connect chain once
    if (!eqConnected) {
      try {
        let node = mediaSrc;
        eqFilters.forEach(b => {
          node.connect(b.node);
          node = b.node;
        });
        node.connect(ctx.destination);
        eqConnected = true;
      } catch (e) {
        // ถ้าต่อซ้ำจะ error บาง browser → ignore
      }
    }

    // bind UI once
    if (!eqUIBound) {
      eqUIBound = true;
      eqFilters.forEach((b, idx) => {
        const el = document.getElementById(b.id);
        if (!el) return;
        el.addEventListener("input", () => {
          const gain = num(el.value, 0);
          eqFilters[idx].node.gain.value = gain;
        });
      });

      const resetBtn = document.getElementById("eqReset");
      resetBtn?.addEventListener("click", () => {
        eqFilters.forEach((b) => {
          const el = document.getElementById(b.id);
          if (el) el.value = "0";
          b.node.gain.value = 0;
        });
      });
    }
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

      // unlock = user gesture → resume EQ context ได้ด้วย
      if (ctx && ctx.state === "suspended") {
        try { await ctx.resume(); } catch {}
      }

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
    setSliderValue(vv, { emit: true });

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
      if (isProgrammatic) return;

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

    // Playlist controls (optional)
    ui.prevTrackBtn?.addEventListener("click", () => {
      const autoplay = !audio?.paused;
      prevTrack({ autoplay });
    });

    ui.nextTrackBtn?.addEventListener("click", () => {
      const autoplay = !audio?.paused;
      nextTrack({ autoplay });
    });

    ui.loopBtn?.addEventListener("click", () => {
      // all -> one -> off -> all
      const next = (loopMode === "all") ? "one" : (loopMode === "one" ? "off" : "all");
      setLoopMode(next);
      updateUI();
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

    // playlist normalize
    playlist = normalizePlaylist(config);
    if (playlist.length === 0) {
      // ไม่มี src/playlist ก็ไม่ทำอะไร
      return;
    }

    // defaults
    opt.targetVol = clamp01(num(opt.targetVol, num(ui.vol?.value, 0.55)));
    opt.fadeMs = clamp(num(opt.fadeMs, num(ui.fadeMsInput?.value, 2000)), 200, 12000);
    opt.persist = opt.persist !== false;               // default true
    opt.storagePrefix = opt.storagePrefix || "s8_bgm"; // default
    opt.showGate = opt.showGate !== false;             // default true

    // loop mode default
    loopMode = (opt.loopMode === "off" || opt.loopMode === "one" || opt.loopMode === "all") ? opt.loopMode : "all";

    // restore persisted (vol/muted/loop/index)
    const persisted = loadPersisted();
    if (persisted) {
      audio.muted = persisted.muted;
      opt.targetVol = clamp01(persisted.vol);

      if (persisted.loopMode) loopMode = persisted.loopMode;
      if (Number.isFinite(persisted.trackIndex) && persisted.trackIndex !== null) {
        trackIndex = clamp(Math.floor(persisted.trackIndex), 0, playlist.length - 1);
      }

      if (ui.vol) ui.vol.value = String(opt.targetVol);
    } else {
      audio.muted = false;
    }

    // attach initial track (no autoplay yet)
    audio.src = playlist[trackIndex].src;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.loop = (loopMode === "one");

    // optional EQ setup (does nothing if no ui.eqRoot)
    setupEQIfNeeded();

    bindEndedOnce();
    bindUI();
    updateUI();

    // start autoplay
    softAutoplay();
  }

  return {
    init,
    // optional helpers if you ever want from slide code
    next: () => nextTrack({ autoplay: true }),
    prev: () => prevTrack({ autoplay: true }),
    setLoop: (m) => setLoopMode(m),
  };
})();
