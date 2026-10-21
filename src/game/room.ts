import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import {
  applyPrompt,
  blockedName,
  emptyMemory,
  findWord,
  initialScores,
  promptLands,
  randomWord,
  rankOf,
  roundScore,
  schoolSpread,
  standIns,
  topN,
  type PromptMemory,
} from "./engine";
import {
  CLUES_PER,
  CLUE_MS,
  DEAL_MS,
  MAX_DEALS,
  MAX_PLAYERS,
  MIN_SIDE,
  NAME_MS,
  REVEAL_MS,
  otherSide,
  type Side,
} from "./rules";

export type RoomStatus = "lobby" | "cast" | "clue" | "deal" | "name" | "reveal" | "match";
export type Pull = "idle" | "tight" | "bolt" | "miss";
export type SeatRole = "skipper" | "fisheries" | "school";

export type RoomPlayer = { id: string; handle: string; team: Side; used: number };
export type RoomClue = { text: string; dead: boolean };

export type RoomDeal = {
  index: number;
  total: number;
  left: string;
  right: string;
  yours: "left" | "right" | null;
};

export type RoomResult = {
  cycle: number;
  half: number;
  fisheries: Side;
  school: Side;
  secretName: string;
  guessName: string;
  rank: number;
  distance: number;
  fisheriesPoints: number;
  schoolPoints: number;
};

export type RoomView = {
  code: string;
  version: number;
  status: RoomStatus;
  amberName: string;
  tideName: string;
  cycles: number;
  cycle: number;
  half: 0 | 1;
  round: number;
  rounds: number;
  fisheries: Side | null;
  school: Side | null;
  skipperId: string | null;
  you: RoomPlayer | null;
  youAre: SeatRole | null;
  players: RoomPlayer[];
  standIn: string | null;
  secret: string | null;
  blurs: { fisheries: string; school: string } | null;
  chips: { id: string; name: string }[];
  deadline: number | null;
  clockMs: number | null;
  holdMs: number | null;
  clues: RoomClue[];
  slotsLeft: number;
  boat: { fisheries: number; school: number };
  spread: number;
  net: number;
  pull: Pull;
  deal: RoomDeal | null;
  result: RoomResult | null;
  results: RoomResult[];
  tally: { amber: number; tide: number };
};

export type RoomResponse = { ok: true; room: RoomView } | { ok: false; error: string };

const seatSchema = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);
const teamSchema = z.enum(["amber", "tide"]);
const handleSchema = z.string().min(1).max(24);
const codeSchema = z.string().min(4).max(4);
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Role = "fisheries" | "school";

type Deal = {
  leftText: string;
  rightText: string;
  leftPlayer: string;
  rightPlayer: string;
  leftRole: Role;
  rightRole: Role;
  choice: "left" | "right" | "none" | null;
};

type Meta = {
  first: Side | null;
  skipperId: string | null;
  schoolStandIn: string | null;
  fisheriesStandIn: string | null;
  past: { amber: string[]; tide: string[] };
  deal: number;
  deals: Deal[];
  spread: number;
  net: number;
  lastPull: Pull;
  pulls: number;
  guessId: string | null;
  holdMs: number | null;
};

type RoomRow = {
  code: string;
  status: string;
  amber_name: string;
  tide_name: string;
  cycles: number;
  cycle: number;
  half: number;
  secret_id: string | null;
  scores: unknown;
  memory: unknown;
  used: unknown;
  deadline: number | null;
  version: number;
  meta: unknown;
};

type PlayerRow = { id: string; handle: string; team: string };

type PromptRow = { id: number; player_id: string; body: string; shrug: boolean };

type ResultRow = {
  cycle: number;
  half: number;
  setter: string;
  swayer: string;
  secret_name: string;
  guess_name: string;
  rank: number;
  distance: number;
  fisheries_points: number;
  school_points: number;
};

function cleanHandle(raw: string, fallback: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, 16);
  return cleaned || fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumMap(value: unknown): Record<string, number> {
  const raw = asObject(value);
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(raw)) {
    const n = Number(item);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function memoryFrom(value: unknown): PromptMemory {
  const raw = asObject(value);
  return {
    repeats: new Map(Object.entries(asNumMap(raw.repeats))),
    nameHits: new Map(Object.entries(asNumMap(raw.nameHits))),
    attacks: Number(raw.attacks) || 0,
  };
}

function memoryTo(memory: PromptMemory) {
  return {
    repeats: Object.fromEntries(memory.repeats),
    nameHits: Object.fromEntries(memory.nameHits),
    attacks: memory.attacks,
  };
}

function scoresFrom(value: unknown) {
  const scores = initialScores();
  for (const [id, score] of Object.entries(asNumMap(value))) scores.set(id, score);
  return scores;
}

function sideOf(value: string): Side {
  return value === "tide" ? "tide" : "amber";
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function emptyMeta(first: Side | null = null): Meta {
  return {
    first,
    skipperId: null,
    schoolStandIn: null,
    fisheriesStandIn: null,
    past: { amber: [], tide: [] },
    deal: 0,
    deals: [],
    spread: 0.34,
    net: 0.22,
    lastPull: "idle",
    pulls: 0,
    guessId: null,
    holdMs: null,
  };
}

function metaFrom(value: unknown): Meta {
  const raw = asObject(value);
  const past = asObject(raw.past);
  const base = emptyMeta(raw.first === "tide" || raw.first === "amber" ? raw.first : null);
  const deals = Array.isArray(raw.deals) ? raw.deals.map(dealFrom).filter((deal): deal is Deal => deal != null) : [];
  const pull = raw.lastPull;
  return {
    ...base,
    skipperId: typeof raw.skipperId === "string" ? raw.skipperId : null,
    schoolStandIn: typeof raw.schoolStandIn === "string" ? raw.schoolStandIn : null,
    fisheriesStandIn: typeof raw.fisheriesStandIn === "string" ? raw.fisheriesStandIn : null,
    past: { amber: asStringList(past.amber), tide: asStringList(past.tide) },
    deal: Number.isFinite(Number(raw.deal)) ? Number(raw.deal) : 0,
    deals,
    spread: Number.isFinite(Number(raw.spread)) ? Number(raw.spread) : 0.34,
    net: Number.isFinite(Number(raw.net)) ? Number(raw.net) : 0.22,
    lastPull: pull === "tight" || pull === "bolt" || pull === "miss" ? pull : "idle",
    pulls: Number.isFinite(Number(raw.pulls)) ? Number(raw.pulls) : 0,
    guessId: typeof raw.guessId === "string" ? raw.guessId : null,
    holdMs: Number.isFinite(Number(raw.holdMs)) ? Math.max(0, Number(raw.holdMs)) : null,
  };
}

function dealFrom(value: unknown): Deal | null {
  const raw = asObject(value);
  const leftRole = raw.leftRole === "school" ? "school" : raw.leftRole === "fisheries" ? "fisheries" : null;
  const rightRole = raw.rightRole === "school" ? "school" : raw.rightRole === "fisheries" ? "fisheries" : null;
  if (!leftRole || !rightRole) return null;
  if (typeof raw.leftText !== "string" || typeof raw.rightText !== "string") return null;
  const choice = raw.choice;
  return {
    leftText: raw.leftText,
    rightText: raw.rightText,
    leftPlayer: typeof raw.leftPlayer === "string" ? raw.leftPlayer : "",
    rightPlayer: typeof raw.rightPlayer === "string" ? raw.rightPlayer : "",
    leftRole,
    rightRole,
    choice: choice === "left" || choice === "right" || choice === "none" ? choice : null,
  };
}

function fisheriesOf(half: number, meta: Meta): Side {
  const first = meta.first ?? "amber";
  return Number(half) === 0 ? first : otherSide(first);
}

function clockFor(status: string): number | null {
  if (status === "clue") return CLUE_MS;
  if (status === "deal") return DEAL_MS;
  if (status === "name") return NAME_MS;
  if (status === "reveal") return REVEAL_MS;
  return null;
}

function pickSkipper(pool: RoomPlayer[], past: string[]): { id: string; past: string[] } {
  const ids = new Set(pool.map((player) => player.id));
  let history = past.filter((id) => ids.has(id));
  let fresh = pool.filter((player) => !history.includes(player.id));
  if (fresh.length === 0) {
    history = [];
    fresh = pool;
  }
  const choice = fresh[Math.floor(Math.random() * fresh.length)] ?? pool[0]!;
  return { id: choice.id, past: [...history, choice.id] };
}

function clueDone(players: RoomPlayer[], skipperId: string | null): boolean {
  const crew = players.filter((player) => player.id !== skipperId);
  return crew.length > 0 && crew.every((player) => player.used >= CLUES_PER);
}

async function dropSeat(sql: Sql, playerId: string) {
  const rows = await sql<{ room_code: string }>`
    delete from sway_players where id = ${playerId} returning room_code
  `;
  const roomCode = rows[0]?.room_code;
  if (!roomCode) return;
  const left = await sql<{ n: number }>`
    select count(*)::int as n from sway_players where room_code = ${roomCode}
  `;
  if ((left[0]?.n ?? 0) === 0) {
    await sql`delete from sway_rooms where code = ${roomCode}`;
    return;
  }
  await sql`update sway_rooms set version = version + 1 where code = ${roomCode}`;
}

async function loadRoom(sql: Sql, code: string): Promise<RoomRow | null> {
  const rows = await sql<RoomRow>`select * from sway_rooms where code = ${code}`;
  return rows[0] ?? null;
}

async function loadPlayers(sql: Sql, code: string): Promise<PlayerRow[]> {
  return sql<PlayerRow>`
    select id, handle, team from sway_players where room_code = ${code} order by joined_at asc
  `;
}

function playersOf(rows: PlayerRow[], used: Record<string, number>): RoomPlayer[] {
  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    team: sideOf(row.team),
    used: used[row.id] ?? 0,
  }));
}

function codeOf(): string {
  let code = "";
  for (let i = 0; i < 4; i += 1) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

function startError(players: RoomPlayer[]): string | null {
  const amber = players.filter((player) => player.team === "amber").length;
  const tide = players.filter((player) => player.team === "tide").length;
  if (amber + tide < MIN_SIDE * 2) return "Need at least four people, two on each side.";
  if (amber < MIN_SIDE || tide < MIN_SIDE) return "Each side needs two, so the skipper still has a crew.";
  if (Math.abs(amber - tide) > 1) return "Keep the sides within one player of each other.";
  if (amber + tide > MAX_PLAYERS) return "This room is too full.";
  return null;
}

async function healLegacy(sql: Sql, room: RoomRow): Promise<boolean> {
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set status = 'lobby', secret_id = null, deadline = null, meta = '{}'::jsonb, version = version + 1
    where code = ${room.code} and version = ${room.version}
    returning version
  `;
  return updated.length > 0;
}

async function healSkipper(sql: Sql, room: RoomRow, meta: Meta, players: RoomPlayer[]): Promise<boolean> {
  if (room.status === "lobby" || room.status === "reveal" || room.status === "match") return false;
  if (!meta.first || !meta.skipperId) return false;
  if (players.some((player) => player.id === meta.skipperId)) return false;
  const fisheries = fisheriesOf(room.half, meta);
  const pool = players.filter((player) => player.team === fisheries);
  if (pool.length === 0) return false;
  const picked = pickSkipper(pool, meta.past[fisheries]);
  const next: Meta = {
    ...meta,
    skipperId: picked.id,
    past: { ...meta.past, [fisheries]: picked.past },
  };
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set meta = ${json(next)}::jsonb, version = version + 1
    where code = ${room.code} and version = ${room.version}
    returning version
  `;
  return updated.length > 0;
}

async function openRound(
  sql: Sql,
  room: RoomRow,
  cycle: number,
  half: number,
  base: Meta,
  expect: string,
): Promise<boolean> {
  const players = playersOf(await loadPlayers(sql, room.code), {});
  const fisheries = fisheriesOf(half, base);
  const pool = players.filter((player) => player.team === fisheries);
  if (!base.first || pool.length === 0) return false;
  const secret = randomWord();
  const stands = standIns(secret.id);
  const scores = initialScores();
  scores.set(secret.id, (scores.get(secret.id) ?? 0) + 2.4);
  const picked = pickSkipper(pool, base.past[fisheries]);
  const meta: Meta = {
    ...base,
    skipperId: picked.id,
    schoolStandIn: stands.schoolId,
    fisheriesStandIn: stands.fisheriesId,
    past: { ...base.past, [fisheries]: picked.past },
    deal: 0,
    deals: [],
    spread: 0.34,
    net: 0.22,
    lastPull: "idle",
    pulls: 0,
    guessId: null,
    holdMs: null,
  };
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set status = 'cast', cycle = ${cycle}, half = ${half}, secret_id = ${secret.id},
        scores = ${json(Object.fromEntries(scores))}::jsonb,
        memory = ${json(memoryTo(emptyMemory()))}::jsonb,
        used = '{}'::jsonb,
        deadline = null,
        meta = ${json(meta)}::jsonb,
        version = version + 1
    where code = ${room.code} and version = ${room.version} and status = ${expect}
    returning version
  `;
  return updated.length > 0;
}

async function closeClue(sql: Sql, room: RoomRow): Promise<boolean> {
  if (!room.secret_id) return false;
  const meta = metaFrom(room.meta);
  const players = playersOf(await loadPlayers(sql, room.code), {});
  const prompts = await sql<PromptRow>`
    select id, player_id, body, shrug
    from sway_prompts
    where room_code = ${room.code} and cycle = ${room.cycle} and half = ${room.half} and shrug = false
    order by id asc
  `;
  const fisheries = fisheriesOf(room.half, meta);
  const teamOf = new Map(players.map((player) => [player.id, player.team]));
  const fishLines = prompts.filter((row) => teamOf.get(row.player_id) === fisheries);
  const schoolLines = prompts.filter((row) => teamOf.get(row.player_id) === otherSide(fisheries));
  const count = Math.min(MAX_DEALS, fishLines.length, schoolLines.length);
  const deals: Deal[] = [];
  for (let i = 0; i < count; i += 1) {
    const fish = fishLines[i]!;
    const school = schoolLines[i]!;
    const flip = Math.random() < 0.5;
    deals.push(
      flip
        ? {
            leftText: fish.body,
            rightText: school.body,
            leftPlayer: fish.player_id,
            rightPlayer: school.player_id,
            leftRole: "fisheries",
            rightRole: "school",
            choice: null,
          }
        : {
            leftText: school.body,
            rightText: fish.body,
            leftPlayer: school.player_id,
            rightPlayer: fish.player_id,
            leftRole: "school",
            rightRole: "fisheries",
            choice: null,
          },
    );
  }
  const next: Meta = {
    ...meta,
    deals,
    deal: 0,
    spread: schoolSpread(schoolLines.map((row) => row.body)),
    net: 0.22,
    lastPull: "idle",
    pulls: 0,
    guessId: null,
    holdMs: null,
  };
  const status = deals.length > 0 ? "deal" : "name";
  const deadline = Date.now() + (deals.length > 0 ? DEAL_MS : NAME_MS);
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set status = ${status}, deadline = ${deadline}, meta = ${json(next)}::jsonb, version = version + 1
    where code = ${room.code} and version = ${room.version} and status = 'clue'
    returning version
  `;
  return updated.length > 0;
}

async function resolveDeal(sql: Sql, room: RoomRow, choice: "left" | "right" | null): Promise<boolean> {
  if (!room.secret_id) return false;
  const meta = metaFrom(room.meta);
  const current = meta.deals[meta.deal];
  if (!current || current.choice != null) return false;
  let scores = scoresFrom(room.scores);
  let memory = memoryFrom(room.memory);
  let pull: Pull = "miss";
  let applied = false;
  if (choice) {
    const text = choice === "left" ? current.leftText : current.rightText;
    const beforeRank = rankOf(scores, room.secret_id);
    const beforeScore = scores.get(room.secret_id) ?? 0;
    const nextScores = applyPrompt(scores, text, memory, room.secret_id);
    scores = nextScores.scores;
    const afterRank = rankOf(scores, room.secret_id);
    const afterScore = scores.get(room.secret_id) ?? 0;
    if (nextScores.shrug) pull = "miss";
    else if (afterRank < beforeRank || afterScore > beforeScore + 0.05) pull = "tight";
    else if (afterRank > beforeRank || afterScore < beforeScore - 0.05) pull = "bolt";
    current.choice = choice;
    applied = true;
  } else {
    current.choice = "none";
  }
  const deals = meta.deals.map((deal, index) => (index === meta.deal ? current : deal));
  let net = meta.net;
  if (pull === "tight") net = Math.min(1, net + 0.16);
  else if (pull === "bolt") net = Math.max(0.16, net - 0.14);
  const nextIndex = meta.deal + 1;
  const more = nextIndex < deals.length;
  const next: Meta = {
    ...meta,
    deals,
    deal: more ? nextIndex : meta.deal,
    lastPull: pull,
    pulls: meta.pulls + (applied ? 1 : 0),
    net,
  };
  const status = more ? "deal" : "name";
  const deadline = Date.now() + (more ? DEAL_MS : NAME_MS);
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set status = ${status},
        deadline = ${deadline},
        scores = ${json(Object.fromEntries(scores))}::jsonb,
        memory = ${json(memoryTo(memory))}::jsonb,
        meta = ${json(next)}::jsonb,
        version = version + 1
    where code = ${room.code} and version = ${room.version} and status = 'deal'
    returning version
  `;
  return updated.length > 0;
}

function packResult(room: RoomRow, guessId: string | null) {
  const secretId = room.secret_id ?? "";
  const scores = scoresFrom(room.scores);
  const scored = roundScore(guessId, secretId, scores);
  const secret = findWord(secretId);
  const guess = guessId ? findWord(guessId) : undefined;
  return {
    ...scored,
    secretName: secret?.name ?? "Unknown",
    guessName: guess?.name ?? "—",
    guessStored: guess?.id ?? "",
  };
}

async function writeResult(sql: Sql, room: RoomRow, guessId: string | null) {
  if (!room.secret_id) return;
  const meta = metaFrom(room.meta);
  const fisheries = fisheriesOf(room.half, meta);
  const school = otherSide(fisheries);
  const packed = packResult(room, guessId);
  await sql`
    insert into sway_results (
      room_code, cycle, half, setter, swayer, secret_id, secret_name, guess_id, guess_name,
      rank, distance, points, fisheries_points, school_points
    ) values (
      ${room.code}, ${room.cycle}, ${room.half}, ${fisheries}, ${school},
      ${room.secret_id}, ${packed.secretName}, ${packed.guessStored}, ${packed.guessName},
      ${packed.rank}, ${packed.distance}, ${packed.fisheries}, ${packed.fisheries}, ${packed.school}
    )
    on conflict (room_code, cycle, half) do nothing
  `;
}

async function finishName(sql: Sql, room: RoomRow, guessId: string | null): Promise<boolean> {
  if (!room.secret_id) return false;
  const word = guessId ? findWord(guessId) : undefined;
  const stored = word?.id ?? null;
  const meta = { ...metaFrom(room.meta), guessId: stored, holdMs: null };
  const deadline = Date.now() + REVEAL_MS;
  const updated = await sql<{ version: number }>`
    update sway_rooms
    set status = 'reveal', deadline = ${deadline}, meta = ${json(meta)}::jsonb, version = version + 1
    where code = ${room.code} and version = ${room.version} and status = 'name'
    returning version
  `;
  if (updated.length === 0) return false;
  await writeResult(sql, room, stored);
  return true;
}

async function ensureResult(sql: Sql, room: RoomRow) {
  if (!room.secret_id) return;
  const meta = metaFrom(room.meta);
  await writeResult(sql, room, meta.guessId);
}

async function expireIfNeeded(sql: Sql, code: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await loadRoom(sql, code);
    if (!room) return;
    if (room.status === "plant" || room.status === "sway") {
      if (!(await healLegacy(sql, room))) return;
      continue;
    }
    const meta = metaFrom(room.meta);
    const players = playersOf(await loadPlayers(sql, code), asNumMap(room.used));
    if (await healSkipper(sql, room, meta, players)) continue;
    const timedOut = room.deadline != null && Date.now() >= Number(room.deadline);
    if (room.status === "clue") {
      if (!timedOut && !clueDone(players, meta.skipperId)) return;
      if (!(await closeClue(sql, room))) continue;
      return;
    }
    if (room.status === "deal" && timedOut) {
      if (!(await resolveDeal(sql, room, null))) continue;
      return;
    }
    if (room.status === "name" && timedOut) {
      if (!(await finishName(sql, room, null))) continue;
      return;
    }
    return;
  }
}

function resultOf(row: ResultRow): RoomResult {
  return {
    cycle: Number(row.cycle),
    half: Number(row.half),
    fisheries: sideOf(row.setter),
    school: sideOf(row.swayer),
    secretName: row.secret_name,
    guessName: row.guess_name,
    rank: Number(row.rank),
    distance: Number(row.distance),
    fisheriesPoints: Number(row.fisheries_points),
    schoolPoints: Number(row.school_points),
  };
}

function addTally(results: RoomResult[]): { amber: number; tide: number } {
  const tally = { amber: 0, tide: 0 };
  for (const row of results) {
    tally[row.fisheries] += row.fisheriesPoints;
    tally[row.school] += row.schoolPoints;
  }
  return tally;
}

async function viewOf(sql: Sql, code: string, playerId: string): Promise<RoomResponse> {
  await expireIfNeeded(sql, code);
  const room = await loadRoom(sql, code);
  if (!room) return { ok: false, error: "No room with that code." };
  if (room.status === "reveal") await ensureResult(sql, room);
  const meta = metaFrom(room.meta);
  const used = asNumMap(room.used);
  const players = playersOf(await loadPlayers(sql, code), used);
  const you = players.find((player) => player.id === playerId) ?? null;
  const playing = room.status !== "lobby" && room.status !== "match";
  const fisheries = meta.first && playing ? fisheriesOf(room.half, meta) : meta.first && room.status === "reveal" ? fisheriesOf(room.half, meta) : null;
  const school = fisheries ? otherSide(fisheries) : null;
  const youAre: SeatRole | null =
    you && fisheries && you.id === meta.skipperId
      ? "skipper"
      : you && fisheries && you.team === fisheries
        ? "fisheries"
        : you && school && you.team === school
          ? "school"
          : null;
  const showBlur = Boolean(you && youAre && youAre !== "skipper" && room.status !== "lobby" && room.status !== "match");
  const blurId = youAre === "fisheries" ? meta.fisheriesStandIn : youAre === "school" ? meta.schoolStandIn : null;
  const blurWord = showBlur && blurId ? findWord(blurId) : undefined;
  const showSecret = room.status === "reveal" && room.secret_id;
  const secretWord = showSecret ? findWord(room.secret_id ?? "") : undefined;
  const scores = scoresFrom(room.scores);
  const chips =
    youAre === "skipper" && room.status === "name"
      ? topN(scores, 5).map((row) => ({ id: row.id, name: row.name }))
      : [];
  const prompts = await sql<PromptRow>`
    select id, player_id, body, shrug
    from sway_prompts
    where room_code = ${code} and cycle = ${room.cycle} and half = ${room.half}
    order by id asc
    limit 120
  `;
  const clues =
    you == null
      ? []
      : prompts
          .filter((row) => row.player_id === you.id)
          .map((row) => ({ text: row.body, dead: Boolean(row.shrug) }));
  const boat = { fisheries: 0, school: 0 };
  if (fisheries) {
    const teamOf = new Map(players.map((player) => [player.id, player.team]));
    for (const row of prompts) {
      if (row.shrug) continue;
      const team = teamOf.get(row.player_id);
      if (team === fisheries) boat.fisheries += 1;
      else if (team === school) boat.school += 1;
    }
  }
  const timed = room.status === "clue" || room.status === "deal" || room.status === "name" || room.status === "reveal";
  const current = meta.deals[meta.deal];
  const deal: RoomDeal | null =
    room.status === "deal" && current
      ? {
          index: meta.deal,
          total: meta.deals.length,
          left: current.leftText,
          right: current.rightText,
          yours:
            you && current.leftPlayer === you.id ? "left" : you && current.rightPlayer === you.id ? "right" : null,
        }
      : null;
  const resultRows = await sql<ResultRow>`
    select cycle, half, setter, swayer, secret_name, guess_name, rank, distance,
           fisheries_points, school_points
    from sway_results
    where room_code = ${code}
    order by id asc
  `;
  const mapped = resultRows.map(resultOf);
  const tally = addTally(mapped);
  const currentResult =
    mapped.find((row) => row.cycle === Number(room.cycle) && row.half === Number(room.half)) ?? null;
  const fishBlur = meta.fisheriesStandIn ? findWord(meta.fisheriesStandIn) : undefined;
  const schoolBlur = meta.schoolStandIn ? findWord(meta.schoolStandIn) : undefined;
  const spread = room.status === "deal" || room.status === "name" || room.status === "reveal" ? meta.spread : 0.34;
  const net = room.status === "deal" || room.status === "name" || room.status === "reveal" ? meta.net : 0.22;
  const rounds = Math.max(1, Number(room.cycles)) * 2;
  const round = (Math.max(1, Number(room.cycle)) - 1) * 2 + (Number(room.half) === 1 ? 2 : 1);
  const status = (["lobby", "cast", "clue", "deal", "name", "reveal", "match"] as const).includes(
    room.status as RoomStatus,
  )
    ? (room.status as RoomStatus)
    : "lobby";
  return {
    ok: true,
    room: {
      code: room.code,
      version: Number(room.version),
      status,
      amberName: room.amber_name,
      tideName: room.tide_name,
      cycles: Number(room.cycles),
      cycle: Number(room.cycle),
      half: Number(room.half) === 1 ? 1 : 0,
      round,
      rounds,
      fisheries,
      school,
      skipperId: meta.skipperId,
      you,
      youAre: status === "lobby" || status === "match" ? null : youAre,
      players,
      standIn: blurWord?.name ?? null,
      secret: secretWord?.name ?? null,
      blurs:
        status === "reveal" && fishBlur && schoolBlur
          ? { fisheries: fishBlur.name, school: schoolBlur.name }
          : null,
      chips,
      deadline: timed && room.deadline ? Number(room.deadline) : null,
      clockMs: clockFor(status),
      holdMs: status === "reveal" ? meta.holdMs : null,
      clues,
      slotsLeft: Math.max(0, CLUES_PER - (you?.used ?? 0)),
      boat,
      spread,
      net,
      pull: status === "cast" || status === "clue" || status === "lobby" ? "idle" : meta.lastPull,
      deal,
      result: status === "reveal" ? currentResult : null,
      results: status === "match" ? mapped : [],
      tally,
    },
  };
}

const seatInput = z.object({
  playerId: seatSchema,
  handle: handleSchema,
  team: teamSchema,
});

export const createRoomFn = createServerFn({ method: "POST" })
  .validator(seatInput)
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const handle = cleanHandle(data.handle, "");
    if (!handle) return { ok: false, error: "Add a name so your team can see you." };
    await dropSeat(sql, data.playerId);
    let code = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      code = codeOf();
      const clash = await sql<{ code: string }>`select code from sway_rooms where code = ${code}`;
      if (clash.length === 0) break;
      code = "";
    }
    if (!code) return { ok: false, error: "Couldn't open a room. Try again." };
    await sql`insert into sway_rooms (code) values (${code})`;
    await sql`
      insert into sway_players (id, room_code, handle, team)
      values (${data.playerId}, ${code}, ${handle}, ${data.team})
    `;
    return viewOf(sql, code, data.playerId);
  });

export const joinRoomFn = createServerFn({ method: "POST" })
  .validator(seatInput.extend({ code: codeSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const handle = cleanHandle(data.handle, "");
    if (!handle) return { ok: false, error: "Add a name so your team can see you." };
    const room = await loadRoom(sql, code);
    if (!room) return { ok: false, error: "No room with that code." };
    const roster = await loadPlayers(sql, code);
    const already = roster.some((player) => player.id === data.playerId);
    if (already) {
      if (room.status === "lobby") {
        await sql`
          update sway_players set handle = ${handle}, team = ${data.team}
          where id = ${data.playerId} and room_code = ${code}
        `;
        await sql`update sway_rooms set version = version + 1 where code = ${code}`;
      }
      return viewOf(sql, code, data.playerId);
    }
    if (room.status !== "lobby") return { ok: false, error: "That room already started." };
    if (roster.length >= MAX_PLAYERS) return { ok: false, error: "That room is full." };
    await dropSeat(sql, data.playerId);
    await sql`
      insert into sway_players (id, room_code, handle, team)
      values (${data.playerId}, ${code}, ${handle}, ${data.team})
    `;
    await sql`update sway_rooms set version = version + 1 where code = ${code}`;
    return viewOf(sql, code, data.playerId);
  });

export const syncRoomFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    return viewOf(sql, data.code.toUpperCase(), data.playerId);
  });

export const chooseTeamFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, team: teamSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) return { ok: false, error: "No room with that code." };
    if (room.status !== "lobby") return { ok: false, error: "Teams are locked. The match already started." };
    const updated = await sql`
      update sway_players set team = ${data.team}
      where id = ${data.playerId} and room_code = ${code}
      returning id
    `;
    if (updated.length === 0) return { ok: false, error: "You're not in this room." };
    await sql`update sway_rooms set version = version + 1 where code = ${code} and status = 'lobby'`;
    return viewOf(sql, code, data.playerId);
  });

export const setLobbyFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: codeSchema,
      playerId: seatSchema,
      cycles: z.number().int().min(1).max(3).optional(),
      amberName: z.string().max(24).optional(),
      tideName: z.string().max(24).optional(),
    }),
  )
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) return { ok: false, error: "No room with that code." };
    if (room.status !== "lobby") return viewOf(sql, code, data.playerId);
    const seated = await sql<{ id: string }>`
      select id from sway_players where id = ${data.playerId} and room_code = ${code}
    `;
    if (seated.length === 0) return { ok: false, error: "You're not in this room." };
    const amber = data.amberName != null ? cleanHandle(data.amberName, "Amber") : room.amber_name;
    const tide = data.tideName != null ? cleanHandle(data.tideName, "Tide") : room.tide_name;
    const cycles = data.cycles ?? room.cycles;
    await sql`
      update sway_rooms
      set amber_name = ${amber}, tide_name = ${tide}, cycles = ${cycles}, version = version + 1
      where code = ${code} and status = 'lobby'
    `;
    return viewOf(sql, code, data.playerId);
  });

export const startRoomFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) return { ok: false, error: "No room with that code." };
    if (room.status !== "lobby") return viewOf(sql, code, data.playerId);
    const players = playersOf(await loadPlayers(sql, code), {});
    if (!players.some((player) => player.id === data.playerId)) return { ok: false, error: "You're not in this room." };
    const problem = startError(players);
    if (problem) return { ok: false, error: problem };
    const first: Side = Math.random() < 0.5 ? "amber" : "tide";
    const opened = await openRound(sql, room, 1, 0, emptyMeta(first), "lobby");
    if (!opened) return viewOf(sql, code, data.playerId);
    await sql`delete from sway_prompts where room_code = ${code}`;
    await sql`delete from sway_results where room_code = ${code}`;
    return viewOf(sql, code, data.playerId);
  });

export const castNetFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "cast") return viewOf(sql, code, data.playerId);
      const meta = metaFrom(room.meta);
      if (meta.skipperId !== data.playerId) return { ok: false, error: "Only the skipper casts." };
      const deadline = Date.now() + CLUE_MS;
      const updated = await sql<{ version: number }>`
        update sway_rooms
        set status = 'clue', deadline = ${deadline}, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'cast'
        returning version
      `;
      if (updated.length > 0) return viewOf(sql, code, data.playerId);
    }
    return viewOf(sql, code, data.playerId);
  });

export const feedClueFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, text: z.string().max(120) }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const text = data.text.trim().slice(0, 80);
    if (!text) return { ok: false, error: "Type a cast first." };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await expireIfNeeded(sql, code);
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "clue" || !room.secret_id) return viewOf(sql, code, data.playerId);
      const meta = metaFrom(room.meta);
      const used = asNumMap(room.used);
      const players = playersOf(await loadPlayers(sql, code), used);
      const you = players.find((player) => player.id === data.playerId);
      if (!you) return { ok: false, error: "You're not in this room." };
      if (you.id === meta.skipperId) return { ok: false, error: "The skipper watches this part." };
      if ((used[you.id] ?? 0) >= CLUES_PER) return { ok: false, error: "You've used your three casts." };
      if (room.deadline != null && Date.now() >= Number(room.deadline)) return viewOf(sql, code, data.playerId);
      const fisheries = fisheriesOf(room.half, meta);
      const standIn = you.team === fisheries ? meta.fisheriesStandIn : meta.schoolStandIn;
      if (blockedName(text, room.secret_id, standIn)) {
        return { ok: false, error: "Rejected — don't name a word that close." };
      }
      const prior = await sql<{ body: string }>`
        select body from sway_prompts
        where room_code = ${code} and cycle = ${room.cycle} and half = ${room.half} and player_id = ${you.id}
      `;
      if (prior.some((row) => row.body.trim().toLowerCase() === text.toLowerCase())) {
        return { ok: false, error: "Rejected — you already cast that line." };
      }
      const normalized = text.toLowerCase().replace(/[^a-z0-9'\s-]/g, " ").replace(/\s+/g, " ").trim();
      if (!normalized) return { ok: false, error: "Type a word the water knows, or a trait." };
      const dead = !promptLands(text);
      const nextUsed = { ...used, [you.id]: (used[you.id] ?? 0) + 1 };
      const updated = await sql<{ version: number }>`
        update sway_rooms
        set used = ${json(nextUsed)}::jsonb, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'clue'
        returning version
      `;
      if (updated.length === 0) continue;
      await sql`
        insert into sway_prompts (room_code, cycle, half, player_id, body, shrug, resisted, rank)
        values (${code}, ${room.cycle}, ${room.half}, ${you.id}, ${text}, ${dead}, false, 0)
      `;
      return viewOf(sql, code, data.playerId);
    }
    return { ok: false, error: "The room was busy. Cast again." };
  });

export const chooseDealFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, choice: z.enum(["left", "right"]) }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    let target: number | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expireIfNeeded(sql, code);
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "deal") return viewOf(sql, code, data.playerId);
      const meta = metaFrom(room.meta);
      if (target == null) target = meta.deal;
      else if (meta.deal !== target) return viewOf(sql, code, data.playerId);
      if (meta.skipperId !== data.playerId) return { ok: false, error: "Only the skipper chooses." };
      if (room.deadline != null && Date.now() >= Number(room.deadline)) return viewOf(sql, code, data.playerId);
      if (await resolveDeal(sql, room, data.choice)) return viewOf(sql, code, data.playerId);
    }
    return { ok: false, error: "That deal already moved. Watch the water." };
  });

export const nameWordFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, wordId: z.string().min(1).max(64) }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const word = findWord(data.wordId);
    if (!word) return { ok: false, error: "That word isn't in the bank." };
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expireIfNeeded(sql, code);
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "name") return viewOf(sql, code, data.playerId);
      const meta = metaFrom(room.meta);
      if (meta.skipperId !== data.playerId) return { ok: false, error: "Only the skipper names the fish." };
      if (room.deadline != null && Date.now() >= Number(room.deadline)) return viewOf(sql, code, data.playerId);
      if (await finishName(sql, room, word.id)) return viewOf(sql, code, data.playerId);
    }
    return viewOf(sql, code, data.playerId);
  });

async function advanceReveal(sql: Sql, room: RoomRow): Promise<boolean> {
  const meta = metaFrom(room.meta);
  let cycle = Number(room.cycle);
  let half = Number(room.half);
  let done = false;
  if (half === 0) half = 1;
  else if (cycle < Number(room.cycles)) {
    cycle += 1;
    half = 0;
  } else done = true;
  if (done) {
    const updated = await sql<{ version: number }>`
      update sway_rooms
      set status = 'match', deadline = null, version = version + 1
      where code = ${room.code} and version = ${room.version} and status = 'reveal'
      returning version
    `;
    return updated.length > 0;
  }
  return openRound(sql, room, cycle, half, meta, "reveal");
}

export const advanceRoomFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "reveal") return viewOf(sql, code, data.playerId);
      const seated = await sql<{ id: string }>`
        select id from sway_players where id = ${data.playerId} and room_code = ${code}
      `;
      if (seated.length === 0) return { ok: false, error: "You're not in this room." };
      if (await advanceReveal(sql, room)) return viewOf(sql, code, data.playerId);
    }
    return viewOf(sql, code, data.playerId);
  });

export const holdRevealFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "reveal") return viewOf(sql, code, data.playerId);
      const seated = await sql<{ id: string }>`
        select id from sway_players where id = ${data.playerId} and room_code = ${code}
      `;
      if (seated.length === 0) return { ok: false, error: "You're not in this room." };
      const meta = metaFrom(room.meta);
      const paused = meta.holdMs != null;
      const remain = paused
        ? meta.holdMs
        : room.deadline != null
          ? Math.max(0, Number(room.deadline) - Date.now())
          : REVEAL_MS;
      const next = { ...meta, holdMs: paused ? null : remain };
      const deadline = paused ? Date.now() + (remain ?? 0) : null;
      const updated = await sql<{ version: number }>`
        update sway_rooms
        set deadline = ${deadline}, meta = ${json(next)}::jsonb, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'reveal'
        returning version
      `;
      if (updated.length > 0) return viewOf(sql, code, data.playerId);
    }
    return viewOf(sql, code, data.playerId);
  });

export const rematchRoomFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const room = await loadRoom(sql, code);
    if (!room) return { ok: false, error: "No room with that code." };
    if (room.status !== "match") return viewOf(sql, code, data.playerId);
    const seated = await sql<{ id: string }>`
      select id from sway_players where id = ${data.playerId} and room_code = ${code}
    `;
    if (seated.length === 0) return { ok: false, error: "You're not in this room." };
    await sql`delete from sway_prompts where room_code = ${code}`;
    await sql`delete from sway_results where room_code = ${code}`;
    await sql`
      update sway_rooms
      set status = 'lobby', cycle = 1, half = 0, secret_id = null,
          scores = '{}'::jsonb, memory = '{}'::jsonb, used = '{}'::jsonb,
          deadline = null, meta = '{}'::jsonb, version = version + 1
      where code = ${code}
    `;
    return viewOf(sql, code, data.playerId);
  });

export const leaveRoomFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await dropSeat(sql, data.playerId);
    return { ok: true };
  });
