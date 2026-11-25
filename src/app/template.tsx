// Se re-montează la fiecare navigare: dă tranziția scurtă fade + slide între pagini.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
