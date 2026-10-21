import { useEffect, useRef, useState } from "react";
import { DrillPlay } from "./DrillPlay";
import { wordCount } from "./engine";
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
  const [best, setBest] = useState<number | null>(null);
  const leaveRef = useRef<() => void>(() => {});

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
    setPhase("home");
  }

  return (
    <SeaProvider>
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <button type="button" onClick={goHome} className="text-left">
          <p className="text-sm tracking-[0.42em] text-tide uppercase glow">Sway</p>
        </button>
        <div className="flex items-center gap-3">
          <p className="text-right text-sm tracking-widest text-muted uppercase">
            {wordCount()} words
            <br />
            {best != null ? `Best catch ${best}` : "4+ · own phones"}
          </p>
          <SoundButton />
          <ContrastButton />
        </div>
      </header>

      {phase === "home" && (
        <section className="rise flex flex-1 flex-col items-center text-center">
          <h1 className="px-title font-display text-7xl sm:text-8xl">SWAY</h1>
          <p className="px-tag mt-3 text-xl">Catch the big fish</p>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted">
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
              <p>Every word sits on a grid of traits. A cast is a claim. Honest traits pull that shape up. A lie is doubted, and the fish hauls itself back.</p>
              <p className="mt-3">The net widens and sinks toward the school only after a deal pulls the fish closer. A school that disagrees spreads sideways. Where they overlap is how close the catch is.</p>
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
  "Make a room and share the code. Two teams, at least two a side, four or more, sides within one player. Everyone plays from their own phone.",
  "A toss picks who is Fisheries first. A compass picks their skipper. Later rounds swap sides. The compass won't pick the same skipper twice until that side has all had the net.",
  "The app hides the fish. The school sees a near lookalike. Fisheries crew see a farther one. The skipper sees neither.",
  "Forty-five seconds. Everyone except the skipper casts up to three lines, all at once. Accepted lines go in the boat. Dead water — words the engine doesn't know — still costs a cast. Naming the fish, your lookalike, or a twin is rejected, and you can try again.",
  "Up to five deals, twelve seconds each. Two unlabeled lines. The skipper taps one. That line hits the water. The other splashes. Nobody sees the word. The net grows if the fish stays close. The school spreads when the school's lines disagree.",
  "Fifteen seconds. The skipper names it from the top of the net or a search. Then the fish is shown. Sides swap. Play one, two, or three times each. Higher total wins.",
];

function HowToPlay() {
  return (
    <section className="px-panel mt-8 w-full p-4 text-left">
      <h2 className="px-rule text-2xl">How to play</h2>
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
    <section className="px-panel mt-3 w-full p-4 text-left">
      <h2 className="px-rule text-2xl">Scoring</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Both crews can score a round. Fisheries are paid for the name. The school is paid for how deep the fish sank in
        the list of {total}, and only if the skipper missed.
      </p>
      <p className="px-kicker live mt-4">Fisheries, for the name</p>
      <ul className="mt-2">
        {[
          ["The exact fish", "120"],
          ["A very close shape", "80"],
          ["A halfway neighbor", "40"],
          ["Anything else, or silence", "0"],
        ].map(([where, points]) => (
          <li key={where} className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm">
            <span className="text-muted">{where}</span>
            <span className="tabular-nums text-fg">{points}</span>
          </li>
        ))}
      </ul>
      <p className="px-kicker hold mt-4">School, if it wasn't caught</p>
      <ul className="mt-2">
        {[
          ["Still the top answer", "0"],
          ["Finishes 2nd–5th", "20"],
          ["Finishes 6th–20th", "50"],
          ["Finishes 21st–100th", "80"],
          ["Deeper than 100th", "100"],
        ].map(([where, points]) => (
          <li key={where} className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm">
            <span className="text-muted">{where}</span>
            <span className="tabular-nums text-fg">{points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The school also gets up to 20 more when the engine's leading guess shares almost no traits with the fish. A
        direct hit zeros the school and pays Fisheries 120. Add every round. The higher total wins.
      </p>
    </section>
  );
}
