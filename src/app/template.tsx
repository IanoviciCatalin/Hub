// Se re-monteaza la fiecare navigare: da tranzitia scurta fade + slide intre pagini.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
