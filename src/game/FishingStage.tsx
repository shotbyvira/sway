export type WaterPull = "idle" | "tight" | "bolt" | "miss";

const ANGLES = [12, 58, 104, 156, 208, 254, 312];

export function pullCaption(pull: WaterPull): string {
  if (pull === "tight") return "The net closed in.";
  if (pull === "bolt") return "The school shot away.";
  if (pull === "miss") return "That cast barely moved the water.";
  return "The net is still in the air.";
}

function netWord(net: number): string {
  if (net < 0.4) return "small net";
  if (net < 0.72) return "wider net";
  return "net on the school";
}

function spreadWord(spread: number): string {
  if (spread < 0.36) return "tight school";
  if (spread < 0.55) return "loose school";
  return "scattered school";
}

export function FishingStage({
  net,
  spread,
  pull,
  secretName,
}: {
  net: number;
  spread: number;
  pull: WaterPull;
  secretName?: string | null;
}) {
  const clampedNet = Math.max(0, Math.min(1, net));
  const clampedSpread = Math.max(0, Math.min(1, spread));
  const shift = pull === "bolt" ? 26 : pull === "tight" ? -22 : 0;
  const schoolX = 246 + shift;
  const schoolY = 118;
  const radius = 8 + clampedSpread * 78;
  const netX = 86 + clampedNet * 28;
  const netRx = 28 + clampedNet * 42;
  const netRy = 16 + clampedNet * 20;
  const caption = pullCaption(pull);

  return (
    <figure className="px-panel overflow-hidden">
      <svg viewBox="0 0 360 210" className="fish-stage block w-full" role="img" aria-label={`${caption} ${netWord(clampedNet)}. ${spreadWord(clampedSpread)}.`}>
        <rect width="360" height="210" fill="#071422" />
        <path d="M0 78 C 80 70, 140 90, 220 76 C 280 66, 320 84, 360 74 L 360 210 L 0 210 Z" fill="#0c3048" />
        <path d="M0 108 C 90 98, 160 120, 250 108 C 300 100, 330 114, 360 106" fill="none" stroke="#1b4e68" strokeWidth="2" />
        <rect x="10" y="64" width="52" height="78" fill="#123048" stroke="#4de3ff" strokeWidth="2" />
        <text x="36" y="108" textAnchor="middle" fill="#7d93b8" fontSize="11" fontFamily="VT323, monospace">
          trailer
        </text>
        <g className="fish-drift" style={{ transform: `translate(${netX}px, 128px)` }}>
          <ellipse
            cx="0"
            cy="0"
            rx={netRx}
            ry={netRy}
            fill="rgba(77,227,255,0.08)"
            stroke="#4de3ff"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        </g>
        <g className="fish-drift" style={{ transform: `translate(${schoolX}px, ${schoolY}px)` }}>
          {ANGLES.map((angle, index) => {
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius * 0.62;
            return <Fish key={angle} x={x} y={y} scale={0.72} tint={index % 2 === 0 ? "#7d93b8" : "#4de3ff"} />;
          })}
          <Fish x={0} y={0} scale={1.35} tint="#f0c14a" />
          {secretName ? (
            <text y="28" textAnchor="middle" fill="#f0c14a" fontSize="14" fontFamily="VT323, monospace">
              {secretName}
            </text>
          ) : null}
        </g>
      </svg>
      <figcaption className="flex items-baseline justify-between gap-3 border-t border-line px-3 py-2 text-sm text-muted">
        <span>{caption}</span>
        <span className="shrink-0 text-fg">
          {netWord(clampedNet)} · {spreadWord(clampedSpread)}
        </span>
      </figcaption>
    </figure>
  );
}

function Fish({ x, y, scale, tint }: { x: number; y: number; scale: number; tint: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="2" cy="0" rx="14" ry="6" fill={tint} />
      <polygon points="-12,0 -22,-6 -22,6" fill={tint} />
      <circle cx="8" cy="-1" r="1.2" fill="#04141c" />
    </g>
  );
}
