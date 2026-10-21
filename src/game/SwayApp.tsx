import { useEffect, useRef, useState } from "react";
import { DrillPlay } from "./DrillPlay";
import { ROUND_POINTS, wordCount } from "./engine";
import { SeaProvider } from "./FishingStage";
import { RoomPlay } from "./RoomPlay";
import { recalledRoom } from "./seat";
import { play, setMuted } from "./sound";

type Phase = "home" | "room" | "drill";

const BEST_KEY = "sway.best.v2";

export function SwayApp() {
  const [phase, setPhase] = useState<Phase>("home");
  const [roomIntent, setRoomIntent] = useState<"make" | "join">("make");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [guide, setGuide] = useState<null | "play" | "scores">(null);
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const leaveRef = useRef<() => void>(() => {});
  const guideRef = useRef<HTMLDivElement>(null);
  const guideReturn = useRef<HTMLElement | null>(null);

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

  function goHome() {
    leaveRef.current();
    leaveRef.current = () => {};
    setRoomStatus(null);
    setPhase("home");
  }

  const inRound = phase === "room" && roomStatus != null && roomStatus !== "lobby" && roomStatus !== "match";
  const showGuide = phase === "home" || (phase === "room" && roomStatus === "lobby");

  useEffect(() => {
    if (!showGuide && guide) setGuide(null);
  }, [showGuide, guide]);

  useEffect(() => {
    if (!guide) return;
    const root = guideRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    guideReturn.current = previous;
    const focusable = () =>
      root ? [...root.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])")] : [];
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setGuide(null);
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      guideReturn.current?.focus();
    };
  }, [guide]);

  return (
    <SeaProvider>
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {inRound ? (
          <p className="text-sm tracking-[0.35em] text-tide uppercase glow sm:tracking-[0.42em]">Sway</p>
        ) : (
          <button type="button" onClick={goHome} className="text-left">
            <p className="text-sm tracking-[0.35em] text-tide uppercase glow sm:tracking-[0.42em]">Sway</p>
          </button>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-right text-xs tracking-widest text-muted uppercase sm:text-sm">
            {wordCount()} words
            <br />
            {best != null ? `Best catch ${best}` : "4+ · own phones"}
          </p>
          <SoundButton />
          <ContrastButton />
        </div>
      </header>

      {showGuide && (
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="px-chip min-h-11 px-3 text-sm"
          aria-expanded={guide === "play"}
          onClick={() => {
            play("tap");
            setGuide((open) => (open === "play" ? null : "play"));
          }}
        >
          How to play
        </button>
        <button
          type="button"
          className="px-chip min-h-11 px-3 text-sm"
          aria-expanded={guide === "scores"}
          onClick={() => {
            play("tap");
            setGuide((open) => (open === "scores" ? null : "scores"));
          }}
        >
          Explain scores
        </button>
      </div>
      )}
      {guide && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-[#061422]/75 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setGuide(null)}
        >
          <div
            ref={guideRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sway-guide-title"
            className="mb-2 max-h-[78vh] w-full max-w-lg overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {guide === "play" ? <HowToPlay /> : <ScoringGuide />}
            <button type="button" onClick={() => setGuide(null)} className="px-chip mt-2 min-h-11 w-full px-3 text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {phase === "home" && (
        <section className="rise flex flex-1 flex-col items-center text-center">
          <h1 className="px-title font-display text-6xl sm:text-8xl">SWAY</h1>
          <p className="px-tag mt-3 text-xl">Catch the big fish</p>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-fg">
            Two crews, one hidden fish. The school tries to swim it clear. Fisheries try to drop the net on it. Only the
            skipper gets to name it.
          </p>
          <div className="min-h-[28vh] flex-1" />
          <div className="flex w-full flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                play("tap");
                setRoomIntent("make");
                setPhase("room");
              }}
              className="px-btn min-h-14 w-full px-4 py-3"
            >
              ▼ Make a room ▼
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  play("tap");
                  setRoomIntent("join");
                  setPhase("room");
                }}
                className="px-chip min-h-12 px-3"
              >
                Join
              </button>
              <button type="button" onClick={() => { play("tap"); setPhase("drill"); }} className="px-chip min-h-12 px-3">
                Solo drill
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              className="px-quiet"
            >
              {rulesOpen ? "Hide the water" : "How the water thinks"}
            </button>
          </div>
          {rulesOpen && (
            <div className="px-panel rise mt-4 p-4 text-left text-base leading-relaxed text-muted">
              <p>Every word sits on a grid of traits. A cast is a claim about the fish. When the skipper taps a line, the water checks each claim against the hidden fish. Mostly true closes the net. Mostly false scatters the school. Half and half barely moves it.</p>
              <p className="mt-3">Lines that disagree spread the school sideways. A crew line does it the same as a school line, so the fan never says who wrote the card.</p>
            </div>
          )}
        </section>
      )}

      {phase === "room" && (
        <RoomPlay
          intent={roomIntent}
          onExit={goHome}
          onRegisterLeave={(leave) => {
            leaveRef.current = leave;
          }}
          onStatus={setRoomStatus}
        />
      )}

      {phase === "drill" && <DrillPlay onExit={goHome} onScore={rememberBest} />}
    </main>
    </SeaProvider>
  );
}

function ContrastButton() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sway.contrast") === "1";
      setOn(stored);
      document.documentElement.dataset.contrast = stored ? "1" : "0";
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <button
      type="button"
      className={"px-mute " + (on ? "" : "off")}
      aria-pressed={on}
      aria-label={on ? "Use the regular palette" : "Boost the palette"}
      onClick={() => {
        const next = !on;
        setOn(next);
        document.documentElement.dataset.contrast = next ? "1" : "0";
        try {
          localStorage.setItem("sway.contrast", next ? "1" : "0");
        } catch {
          /* ignore */
        }
        play("tap");
      }}
    >
      {on ? "Clear" : "Boost"}
    </button>
  );
}

function SoundButton() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sway.mute") === "1";
      setOff(stored);
      setMuted(stored);
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <button
      type="button"
      className={"px-mute " + (off ? "off" : "")}
      aria-pressed={off}
      aria-label={off ? "Unmute sound" : "Mute sound"}
      onClick={() => {
        const next = !off;
        setOff(next);
        setMuted(next);
        if (!next) play("tap");
      }}
    >
      {off ? "Muted" : "Sound"}
    </button>
  );
}

const PLAY_STEPS = [
  "Make a room and share the code. Two crews, at least two a side, and the sides stay within one player. Everyone plays on their own phone.",
  "A toss chooses which crew holds the net first. A compass chooses their skipper. They have twenty seconds to cast — if they don't, the water does. The crews swap every round, and a skipper isn't picked twice until that whole crew has held the net.",
  "The fish stays hidden. The school sees a near lookalike. Fisheries see one farther away. The skipper sees neither.",
  "Forty-five seconds. Everyone except the skipper casts up to three lines, all at once. A line the water knows goes in the boat. A word it doesn't know is dead water, and it still costs a cast. Naming the fish, your lookalike, or its twin is thrown back. You can try again.",
  "Up to five deals, twelve seconds each, one for each of the crew's first five lines. Two lines, and neither is labeled. Only the skipper can read them. The skipper taps one. That line hits the water. The other one splashes. Mostly true closes the net. Mostly false scatters the school. Lines that disagree spread the school sideways, whoever wrote them. If the school casts too few lines, the water writes theirs.",
  "Fifteen seconds to name the fish, from the top of the net or a search. A correct name hauls the fish up in the net. Anything else slips through. That scene runs for ten seconds, and anyone can pause it. Then the round splits 120 points. Tap Explain scores for the table. Play one, two, or three times each. The higher total wins.",
];

function HowToPlay() {
  return (
    <section className="px-panel w-full p-4 text-left">
      <h2 id="sway-guide-title" className="px-rule text-2xl">How to play</h2>
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

const SPLITS: [string, number][] = [
  ["The exact fish", 120],
  ["A very close shape", 80],
  ["A halfway neighbor", 40],
  ["Anything else, or silence", 0],
];

function ScoringGuide() {
  return (
    <section className="px-panel w-full p-4 text-left">
      <h2 id="sway-guide-title" className="px-rule text-2xl">Explain scores</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Every round is {ROUND_POINTS} points, split between the crews. Fisheries keep what the skipper's name is
        worth. The school keeps whatever is left. A perfect catch takes the whole round. Silence hands the school the
        whole round.
      </p>
      <div className="mt-4 grid grid-cols-[1fr_4.75rem_4.25rem] items-baseline gap-x-2">
        <span className="px-kicker">The name</span>
        <span className="px-kicker live text-right">Fisheries</span>
        <span className="px-kicker hold text-right">School</span>
      </div>
      <ul className="mt-2">
        {SPLITS.map(([where, fish]) => (
          <li
            key={where}
            className="grid grid-cols-[1fr_4.75rem_4.25rem] items-baseline gap-x-2 border-t border-line py-2 text-sm"
          >
            <span className="text-muted">{where}</span>
            <span className="text-right tabular-nums text-fg">{fish}</span>
            <span className="text-right tabular-nums text-fg">{ROUND_POINTS - fish}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        A very close shape shares most of the fish's traits. A halfway neighbor shares some. Anything further, or
        no name at all, pays the school the full {ROUND_POINTS}.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Rank is how deep the fish sat on the skipper's list. It shows after the scene. It is not paid. Add every
        round. The higher total wins.
      </p>
    </section>
  );
}
