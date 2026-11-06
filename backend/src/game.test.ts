import assert from "node:assert/strict";
import test from "node:test";
import { applyChoice, applyPlan, availableActivities, calculateAchievements, calculateEnding, chooseEarly, continueAfterReport, createState, earnedCredits, finishSignup, startSignup, planCost, retakeOptions, signupTier, takeLeave } from "./game.ts";
import type { GameState } from "./game.ts";

function playRandomGame(seed: number, policy: "random" | "study" | "network" | "career" | "startup" = "random") {
  const styles = ["scholar", "social", "romantic"] as const;
  const focuses = {
    random: [["study", "network"], ["study", "mental"], ["study", "romance"], ["network", "mental"], ["network", "romance"], ["mental", "romance"]],
    study: [["study", "mental"]],
    network: [["network", "mental"]],
    career: [["study", "mental"]],
    startup: [["network", "romance"]],
  } as const;
  const choices = focuses[policy];
  const department = (["cse", "ice", "ais"] as const)[seed % 3];
  const style = styles[Math.floor(seed / 3) % styles.length];
  const focus = choices[Math.floor(seed / 9) % choices.length];
  const state = createState(seed, department, "network", style, [...focus]);
  let dice = seed;
  const random = (n: number) => { dice = (dice * 1664525 + 1013904223) >>> 0; return dice % n; };
  const preferred: Record<string, string[]> = {
    random: [], study: ["english", "work", "tutor"], network: ["dream", "club", "work"], career: ["lab", "english", "work", "contest"], startup: ["club", "work", "dream"],
  };
  const favoured: Record<string, RegExp> = {
    random: /$^/, study: /계절|본전공|밤샌|점검|평점|1교시|지나친|공부|투표|남는/, network: /지원|출마|참석|가입|커피|유지|교수님께/, career: /들어간|자기소개서|포트폴리오|복수|연구|계획|혼자|지원|지금/, startup: /도전|참석|가입|커피|출마|교수|자기|지금/,
  };
  for (let guard = 0; guard < 240 && state.phase !== "done"; guard++) {
    if (state.phase === "plan") {
      if (!state.signup?.tier) {
        const signup = startSignup(state, 0);
        finishSignup(state, signup.delayMs + (policy === "study" || random(2) ? 300 : 800));
      }
      const options = availableActivities(state).filter((item) => !item.locked);
      let activity = options[random(options.length)].id;
      for (const want of preferred[policy]) if (options.some((item) => item.id === want) && (want !== "english" || !state.flags.includes("english-cert"))) { activity = want; break; }
      const retake = retakeOptions(state);
      const plan = {
        retakeCourseId: retake.length && (policy === "study" || random(2)) ? retake[0].id : null,
        activity,
        labId: activity === "lab" ? "gen-ai" : null,
        items: [] as string[],
      };
      if (state.department !== "cse" && plan.labId) plan.labId = state.department === "ice" ? "iot" : "robot";
      const cost = planCost(state, plan);
      if (cost.needsLoan && !cost.canLoan) { plan.activity = "parttime"; plan.labId = null; }
      applyPlan(state, plan, true);
    } else if (state.phase === "event") {
      const options = state.events[state.eventIndex].options;
      const index = options.findIndex((option) => favoured[policy].test(option.label));
      applyChoice(state, index >= 0 ? index : random(options.length));
    } else if (state.phase === "report") continueAfterReport(state);
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
  const plan = { retakeCourseId: null, activity: "work", labId: null, items: [] };
  assert.throws(() => applyPlan(state, plan, true), /수강신청/);
  const signup = startSignup(state, 0);
  finishSignup(state, signup.delayMs + 200);
  applyPlan(state, plan, true);
  assert.throws(() => applyPlan(state, plan, true));
});

test("수강신청은 학기가 지날수록 판정 구간이 좁아지고 먼저 누르면 우주공강이다", () => {
  const cases: [number, number, string][] = [
    [1, 350, "allClear"], [1, 700, "partial"], [1, 900, "spaceGap"],
    [4, 300, "allClear"], [4, 650, "partial"], [4, 750, "spaceGap"],
    [6, 250, "allClear"], [6, 550, "partial"], [6, 650, "spaceGap"],
    [8, 210, "allClear"], [8, 450, "partial"], [8, 550, "spaceGap"],
    [1, -200, "spaceGap"],
  ];
  for (const [semester, reaction, tier] of cases) {
    assert.equal(signupTier(reaction, semester), tier);
    const state = createState(5, "cse", "study");
    state.semester = semester;
    state.year = Math.ceil(semester / 2);
    const signup = startSignup(state, 1000);
    finishSignup(state, 1000 + signup.delayMs + reaction);
    assert.equal(signup.tier, tier);
    assert.throws(() => finishSignup(state, 9999));
    assert.throws(() => startSignup(state, 9999));
  }
});

test("8학기를 마치면 끝나고 학년은 학기에서 계산된다", () => {
  for (let seed = 1; seed < 100; seed++) {
    const state = playRandomGame(seed, "random");
    assert.equal(state.semester, state.earlyGraduated ? 6 : 8);
    assert.equal(state.year, Math.ceil(state.semester / 2));
  }
});

test("상점은 학기마다 하나만 살 수 있다", () => {
  const state = createState(6, "cse", "study");
  const signup = startSignup(state, 0);
  finishSignup(state, signup.delayMs + 200);
  assert.throws(() => applyPlan(state, { retakeCourseId: null, activity: "parttime", labId: null, items: ["book", "charm"] }, true), /하나/);
});

test("휴학은 대출 한도를 넘을 때만 두 번까지 가능하다", () => {
  const state = createState(3, "cse", "study");
  assert.throws(() => takeLeave(state, "work"));
  state.money = 0;
  state.debt = 450;
  takeLeave(state, "club");
  continueAfterReport(state);
  state.money = 0;
  takeLeave(state, "club");
  continueAfterReport(state);
  state.money = 0;
  assert.throws(() => takeLeave(state, "club"));
});

test("재수강 성적은 재수강한 학년에 반영된다", () => {
  for (let seed = 1; seed < 200; seed++) {
    const state = playRandomGame(seed, "random");
    for (const course of state.courses.filter((item) => item.retaken)) {
      assert.ok(course.year > Number(course.id.split("-")[0]));
    }
  }
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

test("무작위 엔딩 분포가 목표 범위이고 전설도 도달 가능하다", () => {
  const groups = { random: 3000, study: 500, network: 500, career: 500, startup: 500 } as const;
  const all: Record<string, Record<string, number>> = {};
  for (const [policy, count] of Object.entries(groups)) {
    const states = Array.from({ length: count }, (_, seed) => playRandomGame(seed + 1, policy as keyof typeof groups));
    all[policy] = distribution(states, (state) => calculateEnding(state));
  }
  console.log(JSON.stringify(all));
  const legendary = ["bigCompany", "startup", "topStudent", "president"].reduce((sum, ending) => sum + (all.random[ending] ?? 0), 0);
  assert.ok(legendary >= 3000 * 0.08 && legendary <= 3000 * 0.12, "무작위 플레이의 전설 엔딩은 10% 안팎이어야 한다");
  assert.ok((all.random.overtime ?? 0) >= 3000 * 0.15 && (all.random.overtime ?? 0) <= 3000 * 0.25, "무작위 플레이의 초과 학기는 15~25%여야 한다");
  assert.ok((all.network.president ?? 0) > 0, "학생회장 도달 가능");
  assert.ok((all.career.bigCompany ?? 0) > 0, "대기업 도달 가능");
  assert.ok((all.study.topStudent ?? 0) + (all.study.early ?? 0) > 0, "과 수석이나 조기 졸업 도달 가능");
  assert.ok((all.startup.startup ?? 0) > 0, "창업 도달 가능");
});
