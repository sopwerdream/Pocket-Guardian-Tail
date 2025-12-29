/* ===============================
   Global UI Preset Controller
   Small / Medium / Large
   =============================== */

(function(){
  const PRESETS = [
    { key: "S", scale: 0.90 },
    { key: "M", scale: 1.00 },
    { key: "L", scale: 1.15 },
  ];

  // ใช้ sessionStorage เพื่อให้ข้ามหน้าได้
  let presetIndex = Number(sessionStorage.getItem("uiPresetIndex") || 1); // default = M
  const root = document.documentElement;

  function applyPreset(){
    const p = PRESETS[presetIndex];
    root.style.setProperty("--ui-scale", p.scale.toFixed(2));
    if (window.__presetBtn){
      window.__presetBtn.textContent = `Size: ${p.key}`;
    }
    sessionStorage.setItem("uiPresetIndex", presetIndex);
  }

  function nextPreset(){
    presetIndex = (presetIndex + 1) % PRESETS.length;
    applyPreset();
  }

  // สร้างปุ่มอัตโนมัติเมื่อ DOM พร้อม
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.createElement("button");
    btn.className = "presetBtn";
    btn.id = "presetBtn";
    btn.type = "button";
    btn.title = "Text size: Small / Medium / Large";
    btn.addEventListener("click", nextPreset);

    document.body.appendChild(btn);
    window.__presetBtn = btn;

    applyPreset();
  });

  // คีย์ลัด (ไม่บังคับ)
  window.addEventListener("keydown", (e) => {
    if (e.key === "z" || e.key === "Z"){
      nextPreset();
    }
  });
})();
