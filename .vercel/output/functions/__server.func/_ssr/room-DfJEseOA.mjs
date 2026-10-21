import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as findWord, c as otherSide, d as rankOf, h as traitDistance, i as emptyMemory, l as pointsFor, m as topN, n as CLOCK_MS, o as initialScores, r as applyPrompt, s as leadingGuess } from "./rules-BN6M6ngA.mjs";
import { a as string, i as object, r as number, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/room-DfJEseOA.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var _0002_rooms_default = "create table if not exists sway_rooms (\n  code text primary key,\n  status text not null default 'lobby',\n  amber_name text not null default 'Amber',\n  tide_name text not null default 'Tide',\n  cycles int not null default 1,\n  cycle int not null default 1,\n  half int not null default 0,\n  secret_id text,\n  scores jsonb not null default '{}'::jsonb,\n  memory jsonb not null default '{}'::jsonb,\n  used jsonb not null default '{}'::jsonb,\n  deadline bigint,\n  version int not null default 0,\n  created_at timestamptz not null default now()\n);\n\ncreate table if not exists sway_players (\n  id text primary key,\n  room_code text not null references sway_rooms (code) on delete cascade,\n  handle text not null,\n  team text not null,\n  joined_at timestamptz not null default now()\n);\n\ncreate index if not exists sway_players_room_idx on sway_players (room_code);\n\ncreate table if not exists sway_prompts (\n  id serial primary key,\n  room_code text not null references sway_rooms (code) on delete cascade,\n  cycle int not null,\n  half int not null,\n  player_id text not null,\n  body text not null,\n  shrug boolean not null default false,\n  resisted boolean not null default false,\n  rank int not null,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists sway_prompts_room_idx on sway_prompts (room_code, cycle, half);\n\ncreate table if not exists sway_results (\n  id serial primary key,\n  room_code text not null references sway_rooms (code) on delete cascade,\n  cycle int not null,\n  half int not null,\n  setter text not null,\n  swayer text not null,\n  secret_id text not null,\n  secret_name text not null,\n  guess_id text not null,\n  guess_name text not null,\n  rank int not null,\n  distance real not null,\n  points int not null\n);\n";
var _0003_room_result_uniq_default = "create unique index if not exists sway_results_half_idx on sway_results (room_code, cycle, half);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({
			"/migrations/0002_rooms.sql": _0002_rooms_default,
			"/migrations/0003_room_result_uniq.sql": _0003_room_result_uniq_default
		});
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
var seatSchema = string().regex(/^[a-zA-Z0-9-]{8,64}$/);
var teamSchema = _enum(["amber", "tide"]);
var handleSchema = string().min(1).max(24);
var codeSchema = string().min(4).max(4);
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function cleanHandle(raw, fallback) {
	return raw.replace(/\s+/g, " ").trim().slice(0, 16) || fallback;
}
function asObject(value) {
	if (!value) return {};
	if (typeof value === "string") try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
	return typeof value === "object" ? value : {};
}
function asNumMap(value) {
	const raw = asObject(value);
	const out = {};
	for (const [key, item] of Object.entries(raw)) {
		const n = Number(item);
		if (Number.isFinite(n)) out[key] = n;
	}
	return out;
}
function memoryFrom(value) {
	const raw = asObject(value);
	return {
		repeats: new Map(Object.entries(asNumMap(raw.repeats))),
		nameHits: new Map(Object.entries(asNumMap(raw.nameHits))),
		attacks: Number(raw.attacks) || 0
	};
}
function memoryTo(memory) {
	return {
		repeats: Object.fromEntries(memory.repeats),
		nameHits: Object.fromEntries(memory.nameHits),
		attacks: memory.attacks
	};
}
function scoresFrom(value) {
	const scores = initialScores();
	for (const [id, score] of Object.entries(asNumMap(value))) scores.set(id, score);
	return scores;
}
function sideOf(value) {
	return value === "tide" ? "tide" : "amber";
}
function setterOf(half) {
	return half === 1 ? "tide" : "amber";
}
async function dropSeat(sql, playerId) {
	const roomCode = (await sql`
    delete from sway_players where id = ${playerId} returning room_code
  `)[0]?.room_code;
	if (!roomCode) return;
	if (((await sql`
    select count(*)::int as n from sway_players where room_code = ${roomCode}
  `)[0]?.n ?? 0) === 0) {
		await sql`delete from sway_rooms where code = ${roomCode}`;
		return;
	}
	await sql`update sway_rooms set version = version + 1 where code = ${roomCode}`;
}
async function loadRoom(sql, code) {
	return (await sql`select * from sway_rooms where code = ${code}`)[0] ?? null;
}
async function loadPlayers(sql, code) {
	return sql`
    select id, handle, team from sway_players where room_code = ${code} order by joined_at asc
  `;
}
function playersOf(rows, used) {
	return rows.map((row) => ({
		id: row.id,
		handle: row.handle,
		team: sideOf(row.team),
		used: used[row.id] ?? 0
	}));
}
function swayDone(players, swayer) {
	const side = players.filter((player) => player.team === swayer);
	return side.length === 0 || side.every((player) => player.used >= 20);
}
async function viewOf(sql, code, playerId) {
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	if (room.status === "reveal" && room.secret_id) await writeResult(sql, room);
	const players = playersOf(await loadPlayers(sql, code), asNumMap(room.used));
	const you = players.find((player) => player.id === playerId) ?? null;
	const setter = setterOf(room.half);
	const swayer = otherSide(setter);
	const secretWord = room.secret_id ? findWord(room.secret_id) : void 0;
	const showSecret = room.status === "sway" || room.status === "reveal" || room.status === "match" || room.status === "plant" && you?.team === setter;
	const scores = scoresFrom(room.scores);
	const board = showSecret && room.status === "sway" && secretWord ? topN(scores, 5).map((row) => ({
		id: row.id,
		name: row.name
	})) : [];
	const prompts = await sql`
    select player_id, body, shrug, resisted, rank
    from sway_prompts
    where room_code = ${code} and cycle = ${room.cycle} and half = ${room.half}
    order by id desc
    limit 80
  `;
	const handles = new Map(players.map((player) => [player.id, player.handle]));
	const results = await sql`
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
			secret: showSecret && secretWord ? {
				id: secretWord.id,
				name: secretWord.name
			} : null,
			secretRank: showSecret && secretWord && room.status === "sway" ? rankOf(scores, secretWord.id) : null,
			board,
			deadline: room.status === "sway" && room.deadline ? Number(room.deadline) : null,
			prompts: prompts.map((line) => ({
				handle: handles.get(line.player_id) ?? "Someone",
				text: line.body,
				shrug: Boolean(line.shrug),
				resisted: Boolean(line.resisted),
				rank: line.rank
			})),
			results: results.map((row) => ({
				...row,
				setter: sideOf(row.setter),
				swayer: sideOf(row.swayer),
				half: Number(row.half),
				cycle: Number(row.cycle),
				rank: Number(row.rank),
				distance: Number(row.distance),
				points: Number(row.points)
			})),
			perPlayer: 20
		}
	};
}
async function writeResult(sql, room) {
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
async function closeIfNeeded(sql, code) {
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const room = await loadRoom(sql, code);
		if (!room || room.status !== "sway" || !room.secret_id) return;
		const players = playersOf(await loadPlayers(sql, code), asNumMap(room.used));
		const swayer = otherSide(setterOf(room.half));
		if (!(room.deadline != null && Date.now() >= Number(room.deadline)) && !swayDone(players, swayer)) return;
		if ((await sql`
      update sway_rooms
      set status = 'reveal', deadline = null, version = version + 1
      where code = ${code} and version = ${room.version} and status = 'sway'
      returning version
    `).length === 0) continue;
		await writeResult(sql, room);
		return;
	}
}
function codeOf() {
	let code = "";
	for (let i = 0; i < 4; i += 1) code += ALPHABET[Math.floor(Math.random() * 32)];
	return code;
}
var seatInput = object({
	playerId: seatSchema,
	handle: handleSchema,
	team: teamSchema
});
var createRoomFn_createServerFn_handler = createServerRpc({
	id: "744a2dc11cf9209366cbcc6d5b8c65bf5e4dddb86a4fab8fd44dd34fb9e4c417",
	name: "createRoomFn",
	filename: "src/game/room.ts"
}, (opts) => createRoomFn.__executeServer(opts));
var createRoomFn = createServerFn({ method: "POST" }).validator(seatInput).handler(createRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const handle = cleanHandle(data.handle, "");
	if (!handle) return {
		ok: false,
		error: "Add a name so your team can see you."
	};
	await dropSeat(sql, data.playerId);
	let code = "";
	for (let attempt = 0; attempt < 6; attempt += 1) {
		code = codeOf();
		if ((await sql`select code from sway_rooms where code = ${code}`).length === 0) break;
		code = "";
	}
	if (!code) return {
		ok: false,
		error: "Couldn't open a room. Try again."
	};
	await sql`
      insert into sway_rooms (code) values (${code})
    `;
	await sql`
      insert into sway_players (id, room_code, handle, team)
      values (${data.playerId}, ${code}, ${handle}, ${data.team})
    `;
	return viewOf(sql, code, data.playerId);
});
var joinRoomFn_createServerFn_handler = createServerRpc({
	id: "e6cb560bb39f1da4185f1e2f1def0ac5eb80464723dbf85b43a49fb17ed5ac6f",
	name: "joinRoomFn",
	filename: "src/game/room.ts"
}, (opts) => joinRoomFn.__executeServer(opts));
var joinRoomFn = createServerFn({ method: "POST" }).validator(seatInput.extend({ code: codeSchema })).handler(joinRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const handle = cleanHandle(data.handle, "");
	if (!handle) return {
		ok: false,
		error: "Add a name so your team can see you."
	};
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	const roster = await loadPlayers(sql, code);
	if (roster.some((player) => player.id === data.playerId)) {
		if (room.status === "lobby") {
			await sql`
          update sway_players set handle = ${handle}, team = ${data.team}
          where id = ${data.playerId} and room_code = ${code}
        `;
			await sql`update sway_rooms set version = version + 1 where code = ${code}`;
		}
		return viewOf(sql, code, data.playerId);
	}
	if (room.status !== "lobby") return {
		ok: false,
		error: "That room already started."
	};
	if (roster.length >= 29) return {
		ok: false,
		error: "That room is full."
	};
	await dropSeat(sql, data.playerId);
	await sql`
      insert into sway_players (id, room_code, handle, team)
      values (${data.playerId}, ${code}, ${handle}, ${data.team})
    `;
	await sql`update sway_rooms set version = version + 1 where code = ${code}`;
	return viewOf(sql, code, data.playerId);
});
var syncRoomFn_createServerFn_handler = createServerRpc({
	id: "1dd9208c0c921e22d516a74098a01cff9845ad73cf40f26c663cd3b5efdea9f0",
	name: "syncRoomFn",
	filename: "src/game/room.ts"
}, (opts) => syncRoomFn.__executeServer(opts));
var syncRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(syncRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	await closeIfNeeded(sql, code);
	return viewOf(sql, code, data.playerId);
});
var chooseTeamFn_createServerFn_handler = createServerRpc({
	id: "0f9d0093aafbe05c6c7b911de3cc1ef5bc498b5bc8932af1840964fa776bff48",
	name: "chooseTeamFn",
	filename: "src/game/room.ts"
}, (opts) => chooseTeamFn.__executeServer(opts));
var chooseTeamFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	team: teamSchema
})).handler(chooseTeamFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	if (room.status !== "lobby") return {
		ok: false,
		error: "Teams are locked. The match already started."
	};
	if ((await sql`
      update sway_players set team = ${data.team}
      where id = ${data.playerId} and room_code = ${code}
      returning id
    `).length === 0) return {
		ok: false,
		error: "You're not in this room."
	};
	await sql`update sway_rooms set version = version + 1 where code = ${code} and status = 'lobby'`;
	return viewOf(sql, code, data.playerId);
});
var setLobbyFn_createServerFn_handler = createServerRpc({
	id: "244562d352734ea00df14216079edf889e90307b125ffefb28e8e6aae4fc2e8e",
	name: "setLobbyFn",
	filename: "src/game/room.ts"
}, (opts) => setLobbyFn.__executeServer(opts));
var setLobbyFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	cycles: number().int().min(1).max(3).optional(),
	amberName: string().max(24).optional(),
	tideName: string().max(24).optional()
})).handler(setLobbyFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	if (room.status !== "lobby") return viewOf(sql, code, data.playerId);
	if ((await sql`
      select id from sway_players where id = ${data.playerId} and room_code = ${code}
    `).length === 0) return {
		ok: false,
		error: "You're not in this room."
	};
	await sql`
      update sway_rooms
      set amber_name = ${data.amberName != null ? cleanHandle(data.amberName, "Amber") : room.amber_name}, tide_name = ${data.tideName != null ? cleanHandle(data.tideName, "Tide") : room.tide_name}, cycles = ${data.cycles ?? room.cycles}, version = version + 1
      where code = ${code} and status = 'lobby'
    `;
	return viewOf(sql, code, data.playerId);
});
function startError(players) {
	const amber = players.filter((player) => player.team === "amber").length;
	const tide = players.filter((player) => player.team === "tide").length;
	if (amber + tide < 2) return "Need at least two people.";
	if (amber === 0 || tide === 0) return "Both sides need someone.";
	if (Math.abs(amber - tide) > 1) return "Keep the sides within one player of each other.";
	if (amber + tide > 29) return "This room is too full.";
	return null;
}
var startRoomFn_createServerFn_handler = createServerRpc({
	id: "16ec007b4d37f508e1979a1464e89d9c207b1b15378988b224a6cf0d5af947d0",
	name: "startRoomFn",
	filename: "src/game/room.ts"
}, (opts) => startRoomFn.__executeServer(opts));
var startRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(startRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	if (room.status !== "lobby") return viewOf(sql, code, data.playerId);
	const players = playersOf(await loadPlayers(sql, code), {});
	if (!players.some((player) => player.id === data.playerId)) return {
		ok: false,
		error: "You're not in this room."
	};
	const problem = startError(players);
	if (problem) return {
		ok: false,
		error: problem
	};
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
var lockWordFn_createServerFn_handler = createServerRpc({
	id: "89d3dd6d196c38f99c95e1cc4318861e553837f9cc1cef9aabbabbf2ca69604d",
	name: "lockWordFn",
	filename: "src/game/room.ts"
}, (opts) => lockWordFn.__executeServer(opts));
var lockWordFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	wordId: string().min(1).max(64)
})).handler(lockWordFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const word = findWord(data.wordId);
	if (!word) return {
		ok: false,
		error: "That word isn't in the bank."
	};
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const room = await loadRoom(sql, code);
		if (!room) return {
			ok: false,
			error: "No room with that code."
		};
		if (room.status !== "plant") return viewOf(sql, code, data.playerId);
		const you = playersOf(await loadPlayers(sql, code), {}).find((player) => player.id === data.playerId);
		if (!you) return {
			ok: false,
			error: "You're not in this room."
		};
		if (you.team !== setterOf(room.half)) return {
			ok: false,
			error: "The other side is planting."
		};
		const scores = initialScores();
		scores.set(word.id, (scores.get(word.id) ?? 0) + 2.4);
		const deadline = Date.now() + CLOCK_MS;
		if ((await sql`
        update sway_rooms
        set status = 'sway', secret_id = ${word.id},
            scores = ${JSON.stringify(Object.fromEntries(scores))}::jsonb,
            memory = ${JSON.stringify(memoryTo(emptyMemory()))}::jsonb,
            used = '{}'::jsonb, deadline = ${deadline}, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'plant'
        returning version
      `).length > 0) return viewOf(sql, code, data.playerId);
	}
	return {
		ok: false,
		error: "Someone else just locked a word."
	};
});
var feedPromptFn_createServerFn_handler = createServerRpc({
	id: "31d287e61fb64842b370739786f6c09d5b6956aed3ddb909922e0bb1b17a6138",
	name: "feedPromptFn",
	filename: "src/game/room.ts"
}, (opts) => feedPromptFn.__executeServer(opts));
var feedPromptFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	text: string().max(120)
})).handler(feedPromptFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const text = data.text.trim().slice(0, 80);
	if (!text) return {
		ok: false,
		error: "Type a prompt first."
	};
	for (let attempt = 0; attempt < 8; attempt += 1) {
		await closeIfNeeded(sql, code);
		const room = await loadRoom(sql, code);
		if (!room) return {
			ok: false,
			error: "No room with that code."
		};
		if (room.status !== "sway" || !room.secret_id) return viewOf(sql, code, data.playerId);
		const used = asNumMap(room.used);
		const you = playersOf(await loadPlayers(sql, code), used).find((player) => player.id === data.playerId);
		if (!you) return {
			ok: false,
			error: "You're not in this room."
		};
		const swayer = otherSide(setterOf(room.half));
		if (you.team !== swayer) return {
			ok: false,
			error: "Your side is watching this one."
		};
		if (you.used >= 20) return {
			ok: false,
			error: "You've used your 20."
		};
		if (room.deadline != null && Date.now() >= Number(room.deadline)) {
			await closeIfNeeded(sql, code);
			return viewOf(sql, code, data.playerId);
		}
		const scores = scoresFrom(room.scores);
		const memory = memoryFrom(room.memory);
		const applied = applyPrompt(scores, text, memory, room.secret_id);
		const rank = rankOf(applied.scores, room.secret_id);
		const nextUsed = {
			...used,
			[you.id]: you.used + 1
		};
		if ((await sql`
        update sway_rooms
        set scores = ${JSON.stringify(Object.fromEntries(applied.scores))}::jsonb,
            memory = ${JSON.stringify(memoryTo(memory))}::jsonb,
            used = ${JSON.stringify(nextUsed)}::jsonb,
            version = version + 1
        where code = ${code} and version = ${room.version} and status = 'sway'
        returning version
      `).length === 0) continue;
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
	return {
		ok: false,
		error: "The room was busy. Send it again."
	};
});
var advanceRoomFn_createServerFn_handler = createServerRpc({
	id: "d6b44cd8f5eed690c4894021d24b4ff5f06b4587ab084a29866c309b11b06f62",
	name: "advanceRoomFn",
	filename: "src/game/room.ts"
}, (opts) => advanceRoomFn.__executeServer(opts));
var advanceRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(advanceRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const room = await loadRoom(sql, code);
		if (!room) return {
			ok: false,
			error: "No room with that code."
		};
		if (room.status !== "reveal") return viewOf(sql, code, data.playerId);
		if ((await sql`
        select id from sway_players where id = ${data.playerId} and room_code = ${code}
      `).length === 0) return {
			ok: false,
			error: "You're not in this room."
		};
		let status = "plant";
		let cycle = room.cycle;
		let half = room.half;
		if (room.half === 0) half = 1;
		else if (room.cycle < room.cycles) {
			cycle += 1;
			half = 0;
		} else status = "match";
		if ((await sql`
        update sway_rooms
        set status = ${status}, cycle = ${cycle}, half = ${half}, secret_id = null,
            deadline = null, version = version + 1
        where code = ${code} and version = ${room.version} and status = 'reveal'
        returning version
      `).length > 0) return viewOf(sql, code, data.playerId);
	}
	return viewOf(sql, code, data.playerId);
});
var rematchRoomFn_createServerFn_handler = createServerRpc({
	id: "2d56ba24a4facf4f4d204e7b2469591ade9eae1b71ece9a188a0167a8ee73803",
	name: "rematchRoomFn",
	filename: "src/game/room.ts"
}, (opts) => rematchRoomFn.__executeServer(opts));
var rematchRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(rematchRoomFn_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const code = data.code.toUpperCase();
	const room = await loadRoom(sql, code);
	if (!room) return {
		ok: false,
		error: "No room with that code."
	};
	if (room.status !== "match") return viewOf(sql, code, data.playerId);
	if ((await sql`
      select id from sway_players where id = ${data.playerId} and room_code = ${code}
    `).length === 0) return {
		ok: false,
		error: "You're not in this room."
	};
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
var leaveRoomFn_createServerFn_handler = createServerRpc({
	id: "cb2afaa8c62a6d82793661c62ceb712f81ab0eb4e4c11e947d00e92643db4ead",
	name: "leaveRoomFn",
	filename: "src/game/room.ts"
}, (opts) => leaveRoomFn.__executeServer(opts));
var leaveRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(leaveRoomFn_createServerFn_handler, async ({ data }) => {
	await dropSeat(await getSql(), data.playerId);
	return { ok: true };
});
//#endregion
export { advanceRoomFn_createServerFn_handler, chooseTeamFn_createServerFn_handler, createRoomFn_createServerFn_handler, feedPromptFn_createServerFn_handler, joinRoomFn_createServerFn_handler, leaveRoomFn_createServerFn_handler, lockWordFn_createServerFn_handler, rematchRoomFn_createServerFn_handler, setLobbyFn_createServerFn_handler, startRoomFn_createServerFn_handler, syncRoomFn_createServerFn_handler };
