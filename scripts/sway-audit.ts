import assert from "node:assert/strict";
import { FEATURES, LEXICON, WORDS, WORD_BY_ID } from "../src/game/bank.ts";
import {
  ROUND_POINTS,
  SECRET_POOL,
  applyPrompt,
  blockedName,
  catchPoints,
  decoyLine,
  drillPairs,
  emptyMemory,
  initialScores,
  parsePrompt,
  promptLands,
  randomWord,
  readLine,
  roundScore,
  schoolSpread,
  standIns,
  topN,
  traitDistance,
} from "../src/game/engine.ts";

const failures: string[] = [];
function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const ids = new Set(WORDS.map((word) => word.id));
check(ids.size === WORDS.length, "word ids are unique");
check(WORDS.length >= 100, `bank has ${WORDS.length} words`);
for (const word of WORDS) {
  check(word.yes.size > 0, `${word.name} has traits`);
  check(word.name.trim().length > 0, "blank name");
}
for (const feature of FEATURES) {
  check(Boolean(LEXICON[feature]?.includes(feature)), `lexicon is missing the word "${feature}"`);
}

for (const secret of WORDS) {
  const stands = standIns(secret.id);
  check(stands.schoolId !== secret.id, `${secret.name} school stand-in is itself`);
  check(stands.fisheriesId !== secret.id, `${secret.name} fisheries stand-in is itself`);
  check(stands.schoolId !== stands.fisheriesId, `${secret.name} stand-ins collide`);
  const schoolD = traitDistance(secret.id, stands.schoolId);
  const fishD = traitDistance(secret.id, stands.fisheriesId);
  check(schoolD <= fishD, `${secret.name} school blur is farther than fisheries`);
  if (SECRET_POOL.includes(secret)) {
    check(schoolD > 0, `${secret.name} school blur is an exact trait twin`);
    check(fishD >= 0.3, `${secret.name} fisheries blur is too close (${fishD.toFixed(2)})`);
    const crewBlur = WORD_BY_ID.get(stands.fisheriesId)!;
    const overlap = [...crewBlur.yes].some((feature) => secret.yes.has(feature));
    check(overlap, `${secret.name} fisheries blur shares nothing`);
  }
  check(blockedName(secret.name, secret.id, stands.schoolId), `${secret.name} secret name not blocked`);
  check(blockedName(`not ${secret.name}`, secret.id, stands.schoolId), `${secret.name} negated name not blocked`);
  const school = WORDS.find((word) => word.id === stands.schoolId)!;
  check(blockedName(school.name, secret.id, stands.schoolId), `${secret.name} school blur not blocked`);
  check(!blockedName("it is metal and loud", secret.id, stands.schoolId) || secret.name === "Metal", "unrelated cast blocked");
  const pairs = drillPairs(secret.id);
  check(pairs.length === 5, `${secret.name} drill is not five deals`);
  for (const pair of pairs) {
    check(pair.leftSide !== pair.rightSide, `${secret.name} drill pair is one-sided`);
    check(promptLands(pair.left) && promptLands(pair.right), `${secret.name} drill line does not land: ${pair.left} / ${pair.right}`);
  }
}

const scores = initialScores();
const memory = emptyMemory();
const secret = WORDS[0]!;
const shrugged = applyPrompt(scores, "zzzz-not-a-trait", memory);
check(shrugged.shrug, "dead water should shrug");
check(shrugged.scores === scores, "a shrug must not copy the board");

check(catchPoints(null, secret.id) === 0, "silence scores 0");
check(catchPoints(secret.id, secret.id) === 120, "exact catch is 120");
for (const word of WORDS) {
  if (word.id === secret.id) continue;
  const distance = traitDistance(word.id, secret.id);
  const points = catchPoints(word.id, secret.id);
  if (distance < 0.25) check(points === 80, `${word.name} at ${distance.toFixed(2)} should be 80`);
  else if (distance < 0.5) check(points === 40, `${word.name} at ${distance.toFixed(2)} should be 40`);
  else check(points === 0, `${word.name} at ${distance.toFixed(2)} should be 0`);
}

for (const word of WORDS) {
  const split = roundScore(word.id, secret.id, scores);
  check(split.fisheries + split.school === ROUND_POINTS, `${word.name} round does not split ${ROUND_POINTS}`);
}
const exact = roundScore(secret.id, secret.id, scores);
check(exact.fisheries === 120 && exact.school === 0, "exact round zeros the school");
const miss = roundScore(null, secret.id, scores);
check(miss.fisheries === 0 && miss.school === ROUND_POINTS, "silence hands the school the round");

for (const fish of SECRET_POOL) {
  check(fish.yes.size >= 3, `${fish.name} is in the pool with ${fish.yes.size} traits`);
  const twin = WORDS.some((other) => other.id !== fish.id && traitDistance(other.id, fish.id) === 0);
  check(!twin, `${fish.name} has a twin`);
}
for (let i = 0; i < 200; i += 1) check(SECRET_POOL.includes(randomWord()), "randomWord drew outside the pool");

const plain = (feature: string) => LEXICON[feature]?.length === 1;
for (const fish of SECRET_POOL) {
  const has = [...fish.yes].find(plain);
  const lacks = FEATURES.find((feature) => !fish.yes.has(feature) && plain(feature));
  if (!has || !lacks) continue;
  check(readLine(`it is ${has}`, fish.id) === "tight", `${fish.name}: a true line should close the net`);
  check(readLine(`it is ${lacks}`, fish.id) === "bolt", `${fish.name}: a lie should scatter the school`);
  check(readLine(`not ${lacks}`, fish.id) === "tight", `${fish.name}: a true "not" should close the net`);
  check(readLine(`${has} and ${lacks}`, fish.id) === "miss", `${fish.name}: half and half should barely move`);
  const decoy = decoyLine(fish.id);
  check(readLine(decoy, fish.id) === "bolt", `${fish.name}: decoy "${decoy}" should read cold`);
  check(parsePrompt(decoy).mentions.length === 0, `${fish.name}: decoy "${decoy}" names a word`);
  check(!blockedName(decoy, fish.id, null), `${fish.name}: decoy "${decoy}" is blocked`);
}

{
  const started = performance.now();
  for (let i = 0; i < 30; i += 1) decoyLine(SECRET_POOL[i % SECRET_POOL.length]!.id);
  const each = (performance.now() - started) / 30;
  check(each < 15, `decoyLine costs ${each.toFixed(1)} ms of CPU per call; closeClue may need five`);
}

const curly = parsePrompt("it isn\u2019t big").assertions.find((a) => a.feature === "large");
check(curly?.sign === -1, "a curly apostrophe must still negate");
const contrast = parsePrompt("not hot but cold").assertions;
check(contrast.find((a) => a.feature === "hot")?.sign === -1, '"not hot" should stay negative');
check(contrast.find((a) => a.feature === "cold")?.sign === 1, '"but cold" should be positive');
const named = parsePrompt("not big, it's a cat").mentions.find((m) => m.id === "cat");
check(named?.sign === 1, "a name after a comma should not inherit the negation");

{
  let state = 7;
  const realRandom = Math.random;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
  const crewLine = (fishId: string) => `it is ${pick([...WORD_BY_ID.get(standIns(fishId).fisheriesId)!.yes])}`;
  const schoolLine = (fishId: string) => `not ${pick([...WORD_BY_ID.get(standIns(fishId).schoolId)!.yes])}`;
  const play = (trust: "crew" | "school" | "coin") => {
    let top = 0;
    let points = 0;
    for (let round = 0; round < 300; round += 1) {
      const fish = pick(SECRET_POOL).id;
      let board = initialScores();
      const mem = emptyMemory();
      for (let deal = 0; deal < 5; deal += 1) {
        const crew = trust === "crew" || (trust === "coin" && Math.random() < 0.5);
        board = applyPrompt(board, crew ? crewLine(fish) : schoolLine(fish), mem).scores;
      }
      const chip = topN(board, 1)[0]!.id;
      if (chip === fish) top += 1;
      points += roundScore(chip, fish, board).fisheries;
    }
    return { top: top / 300, points: points / 300 };
  };
  const coin = play("coin");
  const crew = play("crew");
  const school = play("school");
  Math.random = realRandom;
  check(coin.top < 0.25, `the top chip is the fish ${(coin.top * 100).toFixed(0)}% of the time on coin flips`);
  const paid = [crew, coin, school].map((side) => side.points.toFixed(0)).join(" > ");
  check(crew.points > coin.points && coin.points > school.points, `trust should pay crew > coin > school: ${paid}`);
}

const packed = schoolSpread(["it is animal", "it is animal", "something animal"]);
const scattered = schoolSpread(["it is animal", "it is metal", "it is music", "not animal"]);
check(packed <= scattered, `agreeing school (${packed}) should pack tighter than a scatter (${scattered})`);
check(packed >= 0.18 && packed <= 0.92, "spread stays in range");
check(schoolSpread([]) === 0.28, "an empty school stays modest");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`engine ok · ${WORDS.length} words`);
