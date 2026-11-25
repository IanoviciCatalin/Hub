import { profile } from "@/content/profile";
import { SectionHeading } from "./SectionHeading";

export function About() {
  return (
    <section id="despre" className="container-x scroll-mt-20 py-24">
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow="Despre" title={`${profile.name}. ${profile.role}.`} />
          <div data-reveal className="flex max-w-[58ch] flex-col gap-4 leading-relaxed text-muted">
            {profile.about.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <dl data-reveal className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {Object.entries(profile.skills).map(([group, items]) => (
            <div key={group} className="flex flex-col gap-3 border-t border-line py-5">
              <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{group}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {items.map((s) => (
                  <span key={s} className="chip text-fg">
                    {s}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
