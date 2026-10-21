const SEAT_KEY = "sway.seat.v1";
const ROOM_KEY = "sway.room.v1";
const HANDLE_KEY = "sway.handle.v1";
const TEAM_KEY = "sway.team.v1";

export function seatId(): string {
  if (typeof window === "undefined") return "00000000-0000-4000-8000-000000000001";
  try {
    const existing = localStorage.getItem(SEAT_KEY);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(SEAT_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function rememberRoom(code: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (code) sessionStorage.setItem(ROOM_KEY, code);
    else sessionStorage.removeItem(ROOM_KEY);
  } catch {
    /* ignore */
  }
}

export function recalledRoom(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = sessionStorage.getItem(ROOM_KEY);
    return code && /^[A-Z0-9]{4}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function savedHandle(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(HANDLE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveHandle(handle: string) {
  try {
    localStorage.setItem(HANDLE_KEY, handle.slice(0, 16));
  } catch {
    /* ignore */
  }
}

export function savedTeam(): "amber" | "tide" {
  if (typeof window === "undefined") return "amber";
  try {
    return localStorage.getItem(TEAM_KEY) === "tide" ? "tide" : "amber";
  } catch {
    return "amber";
  }
}

export function saveTeam(team: "amber" | "tide") {
  try {
    localStorage.setItem(TEAM_KEY, team);
  } catch {
    /* ignore */
  }
}
