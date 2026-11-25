import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x flex flex-col items-start gap-6 py-32">
      <p className="eyebrow">404</p>
      <h1 className="text-4xl font-medium tracking-[-0.03em]">Pagina nu există.</h1>
      <Link href="/" className="btn btn-primary">
        Înapoi la proiecte <span className="arrow" aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
