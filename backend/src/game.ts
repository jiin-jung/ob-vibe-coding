import {
  ACHIEVEMENTS, ACTIVITIES, CHAINS, COURSES, ENDINGS, ENGLISH_EVENT, EVENTS, HIDDEN_OPTION, INCIDENTS, INTERVIEW_EVENT, ITEMS, LABS, QUESTS, START_CARDS,
} from "./content.ts";
import type { AchievementId, Department, Effects, EndingId, EventOption, GameEvent, GoalType, StatKey } from "./content.ts";

export const GRADUATION_CREDITS = 130;
export const TUITION = 200;
export const YEARLY_LOAN_LIMIT = 200;
export const DEBT_LIMIT = 500;
export const LIVING_COST = 50;
const ALLOWANCE = 30;
const MAX_LEAVES = 2;

const GRADE_POINTS = { "A+": 4.5, A0: 4.0, "B+": 3.5, B0: 3.0, "C+": 2.5, C0: 2.0, "D+": 1.5, D0: 1.0, F: 0 } as const;
export type Grade = keyof typeof GRADE_POINTS;

export interface Course {
  id: string;
  name: string;
  year: number;
  credits: number;
  grade: Grade;
  retaken: boolean;
}

export type Phase = "plan" | "event" | "report" | "quest" | "early" | "done";

export interface PlayerEvent extends GameEvent {
  isSample?: boolean;
}

export interface YearReport {
  year: number;
  semesterGpa: number;
  earned: number;
  notices: { title: string; body: string }[];
}

export interface GameState {
  seed: number;
  rolls: number;
  department: Department;
  goalType: GoalType;
  year: number;
  phase: Phase;
  stats: Record<Exclude<StatKey, "money">, number>;
  money: number;
  debt: number;
  courses: Course[];
  flags: string[];
  usedEvents: string[];
  items: string[];
  labId: string | null;
  labCount: number;
  plan: PlanInput | null;
  buffs: { notes: boolean; energy: boolean };
  events: PlayerEvent[];
  eventIndex: number;
  lastResult: { title: string; result: string; changes: Effects; success: boolean } | null;
  report: YearReport | null;
  questId: string;
  questStatus: "none" | "passed" | "later";
  startCard: string;
  leaves: number;
  usedParttime: number;
  earlyGraduated: boolean;
}

export interface PlanInput {
  credits: number;
  retakeCourseId: string | null;
  activity: string;
  labId: string | null;
  items: string[];
}

function roll(state: GameState) {
  state.rolls += 1;
  let value = (state.seed + state.rolls * 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const pick = <T>(state: GameState, items: readonly T[]) => items[Math.floor(roll(state) * items.length)];

export function applyEffects(state: GameState, effects: Effects) {
  for (const [key, delta] of Object.entries(effects) as [StatKey, number][]) {
    if (key === "money") state.money = Math.max(0, state.money + delta);
    else state.stats[key as Exclude<StatKey, "money">] = Math.min(100, Math.max(0, state.stats[key as Exclude<StatKey, "money">] + delta));
  }
}

export function createState(seed: number, department: Department, goalType: GoalType): GameState {
  const state: GameState = {
    seed, rolls: 0, department, goalType, year: 1, phase: "plan",
    stats: { study: 50, network: 50, mental: 60, romance: 50, luck: 50, reputation: 40, career: 40 },
    money: 100, debt: 0, courses: [], flags: [], usedEvents: [], items: [], labId: null, labCount: 0, plan: null,
    buffs: { notes: false, energy: false }, events: [], eventIndex: 0, lastResult: null, report: null,
    questId: "", questStatus: "none", startCard: "", leaves: 0, usedParttime: 0, earlyGraduated: false,
  };
  state.questId = pick(state, QUESTS[goalType]).id;
  const card = pick(state, START_CARDS);
  state.startCard = card.id;
  applyEffects(state, card.effects);
  return state;
}

export function earnedCredits(state: GameState) {
  return state.courses.filter((course) => course.grade !== "F").reduce((sum, course) => sum + course.credits, 0);
}

export function calculateGpa(state: GameState, year?: number) {
  const courses = state.courses.filter((course) => year === undefined || course.year === year);
  const credits = courses.reduce((sum, course) => sum + course.credits, 0);
  if (!credits) return 0;
  const total = courses.reduce((sum, course) => sum + GRADE_POINTS[course.grade] * course.credits, 0);
  return Math.round((total / credits) * 100) / 100;
}

const hasFlag = (state: GameState, flag: string) => state.flags.includes(flag);
const addFlag = (state: GameState, flag?: string) => { if (flag && !hasFlag(state, flag)) state.flags.push(flag); };

export function creditOptions(state: GameState) {
  const gpa = calculateGpa(state);
  return [34, 38, ...(gpa >= 3.5 ? [42] : []), ...(gpa >= 4.0 ? [48] : [])];
}

export function retakeOptions(state: GameState) {
  return state.courses.filter((course) => GRADE_POINTS[course.grade] <= 2.5 && course.name !== "기타 이수");
}

export function availableActivities(state: GameState) {
  const gpa = calculateGpa(state);
  const hasGrades = state.courses.length > 0;
  return ACTIVITIES.map((activity) => {
    let locked: string | null = null;
    if (activity.id === "work" && hasGrades && gpa < 2.0) locked = "직전 평점 C0 이상";
    if (activity.id === "dream" && state.year < 2) locked = "2학년부터";
    if (activity.id === "lab" && (state.year < 3 || state.stats.study < 50)) locked = "3학년부터, 학업 50 이상";
    if (activity.id === "tutor" && (!hasGrades || gpa < 3.5)) locked = "직전 평점 3.5 이상";
    return { ...activity, locked };
  });
}

export const availableLabs = (state: GameState) => LABS[state.department];

export function shopItems(state: GameState) {
  const owned = new Set(state.items);
  return ITEMS.filter((item) => !["pass", "suit"].includes(item.id) || !owned.has(item.id));
}

function activityIncome(state: GameState, activityId: string) {
  const activity = ACTIVITIES.find((item) => item.id === activityId)!;
  return activity.income + ALLOWANCE;
}

export function planCost(state: GameState, plan: Pick<PlanInput, "activity" | "items">) {
  const itemCost = plan.items.reduce((sum, id) => sum + (ITEMS.find((item) => item.id === id)?.price ?? 0), 0);
  const income = activityIncome(state, plan.activity);
  const need = TUITION + LIVING_COST + itemCost;
  const shortfall = Math.max(0, need - state.money - income);
  return { income, tuition: TUITION, living: LIVING_COST, itemCost, shortfall, needsLoan: shortfall > 0, canLoan: shortfall <= YEARLY_LOAN_LIMIT && state.debt + shortfall <= DEBT_LIMIT };
}

export class GameError extends Error {}

export function applyPlan(state: GameState, plan: PlanInput, takeLoan: boolean) {
  if (state.phase !== "plan") throw new GameError("지금은 학년 계획 단계가 아닙니다.");
  if (!creditOptions(state).includes(plan.credits)) throw new GameError("신청할 수 없는 학점입니다.");
  const activity = availableActivities(state).find((item) => item.id === plan.activity);
  if (!activity || activity.locked) throw new GameError("선택할 수 없는 활동입니다.");
  if (plan.activity === "lab" && !availableLabs(state).some((lab) => lab.id === plan.labId)) throw new GameError("연구실을 골라 주세요.");
  if (plan.retakeCourseId && !retakeOptions(state).some((course) => course.id === plan.retakeCourseId)) throw new GameError("재수강할 수 없는 과목입니다.");
  const available = new Set(shopItems(state).map((item) => item.id));
  if (plan.items.some((id) => !available.has(id)) || new Set(plan.items).size !== plan.items.length) throw new GameError("살 수 없는 아이템입니다.");
  const cost = planCost(state, plan);
  if (cost.needsLoan) {
    if (!cost.canLoan) throw new GameError("대출 한도를 넘습니다. 휴학하거나 아이템을 줄여 주세요.");
    if (!takeLoan) throw new GameError("잔액이 부족합니다. 대출에 동의해 주세요.");
    state.debt += cost.shortfall;
  }
  state.money = Math.max(0, state.money + cost.income - TUITION - LIVING_COST - cost.itemCost);
  if (plan.activity === "parttime") state.usedParttime += 1;
  if (plan.activity === "contest" && roll(state) < 0.2 + state.stats.luck / 200) applyEffects(state, { money: 200, career: 8 });
  if (plan.activity === "english" && roll(state) < 0.7) addFlag(state, "english-cert");
  if (plan.activity === "lab") { state.labCount += 1; state.labId = plan.labId; }
  if (plan.activity === "dream") addFlag(state, "dream");
  applyEffects(state, activity.effects);
  for (const id of plan.items) {
    state.items.push(id);
    if (id === "book") applyEffects(state, { study: 6 });
    if (id === "charm") applyEffects(state, { luck: 10 });
    if (id === "suit") applyEffects(state, { career: 10 });
    if (id === "notes") state.buffs.notes = true;
    if (id === "energy") state.buffs.energy = true;
  }
  if (hasFlag(state, "pass") || state.items.includes("pass")) applyEffects(state, { mental: 5 });
  const load = plan.credits + (plan.retakeCourseId ? 3 : 0);
  const mentalCost = Math.max(0, (load - 34) * 0.8) + 5;
  applyEffects(state, { mental: -Math.round(mentalCost * (state.buffs.energy ? 0.4 : 1)) });
  state.plan = plan;
  state.events = pickEvents(state);
  state.eventIndex = 0;
  state.lastResult = null;
  state.phase = "event";
}

export function canTakeLeave(state: GameState, activity: string) {
  return state.phase === "plan" && state.leaves < MAX_LEAVES && !planCost(state, { activity, items: [] }).canLoan;
}

export function takeLeave(state: GameState, activity: string) {
  if (state.phase !== "plan") throw new GameError("지금은 휴학할 수 없습니다.");
  if (!ACTIVITIES.some((item) => item.id === activity)) throw new GameError("활동을 골라 주세요.");
  if (!canTakeLeave(state, activity)) throw new GameError("휴학은 대출 한도를 넘을 때만, 두 번까지 가능합니다.");
  state.leaves += 1;
  applyEffects(state, { money: 260, mental: 15, study: -5 });
  state.report = { year: state.year, semesterGpa: 0, earned: 0, notices: [{ title: "휴학 처리", body: "휴학이 승인되었습니다. 귀하의 학년은 그대로입니다." }] };
  state.phase = "report";
}

export function pickEvents(state: GameState): PlayerEvent[] {
  const pool = EVENTS.filter((event) => event.year === state.year && !state.usedEvents.includes(event.id));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let picked: GameEvent[] = shuffled.slice(0, 2);
  if (state.year === 4 && !hasFlag(state, "english-cert")) picked = [ENGLISH_EVENT, ...picked.slice(0, 1)];
  else if (state.year >= 3 && roll(state) < 0.35) picked = [picked[0], { ...INTERVIEW_EVENT, year: state.year }];
  const events = picked.map((event) => structuredClone(event)) as PlayerEvent[];
  if (state.year === 3 && state.questStatus === "passed" && !hasFlag(state, "outside-class")) events[0].options.push(structuredClone(HIDDEN_OPTION));
  state.usedEvents.push(...events.map((event) => event.id));
  return events;
}

export function applyChoice(state: GameState, optionIndex: number) {
  if (state.phase !== "event") throw new GameError("지금은 선택할 수 없습니다.");
  const event = state.events[state.eventIndex];
  const option: EventOption | undefined = event?.options[optionIndex];
  if (!option) throw new GameError("없는 선택지입니다.");
  const success = option.chance === undefined || roll(state) < option.chance;
  const effects = success ? option.effects : option.failEffects ?? {};
  applyEffects(state, effects);
  if (success) addFlag(state, option.tag);
  if (option.tag === "lab" && success) state.labCount += 1;
  state.lastResult = { title: event.title, result: success ? option.result : option.failResult ?? option.result, changes: effects, success };
  state.eventIndex += 1;
  if (state.eventIndex >= state.events.length) finishYear(state);
}

function rollGrade(state: GameState, load: number): Grade {
  const { study, mental, luck } = state.stats;
  const score = 36 + study * 0.62 + mental * 0.12 + luck * 0.08 + (36 - load) * 0.35 + (state.buffs.notes ? 6 : 0) + (roll(state) - 0.5) * 18;
  if (score >= 90) return "A+";
  if (score >= 84) return "A0";
  if (score >= 77) return "B+";
  if (score >= 70) return "B0";
  if (score >= 63) return "C+";
  if (score >= 56) return "C0";
  if (score >= 49) return "D+";
  if (score >= 42) return "D0";
  return "F";
}

function capRetake(grade: Grade): Grade {
  return grade === "A+" ? "A0" : grade;
}

function finishYear(state: GameState) {
  const plan = state.plan!;
  const load = plan.credits + (plan.retakeCourseId ? 3 : 0);
  const names = COURSES[state.department][state.year - 1];
  const before = earnedCredits(state);
  const notices: YearReport["notices"] = [];
  for (const [index, name] of names.entries()) {
    state.courses.push({ id: `${state.year}-${index}`, name, year: state.year, credits: 3, grade: rollGrade(state, load), retaken: false });
  }
  state.courses.push({ id: `${state.year}-etc`, name: "기타 이수", year: state.year, credits: plan.credits - 9, grade: rollGrade(state, load), retaken: false });
  if (plan.retakeCourseId) {
    const course = state.courses.find((item) => item.id === plan.retakeCourseId)!;
    course.grade = capRetake(rollGrade(state, load));
    // 재수강 성적은 재수강한 학년의 평점과 장학금에 반영한다.
    course.year = state.year;
    course.retaken = true;
    addFlag(state, "retaker");
    notices.push({ title: "재수강 처리", body: `${course.name} 재수강 성적 ${course.grade}. 과거의 귀하는 삭제되었습니다.` });
  }
  const gpa = calculateGpa(state, state.year);
  if (gpa >= 4.0) {
    applyEffects(state, { money: 200 });
    addFlag(state, "full-scholar");
    notices.push({ title: "전액 장학금", body: "성적 장학금 200만 원이 지급되었습니다. 전산 오류가 아닙니다." });
  } else if (gpa >= 3.5) {
    applyEffects(state, { money: 100 });
    notices.push({ title: "성적 장학금", body: "성적 장학금 100만 원이 지급되었습니다." });
  }
  if (gpa < 2.0) {
    addFlag(state, "warning");
    notices.push({ title: "학사경고", body: "귀하의 평점으로 학사경고 대상임을 통지합니다. 게임 기준이며 실제 기준이 아닙니다." });
  }
  for (const chain of CHAINS.filter((item) => item.year === state.year && hasFlag(state, item.flag))) {
    applyEffects(state, chain.effects);
    notices.push({ title: chain.title, body: chain.body });
  }
  const incident = pick(state, INCIDENTS);
  applyEffects(state, incident.effects);
  notices.push({ title: incident.title, body: incident.body });
  // 방학 동안 회복한다. 없으면 멘탈이 3학년쯤 바닥나 모든 판이 비슷해진다.
  applyEffects(state, { mental: 12 });
  state.buffs = { notes: false, energy: false };
  state.report = { year: state.year, semesterGpa: gpa, earned: earnedCredits(state) - before, notices };
  state.phase = "report";
}

export const isEligibleEarly = (state: GameState) =>
  state.year === 3 && earnedCredits(state) >= GRADUATION_CREDITS && calculateGpa(state) >= 4.0 && hasFlag(state, "english-cert");

export function continueAfterReport(state: GameState) {
  if (state.phase !== "report") throw new GameError("지금은 넘어갈 수 없습니다.");
  const wasLeave = state.report?.earned === 0 && state.report.semesterGpa === 0;
  if (wasLeave) { state.phase = "plan"; state.report = null; return; }
  if (state.year === 2 && state.questStatus === "none") { state.phase = "quest"; return; }
  if (isEligibleEarly(state)) { state.phase = "early"; return; }
  advanceYear(state);
}

function advanceYear(state: GameState) {
  state.report = null;
  if (state.year >= 4) { state.phase = "done"; return; }
  state.year += 1;
  state.phase = "plan";
}

export function resolveQuest(state: GameState, passed: boolean) {
  if (state.phase !== "quest" && state.phase !== "done") throw new GameError("지금은 현실 과제 단계가 아닙니다.");
  if (state.questStatus === "passed") throw new GameError("이미 이수했습니다.");
  state.questStatus = passed ? "passed" : "later";
  if (passed) applyEffects(state, { network: 5, mental: 5 });
  if (state.phase === "quest") advanceYear(state);
}

export function chooseEarly(state: GameState, graduate: boolean) {
  if (state.phase !== "early") throw new GameError("지금은 선택할 수 없습니다.");
  if (graduate) { state.earlyGraduated = true; state.report = null; state.phase = "done"; return; }
  advanceYear(state);
}

export function calculateEnding(state: GameState): EndingId {
  const gpa = calculateGpa(state);
  const { reputation, network, career, romance, luck } = state.stats;
  if (earnedCredits(state) < GRADUATION_CREDITS || !hasFlag(state, "english-cert")) return "overtime";
  if ((hasFlag(state, "dream") || hasFlag(state, "council")) && reputation >= 80 && network >= 70) return "president";
  if (hasFlag(state, "startup") && network >= 60 && luck >= 60) return "startup";
  if (gpa >= 3.7 && career >= 85) return "bigCompany";
  if (gpa >= 4.3) return "topStudent";
  if (state.earlyGraduated) return "early";
  if (state.labCount >= 2 && gpa >= 3.8) return "gradSchool";
  if (romance >= 90) return "romantic";
  return "normal";
}

export function calculateAchievements(state: GameState): AchievementId[] {
  const ending = calculateEnding(state);
  const achievements = new Set<AchievementId>();
  if (ending === "overtime") achievements.add("fossil");
  else if (ending !== "normal" && ending !== "gradSchool") achievements.add(ending === "romantic" ? "romantic" : ending as AchievementId);
  if (ending !== "overtime") {
    if (state.earlyGraduated) achievements.add("early");
    if (state.stats.romance >= 90) achievements.add("romantic");
    if (state.debt === 0) achievements.add("noDebt");
  }
  if (hasFlag(state, "warning") || hasFlag(state, "warning-survive")) achievements.add("warning");
  if (hasFlag(state, "retaker")) achievements.add("retaker");
  if (state.usedParttime >= 3) achievements.add("parttime");
  if (hasFlag(state, "exchange")) achievements.add("exchange");
  if (hasFlag(state, "full-scholar")) achievements.add("fullScholar");
  if (state.questStatus === "passed") achievements.add("realWorld");
  return [...achievements];
}

export function calculateScore(state: GameState) {
  const points = calculateAchievements(state).reduce((sum, id) => sum + ACHIEVEMENTS[id].points, 0);
  return Math.max(0, points - Math.floor(state.debt / 100) * 5);
}

export function statGrade(value: number): Grade {
  if (value >= 90) return "A+";
  if (value >= 80) return "A0";
  if (value >= 70) return "B+";
  if (value >= 60) return "B0";
  if (value >= 50) return "C+";
  if (value >= 40) return "C0";
  if (value >= 30) return "D+";
  if (value >= 20) return "D0";
  return "F";
}

export const endingTitles = (ending: EndingId): readonly string[] => ENDINGS[ending].titles;

export function grade(state: GameState) {
  return statGrade(calculateScore(state));
}
