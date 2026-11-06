import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, runToken, saveRunToken } from "../api";
import type { PlanOptions, RunView } from "../api";
import Avatar from "../components/Avatar";
import QuestPanel from "../components/QuestPanel";

const STAT_LABELS = { study: "학업", network: "인맥", mental: "멘탈", romance: "낭만" } as const;
const CHANGE_LABELS: Record<string, string> = { ...STAT_LABELS, money: "돈" };

function Changes({ changes }: { changes: Record<string, number> }) {
  const entries = Object.entries(changes);
  if (!entries.length) return null;
  return (
    <span className="changes">
      {entries.map(([key, value]) => <i key={key} className={value > 0 ? "up" : "down"}>{CHANGE_LABELS[key]}{value > 0 ? "+" : "-"}</i>)}
    </span>
  );
}

function StatusBar({ run }: { run: RunView }) {
  return (
    <section className="status">
      <div className="status-top">
        <Avatar kind={run.avatar} size={44} mood={run.stats.mental < 30 ? "tired" : run.stats.mental > 70 ? "happy" : "normal"} />
        <div className="status-main">
          <div className="year-row">
            <strong>{run.year}학년</strong>
            <span className="year-track" aria-label={`${run.year}학년 진행 중`}>{[1, 2, 3, 4].map((year) => <i key={year} className={year <= run.year ? "on" : ""} />)}</span>
          </div>
          <div className="meta-row num">
            <span>이수 {run.credits}/{run.graduationCredits}</span>
            <span>평점 {run.gpa.toFixed(2)}</span>
            <span className={run.englishCert ? "ok" : ""}>영어 {run.englishCert ? "인증" : "미인증"}</span>
          </div>
        </div>
        <div className="money num"><strong>{run.money}만 원</strong>{run.debt > 0 && <small>대출 {run.debt}만 원</small>}</div>
      </div>
      <div className="stats">
        {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((key) => (
          <div key={key} className="stat">
            <span>{STAT_LABELS[key]}</span>
            <div className="bar" role="progressbar" aria-label={STAT_LABELS[key]} aria-valuenow={run.stats[key]} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${run.stats[key]}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanStep({ run, plan, onSubmit, onLeave, busy }: { run: RunView; plan: PlanOptions; onSubmit: (body: unknown) => void; onLeave: () => void; busy: boolean }) {
  const [credits, setCredits] = useState(plan.creditOptions[Math.min(1, plan.creditOptions.length - 1)]);
  const [retake, setRetake] = useState<string | null>(null);
  const [activity, setActivity] = useState("");
  const [labId, setLabId] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);

  const cost = useMemo(() => {
    const income = (plan.activities.find((item) => item.id === activity)?.income ?? 0) + plan.allowance;
    const itemCost = items.reduce((sum, id) => sum + (plan.items.find((item) => item.id === id)?.price ?? 0), 0);
    const spend = plan.tuition + plan.living + itemCost;
    const shortfall = Math.max(0, spend - run.money - income);
    return { income, itemCost, spend, shortfall, canLoan: shortfall <= plan.yearlyLoanLimit && shortfall <= plan.debtRoom };
  }, [activity, items, plan, run.money]);

  const toggleItem = (id: string) => setItems((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const ready = activity && (activity !== "lab" || labId) && (cost.shortfall === 0 || (cost.canLoan && agree));

  return (
    <div className="plan">
      <section className="card notice">
        <span className="notice-tag">등록금 고지서</span>
        <table className="bill num">
          <tbody>
            <tr><th>보유 금액</th><td>{run.money}만 원</td></tr>
            <tr><th>이번 학년 수입</th><td>+{cost.income}만 원</td></tr>
            <tr><th>등록금 (게임용 금액)</th><td>-{plan.tuition}만 원</td></tr>
            <tr><th>생활비</th><td>-{plan.living}만 원</td></tr>
            {cost.itemCost > 0 && <tr><th>상점</th><td>-{cost.itemCost}만 원</td></tr>}
            <tr className={cost.shortfall ? "short" : ""}><th>{cost.shortfall ? "부족 금액" : "남는 금액"}</th><td>{cost.shortfall ? cost.shortfall : run.money + cost.income - cost.spend}만 원</td></tr>
          </tbody>
        </table>
        {cost.shortfall > 0 && (cost.canLoan ? (
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
            <span>학자금 대출 {cost.shortfall}만 원을 받습니다. 졸업 후 정산됩니다. (게임 규칙)</span>
          </label>
        ) : (
          <>
            <p className="hint hint-error">대출 한도를 넘습니다. 활동을 바꾸거나 휴학할 수 있습니다.</p>
            <button className="btn btn-secondary" disabled={busy} onClick={onLeave}>이번 학년 휴학하기</button>
          </>
        ))}
      </section>

      <section className="card">
        <h3>수강 신청</h3>
        <div className="segment">
          {plan.creditOptions.map((value) => <button key={value} className={credits === value ? "on" : ""} aria-pressed={credits === value} onClick={() => setCredits(value)}>{value}학점</button>)}
        </div>
        <p className="hint">많이 들을수록 멘탈이 줄고 성적이 흔들립니다. 평점이 높으면 더 많이 신청할 수 있습니다.</p>
      </section>

      {plan.retakeOptions.length > 0 && (
        <section className="card">
          <h3>재수강</h3>
          <p className="hint">C+ 이하만 가능합니다. 재수강 성적만 인정되고 상한은 A0입니다. F면 미이수입니다.</p>
          <div className="rows">
            {plan.retakeOptions.map((course) => (
              <button key={course.id} className={`row ${retake === course.id ? "selected" : ""}`} aria-pressed={retake === course.id} onClick={() => setRetake(retake === course.id ? null : course.id)}>
                <span>{course.name}</span><em>{course.grade}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3>이번 학년 활동</h3>
        <div className="rows">
          {plan.activities.map((item) => (
            <button key={item.id} className={`row ${activity === item.id ? "selected" : ""}`} disabled={Boolean(item.locked)} aria-pressed={activity === item.id} onClick={() => setActivity(item.id)}>
              <span>{item.name}<small>{item.locked ?? item.description}</small></span>
              <em className="num">{item.income ? `+${item.income}만` : "수입 없음"}</em>
            </button>
          ))}
        </div>
        {activity === "lab" && (
          <div className="rows sub">
            <p className="hint">모두 가상 연구실입니다.</p>
            {plan.labs.map((lab) => (
              <button key={lab.id} className={`row ${labId === lab.id ? "selected" : ""}`} aria-pressed={labId === lab.id} onClick={() => setLabId(lab.id)}>
                <span>{lab.name}<small>{lab.route}</small></span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3>상점</h3>
        <div className="rows">
          {plan.items.map((item) => (
            <button key={item.id} className={`row ${items.includes(item.id) ? "selected" : ""}`} aria-pressed={items.includes(item.id)} onClick={() => toggleItem(item.id)}>
              <span>{item.name}<small>{item.description}</small></span>
              <em className="num">{item.price}만</em>
            </button>
          ))}
        </div>
      </section>

      <div className="cta"><button className="btn" disabled={!ready || busy} onClick={() => onSubmit({ credits, retakeCourseId: retake, activity, labId: activity === "lab" ? labId : null, items, takeLoan: agree })}>{busy ? "학사 시스템이 처리 중입니다" : `${run.year}학년 시작`}</button></div>
    </div>
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

  return (
    <main className={`page ${run.phase === "plan" ? "has-cta" : ""}`}>
      <StatusBar run={run} />
      {error && <p className="hint hint-error" role="alert">{error}</p>}

      {result ? (
        <section className="card notice result-card" key={result.title}>
          <span className="notice-tag">{result.success ? "처리 결과" : "반려 통지"}</span>
          <p className="doc-body">{result.result}</p>
          <Changes changes={result.changes} />
          <button className="btn" onClick={() => setResult(null)}>확인</button>
        </section>
      ) : run.phase === "plan" && run.plan ? (
        <PlanStep key={run.year} run={run} plan={run.plan} busy={busy} onLeave={() => act("/leave")} onSubmit={(body) => act("/plan", body)} />
      ) : run.phase === "event" && run.event ? (
        <>
          <section className="card notice" key={run.event.title}>
            <h3 className="notice-title">{run.event.title}</h3>
            <p className="doc-body">{run.event.body}</p>
            {run.event.isSample && <p className="sample-tag">샘플 문구</p>}
          </section>
          <div className="options">
            {run.event.options.map((option, index) => (
              <button key={option.label} className={`option ${option.hidden ? "hidden-option" : ""}`} disabled={busy} onClick={() => act("/choice", { optionIndex: index })}>
                {option.hidden && <small>현실 이수로 열린 선택지</small>}
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
        <section className="card notice">
          <span className="notice-tag">{run.report.earned === 0 && run.report.semesterGpa === 0 ? "휴학 통지" : `${run.report.year}학년 성적 통지`}</span>
          {run.report.earned > 0 && (
            <dl className="doc-meta num">
              <div><dt>학년 평점</dt><dd>{run.report.semesterGpa.toFixed(2)}</dd></div>
              <div><dt>취득 학점</dt><dd>{run.report.earned}학점</dd></div>
            </dl>
          )}
          <ul className="report-notices">
            {run.report.notices.map((notice, index) => <li key={index}><strong>{notice.title}</strong><span>{notice.body}</span></li>)}
          </ul>
          <button className="btn" disabled={busy} onClick={() => act("/continue")}>다음</button>
        </section>
      ) : run.phase === "quest" ? (
        <QuestPanel run={run} onPassed={setRun} onLater={() => act("/quest/later")} />
      ) : run.phase === "early" ? (
        <section className="card notice">
          <span className="notice-tag">조기 졸업 안내</span>
          <p className="doc-body">귀하는 조기 졸업 요건을 충족했습니다. 4학년을 계속하면 다른 엔딩을 노릴 수 있으나, 조기 졸업은 사라집니다.</p>
          <button className="btn" disabled={busy} onClick={() => act("/early", { graduate: true })}>조기 졸업하기</button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => act("/early", { graduate: false })}>4학년 계속하기</button>
        </section>
      ) : null}
    </main>
  );
}
