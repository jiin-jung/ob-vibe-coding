import assert from "node:assert/strict";
import test from "node:test";

import { matchTeams, type Team } from "./match.ts";

const team = (overrides: Partial<Team> & Pick<Team, "id">): Team => ({
  id: overrides.id,
  size: 1,
  format: 3,
  timeSlot: "friday-night",
  mode: "friend",
  gender: null,
  departments: [],
  createdAt: 0,
  ...overrides,
});

test("fills mixed-size applications without splitting them", () => {
  const result = matchTeams([
    team({ id: "pair", size: 2, departments: ["CS"], createdAt: 1 }),
    team({ id: "solo", departments: ["Design"], createdAt: 2 }),
    team({ id: "opponent", size: 3, departments: ["Business"], createdAt: 3 }),
  ]);

  assert.deepEqual(result.filledTeams.map((filled) => filled.memberTeamIds), [
    ["pair", "solo"],
    ["opponent"],
  ]);
  assert.equal(result.matches.length, 1);
  assert.deepEqual(result.waiting, []);
});

test("does not split applications to force a complete team", () => {
  const result = matchTeams([
    team({ id: "early-pair", size: 2, createdAt: 1 }),
    team({ id: "late-pair", size: 2, createdAt: 2 }),
  ]);

  assert.deepEqual(result.filledTeams, []);
  assert.deepEqual(result.matches, []);
  assert.deepEqual(result.waiting, ["early-pair", "late-pair"]);
});

test("prefers a match with no overlapping departments", () => {
  const result = matchTeams([
    team({ id: "cs-early", size: 3, departments: ["CS"], createdAt: 1 }),
    team({ id: "cs-later", size: 3, departments: ["CS"], createdAt: 2 }),
    team({ id: "design", size: 3, departments: ["Design"], createdAt: 3 }),
    team({ id: "business", size: 3, departments: ["Business"], createdAt: 4 }),
  ]);

  assert.deepEqual(
    result.matches.map(({ teamA, teamB }) => [teamA.memberTeamIds, teamB.memberTeamIds]),
    [
      [["cs-early"], ["design"]],
      [["cs-later"], ["business"]],
    ],
  );
});

test("keeps incomplete and unmatched applications waiting in application order", () => {
  const result = matchTeams([
    team({ id: "incomplete", size: 2, createdAt: 1 }),
    team({ id: "complete", size: 3, createdAt: 2 }),
  ]);

  assert.deepEqual(result.filledTeams.map((filled) => filled.memberTeamIds), [["complete"]]);
  assert.deepEqual(result.waiting, ["incomplete", "complete"]);
});

test("groups dating applications by gender and matches only opposite genders", () => {
  const result = matchTeams([
    team({ id: "men-pair", size: 2, mode: "dating", gender: "M", departments: ["CS"], createdAt: 1 }),
    team({ id: "woman-solo", mode: "dating", gender: "F", createdAt: 2 }),
    team({ id: "man-solo", mode: "dating", gender: "M", departments: ["Design"], createdAt: 3 }),
    team({ id: "women-pair", size: 2, mode: "dating", gender: "F", departments: ["Nursing"], createdAt: 4 }),
    team({ id: "unknown", size: 3, mode: "dating", gender: null, createdAt: 5 }),
  ]);

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].teamA.gender, "M");
  assert.equal(result.matches[0].teamB.gender, "F");
  assert.deepEqual(result.matches[0].teamA.memberTeamIds, ["men-pair", "man-solo"]);
  assert.deepEqual(result.matches[0].teamB.memberTeamIds, ["woman-solo", "women-pair"]);
  assert.deepEqual(result.waiting, ["unknown"]);
});

test("matches one-person dating applications as 1-to-1", () => {
  const result = matchTeams([
    team({ id: "first-man", format: 1, mode: "dating", gender: "M", createdAt: 1 }),
    team({ id: "second-man", format: 1, mode: "dating", gender: "M", createdAt: 2 }),
    team({ id: "first-woman", format: 1, mode: "dating", gender: "F", createdAt: 3 }),
  ]);

  assert.deepEqual(result.matches[0].teamA.memberTeamIds, ["first-man"]);
  assert.deepEqual(result.matches[0].teamB.memberTeamIds, ["first-woman"]);
  assert.deepEqual(result.waiting, ["second-man"]);
});

test("returns the same result for the same input", () => {
  const input = [
    team({ id: "b", size: 2, createdAt: 1 }),
    team({ id: "a", createdAt: 1 }),
    team({ id: "c", size: 3, createdAt: 2 }),
  ];

  assert.deepEqual(matchTeams(input), matchTeams(input));
});
