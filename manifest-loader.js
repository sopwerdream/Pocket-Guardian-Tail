// manifest-loader.js
// โหลดไฟล์ list (.json) แล้วคืน array ของ URL รูปที่เปิดได้จริง
(function () {
  // ใช้ jsDelivr จะนิ่ง/เร็วกว่า raw github และไม่เจอ 403 rate limit แบบ API
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/sopwerdream/Pocket-Guardian-Tail@main/";

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Manifest load failed: ${res.status} ${url}`);
    return res.json();
  }

  async function loadManifest(manifestPath) {
    // manifestPath เช่น "assets/manifest/cover01.json"
    const manifestUrl = CDN_BASE + encodeURI(manifestPath);
    const list = await fetchJSON(manifestUrl);

    // แปลงเป็น URL ของรูป
    // list[] เป็น path แบบมี space ได้ -> encodeURI ให้เป็น URL ได้จริง
    return list.map(p => CDN_BASE + encodeURI(p));
  }

  // expose global
  window.ManifestLoader = { loadManifest, CDN_BASE };
})();
