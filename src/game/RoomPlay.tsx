import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Copy, Search } from "lucide-react";
import { netWord, pullCaption, spreadWord, useSea } from "./FishingStage";
import { searchWords } from "./engine";
import {
  advanceRoomFn,
  castNetFn,
  chooseDealFn,
  chooseTeamFn,
  createRoomFn,
  feedClueFn,
  holdRevealFn,
  joinRoomFn,
  leaveRoomFn,
  nameWordFn,
  rematchRoomFn,
  setLobbyFn,
  startRoomFn,
  syncRoomFn,
  type RoomPlayer,
  type RoomResponse,
  type RoomView,
} from "./room";
import { otherSide, type Side } from "./rules";
import {
  recalledRoom,
  rememberRoom,
  saveHandle,
  saveTeam,
  savedHandle,
  savedTeam,
  seatId,
} from "./seat";
import { play, type Cue } from "./sound";

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function cueRoom(prev: RoomView, next: RoomView) {
  let cue: Cue | null = null;
  if (prev.status !== next.status) {
    if (next.status === "clue") cue = "cast";
    else if (next.status === "name") cue = "name";
    else if (next.status === "reveal" && next.result) cue = next.result.fisheriesPoints >= 80 ? "catch" : next.result.fisheriesPoints > 0 ? "tight" : "miss";
    else if (next.status === "deal") cue = "deal";
  } else if (next.status === "deal" && next.deal && next.deal.index !== prev.deal?.index) {
    cue = "deal";
  }
  if (next.pull !== prev.pull && next.pull !== "idle") {
    cue = next.pull === "tight" ? "tight" : next.pull === "bolt" ? "bolt" : "dead";
  }
  if (next.clues.length > prev.clues.length) {
    cue = next.clues[next.clues.length - 1]?.dead ? "dead" : "accept";
  }
  if (cue) play(cue);
}

function sideLabel(side: Side, room: RoomView): string {
  return side === "amber" ? room.amberName : room.tideName;
}

function splitNote(players: RoomPlayer[]): { ok: boolean; text: string } {
  const amber = players.filter((player) => player.team === "amber").length;
  const tide = players.filter((player) => player.team === "tide").length;
  if (amber + tide < 4) return { ok: false, text: "Need at least four. Two on each side." };
  if (amber < 2 || tide < 2) return { ok: false, text: "Each side needs two, so the skipper still has crew." };
  if (Math.abs(amber - tide) > 1) return { ok: false, text: "Move someone over. Sides stay within one player." };
  return { ok: true, text: `${amber} against ${tide}. A toss picks who fishes first.` };
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
  const castNet = useServerFn(castNetFn);
  const feedClue = useServerFn(feedClueFn);
  const chooseDeal = useServerFn(chooseDealFn);
  const nameWord = useServerFn(nameWordFn);
  const advanceRoom = useServerFn(advanceRoomFn);
  const holdReveal = useServerFn(holdRevealFn);
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
  const pendingRef = useRef(false);

  const [room, setRoom] = useState<RoomView | null>(null);
  const [handle, setHandle] = useState("");
  const [team, setTeam] = useState<Side>("amber");
  const [codeText, setCodeText] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [amberDraft, setAmberDraft] = useState("Amber");
  const [tideDraft, setTideDraft] = useState("Tide");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  codeRef.current = room?.code ?? codeRef.current;

  function take(next: RoomView) {
    codeRef.current = next.code;
    rememberRoom(next.code);
    setRoom((prev) => {
      if (prev && prev.code === next.code && next.version < prev.version) return prev;
      if (prev) cueRoom(prev, next);
      return next;
    });
  }

  function apply(res: RoomResponse) {
    if (!res.ok) {
      setError(res.error);
      if (res.error.includes("No room")) {
        rememberRoom(null);
        codeRef.current = null;
        setRoom(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterLeave]);

  useEffect(() => {
    const playerId = seatId();
    playerIdRef.current = playerId;
    setHandle(savedHandle());
    setTeam(savedTeam());
    const saved = recalledRoom();
    if (!saved) return;
    let stop = false;
    void syncRef
      .current({ data: { code: saved, playerId } })
      .then((res) => {
        if (stop) return;
        if (res.ok && res.room.you) take(res.room);
        else rememberRoom(null);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
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
        .catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [room?.code]);

  useEffect(() => {
    if (!amberFocus.current && room) setAmberDraft(room.amberName);
    if (!tideFocus.current && room) setTideDraft(room.tideName);
  }, [room?.amberName, room?.tideName, room]);

  useEffect(() => {
    if (!room || room.holdMs != null) return;
    if (!room?.deadline || (room.status !== "clue" && room.status !== "deal" && room.status !== "name" && room.status !== "reveal")) return;
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
  }, [room?.status, room?.deadline, room?.code, room?.holdMs]);

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

  const found = useMemo(() => (query.trim() ? searchWords(query).slice(0, 6) : []), [query]);
  const diving = room != null && room.status !== "lobby";
  useSea({
    depth: diving ? "dive" : "surface",
    net: room?.net ?? 0.28,
    spread: room?.spread ?? 0.62,
    pull: room?.pull ?? "idle",
    secretName: room?.status === "reveal" ? room.secret : null,
    finale: room?.status === "reveal" && room.result ? (room.result.guessName === room.result.secretName ? "haul" : "slip") : null,
    finaleT: null,
    paused: room?.holdMs != null,
  });

  if (!room) {
    return (
      <section className="rise flex flex-1 flex-col">
        <h1 className="px-head">{intent === "join" ? "Join a boat" : "Open a boat"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {intent === "join"
            ? "Same code, your own phone. Your side casts together."
            : "You'll get a four-letter code. Both crews join from their own phones."}
        </p>
        <label className="mt-6 block">
          <span className="px-kicker">Your name</span>
          <input
            value={handle}
            maxLength={16}
            autoComplete="nickname"
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Maya"
            className="mt-1 w-full min-h-12 px-3 text-fg outline-none"
          />
        </label>
        <p className="px-kicker mt-4">Start on</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["amber", "tide"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setTeam(side)}
              className={
                "px-key min-h-12 " + (team === side ? (side === "amber" ? "on-amber" : "on-tide") : "")
              }
            >
              {side === "amber" ? "Amber" : "Tide"}
            </button>
          ))}
        </div>
        {intent === "join" && (
          <label className="mt-4 block">
            <span className="px-kicker">Room code</span>
            <input
              value={codeText}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setCodeText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
              placeholder="K7MQ"
              className="px-code mt-1 w-full min-h-14 bg-transparent text-center font-display text-3xl uppercase outline-none"
            />
          </label>
        )}
        {error && <p className="mt-4 text-sm text-warn">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={enter}
          className="px-commit mt-6 flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3 disabled:opacity-40"
        >
          {intent === "join" ? "▼ Join ▼" : "▼ Open the room ▼"}
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </section>
    );
  }

  const note = splitNote(room.players);
  const leftMs = room.holdMs != null ? room.holdMs : room.deadline != null ? Math.max(0, room.deadline - Date.now()) : 0;
  void tick;
  const skipper = room.players.find((player) => player.id === room.skipperId);
  const fishName = room.fisheries ? sideLabel(room.fisheries, room) : "";
  const schoolName = room.school ? sideLabel(room.school, room) : "";
  const clockMs = room.clockMs ?? 1;

  return (
    <section className="flex flex-1 flex-col">
      {room.status === "lobby" && (
        <div className="rise flex flex-1 flex-col">
          <p className="px-kicker">Room</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="px-code font-display text-6xl">{room.code}</p>
            <button type="button" onClick={() => void copyCode()} className="px-chip inline-flex min-h-11 items-center gap-2 px-3 text-sm">
              <Copy className="size-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">Share the code. The app hides the fish. A toss picks who holds the net.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <TeamColumn
              tone="amber"
              name={amberDraft}
              youId={room.you?.id ?? ""}
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
              youId={room.you?.id ?? ""}
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
          {room.you && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void run(() =>
                  chooseTeam({
                    data: { code: room.code, playerId: playerIdRef.current, team: otherSide(room.you!.team) },
                  }),
                )
              }
              className="px-chip mt-3 min-h-11 text-sm disabled:opacity-40"
            >
              Switch to {sideLabel(otherSide(room.you.team), room)}
            </button>
          )}
          <p className="px-kicker mt-4">Rounds each</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => pushNames({ cycles: n })}
                className={
                  "px-key min-h-12 text-sm " + (room.cycles === n ? "on-tide" : "")
                }
              >
                {n === 1 ? "One each" : `${n} each`}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{note.text} Sides swap after each catch, and the crews stay put.</p>
          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
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
            className="px-btn mt-4 flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3 disabled:opacity-40"
          >
            ▼ Toss for the net ▼
          </button>
          <button type="button" onClick={exitRoom} className="px-quiet mt-3">
            Leave room
          </button>
        </div>
      )}

      {room.status !== "lobby" && (
        <div className="rise flex flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-3">
            <p className="px-kicker">
              {room.code} · {room.round} of {room.rounds}
            </p>
            <p className="text-sm tabular-nums text-muted">
              {room.amberName} {room.tally.amber} · {room.tideName} {room.tally.tide}
            </p>
          </div>
          {diving && (
            <p className="mt-2 text-sm text-muted">
              {pullCaption(room.pull)} {netWord(room.net)} · {spreadWord(room.spread)}
            </p>
          )}
          {room.status === "cast" && room.fisheries && (
            <CastPanel
              room={room}
              fishName={fishName}
              schoolName={schoolName}
              skipper={skipper?.handle ?? "Skipper"}
              pending={pending}
              onCast={() => void run(() => castNet({ data: { code: room.code, playerId: playerIdRef.current } }))}
            />
          )}

          <div className="min-h-[34vh] flex-1" />
          {room.deadline != null && room.status !== "reveal" && room.status !== "cast" && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="px-kicker">
                  {room.status === "clue" ? "Casts" : room.status === "deal" ? "Deal" : "Name it"}
                </span>
                <span className={"tabular-nums " + (leftMs <= 5000 ? "text-warn" : "text-tide")}>{formatClock(leftMs)}</span>
              </div>
              <div className={"px-meter mt-1 " + (leftMs <= 5000 ? "warn" : "")}>
                <div
                  className={"h-full " + (leftMs <= 5000 ? "bg-warn" : "bg-tide")}
                  style={{ width: `${Math.max(0, Math.min(100, (leftMs / clockMs) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {room.status === "clue" && (
            <CluePanel
              room={room}
              draft={draft}
              setDraft={setDraft}
              pending={pending}
              onSubmit={() => {
                const text = draft;
                void run(async () => {
                  const res = await feedClue({ data: { code: room.code, playerId: playerIdRef.current, text } });
                  if (res.ok) setDraft("");
                  return res;
                });
              }}
            />
          )}

          {room.status === "deal" && room.deal && (
            <DealPanel
              room={room}
              pending={pending}
              onPick={(choice) =>
                void run(() => chooseDeal({ data: { code: room.code, playerId: playerIdRef.current, choice } }))
              }
            />
          )}

          {room.status === "name" && (
            <NamePanel
              room={room}
              query={query}
              setQuery={setQuery}
              found={found}
              pending={pending}
              onPick={(wordId) =>
                void run(() => nameWord({ data: { code: room.code, playerId: playerIdRef.current, wordId } }))
              }
            />
          )}

          {room.status === "reveal" && room.result && (
            <RevealPanel
              room={room}
              fishName={fishName}
              schoolName={schoolName}
              pending={pending}
              leftMs={leftMs}
              onHold={() => void run(() => holdReveal({ data: { code: room.code, playerId: playerIdRef.current } }))}
              onNext={() => void run(() => advanceRoom({ data: { code: room.code, playerId: playerIdRef.current } }))}
            />
          )}

          {room.status === "match" && (
            <MatchPanel
              room={room}
              pending={pending}
              onRematch={() => void run(() => rematchRoom({ data: { code: room.code, playerId: playerIdRef.current } }))}
            />
          )}

          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
          <button type="button" onClick={exitRoom} className="px-quiet mt-4">
            Leave room
          </button>
        </div>
      )}
    </section>
  );
}

function CastPanel({
  room,
  fishName,
  schoolName,
  skipper,
  pending,
  onCast,
}: {
  room: RoomView;
  fishName: string;
  schoolName: string;
  skipper: string;
  pending: boolean;
  onCast: () => void;
}) {
  const crew = room.players.filter((player) => player.team === room.fisheries);
  const idx = Math.max(0, crew.findIndex((player) => player.id === room.skipperId));
  const land = 720 + (crew.length > 0 ? (idx / crew.length) * 360 : 0);
  return (
    <div className="mt-4">
      <p className="text-sm text-tide">
        {fishName} holds the net. {schoolName} is the school.
      </p>
      <div className="compass" style={{ ["--land" as string]: `${land}deg` }} aria-hidden="true">
        <div className="compass-needle" />
      </div>
      <p className="text-center font-display text-3xl leading-none">{skipper}</p>
      <p className="mt-2 text-center text-sm text-muted">The needle picked the skipper. They do not know the fish.</p>
      {room.youAre === "skipper" ? (
        <button type="button" disabled={pending} onClick={onCast} className="px-commit mt-4 min-h-14 w-full px-4 disabled:opacity-40">
          ▼ Cast the net ▼
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted">Waiting for {skipper} to cast.</p>
      )}
      {room.youAre && room.youAre !== "skipper" && room.standIn && (
        <p className="px-panel mt-4 p-3 text-sm leading-relaxed text-muted">
          Your blur is <span className="text-fg">{room.standIn}</span>.{" "}
          {room.youAre === "school"
            ? "It is close, not the fish. Drag the school off the real one."
            : "It is a step off. Steer the net toward the real fish."}{" "}
          Don't name this blur, or a twin.
        </p>
      )}
    </div>
  );
}

function CluePanel({
  room,
  draft,
  setDraft,
  pending,
  onSubmit,
}: {
  room: RoomView;
  draft: string;
  setDraft: (value: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  const crew = room.youAre !== "skipper";
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">
        Accepted in the boat: {room.fisheries ? sideLabel(room.fisheries, room) : "Fisheries"} {room.boat.fisheries} ·{" "}
        {room.school ? sideLabel(room.school, room) : "School"} {room.boat.school}. First five from each side are dealt.
      </p>
      {room.youAre === "skipper" && (
        <p className="mt-3 text-sm leading-relaxed text-muted">Your crew is casting. You don't see the lines, and you don't know the fish.</p>
      )}
      {crew && room.standIn && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Blur: <span className="text-fg">{room.standIn}</span>.{" "}
          {room.youAre === "school" ? "Pull the fish away from the net." : "Pull the net onto the fish."} Three casts. A
          rejection doesn't spend one. Dead water does.
        </p>
      )}
      {crew && room.slotsLeft > 0 && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) onSubmit();
          }}
        >
          <input
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A trait, not the name"
            aria-label="Your cast"
            className="min-h-12 flex-1 px-3 text-fg outline-none"
          />
          <button type="submit" disabled={pending || !draft.trim()} className="px-commit min-h-12 px-3 disabled:opacity-40">
            Cast · {room.slotsLeft}
          </button>
        </form>
      )}
      {crew && room.slotsLeft === 0 && <p className="mt-3 text-sm text-tide">Your three casts are in.</p>}
      {room.clues.length > 0 && (
        <ul className="mt-3 space-y-2">
          {room.clues.map((clue, i) => (
            <li key={i} className={"px-say flex items-baseline justify-between gap-3 px-3 py-2 text-sm " + (clue.dead ? "is-bad" : "is-ok")}>
              <span className="text-fg">{clue.text}</span>
              <span className={clue.dead ? "text-warn" : "text-tide"}>{clue.dead ? "Dead water" : "Accepted"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DealPanel({
  room,
  pending,
  onPick,
}: {
  room: RoomView;
  pending: boolean;
  onPick: (choice: "left" | "right") => void;
}) {
  const deal = room.deal!;
  const cards = [
    { id: "left" as const, text: deal.left },
    { id: "right" as const, text: deal.right },
  ];
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">
        Deal {deal.index + 1} of {deal.total}. Two lines. Neither is labeled. {pullCaption(room.pull)}
      </p>
      <div className="mt-3 grid gap-3">
        {cards.map((card) =>
          room.youAre === "skipper" ? (
            <button
              key={card.id}
              type="button"
              disabled={pending}
              onClick={() => onPick(card.id)}
              className="px-say min-h-16 px-3 py-3 text-left text-lg leading-snug disabled:opacity-40"
            >
              {card.text}
            </button>
          ) : (
            <div key={card.id} className="px-say min-h-16 px-3 py-3 text-lg leading-snug">
              {card.text}
              {deal.yours === card.id && <span className="ml-2 text-sm text-tide">Yours</span>}
            </div>
          ),
        )}
      </div>
      {room.youAre !== "skipper" && <p className="mt-3 text-sm text-muted">Only the skipper can tap. Watch the school.</p>}
    </div>
  );
}

function NamePanel({
  room,
  query,
  setQuery,
  found,
  pending,
  onPick,
}: {
  room: RoomView;
  query: string;
  setQuery: (value: string) => void;
  found: { id: string; name: string }[];
  pending: boolean;
  onPick: (wordId: string) => void;
}) {
  if (room.youAre !== "skipper") {
    return <p className="mt-4 text-sm text-muted">The skipper is naming the catch. The word stays hidden until they lock it.</p>;
  }
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">Fifteen seconds. The top of the net, or search the bank.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {room.chips.map((chip) => (
          <button key={chip.id} type="button" disabled={pending} onClick={() => onPick(chip.id)} className="px-chip min-h-11 px-3 text-fg disabled:opacity-40">
            {chip.name}
          </button>
        ))}
      </div>
      <label className="px-field mt-3">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the bank"
          aria-label="Search the bank"
          className="min-h-12 w-full bg-transparent outline-none"
        />
      </label>
      <div className="mt-2 grid gap-1">
        {found.map((word) => (
          <button key={word.id} type="button" disabled={pending} onClick={() => onPick(word.id)} className="px-row disabled:opacity-40">
            {word.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function RevealPanel({
  room,
  fishName,
  schoolName,
  pending,
  leftMs,
  onHold,
  onNext,
}: {
  room: RoomView;
  fishName: string;
  schoolName: string;
  pending: boolean;
  leftMs: number;
  onHold: () => void;
  onNext: () => void;
}) {
  const result = room.result!;
  const caught = result.guessName === result.secretName;
  const paused = room.holdMs != null;
  const scene = leftMs > 0 || paused;
  return (
    <div className="mt-4">
      {scene ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="px-head">{caught ? "Hauling it up" : "Slipping through"}</p>
            <p className={"tabular-nums " + (paused ? "text-muted" : leftMs <= 3000 ? "text-warn" : "text-tide")}>{formatClock(leftMs)}</p>
          </div>
          <button type="button" disabled={pending} onClick={onHold} className="px-chip mt-3 min-h-12 px-3 disabled:opacity-40">
            {paused ? "Resume" : "Pause"}
          </button>
        </>
      ) : (
        <>
          <p className="px-head">{caught ? "Caught" : "It slipped"}</p>
          <p className="mt-3 text-lg text-fg">The fish was {result.secretName}.</p>
          <p className="mt-1 text-sm text-muted">
            {result.guessName === "—" ? "No name in time." : `The skipper said ${result.guessName}.`} It finished #{result.rank}.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ScoreTile name={fishName} role="Fisheries" points={result.fisheriesPoints} tone="tide" />
            <ScoreTile name={schoolName} role="School" points={result.schoolPoints} tone="amber" />
          </div>
          {room.blurs && (
            <p className="mt-3 text-sm text-muted">
              Fisheries were shown {room.blurs.fisheries}. The school was shown {room.blurs.school}.
            </p>
          )}
          <button type="button" disabled={pending} onClick={onNext} className="px-btn mt-4 min-h-12 w-full px-4 disabled:opacity-40">
            {room.round >= room.rounds ? "See the match" : "Next cast"}
          </button>
        </>
      )}
    </div>
  );
}

function MatchPanel({ room, pending, onRematch }: { room: RoomView; pending: boolean; onRematch: () => void }) {
  const amber = room.tally.amber;
  const tide = room.tally.tide;
  const winner = amber === tide ? "Split catch." : amber > tide ? `${room.amberName} takes it.` : `${room.tideName} takes it.`;
  return (
    <div className="mt-4">
      <p className="px-head">{winner}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ScoreTile name={room.amberName} role="Total" points={amber} tone="amber" />
        <ScoreTile name={room.tideName} role="Total" points={tide} tone="tide" />
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {room.results.map((row) => (
          <li key={`${row.cycle}-${row.half}`} className="flex justify-between gap-3">
            <span>
              {row.secretName} · {row.guessName}
            </span>
            <span className="tabular-nums text-fg">
              {row.fisheriesPoints}/{row.schoolPoints}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" disabled={pending} onClick={onRematch} className="px-btn mt-4 min-h-12 w-full px-4 disabled:opacity-40">
        Back to the trailer
      </button>
    </div>
  );
}

const SEAT_COLORS = [
  "var(--color-tide)",
  "var(--color-amber)",
  "var(--color-gold)",
  "var(--color-warn)",
  "var(--color-fg)",
  "var(--color-deep)",
];

function TeamColumn({
  tone,
  name,
  youId,
  players,
  onFocus,
  onChange,
  onBlur,
}: {
  tone: Side;
  name: string;
  youId: string;
  players: RoomPlayer[];
  onFocus: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className={"px-panel p-2 " + (tone === "amber" ? "tone-amber" : "tone-tide")}>
      <input
        value={name}
        maxLength={16}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-label={tone === "amber" ? "Amber crew name" : "Tide crew name"}
        className="w-full bg-transparent text-lg text-fg outline-none"
      />
      <ul className="mt-2 space-y-1">
        {players.map((player, index) => (
          <li key={player.id} className="flex items-center gap-2 truncate text-sm">
            <span className="seat-pip" style={{ background: SEAT_COLORS[index % SEAT_COLORS.length] }} />
            <span className={player.id === youId ? "text-fg" : "text-muted"}>
              {player.handle}
              {player.id === youId ? " · you" : ""}
            </span>
          </li>
        ))}
        {players.length === 0 && <li className="text-sm text-muted">Empty</li>}
      </ul>
    </div>
  );
}

function ScoreTile({ name, role, points, tone }: { name: string; role: string; points: number; tone: Side }) {
  return (
    <div className={"px-panel p-3 " + (tone === "amber" ? "tone-amber" : "tone-tide")}>
      <p className="px-kicker">{role}</p>
      <p className="mt-1 truncate text-fg">{name}</p>
      <p className="px-head">{points}</p>
    </div>
  );
}
