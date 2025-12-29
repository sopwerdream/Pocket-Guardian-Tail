(function(){
  const KEY="pageZoom";
  const MIN=0.75, MAX=1.50, STEP=0.10;

  const clamp=(v)=>Math.max(MIN, Math.min(MAX, v));
  const get=()=>{
    const raw=sessionStorage.getItem(KEY);
    const v=raw?Number(raw):1;
    return Number.isFinite(v)?clamp(v):1;
  };

  function apply(v){
    const z=clamp(v);
    document.documentElement.style.setProperty("--page-zoom", z.toFixed(2));
    sessionStorage.setItem(KEY, String(z));

    const pill=document.getElementById("zoomPill");
    if(pill) pill.textContent = `Zoom: ${Math.round(z*100)}%`;
  }

  function mountControls(){
    if(document.getElementById("zoomCtl")) return;

    const ctl=document.createElement("div");
    ctl.className="zoomCtl";
    ctl.id="zoomCtl";

    const out=document.createElement("button");
    out.type="button"; out.textContent="−"; out.title="Zoom out";

    const inn=document.createElement("button");
    inn.type="button"; inn.textContent="+"; inn.title="Zoom in";

    const reset=document.createElement("button");
    reset.type="button"; reset.textContent="Reset"; reset.title="Reset 100%";

    const pill=document.createElement("span");
    pill.className="pill"; pill.id="zoomPill"; pill.textContent="Zoom: 100%";

    out.onclick=()=>apply(get()-STEP);
    inn.onclick=()=>apply(get()+STEP);
    reset.onclick=()=>apply(1);

    ctl.append(out, inn, reset, pill);
    document.body.appendChild(ctl);

    // คีย์ลัดเหมือน browser
    window.addEventListener("keydown",(e)=>{
      if((e.ctrlKey||e.metaKey) && (e.key==="+"||e.key==="=")){ e.preventDefault(); apply(get()+STEP); }
      if((e.ctrlKey||e.metaKey) && e.key==="-" ){ e.preventDefault(); apply(get()-STEP); }
      if((e.ctrlKey||e.metaKey) && e.key==="0" ){ e.preventDefault(); apply(1); }
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // ถ้ายังไม่มี #pageRoot ให้ครอบทุกอย่างอัตโนมัติ
    if(!document.getElementById("pageRoot")){
      const root=document.createElement("div");
      root.id="pageRoot";
      while(document.body.firstChild){ root.appendChild(document.body.firstChild); }
      document.body.appendChild(root);
    }

    // IMPORTANT: ให้ปุ่มซูมอยู่ “นอก” #pageRoot เพื่อไม่โดน zoom
    // (เพราะเราจะ append controls หลังจาก #pageRoot อยู่แล้ว)
    mountControls();
    apply(get());
  });
})();
