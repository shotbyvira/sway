import assert from "node:assert/strict";
import { FEATURES, LEXICON, WORDS } from "../src/game/bank.ts";
import {
  applyPrompt,
  blockedName,
  catchPoints,
  drillPairs,
  emptyMemory,
  initialScores,
  pointsFor,
  promptLands,
  rankOf,
  roundScore,
  schoolSpread,
  standIns,
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
  check(fishD >= 0.45 || schoolD >= 0.45, `${secret.name} fisheries blur is too close (${fishD.toFixed(2)})`);
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
const shrugged = applyPrompt(scores, "zzzz-not-a-trait", memory, secret.id);
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

check(pointsFor(1, 0.9, "other", secret.id) === 0, "rank 1 pays the school nothing");
check(pointsFor(2, 0, "other", secret.id) === 20, "2nd pays 20");
check(pointsFor(6, 0, "other", secret.id) === 50, "6th pays 50");
check(pointsFor(21, 0, "other", secret.id) === 80, "21st pays 80");
check(pointsFor(101, 1, "other", secret.id) === 120, "deep rank caps at 120 with the trait bonus");
check(pointsFor(101, 0, secret.id, secret.id) === 0, "naming the fish zeros the school even from a deep rank");

const exact = roundScore(secret.id, secret.id, scores);
check(exact.fisheries === 120 && exact.school === 0, "exact round zeros the school");
const miss = roundScore(null, secret.id, scores);
check(miss.fisheries === 0, "timeout pays fisheries nothing");
check(miss.school === 0 || miss.rank > 1, "a timeout can pay the school only if the fish is not still first");

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
