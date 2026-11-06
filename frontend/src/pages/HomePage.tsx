import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, runToken } from "../api";
import type { RankingView } from "../api";
import Avatar from "../components/Avatar";

const STEPS = ["1학년", "2학년", "3학년", "4학년", "졸업"];

export default function HomePage() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankingView | null>(null);
  const lastRun = localStorage.getItem("lastRun");

  useEffect(() => {
    const load = () => api<RankingView>("/ranking").then(setRanking).catch(() => undefined);
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="page has-cta">
      <header className="topbar">
        <h1 className="logo">재수강</h1>
        <Link className="link" to="/ranking">랭킹</Link>
      </header>
      <section className="card hero">
        <Avatar kind="m" mood="tired" size={96} />
        <p className="hero-notice">귀하의 대학생활은 <strong>재수강 대상</strong>입니다.</p>
        <p className="hero-sub">후회를 입력하고 1학년으로 복귀하십시오. 게임에서 다시 쓴 대학생활이 현실의 행동으로 이어집니다.</p>
        <ol className="stepper" aria-label="진행 단계">
          {STEPS.map((step, index) => <li key={step} className={index === 0 ? "active" : ""}><i />{step}</li>)}
        </ol>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>오늘의 랭킹</h2>
          <Link className="link" to="/ranking">전체 보기</Link>
        </div>
        {!ranking ? <p className="hint">불러오는 중입니다.</p> : ranking.overall.length === 0 ? (
          <p className="hint">아직 등록된 졸업생이 없습니다. 첫 번째 졸업생이 되십시오.</p>
        ) : (
          <ol className="rank-list">
            {ranking.overall.slice(0, 3).map((row) => (
              <li key={row.rank}><b>{row.rank}</b><span>{row.nickname}<small>{row.department}</small></span><em>{row.score}점</em></li>
            ))}
          </ol>
        )}
        {ranking?.departments[0] && <p className="dept-lead">학과 대항전 1위 <strong>{ranking.departments[0].department}</strong></p>}
        {ranking?.hasDemoData && <p className="hint">시연용 데이터가 포함되어 있습니다.</p>}
      </section>
      {lastRun && runToken(lastRun) && <button className="link center" onClick={() => navigate(`/play/${lastRun}`)}>이전 재수강 이어 하기</button>}
      <p className="disclaimer">인천대학교 비공식 대회 출품작입니다. 게임 규칙과 금액은 실제 학사 안내가 아닙니다.</p>
      <div className="cta"><button className="btn" onClick={() => navigate("/start")}>재수강 신청하기</button></div>
    </main>
  );
}
