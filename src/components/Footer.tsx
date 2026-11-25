import { profile } from "@/content/profile";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-x flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted">
        <span className="font-mono">
          © {new Date().getFullYear()} {profile.name}
        </span>
        <ul className="flex gap-5">
          {profile.links.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-fg transition-colors">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
