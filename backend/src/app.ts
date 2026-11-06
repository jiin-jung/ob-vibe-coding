import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { createGoal, rewriteEvents, writeEnding } from "./ai.ts";
import { ACHIEVEMENTS, DEPARTMENTS, ENDINGS, GOAL_NAMES, SIGNUP_RESULTS, START_CARDS, STYLES } from "./content.ts";
import type { AchievementId, Department, Effects, FocusStat } from "./content.ts";
import { db, newId } from "./db.ts";
import { isInuEmail, normalizeEmail } from "./email.ts";
import {
  applyChoice, applyPlan, availableActivities, availableLabs, calculateAchievements, calculateEnding, calculateGpa, calculateScore, chooseEarly, continueAfterReport,
  canTakeLeave, createState, earnedCredits, finishSignup, startSignup, GameError, GRADUATION_CREDITS, isEligibleEarly, LIVING_COST, planCost, retakeOptions, shopItems, statGrade, takeLeave, TOTAL_SEMESTERS, TUITION, SEMESTER_LOAN_LIMIT, DEBT_LIMIT, ALLOWANCE,
} from "./game.ts";
import type { GameState } from "./game.ts";
import { sendMail } from "./mail.ts";

type Row = Record<string, any>;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const CODE_TTL = 10 * 60_000;
const RESEND_GAP = 60_000;
const MAX_ATTEMPTS = 5;
const SESSION_TTL = 30 * 24 * 60 * 60_000;
const RUNS_PER_HOUR = 30;
const RANKED_PER_HOUR = 20;

export const app = new Hono().basePath("/api");

const fail = (status: 400 | 401 | 403 | 404 | 409 | 429 | 503, error: string, message: string) =>
  new Response(JSON.stringify({ error, message }), { status, headers: { "content-type": "application/json" } });

app.onError((error, c) => {
  if (error instanceof z.ZodError) return c.json({ error: "invalid_input", message: "입력값을 다시 확인해 주세요." }, 400);
  if (error instanceof GameError) return c.json({ error: "game_rule", message: error.message }, 409);
  console.error(error);
  return c.json({ error: "server_error", message: "잠시 후 다시 시도해 주세요." }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

function currentUser(c: Context) {
  const token = getCookie(c, "session");
  if (!token) return undefined;
  return db.prepare("SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.created_at > ?").get(sha(token), Date.now() - SESSION_TTL) as Row | undefined;
}

app.get("/me", (c) => {
  const user = currentUser(c);
  return c.json({ user: user ? { email: user.email } : null });
});

app.post("/auth/request", async (c) => {
  const { email: raw } = z.object({ email: z.string().max(254) }).parse(await c.req.json());
  if (!isInuEmail(raw)) return fail(400, "invalid_domain", "@inu.ac.kr 메일만 사용할 수 있어요.");
  const email = normalizeEmail(raw);
  const existing = db.prepare("SELECT sent_at FROM auth_codes WHERE email = ?").get(email) as Row | undefined;
  if (existing && Date.now() - existing.sent_at < RESEND_GAP) return fail(429, "too_soon", "1분 뒤에 다시 보낼 수 있어요.");
  const code = String(randomInt(100000, 1000000));
  db.prepare("INSERT OR REPLACE INTO auth_codes (email, code_hash, expires_at, attempts, sent_at) VALUES (?,?,?,0,?)")
    .run(email, sha(`${email}:${code}`), Date.now() + CODE_TTL, Date.now());
  try {
    await sendMail(email, `[재수강] 인증 코드 ${code}`, `인증 코드: ${code}\n10분 안에 입력해 주세요. 요청한 적이 없다면 이 메일을 무시해 주세요.`);
  } catch (error) {
    console.error("[mail]", error);
    db.prepare("DELETE FROM auth_codes WHERE email = ?").run(email);
    return fail(503, "mail_failed", "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  return c.json({ ok: true });
});

app.post("/auth/verify", async (c) => {
  const body = z.object({ email: z.string().max(254), code: z.string().max(10) }).parse(await c.req.json());
  if (!isInuEmail(body.email)) return fail(400, "invalid_domain", "@inu.ac.kr 메일만 사용할 수 있어요.");
  const email = normalizeEmail(body.email);
  const row = db.prepare("SELECT * FROM auth_codes WHERE email = ?").get(email) as Row | undefined;
  if (!row || row.expires_at < Date.now()) return fail(400, "code_expired", "코드가 만료됐어요. 다시 받아 주세요.");
  if (row.attempts >= MAX_ATTEMPTS) return fail(429, "too_many_attempts", "시도 횟수를 넘겼어요. 코드를 다시 받아 주세요.");
  if (!timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(sha(`${email}:${body.code.trim()}`)))) {
    db.prepare("UPDATE auth_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
    return fail(400, "wrong_code", "코드가 맞지 않아요.");
  }
  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as Row | undefined;
  if (!user) {
    user = { id: newId() };
    db.prepare("INSERT INTO users (id, email, created_at) VALUES (?,?,?)").run(user.id, email, Date.now());
  }
  db.prepare("DELETE FROM auth_codes WHERE email = ?").run(email);
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?,?,?)").run(sha(token), user.id, Date.now());
  setCookie(c, "session", token, { httpOnly: true, sameSite: "Lax", path: "/", secure: c.req.header("x-forwarded-proto") === "https", maxAge: 30 * 24 * 3600 });
  return c.json({ ok: true });
});

app.post("/auth/logout", (c) => {
  const token = getCookie(c, "session");
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

const recentRuns = new Map<string, number[]>();

function isRateLimited(c: Context) {
  let ip = "local";
  try { ip = getConnInfo(c).remote.address ?? "local"; } catch { /* 테스트 환경 */ }
  // ponytail: 서버 메모리 기준 제한. 여러 서버로 늘리면 공용 저장소가 필요하다.
  const now = Date.now();
  const hits = (recentRuns.get(ip) ?? []).filter((time) => now - time < 3600_000);
  if (hits.length >= RUNS_PER_HOUR) return true;
  hits.push(now);
  recentRuns.set(ip, hits);
  return false;
}

function loadRun(c: Context) {
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(c.req.param("id") ?? "") as Row | undefined;
  const token = c.req.header("x-run-token") ?? c.req.query("token") ?? "";
  if (!run || run.token_hash !== sha(token)) return { error: fail(404, "run_not_found", "플레이를 찾을 수 없어요.") };
  return { run, state: JSON.parse(run.state) as GameState };
}

const saveState = (id: string, state: GameState) => db.prepare("UPDATE runs SET state = ? WHERE id = ?").run(JSON.stringify(state), id);

const PUBLIC_STATS = ["study", "network", "mental", "romance", "money"] as const;

function publicChanges(effects: Effects) {
  return Object.fromEntries(PUBLIC_STATS.filter((key) => effects[key]).map((key) => [key, effects[key]]));
}

function toRunView(run: Row, state: GameState) {
  const card = START_CARDS.find((item) => item.id === state.startCard)!;
  const plan = state.phase === "plan" ? {
    retakeOptions: retakeOptions(state).map(({ id, name, grade, credits }) => ({ id, name, grade, credits })),
    activities: availableActivities(state).map(({ id, name, income, description, locked }) => ({ id, name, income, description, locked })),
    labs: availableLabs(state),
    items: shopItems(state),
    tuition: TUITION,
    living: LIVING_COST,
    allowance: ALLOWANCE,
    signup: state.signup?.tier ? { tier: state.signup.tier, credits: state.signup.credits, reactionMs: state.signup.reactionMs, ...SIGNUP_RESULTS[state.signup.tier] } : null,
    loanLimit: SEMESTER_LOAN_LIMIT,
    debtRoom: DEBT_LIMIT - state.debt,
    leaveActivities: availableActivities(state).filter((item) => canTakeLeave(state, item.id)).map((item) => item.id),
  } : null;
  const event = state.phase === "event" ? state.events[state.eventIndex] : null;
  return {
    id: run.id,
    nickname: run.nickname,
    department: run.department,
    departmentName: DEPARTMENTS[run.department as Department].name,
    avatar: run.avatar,
    round: run.round,
    goalType: GOAL_NAMES[state.goalType],
    goalText: run.goal_text,
    notice: run.notice,
    serious: Boolean(run.serious),
    isGoalSample: Boolean(run.goal_sample),
    startCard: { name: card.name, body: card.body },
    style: STYLES.find((item) => item.id === state.style)?.name,
    focus: state.focus,
    courses: state.courses.map(({ id, name, year, credits, grade, retaken }) => ({ id, name, year, credits, grade, retaken })),
    year: state.year,
    semester: state.semester,
    term: state.semester % 2 === 1 ? 1 : 2,
    totalSemesters: TOTAL_SEMESTERS,
    phase: state.phase,
    stats: { study: state.stats.study, network: state.stats.network, mental: state.stats.mental, romance: state.stats.romance },
    money: state.money,
    debt: state.debt,
    credits: earnedCredits(state),
    gpa: calculateGpa(state),
    graduationCredits: GRADUATION_CREDITS,
    englishCert: state.flags.includes("english-cert"),
    plan,
    event: event ? {
      title: event.title,
      body: event.body,
      isSample: Boolean(event.isSample),
      options: event.options.map((option) => ({ label: option.label, chance: option.chance ?? null, changes: publicChanges(option.effects) })),
    } : null,
    lastResult: state.lastResult ? { ...state.lastResult, changes: publicChanges(state.lastResult.changes) } : null,
    report: state.report,
    canEarly: isEligibleEarly(state),
  };
}

app.post("/runs", async (c) => {
  if (isRateLimited(c)) return fail(429, "too_many_runs", "잠시 후 다시 시작해 주세요.");
  const body = z.object({
    nickname: z.string().trim().min(1).max(12),
    department: z.enum(["cse", "ice", "ais"]),
    avatar: z.enum(["m", "f"]),
    regret: z.string().trim().min(1).max(300),
    style: z.enum(["scholar", "social", "romantic"]),
    focus: z.array(z.enum(["study", "network", "mental", "romance"])).min(1).max(2),
    previousRunId: z.string().max(64).optional(),
  }).parse(await c.req.json());
  const goal = await createGoal(DEPARTMENTS[body.department].name, body.regret);
  const token = randomBytes(24).toString("hex");
  const id = newId();
  const state = createState(randomInt(1, 2 ** 31), body.department, goal.goalType, body.style, [...new Set(body.focus)] as FocusStat[]);
  const user = currentUser(c);
  const previous = body.previousRunId ? db.prepare("SELECT round FROM runs WHERE id = ?").get(body.previousRunId) as Row | undefined : undefined;
  db.prepare(`INSERT INTO runs (id, token_hash, user_id, nickname, department, avatar, regret, goal_text, notice, serious, goal_sample, round, state, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, sha(token), user?.id ?? null, body.nickname, body.department, body.avatar, "", goal.goalText, goal.notice,
    goal.serious ? 1 : 0, goal.isSample ? 1 : 0, (previous?.round ?? 0) + 1, JSON.stringify(state), Date.now());
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as Row;
  return c.json({ token, run: toRunView(run, state) });
});

app.get("/runs/:id", (c) => {
  const { run, state, error } = loadRun(c);
  if (error) return error;
  return c.json(toRunView(run, state));
});

app.post("/runs/:id/plan", async (c) => {
  const { run, state, error } = loadRun(c);
  if (error) return error;
  const body = z.object({
    retakeCourseId: z.string().max(10).nullable(),
    activity: z.string().max(20),
    labId: z.string().max(20).nullable(),
    items: z.array(z.string().max(20)).max(6),
    takeLoan: z.boolean(),
  }).parse(await c.req.json());
  const { takeLoan, ...plan } = body;
  applyPlan(state, plan, takeLoan);
  const rewritten = await rewriteEvents({ year: state.year, semester: state.semester, department: DEPARTMENTS[run.department as Department].name, goal: run.goal_text, flags: state.flags }, state.events);
  state.events = rewritten.events.map((event) => ({ ...event, isSample: rewritten.isSample }));
  saveState(run.id, state);
  return c.json(toRunView(run, state));
});

app.post("/runs/:id/signup/start", (c) => {
  const { run, state, error } = loadRun(c);
  if (error) return error;
  const signup = startSignup(state, Date.now());
  saveState(run.id, state);
  return c.json({ delayMs: signup.delayMs });
});

app.post("/runs/:id/signup/click", (c) => {
  const { run, state, error } = loadRun(c);
  if (error) return error;
  const signup = finishSignup(state, Date.now());
  saveState(run.id, state);
  return c.json({ run: toRunView(run, state), reactionMs: signup.reactionMs, tier: signup.tier, credits: signup.credits, ...SIGNUP_RESULTS[signup.tier!] });
});

app.post("/runs/:id/cost", async (c) => {
  const { state, error } = loadRun(c);
  if (error) return error;
  const body = z.object({ activity: z.string().max(20), items: z.array(z.string().max(20)).max(6) }).parse(await c.req.json());
  return c.json(planCost(state, body));
});

function runAction(action: (state: GameState, body: any) => void, schema: z.ZodType = z.object({})) {
  return async (c: Context) => {
    const { run, state, error } = loadRun(c);
    if (error) return error;
    const body = schema.parse(await c.req.json().catch(() => ({})));
    action(state, body);
    saveState(run.id, state);
    return c.json(toRunView(run, state));
  };
}

app.post("/runs/:id/leave", runAction((state, body) => takeLeave(state, body.activity), z.object({ activity: z.string().max(20) })));
app.post("/runs/:id/choice", runAction((state, body) => applyChoice(state, body.optionIndex), z.object({ optionIndex: z.number().int().min(0).max(3) })));
app.post("/runs/:id/continue", runAction((state) => continueAfterReport(state)));
app.post("/runs/:id/early", runAction((state, body) => chooseEarly(state, body.graduate), z.object({ graduate: z.boolean() })));

function updateRanking(run: Row, state: GameState) {
  const current = db.prepare("SELECT user_id FROM runs WHERE id = ?").get(run.id) as Row;
  if (!current.user_id || state.phase !== "done") return;
  db.prepare("INSERT OR REPLACE INTO ranking_entries (run_id, user_key, nickname, department, score, created_at) VALUES (?,?,?,?,?,?)")
    .run(run.id, current.user_id, run.nickname, run.department, calculateScore(state), Date.now());
  db.prepare("DELETE FROM achievements WHERE run_id = ?").run(run.id);
  for (const id of calculateAchievements(state)) db.prepare("INSERT INTO achievements (run_id, achievement) VALUES (?,?)").run(run.id, id);
}

app.get("/runs/:id/result", async (c) => {
  const { run, state, error } = loadRun(c);
  if (error) return error;
  if (state.phase !== "done") return fail(409, "not_finished", "아직 졸업 처리되지 않았어요.");
  const ending = calculateEnding(state);
  if (!run.ending_text) {
    const achievementIds = calculateAchievements(state);
    const written = await writeEnding({
      department: DEPARTMENTS[run.department as Department].name, goal: run.goal_text, ending, achievements: achievementIds.map((id) => ACHIEVEMENTS[id].name),
      gpa: calculateGpa(state), flags: state.flags, round: run.round,
    });
    db.prepare("UPDATE runs SET ending_title = ?, ending_text = ?, next_action = ?, ending_sample = ? WHERE id = ?").run(written.title, written.ending, written.nextAction, written.isSample ? 1 : 0, run.id);
    Object.assign(run, { ending_title: written.title, ending_text: written.ending, next_action: written.nextAction, ending_sample: written.isSample ? 1 : 0 });
    updateRanking(run, state);
  }
  const registered = Boolean(db.prepare("SELECT 1 FROM ranking_entries WHERE run_id = ?").get(run.id));
  return c.json({
    run: toRunView(run, state),
    endingName: ENDINGS[ending].name,
    endingId: ending,
    title: run.ending_title,
    ending: run.ending_text,
    nextAction: run.next_action,
    isSample: Boolean(run.ending_sample),
    score: calculateScore(state),
    grades: { 학업: statGrade(state.stats.study), 인맥: statGrade(state.stats.network), 멘탈: statGrade(state.stats.mental), 낭만: statGrade(state.stats.romance) },
    achievements: calculateAchievements(state).map((id) => ({ id, ...ACHIEVEMENTS[id] })),
    registered,
  });
});

app.post("/runs/:id/register", (c) => {
  const user = currentUser(c);
  if (!user) return fail(401, "login_required", "@inu.ac.kr 메일 인증이 필요해요.");
  const { run, state, error } = loadRun(c);
  if (error) return error;
  if (state.phase !== "done") return fail(409, "not_finished", "졸업 처리 뒤에 등록할 수 있어요.");
  const recent = (db.prepare("SELECT COUNT(*) AS n FROM ranking_entries WHERE user_key = ? AND created_at > ?").get(user.id, Date.now() - 3600_000) as Row).n;
  if (recent >= RANKED_PER_HOUR) return fail(429, "too_many_ranked", "한 시간에 등록할 수 있는 기록을 넘겼어요.");
  db.prepare("UPDATE runs SET user_id = ? WHERE id = ?").run(user.id, run.id);
  updateRanking(run, state);
  return c.json({ ok: true });
});

app.get("/ranking", (c) => {
  const overall = db.prepare(`SELECT MAX(nickname) AS nickname, MAX(department) AS department, SUM(score) AS score, COUNT(*) AS plays, MAX(is_demo) AS is_demo
    FROM ranking_entries GROUP BY user_key ORDER BY score DESC LIMIT 20`).all() as Row[];
  const departments = db.prepare("SELECT department, SUM(score) AS score, COUNT(*) AS plays FROM ranking_entries GROUP BY department ORDER BY score DESC").all() as Row[];
  const achievementRows = db.prepare(`SELECT a.achievement, e.user_key, MAX(e.nickname) AS nickname, MAX(e.department) AS department, COUNT(*) AS count
    FROM achievements a JOIN ranking_entries e ON e.run_id = a.run_id GROUP BY a.achievement, e.user_key ORDER BY count DESC`).all() as Row[];
  const byAchievement = (Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
    const top = achievementRows.find((row) => row.achievement === id);
    return { id, ...ACHIEVEMENTS[id], leader: top ? { nickname: top.nickname, department: DEPARTMENTS[top.department as Department].short, count: top.count } : null };
  });
  const legends = db.prepare(`SELECT e.user_key, COUNT(*) AS n FROM achievements a JOIN ranking_entries e ON e.run_id = a.run_id
    WHERE a.achievement IN ('bigCompany','startup','topStudent','president') GROUP BY e.user_key`).all() as Row[];
  return c.json({
    hasDemoData: overall.some((row) => row.is_demo),
    overall: overall.map((row, index) => ({ rank: index + 1, nickname: row.nickname, department: DEPARTMENTS[row.department as Department].short, score: row.score, plays: row.plays })),
    departments: departments.map((row) => ({ department: DEPARTMENTS[row.department as Department].short, score: row.score, plays: row.plays })),
    achievements: byAchievement,
    legendCount: legends.reduce((sum, row) => sum + row.n, 0),
  });
});
