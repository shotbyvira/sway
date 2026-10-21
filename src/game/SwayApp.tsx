import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Dices, Timer } from "lucide-react";
import {
  applyPrompt,
  emptyMemory,
  findWord,
  initialScores,
  leadingGuess,
  pointsFor,
  randomWord,
  rankOf,
  scoreLabel,
  traitDistance,
  topN,
  wordCount,
  type PromptMemory,
  type RankedWord,
} from "./engine";
import { RoomPlay } from "./RoomPlay";
import { recalledRoom } from "./seat";

type Side = "amber" | "tide";
type Phase = "home" | "room" | "sway" | "drill-reveal";

type LogLine = { text: string; shrug: boolean; resisted: boolean; rank: number };

type HalfResult = {
  setter: Side;
  swayer: Side;
  secretId: string;
  secretName: string;
  prompts: string[];
  guessId: string;
  guessName: string;
  rank: number;
  distance: number;
  points: number;
  trace: number[];
};

const CLOCK_MS = 5 * 60 * 1000;
const PER_PLAYER = 20;
const BEST_KEY = "sway.best.v1";

function sideName(side: Side, amber: string, tide: string): string {
  return side === "amber" ? amber : tide;
}

function blip(freq: number, dur = 0.09) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx: AudioContext = (blip as unknown as { ctx?: AudioContext }).ctx ?? new Ctx();
    (blip as unknown as { ctx?: AudioContext }).ctx = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.035;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    /* audio is optional */
  }
}

export function SwayApp() {
  const [phase, setPhase] = useState<Phase>("home");
  const [roomIntent, setRoomIntent] = useState<"make" | "join">("make");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [results, setResults] = useState<HalfResult[]>([]);

  const [secretId, setSecretId] = useState<string | null>(null);
  const [scores, setScores] = useState<Map<string, number>>(() => initialScores());
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [leftMs, setLeftMs] = useState(CLOCK_MS);
  const [best, setBest] = useState<number | null>(null);

  const deadlineRef = useRef(0);
  const memoryRef = useRef<PromptMemory>(emptyMemory());
  const draftRef = useRef("");
  const lockRef = useRef(false);
  const submitRef = useRef<(reason?: "timeout") => void>(() => {});
  const leaveRef = useRef<() => void>(() => {});

  draftRef.current = draft;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBest(Number(raw));
    } catch {
      /* ignore */
    }
    if (recalledRoom()) {
      setRoomIntent("join");
      setPhase("room");
    }
  }, []);

  const secret = secretId ? findWord(secretId) : undefined;
  const board = useMemo(() => (secretId ? topN(scores, 5) : []), [scores, secretId]);
  const secretRank = secretId ? rankOf(scores, secretId) : wordCount();

  function rememberBest(points: number) {
    setBest((prev) => {
      const next = prev == null ? points : Math.max(prev, points);
      try {
        localStorage.setItem(BEST_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function openSway(id: string) {
    memoryRef.current = emptyMemory();
    lockRef.current = false;
    const seeded = initialScores();
    seeded.set(id, (seeded.get(id) ?? 0) + 2.4);
    deadlineRef.current = performance.now() + CLOCK_MS;
    setSecretId(id);
    setScores(seeded);
    setStep(0);
    setLogs([]);
    setDraft("");
    setLeftMs(CLOCK_MS);
    setPhase("sway");
  }

  function finishHalf(finalScores: Map<string, number>, finalLogs: LogLine[]) {
    if (!secret) return;
    const guess = leadingGuess(finalScores);
    const rank = rankOf(finalScores, secret.id);
    const distance = traitDistance(secret.id, guess.id);
    const points = pointsFor(rank, distance, guess.id, secret.id);
    const result: HalfResult = {
      setter: "amber",
      swayer: "tide",
      secretId: secret.id,
      secretName: secret.name,
      prompts: finalLogs.map((line) => line.text),
      guessId: guess.id,
      guessName: guess.name,
      rank,
      distance,
      points,
      trace: finalLogs.map((line) => line.rank),
    };
    blip(points >= 70 ? 520 : 220, 0.16);
    rememberBest(points);
    setResults([result]);
    setPhase("drill-reveal");
  }

  function pushPrompt(reason?: "timeout") {
    if (lockRef.current || !secretId || phase !== "sway") return;
    if (reason === "timeout") {
      lockRef.current = true;
      finishHalf(scores, logs);
      return;
    }
    const text = draftRef.current.trim().slice(0, 80);
    if (!text) return;
    lockRef.current = true;
    const applied = applyPrompt(scores, text, memoryRef.current, secretId);
    const rank = rankOf(applied.scores, secretId);
    const line: LogLine = {
      text,
      shrug: applied.shrug,
      resisted: applied.resisted,
      rank,
    };
    const nextLogs = [...logs, line];
    const nextStep = step + 1;
    setScores(applied.scores);
    setLogs(nextLogs);
    setDraft("");
    setStep(nextStep);
    blip(applied.resisted ? 180 : applied.shrug ? 140 : 360, 0.06);
    if (nextStep >= PER_PLAYER) {
      finishHalf(applied.scores, nextLogs);
      return;
    }
    lockRef.current = false;
  }

  submitRef.current = pushPrompt;

  useEffect(() => {
    if (phase !== "sway") return;
    let frame = 0;
    let lastShown = -1;
    const tick = (now: number) => {
      const remain = Math.max(0, deadlineRef.current - now);
      const shown = Math.ceil(remain / 1000);
      if (shown !== lastShown) {
        lastShown = shown;
        setLeftMs(remain);
      }
      if (remain <= 0) {
        submitRef.current("timeout");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  function startDrill() {
    const word = randomWord();
    setResults([]);
    openSway(word.id);
  }

  function goHome() {
    leaveRef.current();
    leaveRef.current = () => {};
    setPhase("home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <button type="button" onClick={goHome} className="text-left">
          <p className="text-xs tracking-[0.22em] text-muted uppercase">Party engine</p>
          <p className="font-display text-3xl leading-none text-fg">Sway</p>
        </button>
        <p className="text-right text-xs text-muted">
          {wordCount()} words
          <br />
          {best != null ? `Drill best ${best}` : "20 each · 5 min"}
        </p>
      </header>

      {phase === "home" && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-[1.05] text-fg sm:text-5xl">
            Drag the machine off the word.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            Open a room and share the code. Both teams join from their own phones and type at the same time.
            One side plants a secret. The other has five minutes, twenty prompts each, to drag the machine off it.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setRoomIntent("make");
                setPhase("room");
              }}
              className="flex min-h-12 items-center justify-between rounded-lg bg-amber px-4 py-3 text-left font-medium text-amber-ink"
            >
              Make a room
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRoomIntent("join");
                setPhase("room");
              }}
              className="flex min-h-12 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left font-medium text-fg"
            >
              Join a room
              <ArrowRight className="size-5 text-tide" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={startDrill}
              className="flex min-h-12 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left font-medium text-fg"
            >
              Solo drill
              <Dices className="size-5 text-tide" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              className="min-h-11 text-left text-sm text-muted underline-offset-4 hover:underline"
            >
              {rulesOpen ? "Hide how the machine thinks" : "How the machine thinks"}
            </button>
          </div>
          {rulesOpen && (
            <div className="rise mt-4 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
              <p>
                Every word in the bank sits on a grid of traits — alive, metal, flies, sweet — the same
                shape as the old 20Q neural net, which kept a weight between each object and each question.
              </p>
              <p className="mt-3">
                A prompt is a claim. Traits that fit the secret feed it. A lie is doubted, and the machine
                hauls its word back. The grip is strong at first — scattershot opposites bounce. Stay on one
                distant theme and the grip tires.
              </p>
            </div>
          )}
          <HowToPlay />
          <ScoringGuide total={wordCount()} />
        </section>
      )}

      {phase === "room" && (
        <RoomPlay
          intent={roomIntent}
          onExit={goHome}
          onRegisterLeave={(leave) => {
            leaveRef.current = leave;
          }}
        />
      )}

      {phase === "sway" && secret && (
        <SwayTurn
          secretName={secret.name}
          secretRank={secretRank}
          step={step}
          budget={PER_PLAYER}
          perPlayer={PER_PLAYER}
          seat={1}
          seats={1}
          leftMs={leftMs}
          clockMs={CLOCK_MS}
          draft={draft}
          setDraft={setDraft}
          logs={logs}
          board={board}
          onSubmit={pushPrompt}
          label="Drill"
        />
      )}

      {phase === "drill-reveal" && results.length > 0 && (
        <Reveal
          result={results[results.length - 1]!}
          amberName="Amber"
          tideName="Tide"
          drill
          onNext={() => setPhase("home")}
          nextLabel="Back"
        />
      )}
    </main>
  );
}

const PLAY_STEPS = [
  "Make a room and share the four-letter code. Friends join from their own phones. Two teams, 2 to 29 people, sides within one player of each other.",
  "Amber plants a secret from the bank. Only Amber sees the picker. Tide waits on their own screens.",
  "The word unlocks for Tide. Everyone on Tide types at the same time. Each person owes 20 prompts. One shared five-minute clock.",
  "Feed a short claim: a trait, a name, or a sentence. The machine already knows the secret and fights to keep it. Stay on one distant theme. Random opposites bounce.",
  "When everyone has sent 20, or the clock hits zero, the machine names its guess. Points are how far the secret fell.",
  "Swap sides. Play one, two, or three plants each. Highest total wins. Solo drill is the same fight, alone, best score kept on this device.",
];

const SCORE_BANDS: { where: string; points: string }[] = [
  { where: "Still the top answer", points: "0" },
  { where: "Finishes 2nd–5th", points: "20" },
  { where: "Finishes 6th–20th", points: "50" },
  { where: "Finishes 21st–100th", points: "80" },
  { where: "Deeper than 100th", points: "100" },
];

function HowToPlay() {
  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-2xl leading-none text-fg">How to play</h2>
      <ol className="mt-4 space-y-3">
        {PLAY_STEPS.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-muted">
            <span className="w-4 shrink-0 font-display text-lg leading-none text-amber">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ScoringGuide({ total }: { total: number }) {
  return (
    <section className="mt-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-2xl leading-none text-fg">Scoring</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        When the sway ends, the machine names one guess. Your points depend on where the secret still sits
        in its list of {total} words. Rank 1 means it never left the top.
      </p>
      <ul className="mt-4">
        {SCORE_BANDS.map((band) => (
          <li
            key={band.where}
            className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm"
          >
            <span className="text-muted">{band.where}</span>
            <span className="font-medium tabular-nums text-fg">{band.points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Add up to 20 more when that guess shares almost no traits with the secret. 120 is the ceiling. The
        card then calls it held, a nudge, real drift, buried, or lost in the dark.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Each plant scores on its own. Add them up. The higher sway total wins the table.
      </p>
    </section>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function SwayTurn({
  secretName,
  secretRank,
  step,
  budget,
  perPlayer,
  seat,
  seats,
  leftMs,
  clockMs,
  draft,
  setDraft,
  logs,
  board,
  onSubmit,
  label,
}: {
  secretName: string;
  secretRank: number;
  step: number;
  budget: number;
  perPlayer: number;
  seat: number;
  seats: number;
  leftMs: number;
  clockMs: number;
  draft: string;
  setDraft: (value: string) => void;
  logs: LogLine[];
  board: RankedWord[];
  onSubmit: () => void;
  label: string;
}) {
  const ratio = leftMs / clockMs;
  const close = secretRank <= 8;
  const urgent = leftMs <= 60_000;
  const hi = board[0]?.score ?? 1;
  const lo = board[board.length - 1]?.score ?? 0;
  const mine = Math.floor(step / seats) + 1;

  return (
    <section className="rise flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
          <p className="mt-1 text-sm text-fg">
            Player {seat} of {seats}
            <span className="text-muted"> · yours {Math.min(mine, perPlayer)}/{perPlayer}</span>
          </p>
          <p className="text-sm text-muted">
            Prompt {Math.min(step + 1, budget)} of {budget}
          </p>
        </div>
        <div className="w-24" aria-label={`${formatClock(leftMs)} left`}>
          <p className={"text-right font-medium tabular-nums " + (urgent ? "text-heat" : "text-amber")}>
            {formatClock(leftMs)}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={"h-full " + (urgent ? "bg-heat" : "bg-amber")}
              style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={
          "mt-4 rounded-lg border px-4 py-3 " +
          (close ? "border-heat bg-heat-ink" : "border-line bg-surface")
        }
      >
        <p className="text-xs tracking-widest text-muted uppercase">Secret to bury</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="font-display text-4xl leading-none">{secretName}</p>
          <p className={"text-right text-sm " + (close ? "text-heat" : "text-tide")}>
            <span className="block font-medium tabular-nums">#{secretRank}</span>
            <span className="text-xs text-muted">of {wordCount()}</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-muted">
          {close
            ? "Still gripping. Blunt lies bounce. Commit to one distant theme."
            : "The grip is tiring. Stay on that theme — don't wander back."}
        </p>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          value={draft}
          autoFocus
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Player ${seat}: one trait or name`}
          aria-label="Prompt for the engine"
          className="min-h-12 flex-1 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="min-h-12 rounded-lg bg-amber px-4 font-medium text-amber-ink disabled:opacity-40"
        >
          Feed
        </button>
      </form>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted">
        <Timer className="size-3.5" aria-hidden="true" />
        One clock for the side. Time up locks the guess.
      </p>

      <ol className="mt-4 space-y-2">
        {board.map((row, index) => {
          const span = hi - lo || 1;
          const width = 16 + ((row.score - lo) / span) * 84;
          const isSecret = row.name === secretName;
          return (
            <li key={row.id} className="relative">
              <div
                className={"absolute inset-y-0 left-0 rounded-lg " + (isSecret ? "bg-heat/25" : "bg-surface-2")}
                style={{ width: `${width}%` }}
              />
              <div className="relative flex min-h-11 items-center justify-between px-3 text-sm">
                <span className={isSecret ? "font-medium text-heat" : "text-fg"}>
                  {index + 1}. {row.name}
                  {isSecret && <span className="ml-2 text-xs font-normal text-heat">secret</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {logs.length > 0 && (
        <ul className="mt-4 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
          {logs.map((line, i) => (
            <li key={i} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
              {line.shrug ? "shrugged" : line.text}
              {line.resisted && <span className="ml-1 text-heat">held</span>}
              <span className="ml-1 text-fg">#{line.rank}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reveal({
  result,
  amberName,
  tideName,
  drill,
  onNext,
  nextLabel,
}: {
  result: HalfResult;
  amberName: string;
  tideName: string;
  drill: boolean;
  onNext: () => void;
  nextLabel: string;
}) {
  const held = result.guessId === result.secretId;
  return (
    <section className="rise flex flex-1 flex-col">
      <p className="text-xs tracking-widest text-muted uppercase">
        {drill ? "Drill" : `${sideName(result.swayer, amberName, tideName)} swayed`}
      </p>
      <h1 className="mt-2 font-display text-5xl leading-none">{result.points}</h1>
      <p className="mt-2 text-lg text-fg">{scoreLabel(result.points)}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs tracking-widest text-muted uppercase">Secret</p>
          <p className="mt-1 font-display text-2xl leading-tight">{result.secretName}</p>
          <p className="mt-1 text-sm text-muted">finished #{result.rank}</p>
        </div>
        <div className={"rounded-lg border p-3 " + (held ? "border-heat bg-heat-ink" : "border-tide bg-tide-ink")}>
          <p className="text-xs tracking-widest text-muted uppercase">Machine said</p>
          <p className="mt-1 font-display text-2xl leading-tight">{result.guessName}</p>
          <p className="mt-1 text-sm text-muted">
            {Math.round(result.distance * 100)}% unlike
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted">
          <span>Same traits</span>
          <span>Nothing in common</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-amber" style={{ width: `${Math.round(result.distance * 100)}%` }} />
        </div>
      </div>
      <ol className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm text-muted">
        {result.prompts.map((prompt, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="truncate">{prompt === "—" ? "silence" : prompt}</span>
            <span className="shrink-0 tabular-nums text-fg">#{result.trace[i]}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onNext}
        className="mt-auto flex min-h-12 items-center justify-between rounded-lg bg-fg px-4 py-3 font-medium text-bg"
      >
        {nextLabel}
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
    </section>
  );
}
