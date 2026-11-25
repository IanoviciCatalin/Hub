import Link from "next/link";
import { profile } from "@/content/profile";

const items = [
  { href: "/#proiecte", label: "Proiecte" },
  { href: "/#categorii", label: "Categorii" },
  { href: "/#despre", label: "Despre" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header
      className="sticky z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <nav className="container-x flex h-14 items-center justify-between gap-6" aria-label="Principal">
        <Link href="/" className="font-mono text-sm text-fg hover:text-accent transition-colors">
          {profile.siteName}
        </Link>
        <ul className="flex items-center gap-5 text-sm text-muted sm:gap-7">
          {items.map((i, idx) => (
            <li key={i.href} className={idx === 1 ? "hidden sm:block" : undefined}>
              <Link href={i.href} className="transition-colors hover:text-fg">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
