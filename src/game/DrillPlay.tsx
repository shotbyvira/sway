import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  applyPrompt,
  drillPairs,
  emptyMemory,
  findWord,
  initialScores,
  randomWord,
  rankOf,
  roundScore,
  searchWords,
  topN,
  type PromptMemory,
} from "./engine";
import { FishingStage } from "./FishingStage";
import { DEAL_MS, NAME_MS } from "./rules";

type Phase = "deal" | "name" | "reveal";

export function DrillPlay({ onExit, onScore }: { onExit: () => void; onScore: (points: number) => void }) {
  const secret = useMemo(() => randomWord(), []);
  const pairs = useMemo(() => drillPairs(secret.id), [secret.id]);
  const [phase, setPhase] = useState<Phase>("deal");
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Map<string, number>>(() => {
    const seeded = initialScores();
    seeded.set(secret.id, (seeded.get(secret.id) ?? 0) + 2.4);
    return seeded;
  });
  const [net, setNet] = useState(0.22);
  const [pull, setPull] = useState<"idle" | "tight" | "bolt" | "miss">("idle");
  const [query, setQuery] = useState("");
  const [leftMs, setLeftMs] = useState(DEAL_MS);
  const [picked, setPicked] = useState<string | null>(null);
  const memoryRef = useRef<PromptMemory>(emptyMemory());
  const lockRef = useRef(false);
  const deadlineRef = useRef(performance.now() + DEAL_MS);

  const deal = pairs[index];
  const clockMs = phase === "name" ? NAME_MS : DEAL_MS;
  const chips = useMemo(() => topN(scores, 5), [scores]);
  const found = useMemo(() => (query.trim() ? searchWords(query).slice(0, 6) : []), [query]);

  useEffect(() => {
    if (phase === "reveal") return;
    let frame = 0;
    let last = -1;
    const loop = (now: number) => {
      const remain = Math.max(0, deadlineRef.current - now);
      const shown = Math.ceil(remain / 1000);
      if (shown !== last) {
        last = shown;
        setLeftMs(remain);
      }
      if (remain <= 0) {
        if (phase === "deal") choose(-1);
        else lockGuess(null);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // choose/lockGuess close over the latest deal. Restart only when the clock should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  function arm(ms: number) {
    deadlineRef.current = performance.now() + ms;
    setLeftMs(ms);
    lockRef.current = false;
  }

  function choose(side: -1 | 0 | 1) {
    if (lockRef.current || phase !== "deal" || !deal) return;
    lockRef.current = true;
    if (side < 0) {
      setPull("miss");
    } else {
      const text = side === 0 ? deal.left : deal.right;
      const beforeRank = rankOf(scores, secret.id);
      const beforeScore = scores.get(secret.id) ?? 0;
      const applied = applyPrompt(scores, text, memoryRef.current, secret.id);
      const afterRank = rankOf(applied.scores, secret.id);
      const afterScore = applied.scores.get(secret.id) ?? 0;
      setScores(applied.scores);
      setNet((prev) => {
        if (applied.shrug) return prev;
        if (afterRank < beforeRank || afterScore > beforeScore + 0.05) return Math.min(1, prev + 0.16);
        if (afterRank > beforeRank || afterScore < beforeScore - 0.05) return Math.max(0.16, prev - 0.14);
        return prev;
      });
      if (applied.shrug) setPull("miss");
      else if (afterRank < beforeRank || afterScore > beforeScore + 0.05) setPull("tight");
      else if (afterRank > beforeRank || afterScore < beforeScore - 0.05) setPull("bolt");
      else setPull("miss");
    }
    if (index + 1 >= pairs.length) {
      setPhase("name");
      arm(NAME_MS);
      return;
    }
    setIndex((n) => n + 1);
    arm(DEAL_MS);
  }

  function lockGuess(wordId: string | null) {
    if (lockRef.current || phase !== "name") return;
    lockRef.current = true;
    setPicked(wordId);
    const scored = roundScore(wordId, secret.id, scores);
    onScore(scored.fisheries);
    setPhase("reveal");
  }

  const scored = phase === "reveal" ? roundScore(picked, secret.id, scores) : null;
  const guess = picked ? findWord(picked) : undefined;

  return (
    <section className="rise flex flex-1 flex-col">
      <p className="text-xs tracking-widest text-muted uppercase">Skipper drill</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl leading-none">
          {phase === "reveal" ? "The water stills" : phase === "name" ? "Name it" : `Deal ${index + 1} of ${pairs.length}`}
        </h1>
        {phase !== "reveal" && (
          <p className={"tabular-nums " + (leftMs <= 5000 ? "text-heat" : "text-tide")}>{formatClock(leftMs)}</p>
        )}
      </div>
      <div className="mt-3">
        <FishingStage net={net} spread={0.34} pull={pull} secretName={phase === "reveal" ? secret.name : null} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You are the skipper. You do not know the fish. Tap the line you trust. The other one splashes.
      </p>

      {phase === "deal" && deal && (
        <div className="mt-4 grid gap-3">
          {[deal.left, deal.right].map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => choose(i === 0 ? 0 : 1)}
              className="px-panel min-h-16 px-3 py-3 text-left text-lg leading-snug text-fg"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {phase === "name" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {chips.map((row) => (
              <button key={row.id} type="button" onClick={() => lockGuess(row.id)} className="px-chip min-h-11 px-3 text-fg">
                {row.name}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 border border-line bg-surface px-3">
            <Search className="size-4 text-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the bank"
              aria-label="Search the bank"
              className="min-h-12 w-full bg-transparent text-fg outline-none"
            />
          </label>
          <div className="mt-2 grid gap-2">
            {found.map((word) => (
              <button key={word.id} type="button" onClick={() => lockGuess(word.id)} className="min-h-11 text-left text-fg">
                {word.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "reveal" && scored && (
        <div className="mt-4">
          <p className="font-display text-5xl leading-none text-fg">{scored.fisheries}</p>
          <p className="mt-2 text-lg text-fg">
            {picked && picked === secret.id ? "Caught." : guess ? `You named ${guess.name}.` : "The clock took the guess."}
          </p>
          <p className="mt-2 text-sm text-muted">
            The fish was {secret.name}. It finished #{scored.rank}. Fisheries {scored.fisheries}, school {scored.school}.
          </p>
        </div>
      )}

      <button type="button" onClick={onExit} className="px-btn mt-6 min-h-12 px-4">
        {phase === "reveal" ? "Back" : "Leave the drill"}
      </button>
      {phase !== "reveal" && (
        <div className="mt-2 h-2 overflow-hidden bg-surface-2">
          <div
            className={"h-full " + (leftMs <= 5000 ? "bg-heat" : "bg-tide")}
            style={{ width: `${Math.max(0, Math.min(100, (leftMs / clockMs) * 100))}%` }}
          />
        </div>
      )}
    </section>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `0:${total.toString().padStart(2, "0")}`;
}
