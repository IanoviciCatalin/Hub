export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div data-reveal className="flex max-w-[60ch] flex-col gap-3">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl font-medium tracking-[-0.03em] md:text-[2.6rem] md:leading-[1.08]">{title}</h2>
      {children && <p className="leading-relaxed text-muted">{children}</p>}
    </div>
  );
}
