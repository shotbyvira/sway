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
};

export type Reading = "tight" | "bolt" | "miss";

const PRIOR = 0.22;

const VECTORS: Map<string, Record<Feature, number>> = new Map();
for (const word of WORDS) {
  const row = {} as Record<Feature, number>;
  for (const feature of FEATURES) row[feature] = word.yes.has(feature) ? 1 : 0;
  VECTORS.set(word.id, row);
}

const BY_LENGTH = [...WORDS].sort((a, b) => b.name.length - a.name.length);

/** Compiled once. Building 184 patterns on every parse was most of parsePrompt's cost. */
const NAME_PATTERNS = BY_LENGTH.map((word) => {
  const pattern = `\\b${escapeRegExp(word.name.toLowerCase())}\\b`;
  return { word, find: new RegExp(pattern), strip: new RegExp(pattern, "g") };
});

function sameShape(a: Word, b: Word): boolean {
  if (a.yes.size !== b.yes.size) return false;
  for (const feature of a.yes) if (!b.yes.has(feature)) return false;
  return true;
}

/**
 * Fish the water can tell apart: three or more traits and no exact trait twin. Everything else in the
 * bank stays guessable and castable, it just never gets hidden.
 */
export const SECRET_POOL: readonly Word[] = WORDS.filter(
  (word) => word.yes.size >= 3 && !WORDS.some((other) => other.id !== word.id && sameShape(word, other)),
);

export function emptyMemory(): PromptMemory {
  return { repeats: new Map(), nameHits: new Map() };
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

/** Phone keyboards send curly apostrophes. "isn't" has to read as "isn't". */
const APOSTROPHES = /[\u2018\u2019\u201B\u02BC\u0060\u00B4]/g;
/** A comma, a full stop or a "but" ends a "not". "Not hot but cold" is cold. */
const CLAUSE_BREAK = /[,.;:!?]+|\b(?:but|though|although|yet|whereas)\b/;
const NAME_NEGATION = /\b(not|no|never|isn't|isnt|aren't|arent|without|don't|dont)\b/;

function cleanClause(text: string): string {
  return text
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePrompt(raw: string): ParsedPrompt {
  const clauses = raw
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .split(CLAUSE_BREAK)
    .map(cleanClause)
    .filter(Boolean);
  const normalized = clauses.join(" ");
  const mentions: Mention[] = [];
  const assertions: Assertion[] = [];

  for (const clause of clauses) {
    let scrubbed = ` ${clause} `;
    for (const { word, find, strip } of NAME_PATTERNS) {
      const hit = find.exec(scrubbed);
      if (!hit) continue;
      const before = scrubbed.slice(Math.max(0, hit.index - 16), hit.index);
      const negative = NAME_NEGATION.test(before);
      if (mentions.length < 3 && !mentions.some((mention) => mention.id === word.id)) {
        mentions.push({ id: word.id, sign: negative ? -1 : 1 });
      }
      scrubbed = scrubbed.replace(strip, " ");
    }

    let flipRemain = 0;
    let weightMul = 1;
    for (const token of clause.split(" ").filter(Boolean)) {
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

/**
 * The skipper's board. It only hears the lines the skipper tapped and never sees the fish,
 * so the top of the net points wherever those lines point. A tapped lie drags it off course.
 */
export function applyPrompt(
  scores: Map<string, number>,
  raw: string,
  memory: PromptMemory,
): { scores: Map<string, number>; shrug: boolean } {
  const parsed = parsePrompt(raw);
  if (!parsed.normalized || (parsed.assertions.length === 0 && parsed.mentions.length === 0)) {
    return { scores, shrug: true };
  }

  const seen = memory.repeats.get(parsed.normalized) ?? 0;
  memory.repeats.set(parsed.normalized, seen + 1);
  const repeatDamp = seen === 0 ? 1 : Math.pow(0.4, seen);

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
    next.set(word.id, (next.get(word.id) ?? 0) + delta);
  }

  return { scores: next, shrug: false };
}

/** How far a line has to lean before the water moves: two true claims and one lie still read warm. */
const READ_LEAN = 0.3;

/**
 * The water's reading of one tapped line. This is the only place the fish is consulted during a deal.
 * Each claim is checked against the fish: mostly true closes the net, mostly false scatters the school,
 * and an even mix barely moves it.
 */
export function readLine(raw: string, fishId: string): Reading {
  const fish = VECTORS.get(fishId);
  const dir = directionOf(raw);
  if (!fish || !dir) return "miss";
  let truth = 0;
  let mass = 0;
  for (const feature of FEATURES) {
    const claim = dir[feature];
    if (claim === 0) continue;
    truth += claim * (fish[feature] === 1 ? 1 : -1);
    mass += Math.abs(claim);
  }
  if (mass === 0) return "miss";
  const lean = truth / mass;
  if (lean >= READ_LEAN) return "tight";
  if (lean <= -READ_LEAN) return "bolt";
  return "miss";
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

export function findWord(id: string): Word | undefined {
  return WORD_BY_ID.get(id);
}

export function searchWords(query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return WORDS;
  return WORDS.filter((word) => word.name.toLowerCase().includes(q));
}

export function randomWord(avoid?: string): Word {
  const pool = avoid ? SECRET_POOL.filter((word) => word.id !== avoid) : SECRET_POOL;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? SECRET_POOL[0] ?? WORDS[0]!;
}

function sharedTraits(aId: string, bId: string): number {
  const a = WORD_BY_ID.get(aId);
  const b = WORD_BY_ID.get(bId);
  if (!a || !b) return 0;
  let n = 0;
  for (const feature of a.yes) if (b.yes.has(feature)) n += 1;
  return n;
}

/**
 * The school sees the nearest word that isn't an exact trait twin, so they can lie well but can't be sure.
 * The crew sees a word 0.3 to 0.5 away that shares at least two traits: a slight hint, never a blank.
 */
export function standIns(secretId: string): { schoolId: string; fisheriesId: string } {
  const others = WORDS.filter((word) => word.id !== secretId)
    .map((word) => ({
      id: word.id,
      distance: traitDistance(secretId, word.id),
      shared: sharedTraits(secretId, word.id),
      pop: word.pop,
      name: word.name,
    }))
    .sort((a, b) => a.distance - b.distance || b.pop - a.pop || a.name.localeCompare(b.name));
  const school =
    others.find((word) => word.distance >= 0.15) ??
    others.find((word) => word.distance > 0) ??
    others[0]!;
  const rest = others.filter((word) => word.id !== school.id);
  const crew =
    rest.find((word) => word.distance >= 0.3 && word.distance <= 0.5 && word.shared >= 2) ??
    rest.find((word) => word.distance >= 0.3 && word.shared >= 1) ??
    rest.find((word) => word.distance >= 0.3) ??
    rest[0] ??
    school;
  return { schoolId: school.id, fisheriesId: crew.id };
}

export function promptLands(raw: string): boolean {
  const parsed = parsePrompt(raw);
  return Boolean(parsed.normalized) && (parsed.assertions.length > 0 || parsed.mentions.length > 0);
}

/** Secret, the team's blur, or a near twin. Same rejection either way, so a block is not a confirmation. */
export function blockedName(raw: string, secretId: string, standInId: string | null): boolean {
  for (const mention of parsePrompt(raw).mentions) {
    if (mention.id === secretId || mention.id === standInId) return true;
    if (traitDistance(mention.id, secretId) < 0.2) return true;
  }
  return false;
}

export function catchPoints(guessId: string | null, secretId: string): number {
  if (!guessId) return 0;
  if (guessId === secretId) return 120;
  const distance = traitDistance(guessId, secretId);
  if (distance < 0.25) return 80;
  if (distance < 0.5) return 40;
  return 0;
}

export const ROUND_POINTS = 120;

/**
 * Every round splits 120. The crew keeps what the name earns and the school keeps the rest.
 * The fish's place on the skipper's board is reported, never paid.
 */
export function roundScore(
  guessId: string | null,
  secretId: string,
  scores: Map<string, number>,
): { fisheries: number; school: number; rank: number; distance: number } {
  const fisheries = catchPoints(guessId, secretId);
  const rank = rankOf(scores, secretId);
  const distance = guessId ? traitDistance(guessId, secretId) : 1;
  return { fisheries, school: ROUND_POINTS - fisheries, rank, distance };
}

function directionOf(raw: string): Record<Feature, number> | null {
  const parsed = parsePrompt(raw);
  if (parsed.assertions.length === 0 && parsed.mentions.length === 0) return null;
  const vec = {} as Record<Feature, number>;
  for (const feature of FEATURES) vec[feature] = 0;
  let mass = 0;
  for (const assertion of parsed.assertions) {
    vec[assertion.feature] += assertion.sign * assertion.weight;
    mass += assertion.weight;
  }
  return mass > 0 ? vec : null;
}

function cosineDir(a: Record<Feature, number>, b: Record<Feature, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const feature of FEATURES) {
    dot += a[feature] * b[feature];
    na += a[feature] * a[feature];
    nb += b[feature] * b[feature];
  }
  if (na === 0 || nb === 0) return 1;
  return dot / Math.sqrt(na * nb);
}

/** 0.18 packed, ~0.9 scattered. One cast, or none, stays a modest school. */
export function schoolSpread(texts: string[]): number {
  const dirs = texts.map(directionOf).filter((dir): dir is Record<Feature, number> => dir != null);
  if (dirs.length < 2) return 0.28;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < dirs.length; i += 1) {
    for (let j = i + 1; j < dirs.length; j += 1) {
      const agree = cosineDir(dirs[i]!, dirs[j]!);
      sum += (1 - agree) / 2;
      n += 1;
    }
  }
  const disagree = n === 0 ? 0 : sum / n;
  return Math.min(0.92, Math.max(0.18, 0.18 + disagree * 0.74));
}

export type DrillPair = {
  left: string;
  right: string;
  leftSide: "fisheries" | "school";
  rightSide: "fisheries" | "school";
};

/** Five unlabeled pairs. Sides stay on the object so the reveal can teach, not the buttons. */
export function drillPairs(secretId: string): DrillPair[] {
  const word = WORD_BY_ID.get(secretId);
  if (!word) return [];
  const yes = [...word.yes];
  const no = FEATURES.filter((feature) => !word.yes.has(feature));
  const pairs: DrillPair[] = [];
  for (let i = 0; i < 5; i += 1) {
    const yesFeat = yes[i % Math.max(yes.length, 1)] ?? "animal";
    const noFeat = no[i % Math.max(no.length, 1)] ?? "metal";
    const help = i % 2 === 0 ? `it is ${yesFeat}` : `something ${yesFeat}`;
    const harm = i % 2 === 0 ? `not ${yesFeat}` : `it is ${noFeat}`;
    const flip = i % 2 === 1;
    pairs.push(
      flip
        ? { left: harm, right: help, leftSide: "school", rightSide: "fisheries" }
        : { left: help, right: harm, leftSide: "fisheries", rightSide: "school" },
    );
  }
  return pairs;
}

const BANK_NAMES = new Set(WORDS.map((word) => word.name.toLowerCase()));

/** How the house says a trait it wants the skipper to believe. Every candidate is checked with readLine. */
const DECOY_ADJ: Partial<Record<Feature, string[]>> = {
  large: ["big", "huge", "giant", "massive"],
  small: ["tiny", "little", "mini"],
  soft: ["fluffy", "fuzzy", "soft"],
  metal: ["steel", "iron", "metal"],
  flies: ["flying"],
  cold: ["frozen", "chilly", "cold"],
  hot: ["hot", "warm"],
  noisy: ["loud", "noisy"],
  dangerous: ["deadly", "scary", "dangerous"],
  colorful: ["bright", "colorful", "vivid"],
  sharp: ["pointy", "sharp"],
  wooden: ["wooden"],
  round: ["round", "circular"],
  sweet: ["sweet"],
  electronic: ["electric", "digital"],
  fictional: ["magic", "mythical"],
  pet: ["tame"],
  alive: ["living"],
};

const DECOY_NOUN: Partial<Record<Feature, string>> = {
  mammal: "mammal",
  bird: "bird",
  reptile: "reptile",
  insect: "bug",
  plant: "plant",
  fruit: "fruit",
  drink: "drink",
  tool: "tool",
  vehicle: "vehicle",
  place: "place",
  music: "instrument",
  toy: "toy",
  container: "box",
  person: "person",
  weapon: "weapon",
  electronic: "device",
};

function article(word: string): string {
  return /^[aeiou]/.test(word) ? "an" : "a";
}

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function readsCold(line: string, secretId: string): boolean {
  const parsed = parsePrompt(line);
  return parsed.mentions.length === 0 && parsed.assertions.length > 0 && readLine(line, secretId) === "bolt";
}

function decoyCandidates(word: Word, fish: Word): string[] {
  const lacks = [...word.yes].filter((feature) => !fish.yes.has(feature));
  const adjs = lacks.flatMap((feature) =>
    (DECOY_ADJ[feature] ?? []).filter((say) => !BANK_NAMES.has(say)).map((say) => ({ feature, say })),
  );
  const nouns = lacks.flatMap((feature) => {
    const say = DECOY_NOUN[feature];
    return say ? [{ feature, say }] : [];
  });
  const out: string[] = [];
  for (const noun of nouns) {
    for (const adj of adjs) {
      if (adj.feature !== noun.feature) out.push(`${article(adj.say)} ${adj.say} ${noun.say}`);
    }
    out.push(`some kind of ${noun.say}`);
  }
  for (const a of adjs) {
    for (const b of adjs) {
      if (a.feature < b.feature) out.push(`${a.say} and ${b.say}`);
    }
    out.push(`really ${a.say}`);
  }
  return out;
}

/**
 * A line the house casts for a school that came up short. It describes a word far from the fish,
 * reads cold against it, and never names anything in the bank.
 */
export function decoyLine(secretId: string, avoid: ReadonlySet<string> = new Set()): string {
  const fish = WORD_BY_ID.get(secretId);
  if (!fish) return "something loud";
  // Walk far words and their phrasings lazily, in random order. Parsing every candidate up front
  // cost ~144 ms of CPU per decoy, and closeClue can need five in one request.
  const far = WORDS.filter((word) => word.id !== secretId && traitDistance(word.id, secretId) >= 0.6);
  for (const word of shuffled(far)) {
    for (const line of shuffled(decoyCandidates(word, fish))) {
      if (!avoid.has(line) && readsCold(line, secretId)) return line;
    }
  }
  const fallback = FEATURES.filter((feature) => !fish.yes.has(feature)).map((feature) => `it is ${feature}`);
  return shuffled(fallback).find((line) => readsCold(line, secretId)) ?? "something loud";
}

