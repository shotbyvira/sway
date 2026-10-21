import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type WaterPull = "idle" | "tight" | "bolt" | "miss";

export type SeaView = {
  depth: "surface" | "dive";
  net: number;
  spread: number;
  pull: WaterPull;
  secretName?: string | null;
};

const SURFACE: SeaView = { depth: "surface", net: 0.28, spread: 0.62, pull: "idle", secretName: null };

const SeaCtx = createContext<(next: SeaView) => void>(() => {});

export function SeaProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<SeaView>(SURFACE);
  return (
    <SeaCtx.Provider value={setView}>
      <SeaWorld view={view} />
      {children}
    </SeaCtx.Provider>
  );
}

export function useSea(view: SeaView) {
  const setView = useContext(SeaCtx);
  const { depth, net, spread, pull, secretName } = view;
  useEffect(() => {
    setView({ depth, net, spread, pull, secretName: secretName ?? null });
  }, [setView, depth, net, spread, pull, secretName]);
  useEffect(() => {
    return () => setView(SURFACE);
  }, [setView]);
}

const TINTS = ["#4de3ff", "#ff5d8f", "#ffd166", "#e8f1ff", "#ff9f43", "#7deaff", "#bfa7ff"];

const KRILL = Array.from({ length: 36 }, (_, i) => {
  const col = i % 12;
  const row = Math.floor(i / 12);
  return {
    col,
    row,
    jx: ((i * 37) % 17) - 8,
    jy: ((i * 19) % 11) - 5,
    tint: TINTS[i % TINTS.length]!,
    delay: -((i * 0.37) % 2.4),
    duration: i % 3 === 0 ? 2.9 : 2.6,
    scale: 1.35 + (i % 4) * 0.28,
  };
});

export function pullCaption(pull: WaterPull): string {
  if (pull === "tight") return "The net closed in.";
  if (pull === "bolt") return "The school shot away.";
  if (pull === "miss") return "That cast barely moved the water.";
  return "The net is still in the air.";
}

export function netWord(net: number): string {
  if (net < 0.4) return "small net";
  if (net < 0.72) return "wider net";
  return "net on the school";
}

export function spreadWord(spread: number): string {
  if (spread < 0.36) return "tight school";
  if (spread < 0.55) return "loose school";
  return "scattered school";
}

function SeaWorld({ view }: { view: SeaView }) {
  const posed = usePose(view);
  const net = clamp(posed.net);
  const spread = clamp(posed.spread);
  const schoolY = 900 + posed.schoolShift;
  const webY = 700 + net * 180 + posed.webExtra;
  const reach = 90 + spread * 560;
  const span = 80 + net * 500;
  const face = view.pull === "bolt" ? 1 : -1;

  return (
    <div className={"sea-viewport " + (view.pull === "bolt" ? "stage-shake" : "")} aria-hidden="true">
      <svg viewBox="0 0 1600 900" className="sea-svg" preserveAspectRatio="xMidYMid slice">
        <g transform={`translate(800 ${360 + posed.y}) scale(${posed.s}) translate(-800 -360)`}>
          <rect x="-200" y="-200" width="2000" height="520" fill="#050a14" />
          <rect x="-200" y="300" width="2000" height="140" fill="#0b1c33" />
          <path d="M-200 390 C 180 348, 460 430, 800 372 C 1120 318, 1360 410, 1800 360 L 1800 1500 L -200 1500 Z" fill="#08283c" />
          <path d="M-200 470 C 200 430, 520 510, 860 456 C 1180 408, 1420 500, 1800 448 L 1800 1500 L -200 1500 Z" fill="#061e30" />
          <path d="M-200 760 C 240 720, 620 800, 980 740 C 1280 690, 1500 780, 1800 730 L 1800 1500 L -200 1500 Z" fill="#050f1c" />
          <path className="sea-wave" d="M-200 360 C 160 332, 420 392, 760 352 C 1100 312, 1340 384, 1800 340" fill="none" stroke="#4de3ff" strokeWidth="2" opacity="0.55" />
          <path className="sea-wave sea-wave-slow" d="M-200 392 C 220 420, 560 360, 900 404 C 1220 444, 1460 380, 1800 412" fill="none" stroke="#7d93b8" strokeWidth="1.5" opacity="0.35" />
          <g className="trailer-float">
            <Trailer />
          </g>
          {BUBBLES.map((bubble) => (
            <circle
              key={bubble.x}
              className="bubble"
              cx={bubble.x}
              cy={bubble.y}
              r={bubble.r}
              fill="#4de3ff"
              opacity="0.45"
              style={{ animationDelay: `${bubble.delay}s`, animationDuration: `${bubble.dur}s` }}
            />
          ))}
          <g transform={`translate(800 ${webY})`}>
            <LiquidWeb span={span} />
          </g>
          <g transform={`translate(800 ${schoolY})`}>
            {KRILL.map((fish, index) => {
              const x = (fish.col / 11 - 0.5) * reach * 2 + fish.jx;
              const y = (fish.row - 1) * 28 + fish.jy;
              return (
                <Swimmer
                  key={index}
                  x={x}
                  y={y}
                  scale={fish.scale}
                  tint={fish.tint}
                  delay={fish.delay}
                  duration={fish.duration}
                  face={face}
                  fast={view.pull === "tight"}
                />
              );
            })}
            <Puffer x={0} y={0} puff={net} face={face} fast={view.pull === "tight"} />
            {view.secretName ? (
              <text y="78" textAnchor="middle" fill="#ffd166" fontSize="22" fontFamily="VT323, monospace">
                {view.secretName}
              </text>
            ) : null}
          </g>
        </g>
      </svg>
    </div>
  );
}

const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  x: 80 + ((i * 137) % 1440),
  y: 520 + ((i * 89) % 620),
  r: 2 + (i % 3),
  delay: (i % 7) * 0.4,
  dur: 4 + (i % 4) * 0.6,
}));

function usePose(view: SeaView) {
  const target = {
    y: view.depth === "dive" ? -300 : 0,
    s: view.depth === "dive" ? 1.08 : 0.72,
    net: view.net,
    spread: view.spread,
    schoolShift: view.pull === "bolt" ? 78 : view.pull === "miss" ? 20 : 0,
    webExtra: view.pull === "tight" ? 42 : 0,
  };
  const [pose, setPose] = useState(target);
  const poseRef = useRef(target);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      poseRef.current = target;
      setPose(target);
      return;
    }
    let frame = 0;
    const step = () => {
      const cur = poseRef.current;
      const next = {
        y: approach(cur.y, target.y),
        s: approach(cur.s, target.s),
        net: approach(cur.net, target.net),
        spread: approach(cur.spread, target.spread),
        schoolShift: approach(cur.schoolShift, target.schoolShift),
        webExtra: approach(cur.webExtra, target.webExtra),
      };
      poseRef.current = next;
      setPose(next);
      const done = (Object.keys(target) as (keyof typeof target)[]).every((key) => Math.abs(next[key] - target[key]) < 0.4);
      if (!done) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // The latest target is read from this render. Restart when the asked pose changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.y, target.s, target.net, target.spread, target.schoolShift, target.webExtra]);
  return pose;
}

function approach(from: number, to: number) {
  const next = from + (to - from) * 0.08;
  return Math.abs(next - to) < 0.35 ? to : next;
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function Trailer() {
  return (
    <g transform="translate(800 360)" shapeRendering="crispEdges">
      <rect x={-92} y={-6} width={184} height={14} fill="#123048" />
      <rect x={-70} y={4} width={140} height={6} fill="#0b1c33" />
      <rect x={-78} y={-10} width={22} height={8} fill="#1b3050" />
      <rect x={56} y={-10} width={22} height={8} fill="#1b3050" />
      <rect x={-34} y={-58} width={68} height={52} fill="#101d33" stroke="#4de3ff" strokeWidth={2} />
      <rect x={-22} y={-44} width={16} height={12} fill="#4de3ff" />
      <rect x={2} y={-44} width={16} height={12} fill="#ff5d8f" />
      <rect x={-4} y={-86} width={4} height={28} fill="#7d93b8" />
      <text y={32} textAnchor="middle" fill="#7d93b8" fontSize="16" fontFamily="VT323, monospace">
        trailer
      </text>
    </g>
  );
}

function LiquidWeb({ span }: { span: number }) {
  const rows = [0, 22, 44, 66, 88];
  const cols = 11;
  return (
    <g>
      {rows.map((y, index) => (
        <path key={y} className="web-line" d={wave(-span, span, y, 7, index * 0.9)} fill="none" stroke="#4de3ff" strokeWidth="1.7" opacity={0.8 - index * 0.08} />
      ))}
      {Array.from({ length: cols }, (_, index) => {
        const x = -span + (index * (span * 2)) / (cols - 1);
        return <path key={index} className="web-line web-line-down" d={drop(x, index)} fill="none" stroke="#4de3ff" strokeWidth="1.3" opacity="0.45" />;
      })}
    </g>
  );
}

function drop(x: number, phase: number) {
  let d = `M${x.toFixed(1)} 0`;
  for (let i = 1; i <= 8; i++) {
    const y = (i / 8) * 88;
    const xx = x + Math.sin(i * 0.7 + phase) * 6;
    d += ` L${xx.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function wave(x0: number, x1: number, y: number, amp: number, phase: number) {
  const steps = 10;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const yy = y + Math.sin(t * Math.PI * 3 + phase) * amp;
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${yy.toFixed(1)} `;
  }
  return d;
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
  const radius = 4 + Math.round(puff * 2);
  const cells: { x: number; y: number }[] = [];
  for (let py = -radius; py <= radius; py++) {
    const half = Math.round(Math.sqrt(Math.max(0, radius * radius - py * py)));
    for (let px = -half; px <= half; px++) cells.push({ x: px, y: py });
  }
  const spike = radius + 2 + Math.round(puff * 2);
  const spikes = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.round(Math.cos(rad) * spike), y: Math.round(Math.sin(rad) * spike * 0.8) };
  });
  const unit = 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${face} 1)`}>
      <ellipse className="swimmer-glow" cx="0" cy="0" rx={radius * unit + 8} ry={radius * unit * 0.75 + 6} fill="#ffd166" />
      <g className={fast ? "puffer puffer-fast" : "puffer"} shapeRendering="crispEdges">
        {spikes.map((cell) => (
          <rect key={`${cell.x}-${cell.y}`} x={cell.x * unit} y={cell.y * unit} width={unit} height={unit} fill="#ffd166" />
        ))}
        {cells.map((cell) => (
          <rect key={`${cell.x}:${cell.y}`} x={cell.x * unit} y={cell.y * unit} width={unit} height={unit} fill="#ffd166" />
        ))}
        <rect x={Math.round(radius * 0.35) * unit} y={-unit} width={unit} height={unit} fill="#04141c" />
      </g>
    </g>
  );
}
