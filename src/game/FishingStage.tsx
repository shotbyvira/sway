export type WaterPull = "idle" | "tight" | "bolt" | "miss";

const ANGLES = [12, 58, 104, 156, 208, 254, 312];
const TINTS = [
  "var(--color-tide, #4de3ff)",
  "var(--color-amber, #ff5d8f)",
  "var(--color-gold, #ffd166)",
  "var(--color-fg, #e8f1ff)",
  "var(--color-warn, #ff9f43)",
  "var(--color-schooler, #7deaff)",
  "var(--color-deep, #bfa7ff)",
];
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
    <figure className={"px-panel overflow-hidden " + (pull === "bolt" ? "stage-shake" : "")}>
      <div className="stage-frame">
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
              fill="var(--color-tide)"
              style={{ animationDelay: `${index * 0.55}s`, animationDuration: `${3.4 + (index % 4) * 0.45}s` }}
            />
          ))}
          <rect x="10" y="64" width="52" height="78" fill="#123048" stroke="#4de3ff" strokeWidth="2" />
          <text x="36" y="108" textAnchor="middle" fill="var(--color-muted)" fontSize="11" fontFamily="VT323, monospace">
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
                    scale={2}
                    tint={TINTS[index % TINTS.length]!}
                    delay={index % 2 === 0 ? -1.1 : -0.45}
                    duration={index % 3 === 0 ? 2.9 : 2.6}
                    face={face}
                    fast={pull === "tight"}
                  />
                );
              })}
              <Puffer x={0} y={0} puff={clampedNet} face={face} fast={pull === "tight"} />
              {secretName ? (
                <text y="42" textAnchor="middle" fill="var(--color-gold)" fontSize="14" fontFamily="VT323, monospace">
                  {secretName}
                </text>
              ) : null}
            </g>
          </g>
        </svg>
      </div>
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
  duration,
  face,
  fast,
}: {
  x: number;
  y: number;
  scale: number;
  tint: string;
  delay: number;
  duration: number;
  face: number;
  fast: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${face * scale} ${scale})`}>
      <g
        className={fast ? "swimmer swimmer-fast" : "swimmer"}
        style={{ animationDelay: `${delay}s`, animationDuration: fast ? undefined : `${duration}s` }}
      >
        <PixelFish tint={tint} />
      </g>
    </g>
  );
}

function PixelFish({ tint }: { tint: string }) {
  const blocks = [
    [-1, -1, 8, 2],
    [0, -2, 6, 1],
    [0, 1, 6, 1],
    [-4, -1, 3, 2],
    [-5, -2, 1, 1],
    [-5, 1, 1, 1],
  ];
  return (
    <g shapeRendering="crispEdges">
      {blocks.map(([bx, by, w, h]) => (
        <rect key={`${bx}-${by}`} x={bx} y={by} width={w} height={h} fill={tint} />
      ))}
      <rect x={5} y={-1} width={1} height={1} fill="#04141c" />
    </g>
  );
}

function Puffer({ x, y, puff, face, fast }: { x: number; y: number; puff: number; face: number; fast: boolean }) {
  const radius = 4 + Math.round(puff * 3);
  const cells: { x: number; y: number }[] = [];
  for (let py = -radius; py <= radius; py++) {
    const half = Math.round(Math.sqrt(Math.max(0, radius * radius - py * py)));
    for (let px = -half; px <= half; px++) cells.push({ x: px, y: py });
  }
  const spike = radius + 2 + Math.round(puff * 3);
  const spikes = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.round(Math.cos(rad) * spike), y: Math.round(Math.sin(rad) * spike * 0.8) };
  });
  const unit = 3;
  const gold = "var(--color-gold, #ffd166)";
  return (
    <g transform={`translate(${x} ${y}) scale(${face} 1)`}>
      <ellipse className="swimmer-glow" cx="0" cy="0" rx={radius * unit + 8} ry={radius * unit * 0.75 + 6} fill={gold} />
      <g className={fast ? "puffer puffer-fast" : "puffer"} shapeRendering="crispEdges">
        {spikes.map((cell) => (
          <rect key={`${cell.x}-${cell.y}`} x={cell.x * unit} y={cell.y * unit} width={unit} height={unit} fill={gold} />
        ))}
        {cells.map((cell) => (
          <rect key={`${cell.x}:${cell.y}`} x={cell.x * unit} y={cell.y * unit} width={unit} height={unit} fill={gold} />
        ))}
        <rect x={Math.round(radius * 0.35) * unit} y={-unit} width={unit} height={unit} fill="#04141c" />
      </g>
    </g>
  );
}
