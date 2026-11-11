import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { categories, tools } from "../tools.js";
import { HOME_DESC, HOME_TITLE } from "../lib/seo.js";
import { isComingSoon } from "../lib/server.js";
import { Logo, ToolIcon, usePageTitle } from "../components/ui.jsx";

const FORMATS = ["PDF", "JPG", "MP3", "DOCX", "PNG"];

function FlipChip() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FORMATS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span key={i} className="flip-in rounded-md bg-[var(--chip)] px-2 font-bold text-[#0f1b2d]">
      {FORMATS[i]}
    </span>
  );
}

export default function Home() {
  usePageTitle(HOME_TITLE, HOME_DESC);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const searchRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = useMemo(
    () =>
      tools.filter(
        (t) =>
          (cat === "All" || t.cat === cat) &&
          `${t.name} ${t.desc} ${t.from} ${t.to}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query, cat]
  );

  return (
    <>
      <section className="pb-10 pt-12 text-center">
        <Logo className="mx-auto h-24 w-20" />
        <h1 className="display mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
          Flip<span className="ml-1 rounded-xl bg-[var(--chip)] px-3 text-[#0f1b2d]">File</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Flip any file into <FlipChip />
        </p>
      </section>

      <section>
        <div className="flex flex-col gap-4">
          <label className="relative block w-full sm:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by task or format..."
              aria-label="Search tools"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] py-3 pl-11 pr-4"
            />
          </label>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm ${
                  cat === c
                    ? "border-[var(--ink)] bg-[var(--ink)] font-bold text-[var(--bg)]"
                    : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {list.length} {list.length === 1 ? "tool" : "tools"} available. Press / to search.
        </p>

        {list.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <Link
                key={t.id}
                to={`/${t.id}`}
                className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 hover:border-[var(--accent)]"
              >
                <ToolIcon tool={t} />
                <span className="display mt-5 block text-lg font-bold">
                  {t.name}
                  {isComingSoon(t) && (
                    <span className="ml-2 rounded bg-[var(--chip)] px-1.5 py-0.5 align-middle text-xs font-bold text-[#0f1b2d]">Soon</span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{t.desc}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-[var(--muted)]">No tool matches that search. Try a shorter word.</p>
        )}
      </section>
    </>
  );
}