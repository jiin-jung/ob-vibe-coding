import {
  ACHIEVEMENTS, ACTIVITIES, CHAINS, COURSES, ENDINGS, ENGLISH_EVENT, EVENTS, INCIDENTS, INTERVIEW_EVENT, ITEMS, LABS, REACTIONS, SIGNUP_RESULTS, START_CARDS, STYLES,
} from "./content.ts";
import type { AchievementId, Department, Effects, EndingId, EventOption, FocusStat, GameEvent, GoalType, StatKey } from "./content.ts";

export const GRADUATION_CREDITS = 130;
export const TOTAL_SEMESTERS = 8;
export const TUITION = 100;
export const SEMESTER_LOAN_LIMIT = 100;
export const DEBT_LIMIT = 500;
export const LIVING_COST = 25;
export const ALLOWANCE = 15;
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

export type Phase = "plan" | "event" | "report" | "early" | "done";

export interface PlayerEvent extends GameEvent {
  isSample?: boolean;
}

export interface YearReport {
  semester: number;
  semesterGpa: number;
  earned: number;
  growth: Partial<Record<FocusStat, number>>;
  notices: { title: string; body: string }[];
  reactions: string[];
}

export type SignupTier = keyof typeof SIGNUP_RESULTS;

export interface SignupState {
  startedAt: number;
  delayMs: number;
  tier: SignupTier | null;
  reactionMs: number | null;
  credits: number | null;
}

export interface GameState {
  seed: number;
  rolls: number;
  department: Department;
  goalType: GoalType;
  year: number;
  semester: number;
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
  startCard: string;
  style: string;
  focus: FocusStat[];
  signup: SignupState | null;
  gaps: number;
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

export class GameError extends Error {}

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

export function createState(seed: number, department: Department, goalType: GoalType, styleId = "scholar", focus: FocusStat[] = ["study", "network"]): GameState {
  const style = STYLES.find((item) => item.id === styleId);
  if (!style) throw new GameError("없는 스타일입니다.");
  const state: GameState = {
    seed, rolls: 0, department, goalType, year: 1, semester: 1, phase: "plan",
    stats: { ...style.stats, luck: 50, reputation: 40, career: 40 },
    money: 100, debt: 0, courses: [], flags: [], usedEvents: [], items: [], labId: null, labCount: 0, plan: null,
    buffs: { notes: false, energy: false }, events: [], eventIndex: 0, lastResult: null, report: null,
    style: style.id, focus, signup: null, gaps: 0,
    startCard: "", leaves: 0, usedParttime: 0, earlyGraduated: false,
  };
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
  // 인천대 수강 기준: 학기 17~19학점, 직전 평점 3.5 이상 21학점, 4.0 이상 24학점 (docs/INU_FACTS.md).
  return [17, 19, ...(gpa >= 3.5 ? [21] : []), ...(gpa >= 4.0 ? [24] : [])];
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
  return { income, tuition: TUITION, living: LIVING_COST, itemCost, shortfall, needsLoan: shortfall > 0, canLoan: shortfall <= SEMESTER_LOAN_LIMIT && state.debt + shortfall <= DEBT_LIMIT };
}

export function startSignup(state: GameState, now: number) {
  if (state.phase !== "plan") throw new GameError("지금은 수강신청 기간이 아닙니다.");
  if (state.signup?.tier) throw new GameError("이번 학기 수강신청은 끝났습니다.");
  state.signup = { startedAt: now, delayMs: 1500 + Math.floor(roll(state) * 3000), tier: null, reactionMs: null, credits: null };
  return state.signup;
}

export function signupTier(reactionMs: number): SignupTier {
  if (reactionMs < 0 || reactionMs > 1000) return "spaceGap";
  return reactionMs <= 500 ? "allClear" : "partial";
}

export function finishSignup(state: GameState, now: number) {
  const signup = state.signup;
  if (state.phase !== "plan" || !signup || signup.tier) throw new GameError("수강신청을 먼저 시작해 주세요.");
  // 버튼이 열리기 전 클릭은 음수가 되어 우주공강으로 처리된다. 시간은 서버 기준이다.
  const reactionMs = now - signup.startedAt - signup.delayMs;
  const tier = signupTier(reactionMs);
  const options = creditOptions(state);
  signup.tier = tier;
  signup.reactionMs = reactionMs;
  signup.credits = tier === "allClear" ? options[options.length - 1] : tier === "partial" ? 17 : 15;
  if (tier === "spaceGap") state.gaps += 1;
  applyEffects(state, SIGNUP_RESULTS[tier].effects);
  return signup;
}

export function applyPlan(state: GameState, input: Omit<PlanInput, "credits">, takeLoan: boolean) {
  if (state.phase !== "plan") throw new GameError("지금은 학기 계획 단계가 아닙니다.");
  if (!state.signup?.credits) throw new GameError("수강신청을 먼저 해 주세요.");
  const plan: PlanInput = { ...input, credits: state.signup.credits };
  if (plan.items.length > 1) throw new GameError("상점에서는 학기마다 하나만 살 수 있습니다.");
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
  if (plan.activity === "contest" && roll(state) < 0.2 + state.stats.luck / 200) applyEffects(state, { money: 100, career: 5 });
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
  if (state.items.includes("pass")) applyEffects(state, { mental: 3 });
  const load = plan.credits + (plan.retakeCourseId ? 3 : 0);
  const mentalCost = Math.max(0, (load - 17) * 0.8) + 3;
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
  applyEffects(state, { money: 130, mental: 10, study: -3 });
  state.signup = null;
  state.report = { semester: state.semester, semesterGpa: 0, earned: 0, growth: {}, notices: [{ title: "휴학 처리", body: "휴학이 승인되었습니다. 귀하의 학기는 그대로입니다." }], reactions: [] };
  state.phase = "report";
}

export function pickEvents(state: GameState): PlayerEvent[] {
  const unused = EVENTS.filter((event) => !state.usedEvents.includes(event.id));
  const sameYear = unused.filter((event) => event.year === state.year);
  const pool = sameYear.length ? sameYear : unused.filter((event) => event.year < state.year);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // 학기마다 전환점은 하나만 둔다.
  let picked: GameEvent[] = shuffled.slice(0, 1);
  if (state.semester >= 7 && !hasFlag(state, "english-cert")) picked = [ENGLISH_EVENT];
  else if (state.semester >= 5 && !state.usedEvents.includes(INTERVIEW_EVENT.id) && roll(state) < 0.3) picked = [{ ...INTERVIEW_EVENT, year: state.year }];
  if (!picked.length) picked = [structuredClone(EVENTS[Math.floor(roll(state) * EVENTS.length)])];
  const events = picked.map((event) => structuredClone(event)) as PlayerEvent[];
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
  const score = 36 + study * 0.62 + mental * 0.12 + luck * 0.08 + (18 - load) * 0.7 + (state.buffs.notes ? 6 : 0) + (roll(state) - 0.5) * 18;
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
  const yearCourses = COURSES[state.department][state.year - 1];
  const names = state.semester % 2 === 1 ? yearCourses.slice(0, 2) : yearCourses.slice(2);
  const before = earnedCredits(state);
  const notices: YearReport["notices"] = [];
  for (const [index, name] of names.entries()) {
    state.courses.push({ id: `${state.semester}-${index}`, name, year: state.semester, credits: 3, grade: rollGrade(state, load), retaken: false });
  }
  state.courses.push({ id: `${state.semester}-etc`, name: "기타 이수", year: state.semester, credits: plan.credits - names.length * 3, grade: rollGrade(state, load), retaken: false });
  if (plan.retakeCourseId) {
    const course = state.courses.find((item) => item.id === plan.retakeCourseId)!;
    course.grade = capRetake(rollGrade(state, load));
    // 재수강 성적은 재수강한 학년의 평점과 장학금에 반영한다.
    course.year = state.semester;
    course.retaken = true;
    addFlag(state, "retaker");
    notices.push({ title: "재수강 처리", body: `${course.name} 재수강 성적 ${course.grade}. 과거의 귀하는 삭제되었습니다.` });
  }
  const gpa = calculateGpa(state, state.semester);
  if (gpa >= 4.0) {
    applyEffects(state, { money: 100 });
    addFlag(state, "full-scholar");
    notices.push({ title: "전액 장학금", body: "성적 장학금 100만 원이 지급되었습니다. 전산 오류가 아닙니다." });
  } else if (gpa >= 3.5) {
    applyEffects(state, { money: 50 });
    notices.push({ title: "성적 장학금", body: "성적 장학금 50만 원이 지급되었습니다." });
  }
  if (gpa < 2.0) {
    addFlag(state, "warning");
    notices.push({ title: "학사경고", body: "귀하의 평점으로 학사경고 대상임을 통지합니다. 게임 기준이며 실제 기준이 아닙니다." });
  }
  for (const chain of CHAINS.filter((item) => item.year === state.year && hasFlag(state, item.flag) && !hasFlag(state, `chain:${item.flag}`))) {
    addFlag(state, `chain:${chain.flag}`);
    applyEffects(state, chain.effects);
    notices.push({ title: chain.title, body: chain.body });
  }
  if (roll(state) < 0.6) {
    const incident = pick(state, INCIDENTS);
    applyEffects(state, incident.effects);
    notices.push({ title: incident.title, body: incident.body });
  }
  // 방학 동안 회복한다. 없으면 멘탈이 3학년쯤 바닥나 모든 판이 비슷해진다.
  applyEffects(state, { mental: 7 });
  const growth: YearReport["growth"] = {};
  for (const stat of ["study", "network", "mental", "romance"] as FocusStat[]) {
    const before = state.stats[stat];
    applyEffects(state, { [stat]: state.focus.includes(stat) ? 3 : 0 });
    growth[stat] = state.stats[stat] - before;
  }
  const signupTierNow = state.signup?.tier;
  const reactionPool = [
    ...(gpa >= 3.7 ? REACTIONS.high : gpa < 2.5 ? REACTIONS.low : REACTIONS.normal),
    ...(signupTierNow === "spaceGap" ? REACTIONS.spaceGap : signupTierNow === "allClear" ? REACTIONS.allClear : []),
    ...(state.debt > 0 ? REACTIONS.debt : []),
  ];
  const reactions = [...reactionPool].sort(() => roll(state) - 0.5).slice(0, 3);
  state.buffs = { notes: false, energy: false };
  state.signup = null;
  state.report = { semester: state.semester, semesterGpa: gpa, earned: earnedCredits(state) - before, growth, notices, reactions };
  state.phase = "report";
}

export const isEligibleEarly = (state: GameState) =>
  state.semester === 6 && earnedCredits(state) >= GRADUATION_CREDITS && calculateGpa(state) >= 4.0 && hasFlag(state, "english-cert");

export function continueAfterReport(state: GameState) {
  if (state.phase !== "report") throw new GameError("지금은 넘어갈 수 없습니다.");
  const wasLeave = state.report?.earned === 0 && state.report.semesterGpa === 0;
  if (wasLeave) { state.phase = "plan"; state.report = null; return; }
  if (isEligibleEarly(state)) { state.phase = "early"; return; }
  advanceYear(state);
}

function advanceYear(state: GameState) {
  state.report = null;
  if (state.semester >= TOTAL_SEMESTERS) { state.phase = "done"; return; }
  state.semester += 1;
  state.year = Math.ceil(state.semester / 2);
  state.phase = "plan";
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
  if (gpa >= 4.35) return "topStudent";
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
  if (state.gaps >= 2) achievements.add("spaceGap");
  if (state.usedParttime >= 5) achievements.add("parttime");
  if (hasFlag(state, "exchange")) achievements.add("exchange");
  if (hasFlag(state, "full-scholar")) achievements.add("fullScholar");
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
