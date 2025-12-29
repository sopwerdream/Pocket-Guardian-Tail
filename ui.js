/* ===============================
   Global Page Zoom Preset
   =============================== */
(function(){
  const PRESETS = [
    { key: "S", scale: 0.90 },
    { key: "M", scale: 1.00 },
    { key: "L", scale: 1.15 },
  ];

  let presetIndex = Number(sessionStorage.getItem("uiPagePreset") || 1);
  const root = document.documentElement;

  function apply(){
    const p = PRESETS[presetIndex];
    root.style.setProperty("--page-scale", p.scale);
    if (window.__presetBtn){
      window.__presetBtn.textContent = `Size: ${p.key}`;
    }
    sessionStorage.setItem("uiPagePreset", presetIndex);
  }

  function next(){
    presetIndex = (presetIndex + 1) % PRESETS.length;
    apply();
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    const btn = document.createElement("button");
    btn.className = "presetBtn";
    btn.textContent = "Size: M";
    btn.onclick = next;
    document.body.appendChild(btn);
    window.__presetBtn = btn;
    apply();
  });

  // shortcut เหมือน presentation
  window.addEventListener("keydown", (e)=>{
    if (e.key === "+" || e.key === "=") next();
    if (e.key === "0"){
      presetIndex = 1;
      apply();
    }
  });
})();

