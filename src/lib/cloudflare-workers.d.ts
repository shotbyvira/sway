/** Types for the worker binding. Vite aliases the runtime module in dev. */
declare module "cloudflare:workers" {
  export const env: { ROOMS?: SwayRoomNamespace };
  export class DurableObject<Env = unknown> {
    ctx: SwayDurableObjectState;
    env: Env;
    constructor(ctx: SwayDurableObjectState, env: Env);
  }
  export class WorkerEntrypoint {}
  export class WorkflowEntrypoint {}
}

interface SwaySqlCursor {
  toArray(): Record<string, unknown>[];
}

interface SwayDurableObjectState {
  storage: {
    sql: { exec(query: string, ...bindings: unknown[]): SwaySqlCursor };
    transaction<T>(fn: () => Promise<T>): Promise<T>;
    setAlarm(scheduledTime: number): Promise<void>;
    deleteAlarm(): Promise<void>;
  };
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
  getTags(ws: WebSocket): string[];
}

interface SwayRoomNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): {
    play(op: string, data: unknown): Promise<unknown>;
    fetch(request: Request): Promise<Response>;
  };
}

declare const WebSocketPair: {
  new (): [WebSocket, WebSocket];
};
