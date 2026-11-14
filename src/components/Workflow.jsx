import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { tools } from "../tools.js";
import { ProgressBar } from "./ui.jsx";

const field = "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2";
const iconBtn = "rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 disabled:opacity-30";
const size = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

// The steps a workflow can use. Each one takes a PDF and gives back a PDF.
const fromTool = (id) => { const t = tools.find((x) => x.id === id); return { id, name: t.name, options: t.options || [] }; };
const STEPS = [
  fromTool("rotate-pdf"),
  fromTool("page-numbers"),
  fromTool("watermark"),
  fromTool("compress-pdf"),
  { id: "step-keep-pages", name: "Keep only some pages", options: [{ key: "pages", label: "Pages to keep, like 1-3, 5", type: "text", default: "" }] },
  { id: "step-remove-pages", name: "Remove some pages", options: [{ key: "pages", label: "Pages to remove, like 2, 4-6", type: "text", default: "" }] },
];
const defaults = (options) => Object.fromEntries(options.map((o) => [o.key, o.default]));
let counter = 0;

function StepOption({ o, value, onChange, disabled }) {
  return (
    <label className="mt-3 block">
      <span className="block text-sm font-bold">{o.label}{o.type === "range" && ` (${Math.round(value * 100)}%)`}</span>
      {o.type === "select" ? (
        <select className={field} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {o.choices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : o.type === "range" ? (
        <input type="range" min={o.min} max={o.max} step={o.step} value={value} disabled={disabled} className="mt-2 w-full"
          onChange={(e) => onChange(parseFloat(e.target.value))} />
      ) : (
        <input type="text" className={field} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export default function WorkflowBuilder({ files }) {
  const [steps, setSteps] = useState([]);
  const [pick, setPick] = useState(STEPS[0].id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const meta = (id) => STEPS.find((s) => s.id === id);
  const add = () => {
    const m = meta(pick);
    setSteps((s) => [...s, { uid: ++counter, id: m.id, values: defaults(m.options) }]);
    setResult(null);
  };
  const move = (i, d) => setSteps((s) => {
    const j = i + d;
    if (j < 0 || j >= s.length) return s;
    const n = [...s];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const remove = (uid) => { setSteps((s) => s.filter((x) => x.uid !== uid)); setResult(null); };
  const setValue = (uid, key, value) => setSteps((s) => s.map((x) => (x.uid === uid ? { ...x, values: { ...x.values, [key]: value } } : x)));

  const run = async () => {
    setBusy(true); setError(""); setResult(null); setProgress(0);
    try {
      const { processors } = await import("../lib/processors.js");
      const plan = [
        ...(files.length > 1 ? [{ id: "merge-pdf", name: "Merge the PDFs", values: {} }] : []),
        ...steps.map((s) => ({ ...s, name: meta(s.id).name })),
      ];
      let current = files;
      for (let i = 0; i < plan.length; i++) {
        setStage(`Step ${i + 1} of ${plan.length}: ${plan[i].name}`);
        const onProgress = (p) =>
          setProgress((prev) => Math.max(prev, Math.round(((i + Math.min(p, 100) / 100) / plan.length) * 100)));
        const out = await processors[plan[i].id](current, plan[i].values, onProgress);
        if (out.length !== 1) throw new Error("A step made more than one file, so the workflow cannot go on.");
        current = [new File([out[0].blob], out[0].name, { type: "application/pdf" })];
      }
      const final = current[0];
      setProgress(100);
      setResult({ name: `${files[0].name.replace(/\.[^.]+$/, "")}-workflow.pdf`, size: final.size, url: URL.createObjectURL(final) });
    } catch (e) {
      setError(e?.message || "Something went wrong. Check the steps and try again.");
    } finally {
      setBusy(false);
    }
  };

  const canRun = steps.length > 0 || files.length > 1;

  return (
    <div className="mt-6">
      {files.length > 1 && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-sm">
          Your {files.length} PDFs will be merged first, in the order shown above.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s.uid} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--chip)] text-sm font-bold text-[#0f1b2d]">{i + 1}</span>
              <span className="flex-1 font-bold">{meta(s.id).name}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move step ${i + 1} up`} className={iconBtn}><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={busy || i === steps.length - 1} aria-label={`Move step ${i + 1} down`} className={iconBtn}><ArrowDown size={14} /></button>
              <button type="button" onClick={() => remove(s.uid)} disabled={busy} aria-label={`Remove step ${i + 1}`} className={iconBtn}><X size={14} /></button>
            </div>
            {meta(s.id).options.map((o) => (
              <StepOption key={o.key} o={o} value={s.values[o.key]} disabled={busy} onChange={(v) => setValue(s.uid, o.key, v)} />
            ))}
          </li>
        ))}
      </ol>
      {steps.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">No steps yet. Pick one below and click Add step.</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-sm font-bold">Next step</span>
          <select className={field} value={pick} disabled={busy} onChange={(e) => setPick(e.target.value)}>
            {STEPS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={add} disabled={busy}
          className="flex items-center gap-1 rounded-xl border-2 border-[var(--accent)] px-4 py-2 font-bold disabled:opacity-40">
          <Plus size={16} /> Add step
        </button>
      </div>

      <button onClick={run} disabled={!canRun || busy}
        className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--on-accent)] disabled:opacity-40">
        {busy ? "Working..." : "Run workflow"}
      </button>

      {busy && <ProgressBar value={progress} label={stage} />}
      {error && <p role="alert" className="mt-4 text-sm font-bold">{error}</p>}
      {result && (
        <div className="mt-6" aria-live="polite">
          <p className="font-bold">Done. Your file is ready.</p>
          <a href={result.url} download={result.name} className="mt-3 block rounded-xl border-2 border-[var(--accent)] px-5 py-3 font-bold">
            Download {result.name} ({size(result.size)})
          </a>
        </div>
      )}
    </div>
  );
}