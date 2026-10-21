import {
  FEATURES,
  HEDGES,
  INTENSIFIERS,
  LEXICON,
  NEGATION,
  STOP,
  WORDS,
  WORD_BY_ID,
  type Feature,
  type Word,
} from "./bank";

export type Assertion = { feature: Feature; sign: 1 | -1; weight: number };

export type Mention = { id: string; sign: 1 | -1 };

export type ParsedPrompt = {
  assertions: Assertion[];
  mentions: Mention[];
  normalized: string;
};

export type RankedWord = { id: string; name: string; score: number; pop: number };

export type PromptMemory = {
  repeats: Map<string, number>;
  nameHits: Map<string, number>;
  attacks: number;
};

const PRIOR = 0.22;

const VECTORS: Map<string, Record<Feature, number>> = new Map();
for (const word of WORDS) {
  const row = {} as Record<Feature, number>;
  for (const feature of FEATURES) row[feature] = word.yes.has(feature) ? 1 : 0;
  VECTORS.set(word.id, row);
}

const BY_LENGTH = [...WORDS].sort((a, b) => b.name.length - a.name.length);

export function emptyMemory(): PromptMemory {
  return { repeats: new Map(), nameHits: new Map(), attacks: 0 };
}

export function initialScores(): Map<string, number> {
  const scores = new Map<string, number>();
  for (const word of WORDS) scores.set(word.id, word.pop * PRIOR);
  return scores;
}

export function wordCount(): number {
  return WORDS.length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePrompt(raw: string): ParsedPrompt {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const mentions: Mention[] = [];
  let scrubbed = ` ${normalized} `;
  for (const word of BY_LENGTH) {
    const name = word.name.toLowerCase();
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "g");
    if (!re.test(scrubbed)) continue;
    const idx = scrubbed.indexOf(name);
    const before = scrubbed.slice(Math.max(0, idx - 16), idx);
    const negative = /\b(not|no|never|isn't|isnt|aren't|arent|without|don't|dont)\b/.test(before);
    if (mentions.length < 3) mentions.push({ id: word.id, sign: negative ? -1 : 1 });
    scrubbed = scrubbed.replace(re, " ");
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const assertions: Assertion[] = [];
  let flipRemain = 0;
  let weightMul = 1;

  for (const token of tokens) {
    const bare = token.replace(/'/g, "");
    if (NEGATION.has(token) || NEGATION.has(bare)) {
      flipRemain = 3;
      continue;
    }
    if (INTENSIFIERS.has(token)) {
      weightMul = Math.max(weightMul, 1.35);
      continue;
    }
    if (HEDGES.has(token)) {
      weightMul = Math.min(weightMul, 0.5);
      continue;
    }
    if (STOP.has(token) || STOP.has(bare)) continue;

    const features = LEXICON[token] ?? LEXICON[bare];
    if (features) {
      const sign: 1 | -1 = flipRemain > 0 ? -1 : 1;
      for (const feature of features) {
        assertions.push({ feature, sign, weight: weightMul });
      }
      if (flipRemain > 0) flipRemain -= 1;
      weightMul = 1;
      continue;
    }

    if (flipRemain > 0) flipRemain -= 1;
    weightMul = 1;
  }

  // A named object also leaks its own traits, softer than saying them outright.
  for (const mention of mentions) {
    const word = WORD_BY_ID.get(mention.id);
    if (!word) continue;
    for (const feature of word.yes) {
      assertions.push({
        feature,
        sign: mention.sign,
        weight: mention.sign > 0 ? 0.72 : 0.45,
      });
    }
  }

  return { assertions, mentions, normalized };
}

function traitSim(aId: string, bId: string): number {
  if (aId === bId) return 1;
  const a = VECTORS.get(aId);
  const b = VECTORS.get(bId);
  if (!a || !b) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const feature of FEATURES) {
    const x = a[feature];
    const y = b[feature];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return Math.min(1, Math.max(0, dot / Math.sqrt(na * nb)));
}

/** How hard this prompt argues against the planted word. 0 agrees, 1 is a lie. */
function hostilityOf(parsed: ParsedPrompt, secretId: string): number {
  const vec = VECTORS.get(secretId);
  if (!vec) return 0;
  let hostile = 0;
  let mass = 0;
  for (const assertion of parsed.assertions) {
    mass += assertion.weight;
    const has = vec[assertion.feature] === 1;
    const contradicts = (assertion.sign > 0 && !has) || (assertion.sign < 0 && has);
    if (contradicts) hostile += assertion.weight;
  }
  for (const mention of parsed.mentions) {
    mass += 1.2;
    if (mention.id === secretId) {
      if (mention.sign < 0) hostile += 1.6;
    } else if (mention.sign > 0) {
      hostile += 1.1;
    }
  }
  if (mass === 0) return 0;
  return Math.min(1, hostile / mass);
}

export function applyPrompt(
  scores: Map<string, number>,
  raw: string,
  memory: PromptMemory,
  secretId: string,
): { scores: Map<string, number>; shrug: boolean; resisted: boolean } {
  const parsed = parsePrompt(raw);
  if (!parsed.normalized || (parsed.assertions.length === 0 && parsed.mentions.length === 0)) {
    return { scores, shrug: true, resisted: false };
  }

  const seen = memory.repeats.get(parsed.normalized) ?? 0;
  memory.repeats.set(parsed.normalized, seen + 1);
  const repeatDamp = seen === 0 ? 1 : Math.pow(0.4, seen);

  const hostility = hostilityOf(parsed, secretId);
  // Anything that argues with the planted word is fought. Blatant lies are marked as held.
  const opposed = hostility >= 0.22;
  const resisted = hostility >= 0.42;
  if (opposed && repeatDamp > 0.5) memory.attacks += 1;
  const pressure = memory.attacks;

  // Doubt starts high. A long attack on one theme is slowly believed.
  const belief = opposed ? Math.min(0.86, 0.22 + pressure * 0.018) : 1;
  // Early lies barely bruise the secret. The grip tires as the attack continues.
  const bruise = opposed ? Math.min(0.72, 0.08 + pressure * 0.014) : 1;
  const secretBefore = scores.get(secretId) ?? 0;

  const punches = new Map<string, number>();
  for (const mention of parsed.mentions) {
    const hits = memory.nameHits.get(mention.id) ?? 0;
    memory.nameHits.set(mention.id, hits + 1);
    const punch = 2.45 * Math.pow(0.58, hits);
    punches.set(mention.id, mention.sign > 0 ? punch : -punch);
  }

  const next = new Map(scores);
  for (const word of WORDS) {
    const vector = VECTORS.get(word.id)!;
    let delta = 0;
    for (const assertion of parsed.assertions) {
      const has = vector[assertion.feature] === 1;
      if (assertion.sign > 0) delta += has ? assertion.weight : -0.4 * assertion.weight;
      else delta += has ? -1.15 * assertion.weight : 0.26 * assertion.weight;
    }
    const named = punches.get(word.id);
    if (named) delta += named;
    delta = Math.max(-4.2, Math.min(4.2, delta * repeatDamp));

    const sim = traitSim(word.id, secretId);
    if (word.id === secretId && delta < 0) delta *= bruise;
    else if (opposed && sim < 0.3 && delta > 0) delta *= belief;
    next.set(word.id, (next.get(word.id) ?? 0) + delta);
  }

  if (opposed) {
    let secretNow = next.get(secretId) ?? 0;
    const dropped = secretBefore - secretNow;
    if (dropped > 0) {
      // Pull the secret back up by part of the drop only — never above where it started this prompt.
      const hold = Math.max(0.22, 0.92 - pressure * 0.013);
      secretNow += dropped * hold;
      next.set(secretId, secretNow);
    }
  }

  return { scores: next, shrug: false, resisted };
}

export function ranked(scores: Map<string, number>): RankedWord[] {
  const rows: RankedWord[] = WORDS.map((word) => ({
    id: word.id,
    name: word.name,
    score: scores.get(word.id) ?? 0,
    pop: word.pop,
  }));
  rows.sort((a, b) => b.score - a.score || b.pop - a.pop || a.name.localeCompare(b.name));
  return rows;
}

export function topN(scores: Map<string, number>, n: number): RankedWord[] {
  return ranked(scores).slice(0, n);
}

export function rankOf(scores: Map<string, number>, id: string): number {
  const board = ranked(scores);
  const index = board.findIndex((row) => row.id === id);
  return index < 0 ? board.length : index + 1;
}

export function leadingGuess(scores: Map<string, number>): RankedWord {
  return ranked(scores)[0]!;
}

/** 0 = same trait fingerprint, 1 = nothing in common. */
export function traitDistance(aId: string, bId: string): number {
  if (aId === bId) return 0;
  const a = VECTORS.get(aId);
  const b = VECTORS.get(bId);
  if (!a || !b) return 1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const feature of FEATURES) {
    const x = a[feature];
    const y = b[feature];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 1;
  const similarity = dot / Math.sqrt(na * nb);
  return Math.min(1, Math.max(0, 1 - similarity));
}

export function pointsFor(rank: number, distance: number, guessId: string, secretId: string): number {
  if (guessId === secretId) return 0;
  let base = 100;
  if (rank <= 1) base = 10;
  else if (rank <= 5) base = 20;
  else if (rank <= 20) base = 50;
  else if (rank <= 100) base = 80;
  else base = 100;
  const bonus = Math.round(Math.min(1, Math.max(0, distance)) * 20);
  return Math.min(120, base + bonus);
}

export function scoreLabel(points: number): string {
  if (points <= 0) return "The machine held.";
  if (points < 40) return "A nudge.";
  if (points < 70) return "Real drift.";
  if (points < 95) return "Buried.";
  return "Lost in the dark.";
}

export function findWord(id: string): Word | undefined {
  return WORD_BY_ID.get(id);
}

export function searchWords(query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return WORDS;
  return WORDS.filter((word) => word.name.toLowerCase().includes(q));
}

export function randomWord(avoid?: string): Word {
  const pool = avoid ? WORDS.filter((word) => word.id !== avoid) : WORDS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? WORDS[0]!;
}
