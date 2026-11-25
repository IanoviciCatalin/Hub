"use client";

import { useState } from "react";
import { profile } from "@/content/profile";

export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponibil: adresa ramane vizibila si selectabila */
    }
  };
  return (
    <section id="contact" className="container-x scroll-mt-20 pb-28">
      <div data-reveal className="flex flex-col gap-8 rounded-2xl border border-line bg-surface p-8 md:p-14">
        <p className="eyebrow">Contact</p>
        <h2 className="max-w-[18ch] text-3xl font-medium tracking-[-0.03em] md:text-5xl md:leading-[1.05]">
          Ai un proiect sau o idee? <span className="text-muted">Hit me up!</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <a href={`mailto:${profile.email}`} className="btn btn-primary select-all">
            {profile.email}
          </a>
          <button type="button" onClick={copy} className="btn" aria-live="polite">
            {copied ? "Copiat ✓" : "Copiaza adresa"}
          </button>
          {profile.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="btn">
              {l.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
