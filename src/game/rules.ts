export const PER_PLAYER = 20;
export const CLOCK_MS = 5 * 60 * 1000;
export const MAX_PLAYERS = 29;

export type Side = "amber" | "tide";

export function otherSide(side: Side): Side {
  return side === "amber" ? "tide" : "amber";
}
