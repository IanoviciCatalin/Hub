import Link from "next/link";
import { profile } from "@/content/profile";
import { HeroPolyhedron } from "./HeroPolyhedron";

export function Hero() {
  return (
    <section className="container-x grid items-center gap-6 pt-14 pb-10 md:grid-cols-[1.05fr_1fr] md:pt-20 md:pb-16">
      <div className="flex flex-col gap-6">
        <p className="eyebrow line-in" style={{ "--i": 0 } as React.CSSProperties}>
          {profile.domains.join(" · ")}
        </p>
        <h1 className="text-[clamp(2.4rem,6.2vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.035em]">
          {profile.headline.map((line, i) => (
            <span
              key={i}
              className={`line-in block ${i === profile.headlineMutedLine ? "text-muted" : ""}`}
              style={{ "--i": i + 1 } as React.CSSProperties}
            >
              {line}
            </span>
          ))}
        </h1>
        <p className="line-in max-w-[38ch] text-lg leading-relaxed text-muted" style={{ "--i": 4 } as React.CSSProperties}>
          {profile.intro}
        </p>
        <div className="line-in flex flex-wrap gap-3" style={{ "--i": 5 } as React.CSSProperties}>
          <Link href="/#proiecte" className="btn btn-primary">
            Vezi proiectele <span className="arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/#despre" className="btn">
            Despre mine
          </Link>
        </div>
      </div>
      <HeroPolyhedron className="mx-auto aspect-square w-[78%] max-w-[520px] md:w-full" />
    </section>
  );
}
