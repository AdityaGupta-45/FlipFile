import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Minus, Plus, RotateCw, Trash2, Undo2 } from "lucide-react";
import pdfjs from "../lib/pdfjs.js";

const iconBtn = "rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 disabled:opacity-30";

// Page thumbnails for Delete Pages and Organize Pages.
// state is a list of { n: original page number (0-based), rot: extra rotation, del: marked for deletion }
export function PageEditor({ file, mode, state, onChange }) {
  const [thumbs, setThumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragFrom, setDragFrom] = useState(null);
  const organize = mode === "organize";

  useEffect(() => {
    let cancelled = false;
    setThumbs([]);
    setLoading(true);
    setError("");
    (async () => {
      try {
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) return;
        onChange(Array.from({ length: pdf.numPages }, (_, n) => ({ n, rot: 0, del: false })));
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const scale = 160 / page.getViewport({ scale: 1 }).width;
          const vp = page.getViewport({ scale });
          const c = document.createElement("canvas");
          c.width = Math.round(vp.width);
          c.height = Math.round(vp.height);
          await page.render({ canvas: c, canvasContext: c.getContext("2d"), viewport: vp, background: "#fff" }).promise;
          if (cancelled) return;
          const url = c.toDataURL("image/jpeg", 0.7);
          setThumbs((t) => { const x = [...t]; x[n - 1] = url; return x; });
          page.cleanup();
        }
      } catch {
        if (!cancelled) setError("This PDF could not be opened. It may be password-protected or damaged.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const update = (i, patch) => onChange(state.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const move = (from, to) => {
    if (to < 0 || to >= state.length || from === to) return;
    const next = [...state];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const deleted = state.filter((p) => p.del).length;

  return (
    <div className="mt-6">
      <p className="text-sm text-[var(--muted)]">
        {organize
          ? "Drag pages to reorder them, or use the arrow buttons under each page."
          : "Click a page to mark it for deletion. Click it again to keep it."}{" "}
        {state.length ? `${state.length} pages${deleted ? `, ${deleted} marked for deletion` : ""}.` : ""}
      </p>
      {loading && !state.length && <p className="mt-3 text-sm font-bold">Reading PDF...</p>}
      {error && <p role="alert" className="mt-3 text-sm font-bold">{error}</p>}

      <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {state.map((p, i) => (
          <li
            key={p.n}
            draggable={organize}
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => organize && e.preventDefault()}
            onDrop={() => { if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); }}
          >
            <button
              type="button"
              onClick={() => !organize && update(i, { del: !p.del })}
              aria-label={`Page ${p.n + 1}${p.del ? ", marked for deletion" : ""}`}
              className={`relative block aspect-[3/4] w-full overflow-hidden rounded-lg border-2 bg-white ${
                p.del ? "border-[#e5484d]" : "border-[var(--line)]"
              } ${organize ? "cursor-grab" : ""}`}
            >
              {thumbs[p.n] ? (
                <img
                  src={thumbs[p.n]}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain transition-transform duration-300"
                  style={{ transform: `rotate(${p.rot}deg) scale(${p.rot % 180 ? 0.75 : 1})` }}
                />
              ) : (
                <span className="grid h-full place-items-center text-xs text-[#55657a]">Loading</span>
              )}
              {p.del && (
                <span className="absolute inset-0 grid place-items-center bg-[#e5484d]/75 text-sm font-bold text-white">
                  Deleted
                </span>
              )}
            </button>
            <p className="mt-1 text-center text-xs text-[var(--muted)]">Page {p.n + 1}</p>
            {organize && (
              <div className="mt-1 flex justify-center gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move page ${p.n + 1} earlier`} className={iconBtn}><ArrowLeft size={14} /></button>
                <button type="button" onClick={() => update(i, { rot: (p.rot + 90) % 360 })} aria-label={`Rotate page ${p.n + 1}`} className={iconBtn}><RotateCw size={14} /></button>
                <button type="button" onClick={() => update(i, { del: !p.del })} aria-label={p.del ? `Keep page ${p.n + 1}` : `Delete page ${p.n + 1}`} className={iconBtn}>
                  {p.del ? <Undo2 size={14} /> : <Trash2 size={14} />}
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === state.length - 1} aria-label={`Move page ${p.n + 1} later`} className={iconBtn}><ArrowRight size={14} /></button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// Reads a PDF one page at a time, with zoom and keyboard arrows.
export function PdfViewer({ file }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const taskRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    setPdf(null);
    setPage(1);
    setError("");
    file.arrayBuffer()
      .then((d) => pdfjs.getDocument({ data: d }).promise)
      .then((p) => { if (!off) setPdf(p); })
      .catch(() => { if (!off) setError("This PDF could not be opened. It may be password-protected or damaged."); });
    return () => { off = true; };
  }, [file]);

  useEffect(() => {
    if (!pdf) return;
    let off = false;
    (async () => {
      if (taskRef.current) {
        taskRef.current.cancel();
        try { await taskRef.current.promise; } catch { /* cancelled */ }
      }
      const pg = await pdf.getPage(page);
      if (off || !canvasRef.current) return;
      const ratio = window.devicePixelRatio || 1;
      const fit = Math.min((wrapRef.current?.clientWidth || 800) - 24, 900);
      const scale = (fit / pg.getViewport({ scale: 1 }).width) * zoom;
      const vp = pg.getViewport({ scale: scale * ratio });
      const c = canvasRef.current;
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = `${vp.width / ratio}px`;
      c.style.height = `${vp.height / ratio}px`;
      taskRef.current = pg.render({ canvas: c, canvasContext: c.getContext("2d"), viewport: vp, background: "#fff" });
      try { await taskRef.current.promise; } catch { /* cancelled */ }
    })();
    return () => { off = true; };
  }, [pdf, page, zoom]);

  const total = pdf?.numPages || 0;
  const go = (n) => setPage(Math.max(1, Math.min(total, n)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(total, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (error) return <p role="alert" className="mt-6 text-sm font-bold">{error}</p>;
  if (!pdf) return <p className="mt-6 text-sm font-bold">Reading PDF...</p>;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page" className={iconBtn}><ChevronLeft size={18} /></button>
        <label className="flex items-center gap-2 text-sm">
          Page
          <input
            type="number"
            min={1}
            max={total}
            value={page}
            onChange={(e) => go(parseInt(e.target.value) || 1)}
            className="w-16 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
          />
          of {total}
        </label>
        <button onClick={() => go(page + 1)} disabled={page >= total} aria-label="Next page" className={iconBtn}><ChevronRight size={18} /></button>
        <span className="mx-2 h-5 w-px bg-[var(--line)]" />
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out" className={iconBtn}><Minus size={18} /></button>
        <span className="w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in" className={iconBtn}><Plus size={18} /></button>
      </div>
      <div ref={wrapRef} className="mt-3 overflow-auto rounded-xl border border-[var(--line)] bg-[var(--line)] p-3">
        <canvas ref={canvasRef} className="mx-auto block shadow" />
      </div>
    </div>
  );
}

// Shows the result of Compare PDFs.
export function DiffView({ diff }) {
  const { changedPages, added, removed, pagesA, pagesB } = diff;
  const MAX = 300;
  let shown = 0;
  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="font-bold">
        {changedPages.length
          ? `${changedPages.length} ${changedPages.length === 1 ? "page" : "pages"} changed: ${added} lines added, ${removed} lines removed`
          : "No text differences found."}
      </p>
      {pagesA !== pagesB && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          Page count differs: {pagesA} pages in the first file, {pagesB} in the second.
        </p>
      )}
      {changedPages.map((p) => {
        if (shown >= MAX) return null;
        const lines = p.lines.slice(0, MAX - shown);
        shown += lines.length;
        return (
          <div key={p.page} className="mt-4">
            <p className="text-sm font-bold">Page {p.page}</p>
            {lines.map((l, i) => (
              <p key={i} className={`mt-1 rounded px-2 py-1 text-sm ${l.type === "add" ? "bg-[#2fb36a]/15" : "bg-[#e5484d]/15"}`}>
                <span className="mr-2 font-bold">{l.type === "add" ? "+ Added" : "- Removed"}</span>
                {l.text}
              </p>
            ))}
          </div>
        );
      })}
      {added + removed > MAX && (
        <p className="mt-3 text-sm text-[var(--muted)]">Showing the first {MAX} changes. Download the report for the full list.</p>
      )}
    </div>
  );
}