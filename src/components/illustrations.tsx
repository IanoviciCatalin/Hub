// Ilustratii SVG statice: se vad imediat, inainte sa se incarce 3D-ul,
// si raman singura varianta cand WebGL lipseste.

export function HouseIllustration({ lit = {}, className = "" }: { lit?: Record<string, boolean>; className?: string }) {
  const w = (id: string) => (lit[id] ? "#ffd27a" : "#0b0d10");
  return (
    <svg viewBox="0 0 400 320" className={className} aria-hidden="true">
      <ellipse cx="200" cy="282" rx="150" ry="26" fill="#0e1116" />
      {/* acoperis */}
      <polygon points="92,120 200,62 312,108 204,166" fill="#2a2f37" stroke="#8ab4ff" strokeOpacity=".4" />
      {/* fatada */}
      <polygon points="92,120 204,166 204,276 92,230" fill="#1b2028" stroke="#8ab4ff" strokeOpacity=".3" />
      <polygon points="204,166 312,108 312,218 204,276" fill="#151920" stroke="#8ab4ff" strokeOpacity=".3" />
      <line x1="92" y1="175" x2="204" y2="221" stroke="#8ab4ff" strokeOpacity=".3" />
      <line x1="148" y1="143" x2="148" y2="253" stroke="#8ab4ff" strokeOpacity=".3" />
      {/* ferestre: dormitor, birou (sus), living, bucatarie (jos) */}
      <polygon points="108,140 132,150 132,168 108,158" fill={w("dormitor")} />
      <polygon points="164,163 188,173 188,191 164,181" fill={w("birou")} />
      <polygon points="108,195 132,205 132,223 108,213" fill={w("living")} />
      <polygon points="164,218 188,228 188,246 164,236" fill={w("bucatarie")} />
    </svg>
  );
}

export function BoardIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} aria-hidden="true">
      <polygon points="60,170 220,100 350,160 190,230" fill="#141a22" stroke="#8ab4ff" strokeOpacity=".4" />
      <polygon points="60,170 190,230 190,240 60,180" fill="#0e1116" />
      <polygon points="190,230 350,160 350,170 190,240" fill="#0b0d10" />
      <polygon points="160,152 205,132 250,152 205,172" fill="#0b0d10" stroke="#8ab4ff" strokeOpacity=".55" />
      <g stroke="#8ab4ff" strokeOpacity=".35" strokeWidth="1.5" fill="none">
        <polyline points="190,165 160,185 130,198" />
        <polyline points="200,168 180,195 160,210" />
        <polyline points="215,168 205,200 190,214" />
      </g>
      <g fill="#8a919c">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={110 + i * 20} y={192 + i * 9 - 14} width="3" height="14" />
        ))}
      </g>
    </svg>
  );
}
