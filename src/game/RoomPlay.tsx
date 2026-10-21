import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Copy, EyeOff, RotateCcw, Search, Timer, Trophy } from "lucide-react";
import { CATEGORIES, type Category, type Word } from "./bank";
import { randomWord, scoreLabel, searchWords, wordCount } from "./engine";
import {
  advanceRoomFn,
  chooseTeamFn,
  createRoomFn,
  feedPromptFn,
  joinRoomFn,
  leaveRoomFn,
  lockWordFn,
  rematchRoomFn,
  setLobbyFn,
  startRoomFn,
  syncRoomFn,
  type RoomPlayer,
  type RoomResponse,
  type RoomView,
} from "./room";
import { CLOCK_MS, otherSide, type Side } from "./rules";
import {
  recalledRoom,
  rememberRoom,
  saveHandle,
  saveTeam,
  savedHandle,
  savedTeam,
  seatId,
} from "./seat";

type Gate = "boot" | "form";

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sideLabel(side: Side, room: RoomView): string {
  return side === "amber" ? room.amberName : room.tideName;
}

function splitNote(players: RoomPlayer[]): { ok: boolean; text: string } {
  const amber = players.filter((player) => player.team === "amber").length;
  const tide = players.filter((player) => player.team === "tide").length;
  if (amber + tide < 2) return { ok: false, text: "Need at least two people." };
  if (amber === 0 || tide === 0) return { ok: false, text: "Both sides need someone." };
  if (Math.abs(amber - tide) > 1) return { ok: false, text: "Move someone over. Sides stay within one player." };
  return { ok: true, text: `${amber} against ${tide}. Anyone can start.` };
}

function blip(freq: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx: AudioContext = (blip as unknown as { ctx?: AudioContext }).ctx ?? new Ctx();
    (blip as unknown as { ctx?: AudioContext }).ctx = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* audio is optional */
  }
}

export function RoomPlay({
  intent,
  onExit,
  onRegisterLeave,
}: {
  intent: "make" | "join";
  onExit: () => void;
  onRegisterLeave: (leave: () => void) => void;
}) {
  const createRoom = useServerFn(createRoomFn);
  const joinRoom = useServerFn(joinRoomFn);
  const syncRoom = useServerFn(syncRoomFn);
  const chooseTeam = useServerFn(chooseTeamFn);
  const setLobby = useServerFn(setLobbyFn);
  const startRoom = useServerFn(startRoomFn);
  const lockWord = useServerFn(lockWordFn);
  const feedPrompt = useServerFn(feedPromptFn);
  const advanceRoom = useServerFn(advanceRoomFn);
  const rematchRoom = useServerFn(rematchRoomFn);
  const leaveRoom = useServerFn(leaveRoomFn);

  const syncRef = useRef(syncRoom);
  const leaveRef = useRef(leaveRoom);
  syncRef.current = syncRoom;
  leaveRef.current = leaveRoom;

  const playerIdRef = useRef("");
  const codeRef = useRef<string | null>(null);
  const amberFocus = useRef(false);
  const tideFocus = useRef(false);
  const closedRef = useRef(false);

  const [gate, setGate] = useState<Gate>("form");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [handle, setHandle] = useState("");
  const [team, setTeam] = useState<Side>("amber");
  const [codeText, setCodeText] = useState("");
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [amberDraft, setAmberDraft] = useState("Amber");
  const [tideDraft, setTideDraft] = useState("Tide");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [picked, setPicked] = useState<Word | null>(null);
  const [draft, setDraft] = useState("");

  codeRef.current = room?.code ?? codeRef.current;

  function take(next: RoomView) {
    codeRef.current = next.code;
    rememberRoom(next.code);
    setRoom((prev) => {
      if (prev && prev.code === next.code && next.version < prev.version) return prev;
      return next;
    });
    setGate("form");
  }

  function apply(res: RoomResponse) {
    if (!res.ok) {
      setError(res.error);
      if (res.error.includes("No room")) {
        rememberRoom(null);
        codeRef.current = null;
        setRoom(null);
        setGate("form");
      }
      return;
    }
    setError("");
    take(res.room);
  }

  function dropSeatLocal() {
    const code = codeRef.current;
    const playerId = playerIdRef.current;
    rememberRoom(null);
    codeRef.current = null;
    if (code && playerId) void leaveRef.current({ data: { code, playerId } });
  }

  function exitRoom() {
    dropSeatLocal();
    onExit();
  }

  useEffect(() => {
    onRegisterLeave(dropSeatLocal);
    return () => onRegisterLeave(() => {});
    // dropSeatLocal closes over the latest refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterLeave]);

  useEffect(() => {
    const playerId = seatId();
    playerIdRef.current = playerId;
    setHandle(savedHandle());
    setTeam(savedTeam());
    const saved = recalledRoom();
    if (!saved) {
      setGate("form");
      return;
    }
    let stop = false;
    void syncRef
      .current({ data: { code: saved, playerId } })
      .then((res) => {
        if (stop) return;
        if (res.ok && res.room.you) take(res.room);
        else {
          rememberRoom(null);
          setGate("form");
        }
      })
      .catch(() => {
        if (!stop) setGate("form");
      });
    return () => {
      stop = true;
    };
    // Rejoin once, from this phone's saved room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => {
      const code = room.code;
      const playerId = playerIdRef.current;
      if (!code || !playerId) return;
      void syncRef
        .current({ data: { code, playerId } })
        .then((res) => {
          if (!res.ok) {
            if (res.error.includes("No room")) {
              rememberRoom(null);
              codeRef.current = null;
              setRoom(null);
              setError("That room closed.");
            }
            return;
          }
          if (!res.room.you) {
            rememberRoom(null);
            codeRef.current = null;
            setRoom(null);
            setError("You left this room.");
            return;
          }
          take(res.room);
        })
        .catch(() => {
          /* the next poll retries */
        });
    }, 1000);
    return () => clearInterval(timer);
  }, [room?.code]);

  useEffect(() => {
    if (!amberFocus.current && room) setAmberDraft(room.amberName);
    if (!tideFocus.current && room) setTideDraft(room.tideName);
  }, [room?.amberName, room?.tideName, room]);

  useEffect(() => {
    if (room?.status !== "sway" || room.deadline == null) return;
    closedRef.current = false;
    let frame = 0;
    let last = -1;
    const loop = () => {
      const remain = Math.max(0, (room.deadline ?? 0) - Date.now());
      const shown = Math.ceil(remain / 1000);
      if (shown !== last) {
        last = shown;
        setTick(shown);
      }
      if (remain <= 0) {
        if (!closedRef.current) {
          closedRef.current = true;
          void syncRef
            .current({ data: { code: room.code, playerId: playerIdRef.current } })
            .then((res) => {
              if (res.ok) take(res.room);
            });
        }
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [room?.status, room?.deadline, room?.code]);

  async function run(task: () => Promise<RoomResponse>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      apply(await task());
    } catch {
      setError("Couldn't reach the room. Try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function enter() {
    const name = handle.trim();
    if (!name) {
      setError("Add a name so your team can see you.");
      return;
    }
    saveHandle(name);
    saveTeam(team);
    const playerId = playerIdRef.current || seatId();
    playerIdRef.current = playerId;
    if (intent === "join" && !room) {
      const code = codeText.toUpperCase();
      if (code.length !== 4) {
        setError("Room codes are four letters.");
        return;
      }
      void run(() => joinRoom({ data: { code, playerId, handle: name, team } }));
      return;
    }
    void run(() => createRoom({ data: { playerId, handle: name, team } }));
  }

  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Couldn't copy. Read the code out loud.");
    }
  }

  function pushNames(next?: { cycles?: number; amberName?: string; tideName?: string }) {
    if (!room || room.status !== "lobby") return;
    void run(() =>
      setLobby({
        data: {
          code: room.code,
          playerId: playerIdRef.current,
          cycles: next?.cycles ?? room.cycles,
          amberName: next?.amberName ?? amberDraft,
          tideName: next?.tideName ?? tideDraft,
        },
      }),
    );
  }

  const filtered = useMemo(() => {
    return searchWords(query)
      .filter((word) => category === "All" || word.category === category)
      .slice(0, 48);
  }, [query, category]);

  if (gate === "boot" && !room) {
    return <p className="text-sm text-muted">Opening the room…</p>;
  }

  if (!room) {
    return (
      <section className="rise flex flex-1 flex-col">
        <h1 className="font-display text-4xl leading-none">{intent === "join" ? "Join a room" : "Make a room"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {intent === "join"
            ? "Same code, your own phone. You'll type at the same time as the rest of your side."
            : "You'll get a four-letter code. Everyone else joins from their own phone."}
        </p>
        <label className="mt-6 block">
          <span className="text-xs tracking-widest text-muted uppercase">Your name</span>
          <input
            value={handle}
            maxLength={16}
            autoComplete="nickname"
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Maya"
            className="mt-1 w-full min-h-12 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
          />
        </label>
        <p className="mt-4 text-xs tracking-widest text-muted uppercase">Start on</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["amber", "tide"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setTeam(side)}
              className={
                "min-h-12 rounded-lg border font-medium " +
                (team === side
                  ? side === "amber"
                    ? "border-amber bg-amber text-amber-ink"
                    : "border-tide bg-tide text-tide-ink"
                  : "border-line bg-surface text-fg")
              }
            >
              {side === "amber" ? "Amber" : "Tide"}
            </button>
          ))}
        </div>
        {intent === "join" && (
          <label className="mt-4 block">
            <span className="text-xs tracking-widest text-muted uppercase">Room code</span>
            <input
              value={codeText}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setCodeText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
              placeholder="K7MQ"
              className="mt-1 w-full min-h-14 rounded-lg border border-line bg-surface text-center font-display text-3xl tracking-[0.28em] text-fg uppercase outline-none focus:border-amber"
            />
          </label>
        )}
        {error && <p className="mt-4 text-sm text-heat">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={enter}
          className="px-btn mt-6 flex min-h-14 w-full items-center justify-center px-4 py-3 disabled:opacity-40"
        >
          {intent === "join" ? "▼ Join ▼" : "▼ Open the room ▼"}
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </section>
    );
  }

  const you = room.you;
  const note = splitNote(room.players);
  const setterName = sideLabel(room.setter, room);
  const swayerName = sideLabel(room.swayer, room);
  const leftMs = room.status === "sway" && room.deadline != null ? Math.max(0, room.deadline - Date.now()) : 0;
  const planting = you?.team === room.setter;
  const swaying = you?.team === room.swayer;
  const mine = you?.used ?? 0;
  const swayers = room.players.filter((player) => player.team === room.swayer);
  const result = room.results.find((row) => row.cycle === room.cycle && row.half === room.half);
  const amberPoints = room.results.filter((row) => row.swayer === "amber").reduce((sum, row) => sum + row.points, 0);
  const tidePoints = room.results.filter((row) => row.swayer === "tide").reduce((sum, row) => sum + row.points, 0);
  void tick;

  return (
    <section className="flex flex-1 flex-col">
      {room.status === "lobby" && (
        <div className="rise flex flex-1 flex-col">
          <p className="text-xs tracking-widest text-muted uppercase">Room</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="glow font-display text-6xl tracking-[0.22em]">{room.code}</p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="px-chip inline-flex min-h-11 items-center gap-2 px-3 text-sm"
            >
              <Copy className="size-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">Share the code. Everyone joins on their own phone and plays at once.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <TeamColumn
              tone="amber"
              name={amberDraft}
              editable
              youId={you?.id ?? ""}
              players={room.players.filter((player) => player.team === "amber")}
              onFocus={() => {
                amberFocus.current = true;
              }}
              onChange={setAmberDraft}
              onBlur={() => {
                amberFocus.current = false;
                pushNames({ amberName: amberDraft });
              }}
            />
            <TeamColumn
              tone="tide"
              name={tideDraft}
              editable
              youId={you?.id ?? ""}
              players={room.players.filter((player) => player.team === "tide")}
              onFocus={() => {
                tideFocus.current = true;
              }}
              onChange={setTideDraft}
              onBlur={() => {
                tideFocus.current = false;
                pushNames({ tideName: tideDraft });
              }}
            />
          </div>
          {you && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void run(() =>
                  chooseTeam({
                    data: { code: room.code, playerId: playerIdRef.current, team: otherSide(you.team) },
                  }),
                )
              }
              className="px-chip mt-3 min-h-11 text-sm disabled:opacity-40"
            >
              Switch to {sideLabel(otherSide(you.team), room)}
            </button>
          )}
          <p className="mt-4 text-xs tracking-widest text-muted uppercase">Swaps</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => pushNames({ cycles: n })}
                className={
                  "min-h-12 rounded-lg border text-sm " +
                  (room.cycles === n ? "border-fg bg-fg text-bg" : "border-line bg-surface text-fg")
                }
              >
                {n === 1 ? "One each" : `${n} each`}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{note.text} Each swayer owes 20 prompts inside one five-minute clock.</p>
          {error && <p className="mt-3 text-sm text-heat">{error}</p>}
          <button
            type="button"
            disabled={pending || !note.ok}
            onClick={() =>
              void run(async () => {
                await setLobby({
                  data: {
                    code: room.code,
                    playerId: playerIdRef.current,
                    cycles: room.cycles,
                    amberName: amberDraft,
                    tideName: tideDraft,
                  },
                });
                return startRoom({ data: { code: room.code, playerId: playerIdRef.current } });
              })
            }
            className="px-btn mt-4 flex min-h-14 w-full items-center justify-center px-4 py-3 disabled:opacity-40"
          >
            {amberDraft.trim() || room.amberName} plants first
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={exitRoom} className="mt-3 min-h-11 text-sm text-muted">
            Leave room
          </button>
        </div>
      )}

      {room.status === "plant" && (
        <div className="rise flex flex-1 flex-col">
          <p className="text-xs tracking-widest text-muted uppercase">
            Room {room.code} · swap {room.cycle} of {room.cycles}
          </p>
          {planting ? (
            <>
              <h1 className="mt-2 font-display text-4xl leading-none">Pick a secret</h1>
              <p className="mt-2 text-sm text-muted">
                {swayerName} sees it the moment it's locked. Anyone on {setterName} can lock — the first one starts
                the clock.
              </p>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the bank"
                  className="w-full min-h-12 rounded-lg border border-line bg-surface pr-3 pl-10 text-fg outline-none focus:border-amber"
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {(["All", ...CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={
                      "min-h-10 shrink-0 border px-3 text-sm " +
                      (category === cat ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted")
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid max-h-[42dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {filtered.map((word) => {
                  const on = picked?.id === word.id;
                  return (
                    <button
                      key={word.id}
                      type="button"
                      onClick={() => setPicked(word)}
                      className={
                        "min-h-12 rounded-lg border px-3 py-2 text-left text-sm " +
                        (on ? "border-amber bg-amber text-amber-ink" : "border-line bg-surface text-fg")
                      }
                    >
                      <span className="block font-medium">{word.name}</span>
                      <span className={"text-xs " + (on ? "text-amber-ink/70" : "text-muted")}>{word.category}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-sm text-heat">{error}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicked(randomWord(picked?.id))}
                  className="px-chip min-h-12 px-4 text-sm"
                >
                  Surprise
                </button>
                <button
                  type="button"
                  disabled={!picked || pending}
                  onClick={() =>
                    picked &&
                    void run(() =>
                      lockWord({ data: { code: room.code, playerId: playerIdRef.current, wordId: picked.id } }),
                    )
                  }
                  className="px-btn min-h-12 flex-1 px-4 disabled:opacity-40"
                >
                  Lock {picked ? picked.name : "a word"}
                </button>
              </div>
            </>
          ) : (
            <>
              <EyeOff className="mt-4 size-8 text-muted" aria-hidden="true" />
              <h1 className="mt-4 font-display text-4xl leading-[1.05]">{setterName} is planting.</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Stay on this screen. The word shows up here when they lock it. Then everyone on {swayerName} types at
                the same time — 20 prompts each, one five-minute clock.
              </p>
              <ul className="mt-4 space-y-1 text-sm text-muted">
                {room.players
                  .filter((player) => player.team === room.setter)
                  .map((player) => (
                    <li key={player.id}>
                      {player.handle}
                      {player.id === you?.id ? " · you" : ""}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}

      {room.status === "sway" && (
        <div className="rise flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">
                {swayerName} sways · {room.cycle}/{room.cycles}
              </p>
              <p className="mt-1 text-sm text-fg">
                {swaying ? `Yours ${Math.min(mine, room.perPlayer)}/${room.perPlayer}` : "You're watching"}
              </p>
              <p className="text-sm text-muted">Room {room.code}</p>
            </div>
            <div className="w-24" aria-label={`${formatClock(leftMs)} left`}>
              <p className={"text-right font-medium tabular-nums " + (leftMs <= 60_000 ? "text-heat" : "text-amber")}>
                {formatClock(leftMs)}
              </p>
              <div className="mt-1 h-2 overflow-hidden bg-surface-2">
                <div
                  className={"h-full " + (leftMs <= 60_000 ? "bg-heat" : "bg-amber")}
                  style={{ width: `${Math.max(0, Math.min(100, (leftMs / CLOCK_MS) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className={
              "mt-4 rounded-lg border px-4 py-3 " +
              ((room.secretRank ?? 99) <= 8 ? "border-heat bg-heat-ink" : "border-line bg-surface")
            }
          >
            <p className="text-xs tracking-widest text-muted uppercase">Secret to bury</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="font-display text-4xl leading-none">{room.secret?.name ?? "…"}</p>
              <p className={"text-right text-sm " + ((room.secretRank ?? 99) <= 8 ? "text-heat" : "text-tide")}>
                <span className="block font-medium tabular-nums">#{room.secretRank ?? "—"}</span>
                <span className="text-xs text-muted">of {wordCount()}</span>
              </p>
            </div>
          </div>

          {swaying && mine < room.perPlayer && leftMs > 0 ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft.trim();
                if (!text || pendingRef.current) return;
                blip(360);
                void run(async () => {
                  const res = await feedPrompt({ data: { code: room.code, playerId: playerIdRef.current, text } });
                  if (res.ok) setDraft("");
                  return res;
                });
              }}
            >
              <input
                value={draft}
                maxLength={80}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="One trait or name"
                aria-label="Prompt for the engine"
                className="min-h-12 flex-1 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
              />
              <button
                type="submit"
                disabled={!draft.trim() || pending}
                className="px-btn min-h-12 px-4 disabled:opacity-40"
              >
                Feed
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {swaying
                ? "You're done. The clock stays up until your side finishes or time runs out."
                : `${swayerName} is feeding the machine. You can't send from this side.`}
            </p>
          )}
          {error && <p className="mt-2 text-sm text-heat">{error}</p>}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Timer className="size-3.5" aria-hidden="true" />
            Everyone on {swayerName} types at once.
          </p>

          <ul className="mt-4 space-y-1">
            {swayers.map((player) => (
              <li key={player.id} className="flex items-center justify-between text-sm">
                <span className={player.id === you?.id ? "text-fg" : "text-muted"}>
                  {player.handle}
                  {player.id === you?.id ? " · you" : ""}
                </span>
                <span className="tabular-nums text-fg">
                  {player.used}/{room.perPlayer}
                </span>
              </li>
            ))}
          </ul>

          <ol className="mt-4 space-y-2">
            {room.board.map((row, index) => {
              const isSecret = row.id === room.secret?.id;
              return (
                <li key={row.id} className="rounded-lg bg-surface-2">
                  <div className="flex min-h-11 items-center px-3 text-sm">
                    <span className={isSecret ? "font-medium text-heat" : "text-fg"}>
                      {index + 1}. {row.name}
                      {isSecret && <span className="ml-2 text-xs font-normal text-heat">secret</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          {room.prompts.length > 0 && (
            <ul className="mt-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {room.prompts.map((line, index) => (
                <li key={`${line.handle}-${index}-${line.text}`} className="border border-line bg-surface px-3 py-1 text-sm text-muted">
                  <span className="text-fg">{line.handle}</span> · {line.shrug ? "shrugged" : line.text}
                  {line.resisted && <span className="ml-1 text-heat">held</span>}
                  <span className="ml-1 text-fg">#{line.rank}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {room.status === "reveal" && (
        <div className="rise flex flex-1 flex-col">
          <p className="text-xs tracking-widest text-muted uppercase">{swayerName} swayed</p>
          {result ? (
            <>
              <h1 className="mt-2 font-display text-5xl leading-none">{result.points}</h1>
              <p className="mt-2 text-lg">{scoreLabel(result.points)}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-xs tracking-widest text-muted uppercase">Secret</p>
                  <p className="mt-1 font-display text-2xl leading-tight">{result.secretName}</p>
                  <p className="mt-1 text-sm text-muted">finished #{result.rank}</p>
                </div>
                <div
                  className={
                    "rounded-lg border p-3 " +
                    (result.guessName === result.secretName ? "border-heat bg-heat-ink" : "border-tide bg-tide-ink")
                  }
                >
                  <p className="text-xs tracking-widest text-muted uppercase">Machine said</p>
                  <p className="mt-1 font-display text-2xl leading-tight">{result.guessName}</p>
                  <p className="mt-1 text-sm text-muted">{Math.round(result.distance * 100)}% unlike</p>
                </div>
              </div>
            </>
          ) : (
            <h1 className="mt-2 font-display text-4xl leading-none">Reading the board…</h1>
          )}
          <ul className="mt-4 max-h-28 space-y-1 overflow-y-auto text-sm text-muted">
            {[...room.prompts].reverse().map((line, index) => (
              <li key={`${line.text}-${index}`} className="flex justify-between gap-3">
                <span className="truncate">
                  {line.handle}: {line.shrug ? "shrugged" : line.text}
                </span>
                <span className="shrink-0 tabular-nums text-fg">#{line.rank}</span>
              </li>
            ))}
          </ul>
          {error && <p className="mt-3 text-sm text-heat">{error}</p>}
          <button
            type="button"
            disabled={pending}
            onClick={() => void run(() => advanceRoom({ data: { code: room.code, playerId: playerIdRef.current } }))}
            className="px-btn mt-auto flex min-h-12 items-center justify-between px-4 py-3 disabled:opacity-40"
          >
            {room.half === 1 && room.cycle >= room.cycles ? "See the table" : "Next plant"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {room.status === "match" && (
        <div className="rise flex flex-1 flex-col">
          <Trophy className="size-8 text-amber" aria-hidden="true" />
          <h1 className="mt-3 font-display text-5xl leading-none">
            {amberPoints === tidePoints ? "Draw" : amberPoints > tidePoints ? room.amberName : room.tideName}
          </h1>
          <p className="mt-2 text-muted">
            {amberPoints === tidePoints ? "Neither side dragged harder." : "Furthest drift takes the table."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ScoreTile name={room.amberName} points={amberPoints} tone="amber" />
            <ScoreTile name={room.tideName} points={tidePoints} tone="tide" />
          </div>
          <ul className="mt-4 space-y-2">
            {room.results.map((row, index) => (
              <li key={index} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <span className="text-muted">{sideLabel(row.swayer, room)} buried </span>
                {row.secretName}
                <span className="text-muted"> → {row.guessName}</span>
                <span className="float-right font-medium tabular-nums">{row.points}</span>
              </li>
            ))}
          </ul>
          {error && <p className="mt-3 text-sm text-heat">{error}</p>}
          <div className="mt-auto flex gap-2 pt-6">
            <button type="button" onClick={exitRoom} className="px-chip min-h-12 px-4 text-sm">
              Home
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void run(() => rematchRoom({ data: { code: room.code, playerId: playerIdRef.current } }))}
              className="px-btn flex min-h-12 flex-1 items-center justify-center gap-2 disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Rematch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function TeamColumn({
  tone,
  name,
  editable,
  players,
  youId,
  onFocus,
  onChange,
  onBlur,
}: {
  tone: Side;
  name: string;
  editable: boolean;
  players: RoomPlayer[];
  youId: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const tide = tone === "tide";
  return (
    <div className={"px-panel border-t-4 p-3 " + (tide ? "border-tide" : "border-amber")}>
      {editable ? (
        <input
          value={name}
          maxLength={16}
          aria-label={tide ? "Tide team name" : "Amber team name"}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={
            "w-full bg-transparent font-medium outline-none " + (tide ? "text-tide" : "text-amber")
          }
        />
      ) : (
        <p className={"font-medium " + (tide ? "text-tide" : "text-amber")}>{name}</p>
      )}
      <ul className="mt-2 space-y-1 text-sm">
        {players.length === 0 && <li className="text-muted">Waiting</li>}
        {players.map((player) => (
          <li key={player.id} className="truncate">
            {player.handle}
            {player.id === youId ? " · you" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreTile({ name, points, tone }: { name: string; points: number; tone: Side }) {
  return (
    <div className={"rounded-lg p-4 " + (tone === "amber" ? "bg-amber text-amber-ink" : "bg-tide text-tide-ink")}>
      <p className="text-xs tracking-widest uppercase opacity-70">{name}</p>
      <p className="font-display text-4xl leading-none">{points}</p>
    </div>
  );
}
