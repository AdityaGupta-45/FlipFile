import { useEffect, useRef, useState } from "react";
import { PROVIDERS, answerQuestion, clearSettings, loadSettings, saveSettings, summarize } from "../lib/ai.js";
import { extractPages } from "../lib/pdfText.js";
import { ProgressBar } from "./ui.jsx";

const field = "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2";
const btn = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm disabled:opacity-40";
const primary = "rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--on-accent)] disabled:opacity-40";

function useAiSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings();
    if (saved && PROVIDERS[saved.provider]) return { ...saved, remember: true };
    return { provider: "anthropic", key: "", model: PROVIDERS.anthropic.model, remember: false };
  });

  const update = (patch) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.provider && patch.provider !== prev.provider && patch.model === undefined) {
        next.model = PROVIDERS[patch.provider].model;
      }
      if (next.remember) saveSettings(next);
      else clearSettings();
      return next;
    });

  const forget = () => {
    clearSettings();
    setSettings((prev) => ({ ...prev, key: "", remember: false }));
  };
  return { settings, update, forget };
}

function usePdfPages(file) {
  const [state, setState] = useState({ pages: null, error: "", done: 0, total: 0 });
  useEffect(() => {
    let off = false;
    setState({ pages: null, error: "", done: 0, total: 0 });
    extractPages(file, (done, total) => { if (!off) setState((s) => ({ ...s, done, total })); })
      .then((pages) => {
        if (off) return;
        if (!pages.join("").trim()) {
          setState({ pages: null, error: "No text found in this PDF. It is probably a scan (pictures of pages), and an AI tool cannot read that yet.", done: 0, total: 0 });
        } else {
          setState({ pages, error: "", done: pages.length, total: pages.length });
        }
      })
      .catch(() => {
        if (!off) setState({ pages: null, error: "This PDF could not be read. It may be password-protected or damaged.", done: 0, total: 0 });
      });
    return () => { off = true; };
  }, [file]);
  return state;
}

function AiSettings({ settings, update, forget }) {
  return (
    <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="font-bold">Your AI key</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        These tools use your own API key. The text of your PDF is sent straight from your browser to the provider you choose. It does not go through a FlipFile server. The provider bills you for what you use.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">Provider</span>
          <select className={field} value={settings.provider} onChange={(e) => update({ provider: e.target.value })}>
            {Object.entries(PROVIDERS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">Model</span>
          <input type="text" className={field} value={settings.model} spellCheck={false} onChange={(e) => update({ model: e.target.value })} />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-bold">API key</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          className={field}
          placeholder={PROVIDERS[settings.provider].hint}
          value={settings.key}
          onChange={(e) => update({ key: e.target.value })}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.remember} onChange={(e) => update({ remember: e.target.checked })} />
          Remember my key in this browser
        </label>
        {settings.key && <button type="button" onClick={forget} className={btn}>Forget key</button>}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        If the model name stops working, type a current model name from your provider's website.
      </p>
    </div>
  );
}

function SummarizeTool({ settings, pages, file }) {
  const [length, setLength] = useState("medium");
  const [style, setStyle] = useState("paragraphs");
  const [language, setLanguage] = useState("same");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const ready = settings.key.trim().length > 0;

  const run = async () => {
    setBusy(true); setError(""); setResult(""); setProgress(0); setStage("Starting");
    try {
      const text = await summarize({
        settings, pages, length, style, language,
        onProgress: (p, label) => { setProgress((prev) => Math.max(prev, Math.round(p))); if (label) setStage(label); },
      });
      setResult(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([result], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-bold">Length</span>
          <select className={field} value={length} disabled={busy} onChange={(e) => setLength(e.target.value)}>
            <option value="short">Short (about 5 sentences)</option>
            <option value="medium">Medium (about 3 paragraphs)</option>
            <option value="detailed">Detailed (a page or more)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">Style</span>
          <select className={field} value={style} disabled={busy} onChange={(e) => setStyle(e.target.value)}>
            <option value="paragraphs">Paragraphs</option>
            <option value="bullets">Bullet points</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">Language</span>
          <select className={field} value={language} disabled={busy} onChange={(e) => setLanguage(e.target.value)}>
            <option value="same">Same as the PDF</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
          </select>
        </label>
      </div>
      <button onClick={run} disabled={!ready || busy} className={`mt-6 ${primary}`}>{busy ? "Working..." : "Summarize"}</button>
      {!ready && <p className="mt-2 text-sm text-[var(--muted)]">Paste your API key above first.</p>}
      {busy && <ProgressBar value={progress} label={stage} />}
      {error && <p role="alert" className="mt-4 text-sm font-bold">{error}</p>}
      {result && (
        <div className="mt-6" aria-live="polite">
          <div className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 leading-relaxed">{result}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={copy} className={btn}>{copied ? "Copied" : "Copy"}</button>
            <button onClick={download} className={btn}>Download as text</button>
            <span className="text-xs text-[var(--muted)]">AI can make mistakes. Check important details in the PDF.</span>
          </div>
        </div>
      )}
    </div>
  );
}

const STARTERS = ["Summarize this document in 5 bullet points", "What are the key dates and deadlines?", "List the main topics"];

function ChatTool({ settings, pages }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const endRef = useRef(null);
  const ready = settings.key.trim().length > 0;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy || !ready) return;
    const before = messages;
    setMessages([...before, { role: "user", content: q }]);
    setInput(""); setBusy(true); setError("");
    try {
      const out = await answerQuestion({ settings, pages, history: before, question: q });
      setMessages((m) => [...m, { role: "assistant", content: out.text }]);
      setPartial(out.partial);
    } catch (e) {
      setMessages(before); // the question was not answered, so take it back
      setInput(q);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-[var(--muted)]">Ask anything about your PDF. Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" disabled={!ready || busy} onClick={() => send(s)} className={btn}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-[var(--accent)] text-[var(--on-accent)]" : "border border-[var(--line)] bg-[var(--panel)]"
              }`}>{m.content}</p>
            </div>
          ))}
          {busy && <p className="text-sm text-[var(--muted)]">Thinking...</p>}
          <div ref={endRef} />
        </div>
      </div>
      {partial && (
        <p className="mt-2 text-xs text-[var(--muted)]">This PDF is long, so only the pages closest to your question were sent to the AI.</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-bold">{error}</p>}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={input}
          disabled={busy}
          placeholder={ready ? "Type your question and press Enter" : "Paste your API key above first"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
        />
        <button onClick={() => send()} disabled={!ready || busy || !input.trim()} className={primary}>Send</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span>AI can make mistakes. Check important details in the PDF.</span>
        {messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setError(""); setPartial(false); }} className="underline">Clear chat</button>}
      </div>
    </div>
  );
}

export function AiTool({ kind, file }) {
  const { settings, update, forget } = useAiSettings();
  const { pages, error, done, total } = usePdfPages(file);
  const words = pages ? pages.join(" ").split(/\s+/).filter(Boolean).length : 0;

  return (
    <div>
      {error ? (
        <p role="alert" className="mt-6 text-sm font-bold">{error}</p>
      ) : !pages ? (
        <p className="mt-6 text-sm font-bold">Reading the PDF... {done} of {total || "?"} pages</p>
      ) : (
        <p className="mt-6 text-sm text-[var(--muted)]">Read {pages.length} {pages.length === 1 ? "page" : "pages"}, about {words.toLocaleString()} words.</p>
      )}
      <AiSettings settings={settings} update={update} forget={forget} />
      {pages && (kind === "summarize"
        ? <SummarizeTool settings={settings} pages={pages} file={file} />
        : <ChatTool settings={settings} pages={pages} />)}
    </div>
  );
}