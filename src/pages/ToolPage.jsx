import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { tools } from "../tools.js";
import { toolSeo } from "../lib/seo.js";
import { toolContent } from "../lib/toolContent.js";
import { isComingSoon } from "../lib/server.js";
import { Camera } from "lucide-react";
import { ToolIcon, usePageTitle } from "../components/ui.jsx";
import { DiffView, PageEditor, PdfViewer } from "../components/PdfTools.jsx";
import { VisualEditor, editorReady } from "../components/VisualEditors.jsx";
import { AiTool } from "../components/AiTools.jsx";
import WorkflowBuilder from "../components/Workflow.jsx";

const size = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const ext = (name) => {
  const e = name.split(".").pop().toLowerCase();
  return e === "jpeg" ? "jpg" : e;
};

export default function ToolPage() {
  const { id } = useParams();
  const tool = tools.find((t) => t.id === id);
  const seo = tool ? toolSeo(tool) : { title: "Tool not found | FlipFile", description: "This tool does not exist." };
  usePageTitle(seo.title, seo.description);
  if (!tool) {
    return (
      <section className="py-10">
        <h1 className="display text-3xl font-extrabold">Tool not found</h1>
        <Link to="/" className="mt-3 block text-[var(--accent)]">Back to all tools</Link>
      </section>
    );
  }
  return <Tool key={tool.id} tool={tool} />;
}

function Tool({ tool }) {
  const isPageEditor = tool.editor === "delete" || tool.editor === "organize";
  const emptyEditor = isPageEditor ? [] : null;
  const [files, setFiles] = useState([]);
  const [values, setValues] = useState(() =>
    Object.fromEntries((tool.options || []).map((o) => [o.key, o.default]))
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [pageState, setPageState] = useState(emptyEditor);

  useEffect(() => () => results.forEach((r) => URL.revokeObjectURL(r.url)), [results]);

  const acceptAttr = tool.accepts.flatMap((e) => (e === "jpg" ? [".jpg", ".jpeg"] : [`.${e}`])).join(",");
  const min = tool.min || 1;

  const add = (list) => {
    const all = [...list];
    const ok = all.filter((f) => tool.accepts.includes(ext(f.name)));
    setError(
      ok.length < all.length
        ? `This tool only accepts ${tool.accepts.map((e) => e.toUpperCase()).join(", ")} files.`
        : ""
    );
    if (!ok.length) return;
    setFiles((f) => (tool.multiple ? [...f, ...ok] : [ok[0]]).slice(0, tool.max || Infinity));
    setPageState(emptyEditor);
    setResults([]);
  };
  const move = (i, d) => {
    setFiles((f) => {
      const j = i + d;
      if (j < 0 || j >= f.length) return f;
      const n = [...f];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setResults([]);
  };
  const remove = (i) => { setFiles((f) => f.filter((_, k) => k !== i)); setPageState(emptyEditor); setResults([]); };

  const run = async () => {
    setBusy(true);
    setError("");
    setResults([]);
    setProgress(0);
    setStage("Starting");
    // Progress only moves forward, so the bar never jumps backwards.
    const onProgress = (p, label) => {
      setProgress((prev) => Math.max(prev, Math.min(100, Math.round(p))));
      if (label) setStage(label);
    };
    try {
      const { processors } = await import("../lib/processors.js");
      const out = await processors[tool.id](files, { ...values, pageState }, onProgress);
      setResults(out.map((o) => ({ name: o.name, size: o.blob.size, url: URL.createObjectURL(o.blob), diff: o.diff })));
    } catch (e) {
      setError(e?.message || "Something went wrong. Check the file and try again.");
    } finally {
      setBusy(false);
    }
  };

  const input = "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2";
  const originalSize = files.reduce((n, f) => n + f.size, 0);
  const hasDiff = results.some((r) => r.diff);
  const custom = Boolean(tool.viewer || tool.ai || tool.workflow); // these tools have their own screen and button

  let ready = files.length >= min;
  if (tool.editor === "delete") ready = ready && pageState.some((p) => p.del) && !pageState.every((p) => p.del);
  if (tool.editor === "organize") ready = ready && pageState.length > 0 && !pageState.every((p) => p.del);
  if (tool.editor && !isPageEditor) ready = ready && editorReady(tool.editor, pageState);

  if (isComingSoon(tool)) {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <Link to="/" className="text-sm text-[var(--muted)]">Back to all tools</Link>
        <div className="mt-3 flex items-center gap-4">
          <ToolIcon tool={tool} size={22} />
          <h1 className="display text-4xl font-extrabold">{tool.name}</h1>
        </div>
        <p className="mt-3 text-[var(--muted)]">{tool.desc}</p>
        <p className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
          <strong>Coming soon.</strong> This tool needs the FlipFile conversion server, which is not online yet. All the other tools work now.
        </p>
        <ToolGuide tool={tool} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link to="/" className="text-sm text-[var(--muted)]">Back to all tools</Link>
      <div className="mt-3 flex items-center gap-4">
        <ToolIcon tool={tool} size={22} />
        <h1 className="display text-4xl font-extrabold">{tool.name}</h1>
      </div>
      <p className="mt-3 text-[var(--muted)]">{tool.desc}</p>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!busy) add(e.dataTransfer.files); }}
        className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-[var(--line)] p-8 text-center"
      >
        <span className="font-bold text-[var(--accent)]">
          {tool.multiple ? "Add files" : files.length ? "Choose a different file" : "Choose a file"}
        </span>
        <span className="block text-sm text-[var(--muted)]">or drop {tool.multiple ? "them" : "it"} here</span>
        <input type="file" accept={acceptAttr} multiple={!!tool.multiple} hidden disabled={busy}
          onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>

      {tool.hint && <p className="mt-3 text-sm text-[var(--muted)]">{tool.hint}</p>}
      {tool.camera && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-bold">
          <Camera size={18} aria-hidden="true" /> Take a photo
          <input type="file" accept="image/*" capture="environment" hidden disabled={busy}
            onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
      )}

      {error && <p role="alert" className="mt-3 text-sm font-bold">{error}</p>}

      <ol className="mt-4">
        {files.map((f, i) => (
          <li key={`${f.name}-${i}`} className="flex items-center gap-2 border-b border-[var(--line)] py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{f.name}</span>
              <span className="text-sm text-[var(--muted)]">{size(f.size)}</span>
            </span>
            {tool.ordered && (
              <>
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move ${f.name} up`} className="px-2 disabled:opacity-30">Up</button>
                <button onClick={() => move(i, 1)} disabled={busy || i === files.length - 1} aria-label={`Move ${f.name} down`} className="px-2 disabled:opacity-30">Down</button>
              </>
            )}
            <button onClick={() => remove(i)} disabled={busy} aria-label={`Remove ${f.name}`} className="px-2 text-[var(--muted)] disabled:opacity-30">Remove</button>
          </li>
        ))}
      </ol>

      {files.length > 0 && files.length < min && (
        <p className="mt-3 text-sm text-[var(--muted)]">Add at least {min} files to continue.</p>
      )}

      {files.length > 0 && isPageEditor && (
        <PageEditor file={files[0]} mode={tool.editor} state={pageState} onChange={setPageState} />
      )}
      {files.length > 0 && tool.editor && !isPageEditor && (
        <VisualEditor kind={tool.editor} file={files[0]} state={pageState} onChange={setPageState} />
      )}
      {files.length > 0 && tool.viewer && <PdfViewer file={files[0]} />}
      {files.length > 0 && tool.ai && (
        <AiTool key={`${files[0].name}-${files[0].size}-${files[0].lastModified}`} kind={tool.ai} file={files[0]} />
      )}
      {files.length > 0 && tool.workflow && <WorkflowBuilder files={files} />}

      {files.length > 0 && (tool.options || []).map((o) => (
        <label key={o.key} className="mt-4 block">
          <span className="block text-sm font-bold">
            {o.label}{o.type === "range" && ` (${Math.round(values[o.key] * 100)}%)`}
          </span>
          {o.type === "select" ? (
            <select className={input} value={values[o.key]} disabled={busy}
              onChange={(e) => setValues({ ...values, [o.key]: e.target.value })}>
              {o.choices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ) : o.type === "range" ? (
            <input type="range" min={o.min} max={o.max} step={o.step} value={values[o.key]} disabled={busy} className="mt-2 w-full"
              onChange={(e) => setValues({ ...values, [o.key]: parseFloat(e.target.value) })} />
          ) : (
            <input type={o.type === "password" ? "password" : "text"} autoComplete={o.type === "password" ? "new-password" : undefined} className={input} value={values[o.key]} disabled={busy}
              onChange={(e) => setValues({ ...values, [o.key]: e.target.value })} />
          )}
        </label>
      ))}

      {!custom && (
      <button
        onClick={run}
        disabled={!ready || busy}
        className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--on-accent)] disabled:opacity-40"
      >
        {busy ? "Working..." : tool.action}
      </button>
      )}
      {tool.editor === "delete" && pageState.length > 0 && !ready && !busy && (
        <p className="mt-2 text-sm text-[var(--muted)]">Mark at least one page to delete, and keep at least one page.</p>
      )}

      {busy && (
        <div className="mt-6" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Conversion progress">
          <div className="flex justify-between text-sm font-bold">
            <span>{stage}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6" aria-live="polite">
          <p className="font-bold">Done. Your file is ready.</p>
          {!hasDiff && (
            <p className="text-sm text-[var(--muted)]">
              Original {size(originalSize)}, result {size(results.reduce((n, r) => n + r.size, 0))}
            </p>
          )}
          {results.map((r) => r.diff && <DiffView key={`diff-${r.name}`} diff={r.diff} />)}
          {results.map((r) => (
            <a key={r.name} href={r.url} download={r.name}
              className="mt-3 block rounded-xl border-2 border-[var(--accent)] px-5 py-3 font-bold">
              Download {r.name} ({size(r.size)})
            </a>
          ))}
        </div>
      )}
      <ToolGuide tool={tool} />
    </section>
  );
}


function ToolGuide({ tool }) {
  const c = toolContent[tool.id];
  if (!c) return null;
  return (
    <section className="mt-14 border-t border-[var(--line)] pt-10">
      <h2 className="display text-2xl font-extrabold">How to use {tool.name}</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--muted)]">
        {c.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <h2 className="display mt-10 text-2xl font-extrabold">About {tool.name}</h2>
      <p className="mt-3 leading-relaxed text-[var(--muted)]">{c.about}</p>
      <h2 className="display mt-10 text-2xl font-extrabold">Frequently asked questions</h2>
      {c.faq.map(([q, a]) => (
        <div key={q} className="mt-4">
          <h3 className="font-bold">{q}</h3>
          <p className="mt-1 text-[var(--muted)]">{a}</p>
        </div>
      ))}
    </section>
  );
}