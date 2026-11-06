import assert from "node:assert/strict";
import test from "node:test";

process.env.DB_PATH = ":memory:";
delete process.env.ANTHROPIC_API_KEY;
const logs: string[] = [];
const realLog = console.log;
console.log = (...args: unknown[]) => { logs.push(args.join(" ")); };

const { app } = await import("./app.ts");
const { isInuEmail } = await import("./email.ts");

type Client = { cookie?: string; token?: string };
const call = async (client: Client, method: string, path: string, body?: unknown) => {
  const response = await app.request(`/api${path}`, {
    method,
    headers: {
      ...(client.cookie ? { cookie: client.cookie } : {}),
      ...(client.token ? { "x-run-token": client.token } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) client.cookie = setCookie.split(";")[0];
  return { status: response.status, json: await response.json() as any };
};

async function login(client: Client, email: string) {
  assert.equal((await call(client, "POST", "/auth/request", { email })).status, 200);
  const code = logs.findLast((line) => line.includes(`to=${email}`))!.match(/인증 코드: (\d{6})/)![1];
  assert.equal((await call(client, "POST", "/auth/verify", { email, code })).status, 200);
}

const newRun = { nickname: "재수생", department: "cse", avatar: "m", regret: "다른 과 친구를 못 사귀었어요" };

test("메일 도메인 위장을 막는다", async () => {
  for (const good of ["a@inu.ac.kr", " A@INU.AC.KR "]) assert.ok(isInuEmail(good));
  for (const bad of ["a@inu.ac.kr.evil.com", "a@evil-inu.ac.kr", "a@sub.inu.ac.kr", "a@b@inu.ac.kr", "a@inu.ac.krx", "@inu.ac.kr", "a@inuxac.kr"]) assert.ok(!isInuEmail(bad), bad);
  assert.equal((await call({}, "POST", "/auth/request", { email: "a@gmail.com" })).status, 400);
});

test("인증 코드는 5회까지, 재전송은 60초 제한", async () => {
  const client: Client = {};
  const email = "limit@inu.ac.kr";
  await call(client, "POST", "/auth/request", { email });
  assert.equal((await call(client, "POST", "/auth/request", { email })).status, 429);
  for (let i = 0; i < 5; i++) assert.equal((await call(client, "POST", "/auth/verify", { email, code: "000000" })).status, 400);
  const code = logs.findLast((line) => line.includes(`to=${email}`))!.match(/인증 코드: (\d{6})/)![1];
  assert.equal((await call(client, "POST", "/auth/verify", { email, code })).status, 429);
});

test("토큰 없이는 플레이를 볼 수 없고 숨은 값과 시드는 응답에 없다", async () => {
  const created = await call({}, "POST", "/runs", newRun);
  assert.equal(created.status, 200);
  assert.equal((await call({}, "GET", `/runs/${created.json.run.id}`)).status, 404);
  assert.equal((await call({ token: "wrong" }, "GET", `/runs/${created.json.run.id}`)).status, 404);
  const text = JSON.stringify(created.json.run);
  for (const secret of ["seed", "luck", "reputation", newRun.regret]) assert.ok(!text.includes(secret), secret);
  assert.ok(created.json.run.isGoalSample);
  assert.equal(created.json.run.goalType, "인맥");
});

test("후회 원문은 저장하지 않는다", async () => {
  const { db } = await import("./db.ts");
  const regret = "저장되면 안 되는 문장입니다";
  await call({}, "POST", "/runs", { ...newRun, regret });
  const dump = JSON.stringify([db.prepare("SELECT * FROM runs").all(), db.prepare("SELECT * FROM ai_logs").all()]);
  assert.ok(!dump.includes(regret));
});

test("심각한 후회는 위기 표시가 켜진다", async () => {
  const created = await call({}, "POST", "/runs", { ...newRun, regret: "다 그만두고 죽고 싶었어요" });
  assert.equal(created.json.run.serious, true);
});

test("끝까지 플레이하고 결과에 후회 없이 랭킹에 오른다", async () => {
  const client: Client = {};
  await login(client, "player@inu.ac.kr");
  const created = await call(client, "POST", "/runs", newRun);
  client.token = created.json.token;
  const id = created.json.run.id;
  let run = created.json.run;
  for (let guard = 0; guard < 40 && run.phase !== "done"; guard++) {
    if (run.phase === "plan") {
      const activity = run.plan.activities.find((item: any) => !item.locked && item.id === "work").id;
      const result = await call(client, "POST", `/runs/${id}/plan`, { credits: run.plan.creditOptions[1], retakeCourseId: null, activity, labId: null, items: [], takeLoan: true });
      assert.equal(result.status, 200, JSON.stringify(result.json));
      run = result.json;
    } else if (run.phase === "event") {
      run = (await call(client, "POST", `/runs/${id}/choice`, { optionIndex: 0 })).json;
    } else if (run.phase === "report") {
      run = (await call(client, "POST", `/runs/${id}/continue`)).json;
    } else if (run.phase === "early") {
      run = (await call(client, "POST", `/runs/${id}/early`, { graduate: false })).json;
    }
  }
  assert.equal(run.phase, "done");
  const result = await call(client, "GET", `/runs/${id}/result`);
  assert.equal(result.status, 200);
  assert.ok(result.json.title && result.json.ending);
  assert.equal(result.json.registered, true);
  const ranking = await call({}, "GET", "/ranking");
  assert.ok(ranking.json.overall.some((row: any) => row.nickname === "재수생"));
  assert.ok(!JSON.stringify(ranking.json).includes(newRun.regret));
  assert.equal((await call({}, "POST", `/runs/${id}/register`)).status, 401);
});

test.after(() => { console.log = realLog; });
