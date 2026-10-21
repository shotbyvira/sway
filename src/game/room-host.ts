/**
 * Server functions enter here. On the worker, the call runs inside the one
 * SwayRoom object so rooms survive isolates and writes can't interleave.
 * Local preview has no binding and keeps the embedded database.
 */
export async function roomBinding() {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env.ROOMS ?? null;
  } catch {
    return null;
  }
}

export async function enterRoom(op: string, data: unknown): Promise<unknown> {
  const rooms = await roomBinding();
  if (!rooms) {
    const { runOp } = await import("./room");
    return runOp(op, data);
  }
  const stub = rooms.get(rooms.idFromName("sway"));
  return stub.play(op, data);
}
