import { DurableObject } from "cloudflare:workers";
import { AsyncLocalStorage } from "node:async_hooks";
import { bindSql, installSqlScope, type Sql } from "@/lib/db";

const sqlScope = new AsyncLocalStorage<Sql>();
installSqlScope(sqlScope);

const SCHEMA = `
create table if not exists sway_rooms (
  code text primary key,
  status text not null default 'lobby',
  amber_name text not null default 'Amber',
  tide_name text not null default 'Tide',
  cycles integer not null default 1,
  cycle integer not null default 1,
  half integer not null default 0,
  secret_id text,
  scores text not null default '{}',
  memory text not null default '{}',
  used text not null default '{}',
  deadline integer,
  version integer not null default 0,
  created_at integer not null default (unixepoch() * 1000),
  meta text not null default '{}'
);
create table if not exists sway_players (
  id text primary key,
  room_code text not null,
  handle text not null,
  team text not null,
  joined_at integer not null default (unixepoch() * 1000)
);
create index if not exists sway_players_room_idx on sway_players (room_code);
create table if not exists sway_prompts (
  id integer primary key autoincrement,
  room_code text not null,
  cycle integer not null,
  half integer not null,
  player_id text not null,
  body text not null,
  shrug integer not null default 0,
  resisted integer not null default 0,
  rank integer not null,
  created_at integer not null default (unixepoch() * 1000)
);
create index if not exists sway_prompts_room_idx on sway_prompts (room_code, cycle, half);
create table if not exists sway_results (
  id integer primary key autoincrement,
  room_code text not null,
  cycle integer not null,
  half integer not null,
  setter text not null,
  swayer text not null,
  secret_id text not null,
  secret_name text not null,
  guess_id text not null,
  guess_name text not null,
  rank integer not null,
  distance real not null,
  points integer not null,
  fisheries_points integer not null default 0,
  school_points integer not null default 0
);
create unique index if not exists sway_results_half_idx on sway_results (room_code, cycle, half);
`;

function sqliteText(text: string, params: unknown[]): { sql: string; args: unknown[] } {
  const args: unknown[] = [];
  const sql = text
    .replace(/::jsonb/gi, "")
    .replace(/::int/gi, "")
    .replace(/\$(\d+)/g, (_match, index: string) => {
      const value = params[Number(index) - 1];
      args.push(typeof value === "boolean" ? (value ? 1 : 0) : value === undefined ? null : value);
      return "?";
    });
  return { sql, args };
}

function coerce(row: Record<string, unknown>): Record<string, unknown> {
  if ("shrug" in row) row.shrug = Boolean(row.shrug);
  if ("resisted" in row) row.resisted = Boolean(row.resisted);
  return row;
}

/**
 * One object holds every room. Requests queue here, so a cast and the deal
 * can't pass each other, and the log survives the next isolate.
 */
export class SwayRoom extends DurableObject {
  private ready = false;
  private sqlApi: Sql | null = null;

  private ensure() {
    if (this.ready) return;
    for (const statement of SCHEMA.split(";")) {
      const query = statement.trim();
      if (query) this.ctx.storage.sql.exec(query);
    }
    this.ready = true;
  }

  private sql(): Sql {
    this.ensure();
    if (this.sqlApi) return this.sqlApi;
    const exec = this.ctx.storage.sql;
    const run = <T>(text: string, params: unknown[] = []): Promise<T[]> => {
      const converted = sqliteText(text, params);
      const cursor = exec.exec(converted.sql, ...converted.args);
      return Promise.resolve(cursor.toArray().map((row) => coerce(row)) as T[]);
    };
    const sql = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      let text = strings[0] ?? "";
      for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
      return run<T>(text, values);
    }) as Sql;
    sql.query = run;
    sql.transaction = (fn) => this.ctx.storage.transaction(() => fn(sql));
    this.sqlApi = sql;
    return sql;
  }

  async play(op: string, data: unknown): Promise<unknown> {
    const sql = this.sql();
    const hinted = codeFrom(data);
    const before = hinted ? await versionOf(sql, hinted) : null;
    const { runOp } = await import("./room");
    const result = await sqlScope.run(sql, () => runOp(op, data));
    const code = codeFrom(result) ?? hinted;
    const after = code ? await versionOf(sql, code) : null;
    if (code && (op !== "sync" || before !== after)) {
      await bindSql(sql, () => this.fanout(code));
      await this.arm(sql);
    }
    return result;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a socket.", { status: 426 });
    }
    const url = new URL(request.url);
    const code = (url.searchParams.get("code") ?? "").toUpperCase();
    const seat = url.searchParams.get("seat") ?? "";
    if (!/^[A-Z0-9]{4}$/.test(code) || !/^[a-zA-Z0-9-]{8,64}$/.test(seat)) {
      return new Response("Bad room.", { status: 400 });
    }
    const { playerView, seatKey } = await import("./room");
    const playerId = await seatKey(seat);
    const sql = this.sql();
    const view = await sqlScope.run(sql, () => playerView(code, playerId));
    if (!view.ok || !view.room.you) return new Response("You're not in this room.", { status: 403 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [code, playerId]);
    pair[1].send(JSON.stringify(view));
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit);
  }

  async alarm() {
    const sql = this.sql();
    const now = Date.now();
    const due = await sql<{ code: string }>`
      select code from sway_rooms
      where deadline is not null and deadline <= ${now}
        and status in ('cast', 'clue', 'deal', 'name', 'reveal')
    `;
    const { touchRoom } = await import("./room");
    for (const row of due) {
      await sqlScope.run(sql, () => touchRoom(row.code));
      await sqlScope.run(sql, () => this.fanout(row.code));
    }
    await this.arm(sql);
  }

  private async fanout(code: string) {
    const sockets = this.ctx.getWebSockets(code);
    if (sockets.length === 0) return;
    const { playerView } = await import("./room");
    const sent = new Map<string, string>();
    for (const socket of sockets) {
      const playerId = this.ctx.getTags(socket)[1];
      if (!playerId) continue;
      let body = sent.get(playerId);
      if (!body) {
        const view = await playerView(code, playerId);
        body = JSON.stringify(view);
        sent.set(playerId, body);
      }
      try {
        socket.send(body);
      } catch {
        /* a closing phone */
      }
    }
  }

  private async arm(sql: Sql) {
    const rows = await sql<{ d: number | null }>`
      select min(deadline) as d from sway_rooms
      where deadline is not null and status in ('cast', 'clue', 'deal', 'name', 'reveal')
    `;
    const when = rows[0]?.d;
    if (when == null || !Number.isFinite(Number(when))) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Math.max(Date.now(), Number(when)));
  }
}

async function versionOf(sql: Sql, code: string): Promise<number | null> {
  const rows = await sql<{ version: number }>`select version from sway_rooms where code = ${code}`;
  return rows[0] ? Number(rows[0].version) : null;
}

function codeFrom(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if ("room" in value) {
    const room = (value as { room?: { code?: unknown } }).room;
    if (room && typeof room.code === "string") return room.code.toUpperCase();
  }
  if ("code" in value && typeof (value as { code?: unknown }).code === "string") {
    return (value as { code: string }).code.toUpperCase();
  }
  return null;
}
