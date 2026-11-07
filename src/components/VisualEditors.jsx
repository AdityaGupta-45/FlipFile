import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eraser, Highlighter, PenLine, Type, Undo2, X } from "lucide-react";
import pdfjs from "../lib/pdfjs.js";

const btn = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm disabled:opacity-40";
const toggle = (on) =>
  `rounded-lg border px-3 py-1.5 text-sm ${on ? "border-[var(--accent)] bg-[var(--accent)] font-bold text-[var(--on-accent)]" : "border-[var(--line)] bg-[var(--panel)]"}`;
const field = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm";
const clamp = (n) => Math.min(1, Math.max(0, n));
const norm = (a, b) => ({ u0: Math.min(a.u, b.u), v0: Math.min(a.v, b.v), u1: Math.max(a.u, b.u), v1: Math.max(a.v, b.v) });
const CSS_COLORS = { black: "#000000", red: "#d92626", blue: "#2b59ff", green: "#1a9950", yellow: "#ffe600" };

function pointer(e, el) {
  const r = el.getBoundingClientRect();
  return { u: clamp((e.clientX - r.left) / r.width), v: clamp((e.clientY - r.top) / r.height) };
}

export function editorReady(kind, s) {
  if (kind === "crop") return !!s?.rect;
  if (kind === "sign") return !!s?.signature && s.placements.length > 0;
  if (kind === "redact") return (s?.rects?.length || 0) > 0;
  if (kind === "edit") return (s?.items?.length || 0) > 0;
  return false;
}

function usePdf(file) {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let off = false;
    setPdf(null);
    setError("");
    file.arrayBuffer()
      .then((d) => pdfjs.getDocument({ data: d }).promise)
      .then((p) => { if (!off) setPdf(p); })
      .catch(() => { if (!off) setError("This PDF could not be opened. It may be password-protected or damaged."); });
    return () => { off = true; };
  }, [file]);
  return { pdf, error };
}

function PageNav({ page, total, setPage }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={btn}>
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm">Page {page} of {total}</span>
      <button type="button" onClick={() => setPage(page + 1)} disabled={page >= total} aria-label="Next page" className={btn}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// Shows one PDF page and gives the children a layer on top of it.
// children(view) gets { w, h } in screen pixels and { ptW, ptH } in PDF points.
function PageStage({ pdf, page, children }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const taskRef = useRef(null);
  const [fit, setFit] = useState(0);
  const [view, setView] = useState({ w: 0, h: 0, ptW: 1, ptH: 1 });

  useEffect(() => {
    const el = hostRef.current;
    const update = () => setFit(Math.min(el.clientWidth, 760));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!fit) return;
    let off = false;
    (async () => {
      if (taskRef.current) {
        taskRef.current.cancel();
        try { await taskRef.current.promise; } catch { /* cancelled */ }
      }
      const pg = await pdf.getPage(page);
      if (off || !canvasRef.current) return;
      const base = pg.getViewport({ scale: 1 });
      const ratio = window.devicePixelRatio || 1;
      const scale = fit / base.width;
      const vp = pg.getViewport({ scale: scale * ratio });
      const c = canvasRef.current;
      c.width = vp.width;
      c.height = vp.height;
      const h = base.height * scale;
      c.style.width = `${fit}px`;
      c.style.height = `${h}px`;
      setView({ w: fit, h, ptW: base.width, ptH: base.height });
      taskRef.current = pg.render({ canvas: c, canvasContext: c.getContext("2d"), viewport: vp, background: "#fff" });
      try { await taskRef.current.promise; } catch { /* cancelled */ }
    })();
    return () => { off = true; };
  }, [pdf, page, fit]);

  return (
    <div ref={hostRef} className="mt-3 w-full rounded-xl border border-[var(--line)] bg-[var(--line)] p-2">
      <div className="relative mx-auto overflow-hidden bg-white shadow" style={{ width: view.w || "100%", height: view.h || 200 }}>
        <canvas ref={canvasRef} className="block" />
        <div className="absolute inset-0">{view.w > 0 && children(view)}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Crop

function CropEditor({ pdf, page, state, onChange, nav }) {
  const rect = state?.page === page ? state.rect : null;
  const [start, setStart] = useState(null);
  const [live, setLive] = useState(null);
  const shown = live || rect;

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Drag on the page to choose the area you want to keep.
        {state?.rect ? ` Area chosen on page ${state.page}.` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {nav}
        <button type="button" className={btn} onClick={() => onChange(null)} disabled={!state?.rect}>Clear area</button>
      </div>
      <PageStage pdf={pdf} page={page}>
        {() => (
          <div
            className="absolute inset-0 cursor-crosshair touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = pointer(e, e.currentTarget);
              setStart(p);
              setLive(norm(p, p));
            }}
            onPointerMove={(e) => { if (start) setLive(norm(start, pointer(e, e.currentTarget))); }}
            onPointerUp={(e) => {
              if (!start) return;
              const r = norm(start, pointer(e, e.currentTarget));
              setStart(null);
              setLive(null);
              if (r.u1 - r.u0 > 0.03 && r.v1 - r.v0 > 0.03) onChange({ rect: r, page });
            }}
          >
            {shown && (
              <div
                className="absolute border-2 border-[var(--accent)]"
                style={{
                  left: `${shown.u0 * 100}%`, top: `${shown.v0 * 100}%`,
                  width: `${(shown.u1 - shown.u0) * 100}%`, height: `${(shown.v1 - shown.v0) * 100}%`,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            )}
          </div>
        )}
      </PageStage>
    </div>
  );
}

// ------------------------------------------------------------------ Redact

function RedactEditor({ pdf, page, state, onChange, nav }) {
  const rects = state?.rects || [];
  const [start, setStart] = useState(null);
  const [live, setLive] = useState(null);
  const pagesWith = new Set(rects.map((r) => r.page)).size;

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Drag boxes over the text or images you want to hide. Click a box to remove it.{" "}
        {rects.length ? `${rects.length} ${rects.length === 1 ? "box" : "boxes"} on ${pagesWith} ${pagesWith === 1 ? "page" : "pages"}.` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {nav}
        <button type="button" className={btn} onClick={() => onChange({ rects: rects.slice(0, -1) })} disabled={!rects.length}>
          <Undo2 size={14} className="mr-1 inline" /> Undo last box
        </button>
      </div>
      <PageStage pdf={pdf} page={page}>
        {() => (
          <div
            className="absolute inset-0 cursor-crosshair touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = pointer(e, e.currentTarget);
              setStart(p);
              setLive(norm(p, p));
            }}
            onPointerMove={(e) => { if (start) setLive(norm(start, pointer(e, e.currentTarget))); }}
            onPointerUp={(e) => {
              if (!start) return;
              const r = norm(start, pointer(e, e.currentTarget));
              setStart(null);
              setLive(null);
              if (r.u1 - r.u0 > 0.01 && r.v1 - r.v0 > 0.008) onChange({ rects: [...rects, { ...r, page }] });
            }}
          >
            {rects.map((r, i) =>
              r.page === page ? (
                <button
                  key={i}
                  type="button"
                  aria-label="Remove this box"
                  title="Click to remove"
                  onPointerDown={(e) => { e.stopPropagation(); onChange({ rects: rects.filter((_, k) => k !== i) }); }}
                  className="absolute border-2 border-[#e5484d] bg-black/80"
                  style={{ left: `${r.u0 * 100}%`, top: `${r.v0 * 100}%`, width: `${(r.u1 - r.u0) * 100}%`, height: `${(r.v1 - r.v0) * 100}%` }}
                />
              ) : null
            )}
            {live && (
              <div
                className="absolute border-2 border-dashed border-[#e5484d] bg-[#e5484d]/30"
                style={{ left: `${live.u0 * 100}%`, top: `${live.v0 * 100}%`, width: `${(live.u1 - live.u0) * 100}%`, height: `${(live.v1 - live.v0) * 100}%` }}
              />
            )}
          </div>
        )}
      </PageStage>
    </div>
  );
}

// ------------------------------------------------------------------ Sign

function trimCanvas(c) {
  const { width: w, height: h } = c;
  const d = c.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 8;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function SignaturePad({ onDone }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [ink, setInk] = useState("#111111");
  const [empty, setEmpty] = useState(true);
  const [error, setError] = useState("");

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ref.current.width, y: ((e.clientY - r.top) / r.height) * ref.current.height };
  };
  const down = (e) => {
    ref.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = ref.current.getContext("2d");
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setEmpty(false);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = ref.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const clear = () => {
    ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height);
    setEmpty(true);
    setError("");
  };
  const use = (canvas) => {
    const t = trimCanvas(canvas);
    if (!t) return setError("Draw your signature first.");
    onDone({ url: t.toDataURL("image/png"), ar: t.height / t.width });
  };
  const upload = (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      use(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setError("That image could not be read."); };
    img.src = url;
  };

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">Draw your signature in the box with your mouse, finger or stylus.</p>
      <canvas
        ref={ref}
        width={960}
        height={320}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }}
        className="mt-3 aspect-[3/1] w-full max-w-xl touch-none rounded-xl border border-[var(--line)] bg-white"
        aria-label="Signature drawing area"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Ink
          <select className={field} value={ink} onChange={(e) => setInk(e.target.value)}>
            <option value="#111111">Black</option>
            <option value="#1b3fbf">Blue</option>
          </select>
        </label>
        <button type="button" className={btn} onClick={clear} disabled={empty}>Clear</button>
        <button type="button" onClick={() => use(ref.current)} disabled={empty}
          className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40">
          Use this signature
        </button>
        <label className={`${btn} cursor-pointer`}>
          Upload an image instead
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-bold">{error}</p>}
    </div>
  );
}

function SignEditor({ pdf, page, state, onChange, nav }) {
  const drag = useRef(null);
  if (!state?.signature) {
    return <SignaturePad onDone={(signature) => onChange({ signature, scale: 0.25, placements: [] })} />;
  }
  const { signature, scale, placements } = state;
  const set = (patch) => onChange({ ...state, ...patch });

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Click on the page to place your signature. Drag it to move it. You can place it on more than one page.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {nav}
        <label className="flex items-center gap-2 text-sm">
          Size
          <input type="range" min={0.1} max={0.6} step={0.01} value={scale} onChange={(e) => set({ scale: parseFloat(e.target.value) })} />
        </label>
        <button type="button" className={btn} onClick={() => set({ placements: placements.slice(0, -1) })} disabled={!placements.length}>
          <Undo2 size={14} className="mr-1 inline" /> Undo
        </button>
        <button type="button" className={btn} onClick={() => onChange(null)}>New signature</button>
      </div>
      <PageStage pdf={pdf} page={page}>
        {(view) => {
          const hFrac = (scale * signature.ar * view.w) / view.h;
          return (
            <div
              className="absolute inset-0 cursor-copy"
              onClick={(e) => {
                const p = pointer(e, e.currentTarget);
                const u = Math.min(1 - scale, Math.max(0, p.u - scale / 2));
                const v = Math.min(1 - hFrac, Math.max(0, p.v - hFrac / 2));
                set({ placements: [...placements, { id: Date.now() + Math.random(), page, u, v }] });
              }}
            >
              {placements.map((pl) =>
                pl.page === page ? (
                  <div
                    key={pl.id}
                    className="absolute cursor-move touch-none outline outline-1 outline-dashed outline-[var(--accent)]"
                    style={{ left: `${pl.u * 100}%`, top: `${pl.v * 100}%`, width: `${scale * 100}%` }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      const p = pointer(e, e.currentTarget.parentElement);
                      drag.current = { id: pl.id, du: p.u - pl.u, dv: p.v - pl.v };
                    }}
                    onPointerMove={(e) => {
                      if (drag.current?.id !== pl.id) return;
                      const p = pointer(e, e.currentTarget.parentElement);
                      const u = Math.min(1 - scale, Math.max(0, p.u - drag.current.du));
                      const v = Math.min(1 - hFrac, Math.max(0, p.v - drag.current.dv));
                      set({ placements: placements.map((x) => (x.id === pl.id ? { ...x, u, v } : x)) });
                    }}
                    onPointerUp={() => { drag.current = null; }}
                  >
                    <img src={signature.url} alt="Your signature" draggable={false} className="block w-full select-none" />
                    <button
                      type="button"
                      aria-label="Remove this signature"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); set({ placements: placements.filter((x) => x.id !== pl.id) }); }}
                      className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#e5484d] text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null
              )}
            </div>
          );
        }}
      </PageStage>
    </div>
  );
}

// ------------------------------------------------------------------ Edit

const TEXT_SIZES = [["12", "Small"], ["16", "Medium"], ["24", "Large"], ["36", "Extra large"]];
const PEN_SIZES = [["1.5", "Thin"], ["3", "Medium"], ["6", "Thick"]];

function EditEditor({ pdf, page, state, onChange, nav }) {
  const items = state?.items || [];
  const [tool, setTool] = useState("text");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("16");
  const [start, setStart] = useState(null);
  const [live, setLive] = useState(null); // rect while dragging
  const [path, setPath] = useState(null); // freehand points while drawing
  const [pending, setPending] = useState(null); // text box being typed

  const add = (item) => onChange({ items: [...items, item] });
  const pick = (t) => {
    commitText();
    setTool(t);
    if (t === "text") setSize("16");
    if (t === "draw") setSize("3");
    if (t === "highlight") setColor("yellow");
    if (t !== "highlight" && color === "yellow") setColor("black");
  };
  const commitText = () => {
    if (pending && pending.text.trim()) add({ type: "text", page: pending.page, u: pending.u, v: pending.v, text: pending.text, size: parseInt(size), color });
    setPending(null);
  };

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Pick a tool, then click or drag on the page. You can add new content, but you cannot change text that is already in the PDF.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={toggle(tool === "text")} aria-pressed={tool === "text"} onClick={() => pick("text")}><Type size={14} className="mr-1 inline" />Text</button>
        <button type="button" className={toggle(tool === "draw")} aria-pressed={tool === "draw"} onClick={() => pick("draw")}><PenLine size={14} className="mr-1 inline" />Draw</button>
        <button type="button" className={toggle(tool === "highlight")} aria-pressed={tool === "highlight"} onClick={() => pick("highlight")}><Highlighter size={14} className="mr-1 inline" />Highlight</button>
        <button type="button" className={toggle(tool === "whiteout")} aria-pressed={tool === "whiteout"} onClick={() => pick("whiteout")}><Eraser size={14} className="mr-1 inline" />White-out</button>
        {tool !== "whiteout" && (
          <label className="flex items-center gap-1 text-sm">
            Color
            <select className={field} value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="black">Black</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
            </select>
          </label>
        )}
        {(tool === "text" || tool === "draw") && (
          <label className="flex items-center gap-1 text-sm">
            {tool === "text" ? "Text size" : "Pen"}
            <select className={field} value={size} onChange={(e) => setSize(e.target.value)}>
              {(tool === "text" ? TEXT_SIZES : PEN_SIZES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {nav}
        <button type="button" className={btn} onClick={() => { setPending(null); onChange({ items: items.slice(0, -1) }); }} disabled={!items.length}>
          <Undo2 size={14} className="mr-1 inline" /> Undo
        </button>
        <button type="button" className={btn} onClick={() => onChange({ items: items.filter((i) => i.page !== page) })} disabled={!items.some((i) => i.page === page)}>
          Clear this page
        </button>
        <span className="text-sm text-[var(--muted)]">{items.length} {items.length === 1 ? "change" : "changes"}</span>
      </div>

      <PageStage pdf={pdf} page={page}>
        {(view) => {
          const px = view.w / view.ptW; // screen pixels per PDF point
          return (
            <div
              className={`absolute inset-0 touch-none ${tool === "text" ? "cursor-text" : "cursor-crosshair"}`}
              onClick={(e) => {
                // Text boxes are placed on click (after the browser has settled focus), so the input keeps focus.
                if (tool !== "text") return;
                const p = pointer(e, e.currentTarget);
                setPending({ page, u: p.u, v: p.v, text: "" });
              }}
              onPointerDown={(e) => {
                if (tool === "text") return;
                const p = pointer(e, e.currentTarget);
                e.currentTarget.setPointerCapture(e.pointerId);
                if (tool === "draw") setPath([[p.u, p.v]]);
                else { setStart(p); setLive(norm(p, p)); }
              }}
              onPointerMove={(e) => {
                const p = pointer(e, e.currentTarget);
                if (path) setPath([...path, [p.u, p.v]]);
                else if (start) setLive(norm(start, p));
              }}
              onPointerUp={(e) => {
                const p = pointer(e, e.currentTarget);
                if (path) {
                  const pts = path.length > 1 ? path : [path[0], [path[0][0] + 0.0005, path[0][1]]];
                  add({ type: "draw", page, points: pts, color, width: parseFloat(size) });
                  setPath(null);
                } else if (start) {
                  const r = norm(start, p);
                  setStart(null);
                  setLive(null);
                  if (r.u1 - r.u0 > 0.01 && r.v1 - r.v0 > 0.005) add({ type: "rect", page, ...r, mode: tool, color });
                }
              }}
            >
              <svg className="pointer-events-none absolute inset-0" width={view.w} height={view.h}>
                {items.filter((i) => i.page === page && i.type === "rect").map((r, k) => (
                  <rect key={`r${k}`} x={r.u0 * view.w} y={r.v0 * view.h} width={(r.u1 - r.u0) * view.w} height={(r.v1 - r.v0) * view.h}
                    fill={r.mode === "whiteout" ? "#ffffff" : CSS_COLORS[r.color]} fillOpacity={r.mode === "whiteout" ? 1 : 0.35} />
                ))}
                {items.filter((i) => i.page === page && i.type === "draw").map((d, k) => (
                  <polyline key={`d${k}`} fill="none" stroke={CSS_COLORS[d.color]} strokeWidth={d.width * px} strokeLinecap="round" strokeLinejoin="round"
                    points={d.points.map(([u, v]) => `${u * view.w},${v * view.h}`).join(" ")} />
                ))}
                {path && (
                  <polyline fill="none" stroke={CSS_COLORS[color]} strokeWidth={parseFloat(size) * px} strokeLinecap="round" strokeLinejoin="round"
                    points={path.map(([u, v]) => `${u * view.w},${v * view.h}`).join(" ")} />
                )}
                {live && (
                  <rect x={live.u0 * view.w} y={live.v0 * view.h} width={(live.u1 - live.u0) * view.w} height={(live.v1 - live.v0) * view.h}
                    fill={tool === "whiteout" ? "#ffffff" : CSS_COLORS[color]} fillOpacity={tool === "whiteout" ? 0.9 : 0.35}
                    stroke="#2b59ff" strokeDasharray="4 3" />
                )}
              </svg>
              {items.filter((i) => i.page === page && i.type === "text").map((t, k) => (
                <span key={`t${k}`} className="pointer-events-none absolute whitespace-pre"
                  style={{ left: `${t.u * 100}%`, top: `${t.v * 100}%`, fontSize: t.size * px, lineHeight: 1, color: CSS_COLORS[t.color], fontFamily: "Helvetica, Arial, sans-serif" }}>
                  {t.text}
                </span>
              ))}
              {pending && pending.page === page && (
                <input
                  autoFocus
                  value={pending.text}
                  onChange={(e) => setPending({ ...pending, text: e.target.value })}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitText();
                    if (e.key === "Escape") setPending(null);
                  }}
                  onBlur={commitText}
                  placeholder="Type, then press Enter"
                  className="absolute min-w-40 border border-dashed border-[var(--accent)] bg-white/80 px-1 outline-none"
                  style={{ left: `${pending.u * 100}%`, top: `${pending.v * 100}%`, fontSize: parseInt(size) * px, lineHeight: 1, color: CSS_COLORS[color] }}
                />
              )}
            </div>
          );
        }}
      </PageStage>
    </div>
  );
}

// ------------------------------------------------------------------ Entry point

export function VisualEditor({ kind, file, state, onChange }) {
  const { pdf, error } = usePdf(file);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [file]);

  if (error) return <p role="alert" className="mt-6 text-sm font-bold">{error}</p>;
  if (!pdf) return <p className="mt-6 text-sm font-bold">Reading PDF...</p>;

  const Editor = { crop: CropEditor, sign: SignEditor, redact: RedactEditor, edit: EditEditor }[kind];
  const go = (n) => setPage(Math.max(1, Math.min(pdf.numPages, n)));
  return (
    <div className="mt-6">
      <Editor pdf={pdf} page={page} state={state} onChange={onChange} nav={<PageNav page={page} total={pdf.numPages} setPage={go} />} />
    </div>
  );
}