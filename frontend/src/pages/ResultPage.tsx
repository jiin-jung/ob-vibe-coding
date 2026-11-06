import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type { ResultView } from "../api";
import AuthPanel from "../components/AuthPanel";
import Avatar from "../components/Avatar";

export default function ResultPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultView | null>(null);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [message, setMessage] = useState("");
  const card = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<ResultView>(`/runs/${id}/result`, { runId: id }).then(setResult).catch((err) => setError(err instanceof ApiError ? err.message : "결과를 불러오지 못했습니다."));
  }, [id]);
  useEffect(load, [load]);


  async function save() {
    if (!card.current) return;
    try {
      // 저장 이미지에 직인 애니메이션의 중간 상태가 찍히지 않게 끈다.
      card.current.classList.add("capturing");
      const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "재수강-성적표.png";
      link.href = url;
      link.click();
    } catch {
      setMessage("이미지를 만들지 못했습니다. 화면을 캡처해 주세요.");
    } finally {
      card.current?.classList.remove("capturing");
    }
  }

  async function share() {
    if (!result) return;
    const text = `재수강 성적표: ${result.endingName}, 칭호 "${result.title}", 명예 ${result.score}점. 귀하도 재수강 대상입니다.`;
    const url = window.location.origin;
    if (navigator.share) {
      await navigator.share({ title: "재수강", text, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setMessage("공유 문구를 복사했습니다.");
    } catch {
      setMessage(`${text} ${url}`);
    }
  }

  async function register() {
    try {
      await api(`/runs/${id}/register`, { method: "POST", runId: id });
      setShowAuth(false);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.message.includes("인증")) setShowAuth(true);
      else setMessage(err instanceof ApiError ? err.message : "등록하지 못했습니다.");
    }
  }

  if (error) return <main className="page"><p className="hint hint-error" role="alert">{error}</p><Link className="link" to="/home">메인으로</Link></main>;
  if (!result) return <main className="page"><p className="processing">학사 시스템이 졸업 사정을 진행 중입니다.</p></main>;
  const { run } = result;
  const overtime = result.endingId === "overtime";

  return (
    <main className="page">
      <div className="transcript" ref={card}>
        <header className="transcript-head">
          <div>
            <h2>재수강 성적표</h2>
            <small>가상 문서 · 실제 성적과 무관</small>
          </div>
          <Avatar kind={run.avatar} mood={overtime ? "tired" : "happy"} size={56} />
        </header>
        <dl className="transcript-meta">
          <div><dt>성명</dt><dd>{run.nickname}</dd></div>
          <div><dt>소속</dt><dd>{run.departmentName}</dd></div>
          <div><dt>회차</dt><dd>재수강 {run.round}회차</dd></div>
          <div><dt>이수</dt><dd className="num">{run.credits} / {run.graduationCredits}학점</dd></div>
          <div><dt>평점</dt><dd className="num">{run.gpa.toFixed(2)} / 4.5</dd></div>
          <div><dt>명예</dt><dd className="num">{result.score}점</dd></div>
        </dl>
        <table className="grade-table">
          <thead><tr>{Object.keys(result.grades).map((key) => <th key={key}>{key}</th>)}</tr></thead>
          <tbody><tr>{Object.values(result.grades).map((value, index) => <td key={index}>{value}</td>)}</tr></tbody>
        </table>
        <div className="verdict">
          <small>{overtime ? "졸업 유예 통지" : "졸업 사정 결과"}</small>
          <strong>{result.endingName}</strong>
          <span>칭호: {result.title}</span>
          <div className={`stamp ${overtime ? "stamp-warn" : ""}`} aria-hidden>{overtime ? "유예" : "졸업"}</div>
        </div>
        <p className="ending">{result.ending}</p>
        {result.achievements.length > 0 && (
          <ul className="badges">
            {result.achievements.map((item) => <li key={item.id} data-rarity={item.rarity}>{item.name}</li>)}
          </ul>
        )}
        {result.isSample && <p className="sample-tag">샘플 문구</p>}
      </div>

      <section className="card next-action">
        <h3>오늘 현실에서 해볼 일</h3>
        <p>{result.nextAction}</p>
      </section>

      <div className="actions">
        <button className="btn btn-secondary" onClick={save}>저장</button>
        <button className="btn btn-secondary" onClick={share}>공유</button>
      </div>
      {message && <p className="hint" role="status">{message}</p>}
      <button className="btn" onClick={() => navigate(`/start?previous=${id}&department=${run.department}&nickname=${encodeURIComponent(run.nickname)}&avatar=${run.avatar}`)}>다시 재수강하기</button>

      <section className="card">
        <div className="card-head">
          <h3>랭킹</h3>
          <Link className="link" to="/ranking">랭킹 보기</Link>
        </div>
        {result.registered ? <p className="hint">랭킹에 등록되었습니다.</p> : showAuth ? (
          <AuthPanel onDone={register} />
        ) : (
          <button className="btn btn-secondary" onClick={register}>인천대 메일 인증하고 랭킹 등록</button>
        )}
      </section>
      <p className="disclaimer">가상 게임 기록입니다. 실제 졸업 요건은 학과 안내를 확인하세요.</p>
    </main>
  );
}
