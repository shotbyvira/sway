export type WaterPull = "idle" | "tight" | "bolt" | "miss";

const ANGLES = [12, 58, 104, 156, 208, 254, 312];
const BUBBLES = [18, 70, 124, 168, 214, 262, 310];

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
  const schoolClass = pull === "bolt" ? "school-dart" : pull === "tight" ? "school-haul" : "";
  const face = pull === "bolt" ? 1 : -1;

  return (
    <figure className="px-panel overflow-hidden">
      <svg viewBox="0 0 360 210" className="fish-stage block w-full" role="img" aria-label={`${caption} ${netWord(clampedNet)}. ${spreadWord(clampedSpread)}.`}>
        <rect width="360" height="210" fill="#071422" />
        <g className="water-drift">
          <path d="M0 78 C 80 70, 140 90, 220 76 C 280 66, 320 84, 360 74 L 360 210 L 0 210 Z" fill="#0c3048" />
          <path d="M-40 108 C 50 96, 130 122, 220 106 C 290 94, 340 116, 400 104" fill="none" stroke="#1b4e68" strokeWidth="2" />
          <path d="M-40 146 C 70 136, 150 160, 240 146 C 310 136, 350 156, 400 146" fill="none" stroke="#14384c" strokeWidth="2" />
        </g>
        {BUBBLES.map((x, index) => (
          <circle
            key={x}
            className="bubble"
            cx={x}
            cy={176 - (index % 3) * 8}
            r={1.4 + (index % 3) * 0.7}
            fill="#4de3ff"
            style={{ animationDelay: `${index * 0.55}s`, animationDuration: `${3.4 + (index % 4) * 0.45}s` }}
          />
        ))}
        <rect x="10" y="64" width="52" height="78" fill="#123048" stroke="#4de3ff" strokeWidth="2" />
        <text x="36" y="108" textAnchor="middle" fill="#7d93b8" fontSize="11" fontFamily="VT323, monospace">
          trailer
        </text>
        <g className="fish-drift" style={{ transform: `translate(${netX}px, 128px)` }}>
          <ellipse className="net-mesh" cx="0" cy="0" rx={netRx} ry={netRy} />
          <ellipse className="net-mesh net-mesh-inner" cx="0" cy="0" rx={netRx * 0.62} ry={netRy * 0.62} />
        </g>
        <g className="fish-drift" style={{ transform: `translate(${schoolX}px, ${schoolY}px)` }}>
          <g className={schoolClass} key={`${pull}-${Math.round(clampedNet * 100)}`}>
            {ANGLES.map((angle, index) => {
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius * 0.62;
              return (
                <Swimmer
                  key={angle}
                  x={x}
                  y={y}
                  scale={0.72}
                  tint={index % 2 === 0 ? "#7d93b8" : "#4de3ff"}
                  delay={index * 0.17}
                  face={face}
                />
              );
            })}
            <Swimmer x={0} y={0} scale={1.35} tint="#f0c14a" delay={0.05} face={face} big />
            {secretName ? (
              <text y="34" textAnchor="middle" fill="#f0c14a" fontSize="14" fontFamily="VT323, monospace">
                {secretName}
              </text>
            ) : null}
          </g>
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

function Swimmer({
  x,
  y,
  scale,
  tint,
  delay,
  face,
  big = false,
}: {
  x: number;
  y: number;
  scale: number;
  tint: string;
  delay: number;
  face: number;
  big?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${face * scale} ${scale})`}>
      <g className={big ? "swimmer swimmer-big" : "swimmer"} style={{ animationDelay: `${delay}s` }}>
        {big ? <ellipse className="swimmer-glow" cx="2" cy="0" rx="24" ry="12" fill={tint} /> : null}
        <g className="tail" style={{ animationDelay: `${delay * 0.6}s` }}>
          <polygon points="-12,0 -23,-7 -18,0 -23,7" fill={tint} />
        </g>
        <ellipse cx="3" cy="0" rx={big ? 16 : 13} ry={big ? 7 : 5.5} fill={tint} />
        <circle cx="10" cy="-1.5" r={big ? 1.6 : 1.2} fill="#04141c" />
      </g>
    </g>
  );
}
