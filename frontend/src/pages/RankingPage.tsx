import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { RankingView } from "../api";

const TABS = [["overall", "종합"], ["departments", "학과 대항전"], ["achievements", "업적별"]] as const;

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingView | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overall");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () => api<RankingView>("/ranking").then((data) => { setRanking(data); setFailed(false); }).catch(() => setFailed(true));
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="page">
      <header className="topbar">
        <Link className="logo logo-small" to="/">재수강</Link>
        <span className="hint">10초마다 갱신</span>
      </header>
      <h2 className="wizard-title">졸업생 랭킹</h2>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <section className="card">
        {failed && !ranking && <p className="hint hint-error">랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        {!failed && !ranking && <p className="hint">불러오는 중입니다.</p>}
        {ranking && tab === "overall" && (ranking.overall.length ? (
          <ol className="rank-list">
            {ranking.overall.map((row) => <li key={row.rank}><b>{row.rank}</b><span>{row.nickname}<small>{row.department} · {row.plays}회 재수강</small></span><em>{row.score}점</em></li>)}
          </ol>
        ) : <p className="hint">아직 등록된 졸업생이 없습니다.</p>)}
        {ranking && tab === "departments" && (ranking.departments.length ? (
          <ol className="rank-list">
            {ranking.departments.map((row, index) => <li key={row.department}><b>{index + 1}</b><span>{row.department}<small>{row.plays}회 졸업 처리</small></span><em>{row.score}점</em></li>)}
          </ol>
        ) : <p className="hint">아직 등록된 학과 기록이 없습니다.</p>)}
        {ranking && tab === "achievements" && (
          <ul className="achieve-list">
            {ranking.achievements.map((item) => (
              <li key={item.id} data-rarity={item.rarity}>
                <span className="rarity">{item.rarity}</span>
                <span>{item.name}<small>{item.leader ? `${item.leader.nickname} · ${item.leader.department} · ${item.leader.count}회` : "달성자 없음"}</small></span>
                <em>{item.points}점</em>
              </li>
            ))}
          </ul>
        )}
      </section>
      {ranking?.hasDemoData && <p className="hint center-text">시연용 데이터가 포함되어 있습니다.</p>}
    </main>
  );
}
