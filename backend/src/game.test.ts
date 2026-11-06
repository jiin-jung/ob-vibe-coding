import assert from "node:assert/strict";
import test from "node:test";
import { applyChoice, applyPlan, availableActivities, calculateAchievements, calculateEnding, chooseEarly, continueAfterReport, createState, creditOptions, earnedCredits, planCost, resolveQuest, retakeOptions, takeLeave } from "./game.ts";
import type { GameState } from "./game.ts";

function playRandomGame(seed: number, policy: "random" | "study" | "network" | "career" | "startup" = "random") {
  const state = createState(seed, (["cse", "ice", "ais"] as const)[seed % 3], "network");
  let dice = seed;
  const random = (n: number) => { dice = (dice * 1664525 + 1013904223) >>> 0; return dice % n; };
  const preferred: Record<string, string[]> = {
    random: [], study: ["english", "work", "tutor"], network: ["dream", "club", "work"], career: ["lab", "english", "work", "contest"], startup: ["club", "work", "dream"],
  };
  const favoured: Record<string, RegExp> = {
    random: /$^/, study: /계절|본전공|밤샌|점검|평점|1교시|지나친|공부|투표|남는/, network: /지원|출마|참석|가입|커피|유지|교수님께/, career: /들어간|자기소개서|포트폴리오|복수|연구|계획|혼자|지원|지금/, startup: /도전|참석|가입|커피|출마|교수|자기|지금/,
  };
  for (let guard = 0; guard < 80 && state.phase !== "done"; guard++) {
    if (state.phase === "plan") {
      const options = availableActivities(state).filter((item) => !item.locked);
      let activity = options[random(options.length)].id;
      for (const want of preferred[policy]) if (options.some((item) => item.id === want) && (want !== "english" || !state.flags.includes("english-cert"))) { activity = want; break; }
      const credits = creditOptions(state);
      const retake = retakeOptions(state);
      const plan = {
        credits: credits[policy === "study" ? credits.length - 1 : 1],
        retakeCourseId: retake.length && (policy === "study" || random(2)) ? retake[0].id : null,
        activity,
        labId: activity === "lab" ? "gen-ai" : null,
        items: [] as string[],
      };
      if (state.department !== "cse" && plan.labId) plan.labId = state.department === "ice" ? "iot" : "robot";
      const cost = planCost(state, plan);
      if (cost.needsLoan && !cost.canLoan) { takeLeave(state); continue; }
      applyPlan(state, plan, true);
    } else if (state.phase === "event") {
      const options = state.events[state.eventIndex].options;
      const index = options.findIndex((option) => favoured[policy].test(option.label));
      applyChoice(state, index >= 0 ? index : random(options.length));
    } else if (state.phase === "report") continueAfterReport(state);
    else if (state.phase === "quest") resolveQuest(state, random(2) === 0);
    else if (state.phase === "early") chooseEarly(state, true);
  }
  assert.equal(state.phase, "done");
  return state;
}

const distribution = (states: GameState[], key: (state: GameState) => string) => {
  const counts: Record<string, number> = {};
  for (const state of states) counts[key(state)] = (counts[key(state)] ?? 0) + 1;
  return counts;
};

test("같은 시드와 선택이면 결과가 같다", () => {
  assert.deepEqual(playRandomGame(42), playRandomGame(42));
});

test("지금 학년 단계가 아니면 계획을 거부한다", () => {
  const state = createState(1, "cse", "study");
  applyPlan(state, { credits: 34, retakeCourseId: null, activity: "work", labId: null, items: [] }, true);
  assert.throws(() => applyPlan(state, { credits: 34, retakeCourseId: null, activity: "work", labId: null, items: [] }, true));
});

test("학점과 영어졸업인증을 못 채우면 초과 학기다", () => {
  const state = playRandomGame(7, "study");
  state.flags = state.flags.filter((flag) => flag !== "english-cert");
  assert.equal(calculateEnding(state), "overtime");
  assert.ok(calculateAchievements(state).includes("fossil"));
});

test("재수강 성적은 A0를 넘지 않고 F면 학점이 빠진다", () => {
  const states = Array.from({ length: 300 }, (_, seed) => playRandomGame(seed, "random"));
  for (const state of states) {
    for (const course of state.courses.filter((item) => item.retaken)) assert.notEqual(course.grade, "A+");
    assert.equal(earnedCredits(state), state.courses.filter((course) => course.grade !== "F").reduce((sum, course) => sum + course.credits, 0));
  }
});

test("엔딩이 고르게 나오고 전설도 도달 가능하다", () => {
  const groups = { random: 3000, study: 500, network: 500, career: 500, startup: 500 } as const;
  const all: Record<string, Record<string, number>> = {};
  for (const [policy, count] of Object.entries(groups)) {
    const states = Array.from({ length: count }, (_, seed) => playRandomGame(seed + 1, policy as keyof typeof groups));
    all[policy] = distribution(states, (state) => calculateEnding(state));
  }
  console.log(JSON.stringify(all));
  assert.ok((all.random.overtime ?? 0) < 3000 * 0.5, "무작위 플레이의 초과 학기가 절반을 넘으면 안 된다");
  assert.ok((all.network.president ?? 0) > 0, "학생회장 도달 가능");
  assert.ok((all.career.bigCompany ?? 0) > 0, "대기업 도달 가능");
  assert.ok((all.study.topStudent ?? 0) + (all.study.early ?? 0) > 0, "과 수석이나 조기 졸업 도달 가능");
  assert.ok((all.startup.startup ?? 0) > 0, "창업 도달 가능");
});
