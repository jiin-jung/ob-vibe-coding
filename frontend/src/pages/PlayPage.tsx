import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, runToken, saveRunToken } from "../api";
import type { PlanOptions, RunView, SignupResult } from "../api";
import Avatar from "../components/Avatar";

const STAT_LABELS = { study: "학업", network: "인맥", mental: "멘탈", romance: "낭만" } as const;
const CHANGE_LABELS: Record<string, string> = { ...STAT_LABELS, money: "돈" };
const WEEK_LINES = ["개강했습니다. 강의실을 찾는 중입니다.", "출석이 확인되었습니다.", "과제가 부과되었습니다.", "중간고사 기간입니다.", "대동제가 다가옵니다.", "기말고사 기간입니다.", "성적 입력이 진행 중입니다."];

function Changes({ changes }: { changes: Record<string, number> }) {
  const entries = Object.entries(changes);
  if (!entries.length) return null;
  return (
    <span className="changes">
      {entries.map(([key, value]) => <i key={key} className={value > 0 ? "up" : "down"}>{CHANGE_LABELS[key]}{value > 0 ? "+" : "-"}</i>)}
    </span>
  );
}

function ProfileHead({ run }: { run: RunView }) {
  return (
    <section className="profile-head">
      <Avatar kind={run.avatar} size={48} mood={run.stats.mental < 30 ? "tired" : run.stats.mental > 70 ? "happy" : "normal"} />
      <div className="profile-main">
        <strong>{run.year}학년 {run.term}학기 <small className="semester-count">{run.semester}/{run.totalSemesters}학기</small></strong>
        <span className="num">이수 {run.credits}/{run.graduationCredits} · 평점 {run.gpa.toFixed(2)}</span>
        <span className="year-track" aria-label={`전체 ${run.totalSemesters}학기 중 ${run.semester}학기 진행 중`}>{Array.from({ length: run.totalSemesters }, (_, index) => <i key={index} className={index < run.semester ? "on" : ""} />)}</span>
      </div>
      <div className="money num"><strong>{run.money}만 원</strong>{run.debt > 0 && <small>대출 {run.debt}만</small>}</div>
    </section>
  );
}

function SignupGame({ run, onDone }: { run: RunView; onDone: (run: RunView, result: SignupResult) => void }) {
  const [state, setState] = useState<"ready" | "waiting" | "open" | "sending">("ready");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function start() {
    setError("");
    try {
      const { delayMs } = await api<{ delayMs: number }>(`/runs/${run.id}/signup/start`, { body: {}, runId: run.id });
      setState("waiting");
      timer.current = setTimeout(() => setState("open"), delayMs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수강신청 서버에 접속하지 못했습니다.");
    }
  }

  async function click() {
    if (state === "sending") return;
    clearTimeout(timer.current);
    setState("sending");
    try {
      const result = await api<SignupResult & { run: RunView }>(`/runs/${run.id}/signup/click`, { body: {}, runId: run.id });
      onDone(result.run, result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신청 결과를 받지 못했습니다.");
    }
  }

  return (
    <section className="signup">
      <span className="notice-tag">{run.year}학년 {run.term}학기 수강신청</span>
      {state === "ready" ? (
        <>
          <h2>10시 정각에 시작합니다</h2>
          <p className="doc-body">버튼이 빨갛게 바뀌면 바로 누르십시오. 너무 일찍 누르면 신청이 실패합니다.</p>
          <button className="btn" onClick={start}>수강신청 사이트 접속</button>
        </>
      ) : (
        <>
          <h2>{state === "waiting" ? "접속 대기 중입니다" : state === "open" ? "지금입니다" : "처리 중입니다"}</h2>
          <button className={`signup-button ${state === "open" ? "open" : ""}`} onPointerDown={click} disabled={state === "sending"}>
            {state === "open" ? "신청" : "대기"}
          </button>
        </>
      )}
      {error && <p className="hint hint-error" role="alert">{error}</p>}
    </section>
  );
}

function SignupResultView({ result, onClose }: { result: SignupResult; onClose: () => void }) {
  return (
    <section className={`card notice signup-result ${result.tier}`}>
      <span className="notice-tag">수강신청 결과</span>
      <h2>{result.title}</h2>
      <p className="doc-body">{result.body}</p>
      <p className="num signup-meta">반응 {result.reactionMs < 0 ? "너무 빨랐음" : `${result.reactionMs}ms`} · {result.credits}학점 신청</p>
      <div className={`stamp ${result.tier === "spaceGap" ? "stamp-warn" : ""}`} aria-hidden>{result.tier === "allClear" ? "올클" : result.tier === "partial" ? "일부" : "공강"}</div>
      <button className="btn" onClick={onClose}>확인</button>
    </section>
  );
}

type Sheet = "activity" | "retake" | "shop" | null;

function HomeTab({ run, plan, busy, onStartYear, onLeave, onSignup }: { run: RunView; plan: PlanOptions; busy: boolean; onStartYear: (body: unknown) => void; onLeave: (activity: string) => void; onSignup: () => void }) {
  const stored = localStorage.getItem(`activity:${run.id}`);
  const [activity, setActivity] = useState(stored && plan.activities.some((item) => item.id === stored && !item.locked) ? stored : "");
  const [labId, setLabId] = useState<string | null>(null);
  const [retake, setRetake] = useState<string | null>(null);
  const [item, setItem] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [agree, setAgree] = useState(false);

  const cost = useMemo(() => {
    const income = (plan.activities.find((entry) => entry.id === activity)?.income ?? 0) + plan.allowance;
    const itemCost = plan.items.find((entry) => entry.id === item)?.price ?? 0;
    const spend = plan.tuition + plan.living + itemCost;
    const shortfall = Math.max(0, spend - run.money - income);
    return { income, itemCost, spend, shortfall, canLoan: shortfall <= plan.loanLimit && shortfall <= plan.debtRoom };
  }, [activity, item, plan, run.money]);

  const chooseActivity = (id: string) => {
    setActivity(id);
    localStorage.setItem(`activity:${run.id}`, id);
    if (id !== "lab") setSheet(null);
  };
  const activityName = plan.activities.find((entry) => entry.id === activity)?.name;
  const labName = plan.labs.find((entry) => entry.id === labId)?.name;
  const ready = plan.signup && activity && (activity !== "lab" || labId) && (cost.shortfall === 0 || (cost.canLoan && agree));

  return (
    <div className="home-tab">
      <h2 className="section-title">확인할 일</h2>
      <div className="todo">
        {!plan.signup ? (
          <button className="todo-row urgent" onClick={onSignup}>
            <span><strong>수강신청이 곧 시작됩니다</strong><small>필수 · 반응 속도로 결과가 갈립니다</small></span><b>열기</b>
          </button>
        ) : (
          <div className="todo-row done"><span><strong>수강신청 {plan.signup.title}</strong><small>{plan.signup.credits}학점 신청 완료</small></span></div>
        )}
        <button className={`todo-row ${activity ? "done-action" : "urgent"}`} onClick={() => setSheet("activity")}>
          <span><strong>{activityName ? `이번 학기 활동: ${activityName}` : "이번 학기 활동을 정해 주세요"}</strong><small>{labName ?? (activity ? "눌러서 변경" : "필수")}</small></span><b>{activity ? "변경" : "열기"}</b>
        </button>
        {plan.retakeOptions.length > 0 && (
          <button className="todo-row" onClick={() => setSheet("retake")}>
            <span><strong>재수강 대상 과목 {plan.retakeOptions.length}개</strong><small>{retake ? `${plan.retakeOptions.find((entry) => entry.id === retake)?.name} 신청` : "선택 · 성적을 다시 받을 수 있습니다"}</small></span><b>열기</b>
          </button>
        )}
        <button className="todo-row" onClick={() => setSheet("shop")}>
          <span><strong>새 상품이 입고되었습니다</strong><small>{item ? `${plan.items.find((entry) => entry.id === item)?.name} 구매 예정` : "선택 · 학기마다 하나"}</small></span><b>열기</b>
        </button>
      </div>

      <section className="card bill-summary">
        <div className="bill-line num"><span>등록금 + 생활비</span><b>-{cost.spend}만 원</b></div>
        <div className="bill-line num"><span>이번 학기 수입</span><b>+{cost.income}만 원</b></div>
        {cost.shortfall > 0 && (cost.canLoan ? (
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
            <span>부족한 {cost.shortfall}만 원은 학자금 대출을 받습니다. 게임 규칙입니다.</span>
          </label>
        ) : (
          <>
            <p className="hint hint-error">대출 한도를 넘습니다. 활동이나 상점 구매를 바꿔 주세요.</p>
            {plan.leaveActivities.includes(activity) && <button className="btn btn-secondary" disabled={busy} onClick={() => onLeave(activity)}>이번 학기 휴학하기</button>}
          </>
        ))}
      </section>

      <div className="cta">
        <button className="btn" disabled={!ready || busy} onClick={() => onStartYear({ retakeCourseId: retake, activity, labId: activity === "lab" ? labId : null, items: item ? [item] : [], takeLoan: agree })}>
          {busy ? "학사 시스템이 처리 중입니다" : `${run.year}학년 ${run.term}학기 보내기`}
        </button>
      </div>

      {sheet && (
        <div className="sheet-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <section className="sheet" role="dialog" aria-modal="true">
            {sheet === "activity" && <>
              <h3>이번 학기 활동</h3>
              <div className="rows">
                {plan.activities.map((entry) => (
                  <button key={entry.id} className={`row ${activity === entry.id ? "selected" : ""}`} disabled={Boolean(entry.locked)} aria-pressed={activity === entry.id} onClick={() => chooseActivity(entry.id)}>
                    <span>{entry.name}<small>{entry.locked ?? entry.description}</small></span>
                    <em className="num">{entry.income ? `+${entry.income}만` : "수입 없음"}</em>
                  </button>
                ))}
              </div>
              {activity === "lab" && (
                <div className="rows sub">
                  <p className="hint">모두 가상 연구실입니다.</p>
                  {plan.labs.map((lab) => (
                    <button key={lab.id} className={`row ${labId === lab.id ? "selected" : ""}`} aria-pressed={labId === lab.id} onClick={() => { setLabId(lab.id); setSheet(null); }}>
                      <span>{lab.name}<small>{lab.route}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </>}
            {sheet === "retake" && <>
              <h3>재수강 신청</h3>
              <p className="hint">C+ 이하만 가능합니다. 재수강 성적만 인정되고 상한은 A0입니다. F면 미이수입니다.</p>
              <div className="rows">
                {plan.retakeOptions.map((course) => (
                  <button key={course.id} className={`row ${retake === course.id ? "selected" : ""}`} aria-pressed={retake === course.id} onClick={() => { setRetake(retake === course.id ? null : course.id); setSheet(null); }}>
                    <span>{course.name}</span><em>{course.grade}</em>
                  </button>
                ))}
              </div>
            </>}
            {sheet === "shop" && <>
              <h3>상점 <small>학기마다 하나</small></h3>
              <div className="rows">
                {plan.items.map((entry) => (
                  <button key={entry.id} className={`row ${item === entry.id ? "selected" : ""}`} aria-pressed={item === entry.id} onClick={() => { setItem(item === entry.id ? null : entry.id); setSheet(null); }}>
                    <span>{entry.name}<small>{entry.description}</small></span>
                    <em className="num">{entry.price}만</em>
                  </button>
                ))}
              </div>
            </>}
            <button className="btn btn-secondary" onClick={() => setSheet(null)}>닫기</button>
          </section>
        </div>
      )}
    </div>
  );
}

function StatsTab({ run }: { run: RunView }) {
  return (
    <section className="card">
      <h3>능력치</h3>
      <p className="hint">{run.style} · 파란 표시는 집중 육성 능력입니다.</p>
      <div className="stat-list">
        {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((key) => (
          <div key={key} className={`stat-line ${run.focus.includes(key) ? "focus" : ""}`}>
            <span>{STAT_LABELS[key]}</span>
            <div className="bar" role="progressbar" aria-label={STAT_LABELS[key]} aria-valuenow={run.stats[key]} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${run.stats[key]}%` }} /></div>
            <b className="num">{run.stats[key]}</b>
          </div>
        ))}
      </div>
      <dl className="doc-meta">
        <div><dt>회귀 목표</dt><dd>{run.goalType}</dd></div>
        <div><dt>영어졸업인증</dt><dd>{run.englishCert ? "인증" : "미인증"}</dd></div>
        <div><dt>시작 조건</dt><dd>{run.startCard.name}</dd></div>
      </dl>
    </section>
  );
}

function RecordTab({ run }: { run: RunView }) {
  const named = run.courses.filter((course) => course.name !== "기타 이수");
  return (
    <section className="card">
      <h3>이수 내역</h3>
      {named.length === 0 ? <p className="hint">아직 이수 내역이 없습니다.</p> : (
        <ul className="course-list">
          {named.map((course) => <li key={course.id}><span>{course.name}{course.retaken && <small>재수강</small>}</span><b>{course.grade}</b></li>)}
        </ul>
      )}
    </section>
  );
}

function SemesterTicker({ label, onDone }: { label: string; onDone: () => void }) {
  const [week, setWeek] = useState(1);
  useEffect(() => {
    if (week >= 16) { onDone(); return; }
    const timer = setTimeout(() => setWeek((current) => Math.min(16, current + 1)), 110);
    return () => clearTimeout(timer);
  }, [onDone, week]);
  return (
    <section className="card ticker">
      <span className="notice-tag">{label} 진행 중</span>
      <strong className="num">{week}주차 / 16주차</strong>
      <div className="bar"><i style={{ width: `${(week / 16) * 100}%` }} /></div>
      <p>{WEEK_LINES[Math.floor(((week - 1) / 16) * WEEK_LINES.length)]}</p>
      <button className="link center" onClick={onDone}>건너뛰기</button>
    </section>
  );
}

export default function PlayPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [goalSeen, setGoalSeen] = useState(false);
  const [result, setResult] = useState<RunView["lastResult"]>(null);
  const [tab, setTab] = useState<"home" | "stats" | "record">("home");
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupResult, setSignupResult] = useState<SignupResult | null>(null);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (token) { saveRunToken(id, token); navigate(`/play/${id}`, { replace: true }); }
  }, [id, navigate, params]);

  const act = useCallback(async (path: string, body: unknown = {}) => {
    setBusy(true);
    setError("");
    try {
      const next = await api<RunView>(`/runs/${id}${path}`, { body, runId: id });
      if (path === "/choice") setResult(next.lastResult);
      if (path === "/plan") setTicking(true);
      setRun(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    if (params.get("token") || !runToken(id)) { if (!params.get("token")) setError("이 플레이를 열 수 없습니다."); return; }
    api<RunView>(`/runs/${id}`, { runId: id }).then((value) => {
      setRun(value);
      if (value.year > 1 || value.credits > 0 || value.phase !== "plan") setGoalSeen(true);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "플레이를 불러오지 못했습니다."));
  }, [id, params]);

  useEffect(() => {
    if (run?.phase === "done" && !result) navigate(`/result/${id}`, { replace: true });
  }, [id, navigate, result, run?.phase]);

  const stopTicking = useCallback(() => setTicking(false), []);

  if (!run) return <main className="page">{error ? <><p className="hint hint-error" role="alert">{error}</p><Link className="link" to="/">처음으로</Link></> : <p className="processing">학사 시스템에 접속 중입니다.</p>}</main>;

  if (!goalSeen) {
    return (
      <main className="page has-cta">
        {run.serious && (
          <section className="card care" role="alert">
            <h3>혹시 많이 힘든 상태라면</h3>
            <p>게임보다 귀하의 안전이 먼저입니다. 혼자 견디지 말고 믿을 수 있는 사람이나 전문 상담에 도움을 요청해 주세요. 자살예방 상담전화 <a href="tel:109">109</a>는 24시간 연결됩니다. 학교 학생상담 창구도 이용할 수 있습니다.</p>
          </section>
        )}
        <section className="card notice document">
          <span className="notice-tag">복귀 처리 통지서</span>
          <Avatar kind={run.avatar} size={72} />
          <dl className="doc-meta">
            <div><dt>성명</dt><dd>{run.nickname}</dd></div>
            <div><dt>소속</dt><dd>{run.departmentName}</dd></div>
            <div><dt>유형</dt><dd>{run.style}</dd></div>
            <div><dt>회차</dt><dd>재수강 {run.round}회차</dd></div>
          </dl>
          <p className="doc-body">{run.notice}</p>
          <p className="goal">{run.goalText}</p>
          <div className="start-card"><strong>시작 조건: {run.startCard.name}</strong><span>{run.startCard.body}</span></div>
          {run.isGoalSample && <p className="sample-tag">샘플 문구</p>}
          <div className="stamp" aria-hidden>복귀</div>
        </section>
        <div className="cta"><button className="btn" onClick={() => setGoalSeen(true)}>1학년 시작</button></div>
      </main>
    );
  }

  if (signupResult) {
    return <main className="page"><SignupResultView result={signupResult} onClose={() => setSignupResult(null)} /></main>;
  }
  if (signupOpen && run.phase === "plan") {
    return <main className="page"><SignupGame run={run} onDone={(next, value) => { setRun(next); setSignupOpen(false); setSignupResult(value); }} /></main>;
  }
  if (ticking) {
    return <main className="page"><ProfileHead run={run} /><SemesterTicker label={`${run.year}학년 ${run.term}학기`} onDone={stopTicking} /></main>;
  }

  return (
    <main className={`page ${run.phase === "plan" && tab === "home" ? "has-cta-nav" : "has-nav"}`}>
      <ProfileHead run={run} />
      {error && <p className="hint hint-error" role="alert">{error}</p>}

      {tab === "stats" ? <StatsTab run={run} /> : tab === "record" ? <RecordTab run={run} /> : result ? (
        <section className="card notice result-card" key={result.title}>
          <span className="notice-tag">{result.success ? "처리 결과" : "반려 통지"}</span>
          <p className="doc-body">{result.result}</p>
          <Changes changes={result.changes} />
          <button className="btn" onClick={() => setResult(null)}>확인</button>
        </section>
      ) : run.phase === "plan" && run.plan ? (
        <HomeTab key={`${run.semester}-${run.credits}`} run={run} plan={run.plan} busy={busy} onSignup={() => setSignupOpen(true)} onLeave={(activity) => act("/leave", { activity })} onStartYear={(body) => act("/plan", body)} />
      ) : run.phase === "event" && run.event ? (
        <>
          <span className="turning">전환점</span>
          <section className="card notice" key={run.event.title}>
            <h3 className="notice-title">{run.event.title}</h3>
            <p className="doc-body">{run.event.body}</p>
            {run.event.isSample && <p className="sample-tag">샘플 문구</p>}
          </section>
          <div className="options">
            {run.event.options.map((option, index) => (
              <button key={option.label} className="option" disabled={busy} onClick={() => act("/choice", { optionIndex: index })}>
                <strong>{option.label}</strong>
                <span className="option-meta">
                  {option.chance !== null && <b className="chance num">성공 확률 {Math.round(option.chance * 100)}%</b>}
                  <Changes changes={option.changes} />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : run.phase === "report" && run.report ? (
        <>
          <section className="card notice">
            <span className="notice-tag">{run.report.earned === 0 && run.report.semesterGpa === 0 ? "휴학 통지" : `${Math.ceil(run.report.semester / 2)}학년 ${run.report.semester % 2 === 1 ? 1 : 2}학기가 끝났습니다`}</span>
            {run.report.earned > 0 && (
              <>
                <p className="report-gpa num">평점 <strong>{run.report.semesterGpa.toFixed(2)}</strong> · {run.report.earned}학점 취득</p>
                <div className="growth num">
                  {Object.entries(run.report.growth).map(([key, value]) => <span key={key} className={run.focus.includes(key) ? "focus" : ""}>{CHANGE_LABELS[key]} +{value}</span>)}
                </div>
              </>
            )}
            <ul className="report-notices">
              {run.report.notices.map((notice, index) => <li key={index}><strong>{notice.title}</strong><span>{notice.body}</span></li>)}
            </ul>
          </section>
          {run.report.reactions.length > 0 && (
            <section className="card">
              <h3>익명 게시판 반응 <small>가상</small></h3>
              <ul className="reactions">
                {run.report.reactions.map((text, index) => <li key={index}><b>익명 {index + 1}</b><span>{text}</span></li>)}
              </ul>
            </section>
          )}
          <button className="btn" disabled={busy} onClick={() => act("/continue")}>다음</button>
        </>
      ) : run.phase === "early" ? (
        <section className="card notice">
          <span className="notice-tag">조기 졸업 안내</span>
          <p className="doc-body">귀하는 3학년 2학기에 조기 졸업 요건을 충족했습니다. 4학년을 계속하면 다른 엔딩을 노릴 수 있으나, 조기 졸업은 사라집니다.</p>
          <button className="btn" disabled={busy} onClick={() => act("/early", { graduate: true })}>조기 졸업하기</button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => act("/early", { graduate: false })}>4학년 계속하기</button>
        </section>
      ) : null}

      <nav className="bottom-nav" aria-label="화면 이동">
        {([["home", "학사"], ["stats", "능력"], ["record", "이수"]] as const).map(([value, label]) => (
          <button key={value} className={tab === value ? "on" : ""} aria-current={tab === value} onClick={() => setTab(value)}>{label}</button>
        ))}
      </nav>
    </main>
  );
}
