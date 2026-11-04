import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { categories, tools } from "../tools.js";
import { Logo, ToolIcon } from "./ui.jsx";

const quick = ["merge-pdf", "split-pdf", "compress-pdf"].map((id) => tools.find((t) => t.id === id));
const linkClass = "rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]";

const convertGroups = [
  { title: "Convert to PDF", items: tools.filter((t) => t.to === "PDF" && t.from !== "PDF") },
  { title: "Convert from PDF", items: tools.filter((t) => t.from === "PDF" && t.to !== "PDF") },
  { title: "Other conversions", items: tools.filter((t) => t.from !== "PDF" && t.to !== "PDF" && t.from !== t.to) },
].filter((g) => g.items.length);

const allGroups = categories
  .filter((c) => c !== "All")
  .map((c) => ({ title: c, items: tools.filter((t) => t.cat === c) }))
  .filter((g) => g.items.length);

// Opens when the cursor hovers over it (or on click/keyboard for touch and keyboard users).
function MegaMenu({ label, groups, showAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150); };

  useEffect(() => {
    const outside = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onBlur={(e) => { if (!ref.current.contains(e.relatedTarget)) setOpen(false); }}
    >
      <button
        onClick={show}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${linkClass} flex items-center gap-1 ${open ? "bg-[var(--bg)] text-[var(--ink)]" : ""}`}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 pt-2">
          <div
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-xl"
            style={{ width: `min(92vw, ${groups.length * 220 + 40}px)` }}
          >
            <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="mb-2 px-2 text-xs font-bold text-[var(--muted)]">{g.title}</p>
                  {g.items.map((t) => (
                    <Link
                      key={t.id}
                      to={`/${t.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--bg)]"
                    >
                      <ToolIcon tool={t} size={16} pad={14} />
                      {t.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
            {showAll && (
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="mt-4 block border-t border-[var(--line)] px-2 pt-3 text-sm font-bold text-[var(--accent)]"
              >
                See all tools
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onClick }) {
  const dark = theme === "dark";
  const anim = "absolute transition-all duration-500";
  return (
    <button
      onClick={onClick}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative ml-2 grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[var(--line)]"
    >
      <Sun size={16} className={`${anim} ${dark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
      <Moon size={16} className={`${anim} ${dark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
    </button>
  );
}

export function Header() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const [menu, setMenu] = useState(false);

  const toggleTheme = (e) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    try { localStorage.setItem("flipfile-theme", next); } catch { /* storage blocked */ }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return apply();

    // Circle reveal that starts at the toggle button and spreads across the whole page.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      );
    });
  };

  return (
    <header className="relative z-20 border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="display flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Logo />
          flip<span className="-ml-1.5 rounded bg-[var(--chip)] px-1.5 text-[#0f1b2d]">file</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {quick.map((t) => (
            <Link key={t.id} to={`/${t.id}`} className={linkClass}>{t.name}</Link>
          ))}
          <MegaMenu label="Convert" groups={convertGroups} />
          <MegaMenu label="All tools" groups={allGroups} showAll />
          <ThemeToggle theme={theme} onClick={toggleTheme} />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle theme={theme} onClick={toggleTheme} />
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu" className="rounded-lg p-2">
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menu && (
        <nav className="border-t border-[var(--line)] px-5 py-3 md:hidden" aria-label="Mobile">
          {tools.map((t) => (
            <Link key={t.id} to={`/${t.id}`} onClick={() => setMenu(false)} className="block py-2 text-sm">
              {t.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

const footerLinks = [
  ["All Tools", "/tools"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
  ["Docs", "/docs"],
  ["Changelog", "/changelog"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] px-5 py-10 text-center">
      <nav className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-[var(--muted)]" aria-label="Footer">
        {footerLinks.map(([label, to]) => (
          <Link key={to} to={to} className="hover:text-[var(--ink)]">{label}</Link>
        ))}
      </nav>
      <p className="mt-6 text-xs text-[var(--muted)]">Made with Adityaa © 2026</p>
    </footer>
  );
}