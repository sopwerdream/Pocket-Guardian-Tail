(function(){
  const STORAGE_KEY = "pageScale";
  const MIN = 0.75, MAX = 1.35, STEP = 0.10;
  const clamp = (v)=>Math.max(MIN, Math.min(MAX, v));

  function getScale(){
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const v = raw ? Number(raw) : 1;
    return Number.isFinite(v) ? clamp(v) : 1;
  }

  function setScale(v){
    const scale = clamp(v);
    document.documentElement.style.setProperty("--page-scale", scale.toFixed(2));
    sessionStorage.setItem(STORAGE_KEY, String(scale));
    const pill = document.getElementById("zoomPill");
    if(pill) pill.textContent = `Zoom: ${Math.round(scale*100)}%`;
  }

  function mountControls(){
    // ถ้าคุณมีปุ่มซูมของคุณเองอยู่แล้ว จะไม่สร้างซ้ำ
    if(document.getElementById("zoomCtl")) return;

    const ctl = document.createElement("div");
    ctl.className = "zoomCtl"; ctl.id="zoomCtl";

    const btnOut = document.createElement("button");
    btnOut.type="button"; btnOut.textContent="−"; btnOut.title="Zoom out";

    const btnIn = document.createElement("button");
    btnIn.type="button"; btnIn.textContent="+"; btnIn.title="Zoom in";

    const btnReset = document.createElement("button");
    btnReset.type="button"; btnReset.textContent="Reset"; btnReset.title="Reset 100%";

    const pill = document.createElement("span");
    pill.className="pill"; pill.id="zoomPill"; pill.textContent="Zoom: 100%";

    btnOut.addEventListener("click", ()=>setScale(getScale()-STEP));
    btnIn.addEventListener("click", ()=>setScale(getScale()+STEP));
    btnReset.addEventListener("click", ()=>setScale(1));

    ctl.append(btnOut, btnIn, btnReset, pill);
    document.body.appendChild(ctl);

    // คีย์ลัดแบบ browser: Ctrl/Cmd + / - / 0
    window.addEventListener("keydown",(e)=>{
      if((e.ctrlKey||e.metaKey) && (e.key==="+"||e.key==="=")){ e.preventDefault(); setScale(getScale()+STEP); }
      if((e.ctrlKey||e.metaKey) && e.key==="-" ){ e.preventDefault(); setScale(getScale()-STEP); }
      if((e.ctrlKey||e.metaKey) && e.key==="0" ){ e.preventDefault(); setScale(1); }
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // บังคับให้ทุกอย่างอยู่ใน #pageRoot เพื่อ scale ทั้งหน้า
    if(!document.getElementById("pageRoot")){
      const root=document.createElement("div"); root.id="pageRoot";
      while(document.body.firstChild){ root.appendChild(document.body.firstChild); }
      document.body.appendChild(root);
    }
    setScale(getScale());
    mountControls();
  });
})();
