// Schema fluxului de date pentru proiectul de import: fisiere Excel → importator → PostgreSQL → rapoarte.
// Punctele care circula pe linii sunt animate din CSS si se opresc la prefers-reduced-motion.
const sources = ["CAF", "CB", "Cottura", "Presso", "LAV", "RD"];

export function PipelineIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} role="img" aria-label="Fluxul de date: rapoarte Excel, importator C#, PostgreSQL, view-uri de raportare">
      <style>{`
        .flow{stroke-dasharray:3 9;animation:flow 1.6s linear infinite}
        @keyframes flow{to{stroke-dashoffset:-24}}
        @media (prefers-reduced-motion:reduce){.flow{animation:none}}
      `}</style>
      {/* surse: foldere cu rapoarte Excel */}
      {sources.map((s, i) => {
        const y = 52 + i * 40;
        return (
          <g key={s}>
            <rect x="16" y={y - 14} width="84" height="28" rx="6" fill="#101318" stroke="#2a2f37" />
            <text x="28" y={y + 4} fontFamily="var(--font-mono), monospace" fontSize="10" fill="#8a919c">
              {s}.xlsx
            </text>
            <path d={`M100 ${y} C 135 ${y}, 135 160, 168 160`} fill="none" stroke="#2c4a73" />
            <path className="flow" d={`M100 ${y} C 135 ${y}, 135 160, 168 160`} fill="none" stroke="#8ab4ff" strokeWidth="1.5" style={{ animationDelay: `${i * -0.27}s` }} />
          </g>
        );
      })}
      {/* importator */}
      <rect x="168" y="128" width="78" height="64" rx="10" fill="#101a28" stroke="#8ab4ff" strokeOpacity=".6" />
      <text x="207" y="156" textAnchor="middle" fontFamily="var(--font-sans), sans-serif" fontSize="12" fill="#e6e8ec">Importator</text>
      <text x="207" y="174" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="9" fill="#8a919c">C# · MD5</text>
      <path d="M246 160 L 282 160" stroke="#2c4a73" />
      <path className="flow" d="M246 160 L 282 160" stroke="#8ab4ff" strokeWidth="1.5" fill="none" />
      {/* baza de date */}
      <g transform="translate(282 124)">
        <ellipse cx="40" cy="8" rx="40" ry="8" fill="#151920" stroke="#8ab4ff" strokeOpacity=".5" />
        <path d="M0 8 V 64 A 40 8 0 0 0 80 64 V 8" fill="#151920" stroke="#8ab4ff" strokeOpacity=".5" />
        <path d="M0 26 A 40 8 0 0 0 80 26 M0 44 A 40 8 0 0 0 80 44" fill="none" stroke="#2a2f37" />
        <text x="40" y="92" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="10" fill="#8a919c">PostgreSQL</text>
      </g>
      {/* rapoarte */}
      <path d="M322 210 L 322 236" stroke="#2c4a73" />
      <g transform="translate(272 240)">
        <rect width="104" height="60" rx="8" fill="#101318" stroke="#2a2f37" />
        {[18, 30, 22, 40, 34].map((h, i) => (
          <rect key={i} x={14 + i * 16} y={48 - h} width="9" height={h} rx="2" fill={i === 3 ? "#8ab4ff" : "#2c4a73"} />
        ))}
      </g>
      <text x="222" y="274" textAnchor="end" fontFamily="var(--font-mono), monospace" fontSize="9" fill="#8a919c">view-uri SQL</text>
    </svg>
  );
}
