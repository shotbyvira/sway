export const CLUES_PER = 3;
export const CLUE_MS = 45_000;
export const DEAL_MS = 12_000;
export const NAME_MS = 15_000;
export const REVEAL_MS = 10_000;
export const MAX_DEALS = 5;
export const MIN_SIDE = 2;
export const MAX_PLAYERS = 29;

export type Side = "amber" | "tide";

export function otherSide(side: Side): Side {
  return side === "amber" ? "tide" : "amber";
}
