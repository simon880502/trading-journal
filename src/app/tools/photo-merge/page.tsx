"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_W = 1800;
const CANVAS_H = 1200;

const LAYOUTS = [
  { id: "1x1",  label: "全版 1張",   cells: [{x:0,y:0,w:1,h:1}] },
  { id: "2x1",  label: "左右 2張",   cells: [{x:0,y:0,w:.5,h:1},{x:.5,y:0,w:.5,h:1}] },
  { id: "1x2",  label: "上下 2張",   cells: [{x:0,y:0,w:1,h:.5},{x:0,y:.5,w:1,h:.5}] },
  { id: "2x2",  label: "2×2 四張",   cells: [{x:0,y:0,w:.5,h:.5},{x:.5,y:0,w:.5,h:.5},{x:0,y:.5,w:.5,h:.5},{x:.5,y:.5,w:.5,h:.5}] },
  { id: "3x1",  label: "橫排 3張",   cells: [{x:0,y:0,w:1/3,h:1},{x:1/3,y:0,w:1/3,h:1},{x:2/3,y:0,w:1/3,h:1}] },
  { id: "3x2",  label: "3×2 六張",   cells: [{x:0,y:0,w:1/3,h:.5},{x:1/3,y:0,w:1/3,h:.5},{x:2/3,y:0,w:1/3,h:.5},{x:0,y:.5,w:1/3,h:.5},{x:1/3,y:.5,w:1/3,h:.5},{x:2/3,y:.5,w:1/3,h:.5}] },
  { id: "1L2R", label: "1大+2小右",  cells: [{x:0,y:0,w:.6,h:1},{x:.6,y:0,w:.4,h:.5},{x:.6,y:.5,w:.4,h:.5}] },
  { id: "2L1R", label: "2小+1大右",  cells: [{x:0,y:0,w:.4,h:.5},{x:0,y:.5,w:.4,h:.5},{x:.4,y:0,w:.6,h:1}] },
  { id: "1T3B", label: "1大+3小下",  cells: [{x:0,y:0,w:1,h:.6},{x:0,y:.6,w:1/3,h:.4},{x:1/3,y:.6,w:1/3,h:.4},{x:2/3,y:.6,w:1/3,h:.4}] },
  { id: "3T1B", label: "3小+1大下",  cells: [{x:0,y:0,w:1/3,h:.4},{x:1/3,y:0,w:1/3,h:.4},{x:2/3,y:0,w:1/3,h:.4},{x:0,y:.4,w:1,h:.6}] },
  { id: "Lshp", label: "L型 4格",    cells: [{x:0,y:0,w:.6,h:.6},{x:.6,y:0,w:.4,h:.5},{x:.6,y:.5,w:.4,h:.5},{x:0,y:.6,w:.6,h:.4}] },
  { id: "1L3R", label: "1大+右3小",  cells: [{x:0,y:0,w:.55,h:1},{x:.55,y:0,w:.45,h:1/3},{x:.55,y:1/3,w:.45,h:1/3},{x:.55,y:2/3,w:.45,h:1/3}] },
];

interface Cell { x: number; y: number; w: number; h: number; }
interface Layout { id: string; label: string; cells: Cell[]; }
interface Slot { img: HTMLImageElement; src: string; }
interface EditorState {
  img: HTMLImageElement;
  rot: number; fh: boolean; fv: boolean;
  zoom: number; pan: { x: number; y: number };
  crop: { x: number; y: number; w: number; h: number };
}

// ── Image Editor ──────────────────────────────────────────────────────────────
function ImageEditor({ state, onConfirm, onCancel }: {
  state: EditorState;
  onConfirm: (src: string, img: HTMLImageElement) => void;
  onCancel: () => void;
}) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [rot, setRot] = useState(state.rot);
  const [fh, setFh] = useState(state.fh);
  const [fv, setFv] = useState(state.fv);
  const [zoom, setZoom] = useState(state.zoom);
  const [pan, setPan] = useState(state.pan);
  const [crop, setCrop] = useState(state.crop);
  const drag = useRef<string | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const [EW, setEW] = useState(320);
  const EH = Math.round(EW * 2 / 3);

  useEffect(() => {
    setEW(Math.min(window.innerWidth - 40, 460));
  }, []);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, EW, EH);
    ctx.save();
    ctx.translate(EW / 2 + pan.x, EH / 2 + pan.y);
    ctx.rotate(rot * Math.PI / 180);
    ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
    const r90 = rot % 180 !== 0;
    const iw = r90 ? state.img.height : state.img.width;
    const ih = r90 ? state.img.width : state.img.height;
    const s = Math.max(EW / iw, EH / ih) * zoom;
    ctx.drawImage(state.img, -state.img.width / 2 * s, -state.img.height / 2 * s, state.img.width * s, state.img.height * s);
    ctx.restore();
    const cx = crop.x * EW, cy = crop.y * EH, cw = crop.w * EW, ch = crop.h * EH;
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, EW, cy); ctx.fillRect(0, cy + ch, EW, EH - cy - ch);
    ctx.fillRect(0, cy, cx, ch); ctx.fillRect(cx + cw, cy, EW - cx - cw, ch);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(cx, cy, cw, ch);
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 0.7;
    [1/3, 2/3].forEach(f => {
      ctx.beginPath(); ctx.moveTo(cx + cw * f, cy); ctx.lineTo(cx + cw * f, cy + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + ch * f); ctx.lineTo(cx + cw, cy + ch * f); ctx.stroke();
    });
    [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]].forEach(([hx, hy]) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(hx - 7, hy - 7, 14, 14);
    });
  }, [rot, fh, fv, zoom, pan, crop, EW, EH, state.img]);

  const hitHandle = (px: number, py: number) => {
    const cx = crop.x * EW, cy = crop.y * EH, cw = crop.w * EW, ch = crop.h * EH, T = 18;
    const pts: Record<string, [number, number]> = { tl: [cx, cy], tr: [cx + cw, cy], bl: [cx, cy + ch], br: [cx + cw, cy + ch] };
    for (const [k, [hx, hy]] of Object.entries(pts)) {
      if (Math.abs(px - hx) < T && Math.abs(py - hy) < T) return k;
    }
    return (px > cx && px < cx + cw && py > cy && py < cy + ch) ? "move" : "pan";
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const r = cvRef.current!.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getPos(e); drag.current = hitHandle(p.x, p.y); last.current = p;
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drag.current) return;
    if ("touches" in e) e.preventDefault();
    const p = getPos(e);
    const dx = (p.x - last.current.x) / EW, dy = (p.y - last.current.y) / EH;
    last.current = p;
    const d = drag.current;
    if (d === "pan") { setPan(v => ({ x: v.x + dx * EW, y: v.y + dy * EH })); return; }
    const MIN = 0.05;
    setCrop(c => {
      let { x, y, w, h } = c;
      if (d === "move") { x = Math.max(0, Math.min(1 - w, x + dx)); y = Math.max(0, Math.min(1 - h, y + dy)); }
      if (d === "tl") { const nx = Math.min(x + w - MIN, x + dx); const ny = Math.min(y + h - MIN, y + dy); w += x - nx; h += y - ny; x = nx; y = ny; }
      if (d === "tr") { const ny = Math.min(y + h - MIN, y + dy); w = Math.max(MIN, w + dx); h += y - ny; y = ny; }
      if (d === "bl") { const nx = Math.min(x + w - MIN, x + dx); w += x - nx; x = nx; h = Math.max(MIN, h + dy); }
      if (d === "br") { w = Math.max(MIN, w + dx); h = Math.max(MIN, h + dy); }
      x = Math.max(0, Math.min(1 - w, x)); y = Math.max(0, Math.min(1 - h, y));
      w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
      return { x, y, w, h };
    });
  };
  const onUp = () => { drag.current = null; };

  const confirm = () => {
    const off = document.createElement("canvas"); off.width = EW; off.height = EH;
    const ctx = off.getContext("2d")!;
    ctx.save();
    ctx.translate(EW / 2 + pan.x, EH / 2 + pan.y);
    ctx.rotate(rot * Math.PI / 180);
    ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
    const r90 = rot % 180 !== 0;
    const iw = r90 ? state.img.height : state.img.width;
    const ih = r90 ? state.img.width : state.img.height;
    const s = Math.max(EW / iw, EH / ih) * zoom;
    ctx.drawImage(state.img, -state.img.width / 2 * s, -state.img.height / 2 * s, state.img.width * s, state.img.height * s);
    ctx.restore();
    const cx = Math.round(crop.x * EW), cy = Math.round(crop.y * EH);
    const cw = Math.round(crop.w * EW), ch = Math.round(crop.h * EH);
    const out = document.createElement("canvas"); out.width = cw; out.height = ch;
    out.getContext("2d")!.drawImage(off, cx, cy, cw, ch, 0, 0, cw, ch);
    const src = out.toDataURL("image/jpeg", 0.95);
    const fin = new Image(); fin.onload = () => onConfirm(src, fin); fin.src = src;
  };

  const Btn = ({ label, fn }: { label: string; fn: () => void }) => (
    <button onClick={fn} style={{ padding: "8px 12px", fontSize: 12, background: "#242424", color: "#ddd", border: "1px solid #444", borderRadius: 5, cursor: "pointer" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 }}>
      <p style={{ fontSize: 11, color: "#666", margin: 0 }}>拖曳移動 · 拉四角裁切</p>
      <canvas ref={cvRef} width={EW} height={EH}
        style={{ display: "block", borderRadius: 4, touchAction: "none" }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
        <Btn label="↺ 逆時針" fn={() => setRot(r => (r - 90 + 360) % 360)} />
        <Btn label="↻ 順時針" fn={() => setRot(r => (r + 90) % 360)} />
        <Btn label="⇄ 水平翻" fn={() => setFh(f => !f)} />
        <Btn label="⇅ 垂直翻" fn={() => setFv(f => !f)} />
        <Btn label="＋ 放大"  fn={() => setZoom(z => Math.min(z + 0.2, 5))} />
        <Btn label="－ 縮小"  fn={() => setZoom(z => Math.max(z - 0.2, 0.2))} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} style={{ padding: "10px 24px", fontSize: 13, background: "#1e1e1e", color: "#aaa", border: "1px solid #444", borderRadius: 6, cursor: "pointer" }}>取消</button>
        <button onClick={confirm} style={{ padding: "10px 36px", fontSize: 14, fontWeight: 700, background: "#e8a000", color: "#000", border: "none", borderRadius: 6, cursor: "pointer" }}>✓ 確認</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PhotoMergePage() {
  const [layout, setLayout] = useState<Layout>(LAYOUTS[3]);
  const [slots, setSlots] = useState<(Slot | null)[]>(Array(12).fill(null));
  const [editor, setEditor] = useState<{ idx: number; state: EditorState } | null>(null);
  const [gap, setGap] = useState(6);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [vw, setVw] = useState(340);
  const fileRef = useRef<HTMLInputElement>(null);
  const slotIdx = useRef(0);

  useEffect(() => {
    setVw(Math.min(window.innerWidth - 32, 680));
  }, []);

  const vh = Math.round(vw * CANVAS_H / CANVAS_W);
  const gx = gap * (vw / CANVAS_W);

  const openFile = (i: number) => { slotIdx.current = i; fileRef.current?.click(); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => setEditor({
        idx: slotIdx.current,
        state: { img, rot: 0, fh: false, fv: false, zoom: 1, pan: { x: 0, y: 0 }, crop: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 } }
      });
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const onConfirm = (src: string, img: HTMLImageElement) => {
    setSlots(s => s.map((v, i) => i === editor?.idx ? { img, src } : v));
    setEditor(null);
  };

  const build = (ow: number, oh: number, g: number) => {
    const cv = document.createElement("canvas"); cv.width = ow; cv.height = oh;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ow, oh);
    layout.cells.forEach((c, i) => {
      const x = c.x * ow + g / 2, y = c.y * oh + g / 2, w = c.w * ow - g, h = c.h * oh - g;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (slots[i]) { ctx.drawImage(slots[i]!.img, x, y, w, h); }
      else { ctx.fillStyle = "#ececec"; ctx.fillRect(x, y, w, h); }
      ctx.restore();
    });
    return cv;
  };

  const doPreview = () => setPreview(build(vw, vh, gx).toDataURL("image/jpeg", 0.85));

  const doExport = () => {
    setBusy(true);
    setTimeout(() => {
      const cv = build(CANVAS_W, CANVAS_H, gap);
      const a = document.createElement("a"); a.download = "4x6.jpg"; a.href = cv.toDataURL("image/jpeg", 0.95); a.click();
      setBusy(false);
    }, 60);
  };

  const btnBase: React.CSSProperties = { padding: "4px 11px", fontSize: 11, borderRadius: 5, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#eee", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <a href="/" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>◄ 返回</a>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📷 照片合併 4×6 吋</h1>
            <p style={{ fontSize: 10, color: "#555", margin: 0 }}>1800×1200px · 300dpi · JPG/BMP/GIF</p>
          </div>
        </div>

        {/* Layout */}
        <p style={{ fontSize: 11, color: "#777", marginBottom: 7 }}>版面</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {LAYOUTS.map(l => (
            <button key={l.id} onClick={() => setLayout(l)} style={{
              ...btnBase,
              background: layout.id === l.id ? "#e8a000" : "#1e1e1e",
              color: layout.id === l.id ? "#000" : "#bbb",
              border: layout.id === l.id ? "1px solid #e8a000" : "1px solid #333",
              fontWeight: layout.id === l.id ? 700 : 400,
            }}>{l.label}</button>
          ))}
        </div>

        {/* Gap */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "#777" }}>間距</span>
          {[0, 4, 8, 14].map(g => (
            <button key={g} onClick={() => setGap(g)} style={{
              padding: "3px 9px", fontSize: 11, borderRadius: 4, cursor: "pointer",
              background: gap === g ? "#e8a000" : "#1e1e1e",
              color: gap === g ? "#000" : "#bbb",
              border: gap === g ? "none" : "1px solid #333",
            }}>{g === 0 ? "無" : `${g}px`}</button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ position: "relative", width: vw, height: vh, background: "#000", borderRadius: 5, overflow: "hidden", marginBottom: 14 }}>
          {layout.cells.map((c, i) => {
            const pw = Math.floor(c.w * vw - gx), ph = Math.floor(c.h * vh - gx);
            return (
              <div key={i} style={{ position: "absolute", left: c.x * vw + gx / 2, top: c.y * vh + gx / 2, width: pw, height: ph, background: "#1a1a1a", overflow: "hidden" }}>
                {slots[i] ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <img src={slots[i]!.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(0,0,0,0.4)" }}>
                      <button onClick={() => openFile(i)} style={{ padding: "5px 10px", fontSize: 11, background: "rgba(0,0,0,0.8)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 4, cursor: "pointer" }}>✎</button>
                      <button onClick={() => setSlots(s => s.map((v, idx) => idx === i ? null : v))} style={{ padding: "5px 9px", fontSize: 11, background: "rgba(160,0,0,0.9)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => openFile(i)} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 4 }}>
                    <span style={{ fontSize: Math.min(pw, ph) * 0.22, opacity: .2, lineHeight: 1 }}>＋</span>
                    <span style={{ fontSize: 9, color: "#555" }}>點擊上傳</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={doPreview} style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", background: "#1e1e1e", color: "#e8a000", border: "1px solid #e8a000" }}>
            👁 預覽
          </button>
          <button onClick={doExport} disabled={busy} style={{ flex: 2, padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 7, cursor: "pointer", background: "#e8a000", color: "#000", border: "none", opacity: busy ? 0.6 : 1 }}>
            {busy ? "⏳ 產生中..." : "⬇ 下載 JPG（4×6 吋）"}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.bmp,.gif" style={{ display: "none" }} onChange={onFile} />

      {editor && (
        <ImageEditor state={editor.state} onConfirm={onConfirm} onCancel={() => setEditor(null)} />
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 12 }}>
          <p style={{ fontSize: 11, color: "#666" }}>點擊關閉</p>
          <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 5 }} />
          <button onClick={e => { e.stopPropagation(); doExport(); setPreview(null); }} style={{ padding: "10px 32px", background: "#e8a000", color: "#000", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ⬇ 下載
          </button>
        </div>
      )}
    </div>
  );
}
