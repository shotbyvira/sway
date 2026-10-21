import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import {
  applyPrompt,
  emptyMemory,
  findWord,
  initialScores,
  leadingGuess,
  pointsFor,
  rankOf,
  topN,
  traitDistance,
  type PromptMemory,
} from "./engine";
import { CLOCK_MS, MAX_PLAYERS, PER_PLAYER, otherSide, type Side } from "./rules";

export type RoomStatus = "lobby" | "plant" | "sway" | "reveal" | "match";

export type RoomPlayer = { id: string; handle: string; team: Side; used: number };

export type RoomPrompt = {
  handle: string;
  text: string;
  shrug: boolean;
  resisted: boolean;
  rank: number;
};

export type RoomResult = {
  cycle: number;
  half: number;
  setter: Side;
  swayer: Side;
  secretName: string;
  guessName: string;
  rank: number;
  distance: number;
  points: number;
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
  setter: Side;
  swayer: Side;
  you: RoomPlayer | null;
  players: RoomPlayer[];
  secret: { id: string; name: string } | null;
  secretRank: number | null;
  board: { id: string; name: string }[];
  deadline: number | null;
  prompts: RoomPrompt[];
  results: RoomResult[];
  perPlayer: number;
};

export type RoomResponse = { ok: true; room: RoomView } | { ok: false; error: string };

const seatSchema = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);
const teamSchema = z.enum(["amber", "tide"]);
const handleSchema = z.string().min(1).max(24);
const codeSchema = z.string().min(4).max(4);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type RoomRow = {
  code: string;
  status: RoomStatus;
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
};

type PlayerRow = { id: string; handle: string; team: string };

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

function setterOf(half: number): Side {
  return half === 1 ? "tide" : "amber";
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

function swayDone(players: RoomPlayer[], swayer: Side): boolean {
  const side = players.filter((player) => player.team === swayer);
  return side.length === 0 || side.every((player) => player.used >= PER_PLAYER);
}

async function viewOf(sql: Sql, code: string, playerId: string): Promise<RoomResponse> {
  const room = await loadRoom(sql, code);
  if (!room) return { ok: false, error: "No room with that code." };
  if (room.status === "reveal" && room.secret_id) await writeResult(sql, room);
  const roster = await loadPlayers(sql, code);
  const used = asNumMap(room.used);
  const players = playersOf(roster, used);
  const you = players.find((player) => player.id === playerId) ?? null;
  const setter = setterOf(room.half);
  const swayer = otherSide(setter);
  const secretWord = room.secret_id ? findWord(room.secret_id) : undefined;
  const showSecret =
    room.status === "sway" ||
    room.status === "reveal" ||
    room.status === "match" ||
    (room.status === "plant" && you?.team === setter);
  const scores = scoresFrom(room.scores);
  const board =
    showSecret && room.status === "sway" && secretWord
      ? topN(scores, 5).map((row) => ({ id: row.id, name: row.name }))
      : [];
  const prompts = await sql<{
    player_id: string;
    body: string;
    shrug: boolean;
    resisted: boolean;
    rank: number;
  }>`
    select player_id, body, shrug, resisted, rank
    from sway_prompts
    where room_code = ${code} and cycle = ${room.cycle} and half = ${room.half}
    order by id desc
    limit 80
  `;
  const handles = new Map(players.map((player) => [player.id, player.handle]));
  const results = await sql<RoomResult>`
    select cycle, half, setter, swayer, secret_name as "secretName", guess_name as "guessName",
           rank, distance, points
    from sway_results
    where room_code = ${code}
    order by id asc
  `;
  return {
    ok: true,
    room: {
      code: room.code,
      version: room.version,
      status: room.status,
      amberName: room.amber_name,
      tideName: room.tide_name,
      cycles: room.cycles,
      cycle: room.cycle,
      half: room.half === 1 ? 1 : 0,
      setter,
      swayer,
      you,
      players,
      secret: showSecret && secretWord ? { id: secretWord.id, name: secretWord.name } : null,
      secretRank: showSecret && secretWord && room.status === "sway" ? rankOf(scores, secretWord.id) : null,
      board,
      deadline: room.status === "sway" && room.deadline ? Number(room.deadline) : null,
      prompts: prompts.map((line) => ({
        handle: handles.get(line.player_id) ?? "Someone",
        text: line.body,
        shrug: Boolean(line.shrug),
        resisted: Boolean(line.resisted),
        rank: line.rank,
      })),
      results: results.map((row) => ({
        ...row,
        setter: sideOf(row.setter),
        swayer: sideOf(row.swayer),
        half: Number(row.half),
        cycle: Number(row.cycle),
        rank: Number(row.rank),
        distance: Number(row.distance),
        points: Number(row.points),
      })),
      perPlayer: PER_PLAYER,
    },
  };
}

async function writeResult(sql: Sql, room: RoomRow) {
  if (!room.secret_id) return;
  const scores = scoresFrom(room.scores);
  const guess = leadingGuess(scores);
  const rank = rankOf(scores, room.secret_id);
  const distance = traitDistance(room.secret_id, guess.id);
  const points = pointsFor(rank, distance, guess.id, room.secret_id);
  const secret = findWord(room.secret_id);
  const swayer = otherSide(setterOf(room.half));
  await sql`
    insert into sway_results (
      room_code, cycle, half, setter, swayer, secret_id, secret_name, guess_id, guess_name, rank, distance, points
    ) values (
      ${room.code}, ${room.cycle}, ${room.half}, ${setterOf(room.half)}, ${swayer},
      ${room.secret_id}, ${secret?.name ?? room.secret_id}, ${guess.id}, ${guess.name},
      ${rank}, ${distance}, ${points}
    )
    on conflict (room_code, cycle, half) do nothing
  `;
}

async function closeIfNeeded(sql: Sql, code: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const room = await loadRoom(sql, code);
    if (!room || room.status !== "sway" || !room.secret_id) return;
    const roster = await loadPlayers(sql, code);
    const players = playersOf(roster, asNumMap(room.used));
    const swayer = otherSide(setterOf(room.half));
    const timedOut = room.deadline != null && Date.now() >= Number(room.deadline);
    if (!timedOut && !swayDone(players, swayer)) return;
    const updated = await sql<{ version: number }>`
      update sway_rooms
      set status = 'reveal', deadline = null, version = version + 1
      where code = ${code} and version = ${room.version} and status = 'sway'
      returning version
    `;
    if (updated.length === 0) continue;
    await writeResult(sql, room);
    return;
  }
}

function codeOf(): string {
  let code = "";
  for (let i = 0; i < 4; i += 1) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
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
    await sql`
      insert into sway_rooms (code) values (${code})
    `;
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
    const code = data.code.toUpperCase();
    await closeIfNeeded(sql, code);
    return viewOf(sql, code, data.playerId);
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

function startError(players: RoomPlayer[]): string | null {
  const amber = players.filter((player) => player.team === "amber").length;
  const tide = players.filter((player) => player.team === "tide").length;
  if (amber + tide < 2) return "Need at least two people.";
  if (amber === 0 || tide === 0) return "Both sides need someone.";
  if (Math.abs(amber - tide) > 1) return "Keep the sides within one player of each other.";
  if (amber + tide > MAX_PLAYERS) return "This room is too full.";
  return null;
}

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
    await sql`delete from sway_prompts where room_code = ${code}`;
    await sql`delete from sway_results where room_code = ${code}`;
    await sql`
      update sway_rooms
      set status = 'plant', cycle = 1, half = 0, secret_id = null,
          scores = '{}'::jsonb, memory = '{}'::jsonb, used = '{}'::jsonb,
          deadline = null, version = version + 1
      where code = ${code} and status = 'lobby'
    `;
    return viewOf(sql, code, data.playerId);
  });

export const lockWordFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, wordId: z.string().min(1).max(64) }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const word = findWord(data.wordId);
    if (!word) return { ok: false, error: "That word isn't in the bank." };
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "plant") return viewOf(sql, code, data.playerId);
      const players = playersOf(await loadPlayers(sql, code), {});
      const you = players.find((player) => player.id === data.playerId);
      if (!you) return { ok: false, error: "You're not in this room." };
      if (you.team !== setterOf(room.half)) return { ok: false, error: "The other side is planting." };
      const scores = initialScores();
      scores.set(word.id, (scores.get(word.id) ?? 0) + 2.4);
      const deadline = Date.now() + CLOCK_MS;
      const updated = await sql`
        update sway_rooms
        set status = 'sway', secret_id = ${word.id},
            scores = ${JSON.stringify(Object.fromEntries(scores))}::jsonb,
            memory = ${JSON.stringify(memoryTo(emptyMemory()))}::jsonb,
            used = '{}'::jsonb, deadline = ${deadline}, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'plant'
        returning version
      `;
      if (updated.length > 0) return viewOf(sql, code, data.playerId);
    }
    return { ok: false, error: "Someone else just locked a word." };
  });

export const feedPromptFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: codeSchema, playerId: seatSchema, text: z.string().max(120) }))
  .handler(async ({ data }): Promise<RoomResponse> => {
    const sql = await getSql();
    const code = data.code.toUpperCase();
    const text = data.text.trim().slice(0, 80);
    if (!text) return { ok: false, error: "Type a prompt first." };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await closeIfNeeded(sql, code);
      const room = await loadRoom(sql, code);
      if (!room) return { ok: false, error: "No room with that code." };
      if (room.status !== "sway" || !room.secret_id) return viewOf(sql, code, data.playerId);
      const used = asNumMap(room.used);
      const players = playersOf(await loadPlayers(sql, code), used);
      const you = players.find((player) => player.id === data.playerId);
      if (!you) return { ok: false, error: "You're not in this room." };
      const swayer = otherSide(setterOf(room.half));
      if (you.team !== swayer) return { ok: false, error: "Your side is watching this one." };
      if (you.used >= PER_PLAYER) return { ok: false, error: "You've used your 20." };
      if (room.deadline != null && Date.now() >= Number(room.deadline)) {
        await closeIfNeeded(sql, code);
        return viewOf(sql, code, data.playerId);
      }
      const scores = scoresFrom(room.scores);
      const memory = memoryFrom(room.memory);
      const applied = applyPrompt(scores, text, memory, room.secret_id);
      const rank = rankOf(applied.scores, room.secret_id);
      const nextUsed = { ...used, [you.id]: you.used + 1 };
      const updated = await sql`
        update sway_rooms
        set scores = ${JSON.stringify(Object.fromEntries(applied.scores))}::jsonb,
            memory = ${JSON.stringify(memoryTo(memory))}::jsonb,
            used = ${JSON.stringify(nextUsed)}::jsonb,
            version = version + 1
        where code = ${code} and version = ${room.version} and status = 'sway'
        returning version
      `;
      if (updated.length === 0) continue;
      await sql`
        insert into sway_prompts (room_code, cycle, half, player_id, body, shrug, resisted, rank)
        values (
          ${code}, ${room.cycle}, ${room.half}, ${you.id}, ${text},
          ${applied.shrug}, ${applied.resisted}, ${rank}
        )
      `;
      await closeIfNeeded(sql, code);
      return viewOf(sql, code, data.playerId);
    }
    return { ok: false, error: "The room was busy. Send it again." };
  });

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
      let status: RoomStatus = "plant";
      let cycle = room.cycle;
      let half = room.half;
      if (room.half === 0) half = 1;
      else if (room.cycle < room.cycles) {
        cycle += 1;
        half = 0;
      } else status = "match";
      const updated = await sql`
        update sway_rooms
        set status = ${status}, cycle = ${cycle}, half = ${half}, secret_id = null,
            deadline = null, version = version + 1
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
          deadline = null, version = version + 1
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
