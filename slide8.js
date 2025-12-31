AudioModule.init({
  src: ASSETS.bgm,
  audio: document.getElementById("s8_bgm"),
  ui: {
    playBtn: document.getElementById("s8_playBtn"),
    muteBtn: document.getElementById("s8_muteBtn"),
    vol: document.getElementById("s8_vol"),
    volDown: document.getElementById("s8_volDown"),
    volUp: document.getElementById("s8_volUp"),
    targetVol: 0.55,
    fadeMs: document.getElementById("s8_fadeMs")?.value || 2000,
  },
});
