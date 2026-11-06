import { randomBytes, createHash } from "node:crypto";
import { db, newId } from "./db.ts";
import { sampleGoal } from "./ai.ts";
import { applyChoice, applyPlan, continueAfterReport, createState, finishSignup, startSignup } from "./game.ts";
import type { Department } from "./content.ts";

// 시연 전에 실행한다. 시연용 랭킹과 3학년 계획에서 시작하는 플레이를 만든다.
const demoRows: [string, Department, number, string[]][] = [
  ["수강철회왕", "cse", 240, ["president", "fullScholar", "noDebt"]],
  ["공강사냥꾼", "ice", 210, ["bigCompany", "early", "retaker"]],
  ["칩만드는사람", "ais", 170, ["startup", "exchange"]],
  ["1교시생존자", "cse", 120, ["topStudent", "noDebt"]],
  ["학식평론가", "ice", 90, ["romantic", "parttime", "warning"]],
  ["로봇산책러", "ais", 60, ["fossil", "exchange"]],
];

db.exec("DELETE FROM achievements WHERE run_id IN (SELECT run_id FROM ranking_entries WHERE is_demo = 1)");
db.exec("DELETE FROM ranking_entries WHERE is_demo = 1");
const createdAt = Date.now();
const demoRun = (nickname: string, department: Department, score: number, achievements: string[]) => {
  const runId = `demo-${newId()}`;
  db.prepare("INSERT INTO ranking_entries (run_id, user_key, nickname, department, score, is_demo, created_at) VALUES (?,?,?,?,?,1,?)")
    .run(runId, `demo:${nickname}`, nickname, department, score, createdAt);
  for (const achievement of achievements) db.prepare("INSERT INTO achievements (run_id, achievement) VALUES (?,?)").run(runId, achievement);
};
for (const [nickname, department, score, achievements] of demoRows) demoRun(nickname, department, score, achievements);

const regret = "다른 과 친구를 한 명도 못 사귄 게 후회돼요";
const goal = sampleGoal(regret);
const state = createState(20261106, "cse", goal.goalType);
for (let semester = 1; semester <= 4; semester++) {
  const signup = startSignup(state, 0);
  finishSignup(state, signup.delayMs + 300);
  applyPlan(state, { retakeCourseId: null, activity: semester <= 2 ? "work" : "dream", labId: null, items: [] }, true);
  while (state.phase === "event") applyChoice(state, 0);
  continueAfterReport(state);
}
const token = randomBytes(24).toString("hex");
const id = newId();
db.prepare(`INSERT INTO runs (id, token_hash, nickname, department, avatar, regret, goal_text, notice, serious, goal_sample, round, state, created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, createHash("sha256").update(token).digest("hex"), "시연학생", "cse", "m", "", goal.goalText, goal.notice, 0, 1, 1, JSON.stringify(state), Date.now());
console.log(`phase=${state.phase} year=${state.year} semester=${state.semester}`);
console.log(`시연 플레이: /play/${id}?token=${token}`);
