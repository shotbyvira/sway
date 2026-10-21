import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { REVEAL_MS } from "./rules";

export type WaterPull = "idle" | "tight" | "bolt" | "miss" | "skip";

export type SeaView = {
  depth: "surface" | "dive";
  net: number;
  spread: number;
  pull: WaterPull;
  secretName?: string | null;
  finale: "haul" | "slip" | null;
  finaleT: number | null;
  paused: boolean;
  beat: number;
  revealDeadline?: number | null;
  revealHold?: number | null;
  clockSkew?: number;
};

const SURFACE: SeaView = {
  depth: "surface",
  net: 0.28,
  spread: 0.62,
  pull: "idle",
  secretName: null,
  finale: null,
  finaleT: null,
  paused: false,
  beat: 0,
  revealDeadline: null,
  revealHold: null,
  clockSkew: 0,
};

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
  const { depth, net, spread, pull, secretName, finale, finaleT, paused, beat, revealDeadline, revealHold, clockSkew } = view;
  useEffect(() => {
    setView({
      depth,
      net,
      spread,
      pull,
      secretName: secretName ?? null,
      finale,
      finaleT,
      paused,
      beat,
      revealDeadline: revealDeadline ?? null,
      revealHold: revealHold ?? null,
      clockSkew: clockSkew ?? 0,
    });
  }, [setView, depth, net, spread, pull, secretName, finale, finaleT, paused, beat, revealDeadline, revealHold, clockSkew]);
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
    angle: ((i * 47) % 36) * (Math.PI / 18),
    speed: 1.15 + (i % 5) * 0.22,
    phase: i * 0.65,
  };
});

export function pullCaption(pull: WaterPull): string {
  if (pull === "tight") return "The net closed in.";
  if (pull === "bolt") return "The school shot away.";
  if (pull === "miss") return "That cast barely moved the water.";
  if (pull === "skip") return "Nobody tapped. The line stayed in the boat.";
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
  const rootRef = useRef<SVGSVGElement>(null);
  const posed = useMotion(view, rootRef);
  const scene = layoutSea(view, posed);

  return (
    <div className="sea-viewport" aria-hidden="true">
      <svg ref={rootRef} viewBox="0 0 1600 900" className="sea-svg" preserveAspectRatio="xMidYMid slice">
        <g data-sea="camera" transform={scene.camera}>
          <rect x="-200" y="-400" width="2000" height="520" fill="#123a5c" />
          <rect x="-200" y="80" width="2000" height="180" fill="#1d6fa3" />
          <rect x="-200" y="220" width="2000" height="160" fill="#7ec8e8" />
          <ellipse cx="800" cy="300" rx="420" ry="48" fill="#fff4cc" opacity="0.45" />
          <path d="M-200 360 C 180 332, 460 392, 800 348 C 1120 308, 1360 388, 1800 344 L 1800 1500 L -200 1500 Z" fill="#1a9fd0" />
          <path d="M-200 430 C 200 400, 520 470, 860 424 C 1180 384, 1420 460, 1800 418 L 1800 1500 L -200 1500 Z" fill="#127eae" />
          <path d="M-200 640 C 240 600, 620 690, 980 630 C 1280 580, 1500 700, 1800 640 L 1800 1500 L -200 1500 Z" fill="#0c5e86" />
          <g className="surface-ripple">
            <path d={ripple(348, 3.2, 28)} fill="none" stroke="#f4fbff" strokeWidth="2.4" opacity="0.9" />
            <path d={ripple(356, 2.2, 18)} fill="none" stroke="#b7e7f8" strokeWidth="1.6" opacity="0.8" />
            <path d={ripple(366, 4, 36)} fill="none" stroke="#e9f8ff" strokeWidth="1.2" opacity="0.55" />
          </g>
          <path className="sea-wave" d="M-200 400 C 160 378, 420 428, 760 392 C 1100 358, 1340 430, 1800 388" fill="none" stroke="#d7f3ff" strokeWidth="1.5" opacity="0.45" />
          <g data-sea="boat" transform={scene.boat}>
            <Trailer />
          </g>
          {scene.ropes.map((rope) => (
            <line
              key={rope.side}
              data-sea="rope"
              data-side={rope.side}
              x1={rope.x1}
              y1="362"
              x2={rope.x2}
              y2={rope.y2}
              stroke="#f4fbff"
              strokeWidth="2"
              opacity="0.85"
            />
          ))}
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
          <g data-sea="web" transform={scene.web}>
            <LiquidWeb span={220} />
          </g>
          <g data-sea="school" transform={scene.school}>
            {scene.fish.map((fish) => (
              <Swimmer
                key={fish.index}
                x={fish.x}
                y={fish.y}
                scale={fish.scale}
                tint={fish.tint}
                delay={fish.delay}
                duration={fish.duration}
                face={fish.face}
                fast={fish.fast}
                index={fish.index}
              />
            ))}
          </g>
          <g data-sea="puffer" transform={scene.puffer}>
            <Puffer x={0} y={0} puff={0.62} face={1} fast={view.finale === "haul"} />
            {view.secretName ? (
              <text y="58" textAnchor="middle" fill="#ffd166" fontSize="22" fontFamily="VT323, monospace">
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

type Pose = {
  y: number;
  s: number;
  net: number;
  spread: number;
  cruise: number;
  clock: number;
  finaleT: number;
  surge: number;
  kind: WaterPull;
};

function layoutSea(view: SeaView, posed: Pose) {
  const net = clamp(posed.net);
  const spread = clamp(posed.spread);
  const playSchool = 720 - net * 50;
  const playWeb = 500 + net * 190;
  const playSpan = 46 + net * 340;
  const fan = spread * 260;
  const surge = view.finale ? 0 : posed.surge;
  const kind = posed.kind;
  const u = smooth(posed.finaleT);
  let schoolY = playSchool + (kind === "bolt" ? surge * 130 : kind === "miss" ? surge * 16 : 0);
  let webY = playWeb + (kind === "tight" ? surge * 96 : kind === "bolt" ? surge * -28 : kind === "miss" ? surge * 14 : 0);
  let span = playSpan + (kind === "tight" ? surge * 50 : 0);
  let reach = fan + (kind === "bolt" ? surge * 160 : 0);
  let pufferY = schoolY - net * 24 - (kind === "tight" ? surge * 56 : 0) + (kind === "bolt" ? surge * 40 : 0);
  if (view.finale === "haul") {
    const close = Math.min(1, u / 0.32);
    const rise = smooth(Math.max(0, (u - 0.28) / 0.72));
    webY = lerp(lerp(playWeb, playSchool - 8, close), 392, rise);
    span = lerp(playSpan, 110, rise);
    pufferY = lerp(playSchool, webY + 26, Math.max(close, rise));
    reach = lerp(fan, 780, u);
    schoolY = playSchool + u * 36;
  } else if (view.finale === "slip") {
    const through = smooth(Math.min(1, u / 0.5));
    const away = smooth(Math.max(0, (u - 0.32) / 0.68));
    webY = lerp(lerp(playWeb, playSchool + 36, through), 1040, away);
    span = lerp(playSpan, playSpan + 90, through);
    schoolY = playSchool + away * 40;
    pufferY = schoolY;
    reach = lerp(fan, 840, away);
  }
  const fish = KRILL.map((spec, index) => {
    const ax = Math.cos(spec.angle);
    const ay = Math.sin(spec.angle);
    const homeX = (spec.col / 11 - 0.5) * (120 + spread * 70);
    const homeY = (spec.row - 1) * 18 + spec.jy;
    const swim = Math.sin(posed.clock * spec.speed + spec.phase) * (8 + surge * 10);
    const x = homeX + ax * reach + ax * swim;
    const y = homeY + ay * reach * 0.35 + Math.cos(posed.clock * spec.speed * 0.8 + spec.phase) * 5;
    return {
      index,
      x,
      y,
      scale: spec.scale,
      tint: spec.tint,
      delay: spec.delay,
      duration: spec.duration,
      face: ax * reach + swim >= 0 ? 1 : -1,
      fast: kind === "bolt" && surge > 0.2,
    };
  });
  const puff = view.finale === "haul" ? lerp(net, 1, u) : net;
  return {
    camera: `translate(800 ${px(360 + posed.y)}) scale(${posed.s.toFixed(3)}) translate(-800 -360)`,
    boat: `translate(${px(800 + posed.cruise)} 348)`,
    ropes: [-1, 0, 1].map((side) => ({
      side,
      x1: px(800 + posed.cruise + side * 132),
      x2: px(800 + side * span),
      y2: px(webY),
    })),
    web: `translate(800 ${px(webY)}) scale(${px(span / 220)} 1)`,
    school: `translate(800 ${px(schoolY)})`,
    fish,
    puffer: `translate(800 ${px(pufferY)}) scale(${px(0.72 + puff)})`,
  };
}

function paintSea(root: SVGSVGElement | null, view: SeaView, pose: Pose) {
  if (!root) return;
  const scene = layoutSea(view, pose);
  root.querySelector<SVGGElement>('[data-sea="camera"]')?.setAttribute("transform", scene.camera);
  root.querySelector<SVGGElement>('[data-sea="boat"]')?.setAttribute("transform", scene.boat);
  root.querySelector<SVGGElement>('[data-sea="web"]')?.setAttribute("transform", scene.web);
  root.querySelector<SVGGElement>('[data-sea="school"]')?.setAttribute("transform", scene.school);
  root.querySelector<SVGGElement>('[data-sea="puffer"]')?.setAttribute("transform", scene.puffer);
  for (const rope of scene.ropes) {
    const line = root.querySelector<SVGLineElement>(`[data-sea="rope"][data-side="${rope.side}"]`);
    if (!line) continue;
    line.setAttribute("x1", rope.x1);
    line.setAttribute("x2", rope.x2);
    line.setAttribute("y2", rope.y2);
  }
  for (const fish of scene.fish) {
    const node = root.querySelector<SVGGElement>(`[data-sea="fish"][data-i="${fish.index}"]`);
    if (!node) continue;
    node.setAttribute("transform", `translate(${px(fish.x)} ${px(fish.y)}) scale(${px(fish.face * fish.scale)} ${px(fish.scale)})`);
    const body = node.querySelector(".swimmer, .swimmer-fast");
    if (body) body.setAttribute("class", fish.fast ? "swimmer swimmer-fast" : "swimmer");
  }
}

function useMotion(view: SeaView, rootRef: RefObject<SVGSVGElement | null>) {
  const target = {
    y: view.depth === "dive" ? -300 : 170,
    s: view.depth === "dive" ? 1.08 : 0.92,
    net: view.net,
    spread: view.spread,
  };
  const [pose, setPose] = useState<Pose>({ ...target, cruise: 0, clock: 0, finaleT: 0, surge: 0, kind: "idle" });
  const poseRef = useRef(pose);
  const finaleRef = useRef(0);
  const askedT = useRef(view.finaleT);
  const askedPause = useRef(view.paused);
  const askedFinale = useRef(view.finale);
  const askedPull = useRef(view.pull);
  const askedBeat = useRef(view.beat);
  const askedDepth = useRef(view.depth);
  const deadlineRef = useRef(view.revealDeadline ?? null);
  const holdRef = useRef(view.revealHold ?? null);
  const skewRef = useRef(view.clockSkew ?? 0);
  const lastBeat = useRef(view.beat);
  const surgeRef = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;
  askedT.current = view.finaleT;
  askedPause.current = view.paused;
  askedFinale.current = view.finale;
  askedPull.current = view.pull;
  askedBeat.current = view.beat;
  askedDepth.current = view.depth;
  deadlineRef.current = view.revealDeadline ?? null;
  holdRef.current = view.revealHold ?? null;
  skewRef.current = view.clockSkew ?? 0;
  useLayoutEffect(() => {
    paintSea(rootRef.current, viewRef.current, poseRef.current);
  });
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!view.finale) finaleRef.current = 0;
    let frame = 0;
    let last = performance.now();
    let stopped = false;
    const step = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cur = poseRef.current;
      if (holdRef.current != null && askedFinale.current) finaleRef.current = 1 - holdRef.current / REVEAL_MS;
      else if (deadlineRef.current != null && askedFinale.current) {
        const remain = Math.max(0, deadlineRef.current - (Date.now() + skewRef.current));
        finaleRef.current = 1 - remain / REVEAL_MS;
      } else if (askedT.current != null) finaleRef.current = askedT.current;
      else if (askedFinale.current && !askedPause.current && !reduce) finaleRef.current = Math.min(1, finaleRef.current + dt / 10);
      if (!askedFinale.current) finaleRef.current = 0;
      if (askedBeat.current !== lastBeat.current) {
        lastBeat.current = askedBeat.current;
        if (askedPull.current === "tight" || askedPull.current === "bolt" || askedPull.current === "miss") surgeRef.current = 1;
      }
      surgeRef.current *= Math.exp(-dt * 1.7);
      const clock = reduce || askedPause.current ? cur.clock : cur.clock + dt;
      const next: Pose = {
        y: approach(cur.y, target.y),
        s: approach(cur.s, target.s),
        net: approach(cur.net, target.net),
        spread: approach(cur.spread, target.spread),
        cruise: Math.sin(clock * 0.42) * (askedDepth.current === "dive" ? 64 : 220),
        clock,
        finaleT: reduce && askedFinale.current ? 1 : finaleRef.current,
        surge: reduce ? 0 : surgeRef.current,
        kind: askedPull.current,
      };
      poseRef.current = next;
      paintSea(rootRef.current, viewRef.current, next);
      const calm =
        Math.abs(next.y - target.y) < 0.5 &&
        Math.abs(next.s - target.s) < 0.002 &&
        Math.abs(next.net - target.net) < 0.004 &&
        Math.abs(next.spread - target.spread) < 0.004 &&
        next.surge < 0.02;
      const finaleRunning = Boolean(askedFinale.current) && !askedPause.current && finaleRef.current < 0.999;
      const idle = askedDepth.current !== "dive" && calm && !finaleRunning;
      if (reduce || document.hidden || idle) {
        setPose(next);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    const onVisible = () => {
      if (!document.hidden && !stopped) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    frame = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Cruise, the haul, and the school are painted on the nodes. React only commits when the shot changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.y, target.s, target.net, target.spread, view.finale, view.depth]);
  return pose;
}

function approach(from: number, to: number) {
  const next = from + (to - from) * 0.1;
  return Math.abs(next - to) < 0.35 ? to : next;
}

function px(n: number) {
  return n.toFixed(2);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function ripple(y: number, amp: number, length: number) {
  let d = "";
  for (let x = -240; x <= 1860; x += 12) {
    const yy = y + Math.sin(x / length) * amp;
    d += `${x === -240 ? "M" : "L"}${x} ${yy.toFixed(1)} `;
  }
  return d;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smooth(t: number) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

function Trailer() {
  return (
    <g transform="scale(1.65)" shapeRendering="crispEdges">
        <ellipse cx="0" cy="10" rx="78" ry="8" fill="#083044" opacity="0.28" />
        <rect x={-92} y={-6} width={184} height={14} fill="#0e3a56" />
        <rect x={-70} y={4} width={140} height={6} fill="#08283c" />
        <rect x={-78} y={-10} width={22} height={8} fill="#14506e" />
        <rect x={56} y={-10} width={22} height={8} fill="#14506e" />
        <rect x={-34} y={-58} width={68} height={52} fill="#14324a" stroke="#e8f7ff" strokeWidth={2} />
        <rect x={-22} y={-44} width={16} height={12} fill="#4de3ff" />
        <rect x={2} y={-44} width={16} height={12} fill="#ff5d8f" />
        <rect x={-4} y={-86} width={4} height={28} fill="#e8f1ff" />
      </g>
  );
}

function LiquidWeb({ span }: { span: number }) {
  const rows = [0, 22, 44, 66, 88];
  const cols = 11;
  return (
    <g>
      {rows.map((y, index) => (
        <path key={y} className="web-line" d={wave(-span, span, y, 7, index * 0.9)} fill="none" stroke="#f4fbff" strokeWidth="2.2" opacity={0.95 - index * 0.1} />
      ))}
      {Array.from({ length: cols }, (_, index) => {
        const x = -span + (index * (span * 2)) / (cols - 1);
        return <path key={index} className="web-line web-line-down" d={drop(x, index)} fill="none" stroke="#d7f3ff" strokeWidth="1.6" opacity="0.7" />;
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
  index,
}: {
  x: number;
  y: number;
  scale: number;
  tint: string;
  delay: number;
  duration: number;
  face: number;
  fast: boolean;
  index: number;
}) {
  return (
    <g data-sea="fish" data-i={index} transform={`translate(${px(x)} ${px(y)}) scale(${px(face * scale)} ${px(scale)})`}>
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
    <g transform={`translate(${px(x)} ${px(y)}) scale(${face} 1)`}>
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
