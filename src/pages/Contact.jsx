import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../components/ui.jsx";
import { PAGE_SEO } from "../lib/seo.js";

const EMAIL = "adityagupta1212349@gmail.com";
// Messages are emailed to you by Web3Forms (free, 250 per month). To get your access key:
// go to web3forms.com, enter your email, and paste the key that arrives in your inbox below.
// The key is safe to keep in public code.
const ACCESS_KEY = "PASTE_YOUR_ACCESS_KEY_HERE";

const socials = [
  {
    name: "X",
    href: "https://x.com/G09287859Gupta",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/adityagupta1710/",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    name: "GitHub",
    href: "https://github.com/AdityaGupta-45/",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
];

const field = "mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3";

export default function Contact() {
  usePageTitle(PAGE_SEO.contact.title, PAGE_SEO.contact.description);
  const [status, setStatus] = useState("idle"); // idle, sending, sent, error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("botcheck")) return; // hidden field only bots tick
    setStatus("sending");
    setError("");
    try {
      if (ACCESS_KEY.startsWith("PASTE")) throw new Error("The contact form is not set up yet.");
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          subject: `FlipFile message from ${data.get("name")}`,
          from_name: "FlipFile",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "The message could not be sent.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      const reason = err instanceof TypeError ? "Could not reach the mail service. Check your internet connection." : err.message;
      setError(`${reason} You can also email ${EMAIL} directly.`);
      setStatus("error");
    }
  };

  return (
    <section className="mx-auto max-w-2xl py-12">
      <Link to="/" className="text-sm text-[var(--muted)]">Back to all tools</Link>
      <h1 className="display mt-3 text-4xl font-extrabold">Contact</h1>
      <p className="mt-4 leading-relaxed text-[var(--muted)]">
        Questions, bugs or ideas for a new tool? Send a message below, or find me on these accounts.
      </p>

      <div className="mt-6 flex gap-3">
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.name} (opens in a new tab)`}
            title={s.name}
            className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d={s.path} />
            </svg>
          </a>
        ))}
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Prefer email? Write to{" "}
        <a href={`mailto:${EMAIL}`} className="font-bold text-[var(--accent)]">{EMAIL}</a>
      </p>

      <form onSubmit={submit} className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <label className="block">
          <span className="text-sm font-bold">Your name</span>
          <input name="name" type="text" required autoComplete="name" placeholder="Your name" className={field} />
        </label>
        <label className="mt-5 block">
          <span className="text-sm font-bold">Your email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
        </label>
        <label className="mt-5 block">
          <span className="text-sm font-bold">Your message</span>
          <textarea name="message" required rows={6} maxLength={2000} placeholder="How can I help?" className={field} />
        </label>
        <input name="botcheck" type="checkbox" tabIndex={-1} className="hidden" aria-hidden="true" />

        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-6 w-full rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--on-accent)] disabled:opacity-50"
        >
          {status === "sending" ? "Sending..." : "Send message"}
        </button>

        {status === "sent" && (
          <p role="status" className="mt-4 text-sm font-bold">
            Message sent. Thanks for writing, I will reply to your email soon.
          </p>
        )}
        {status === "error" && <p role="alert" className="mt-4 text-sm font-bold">{error}</p>}
      </form>
    </section>
  );
}