import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError, saveRunToken } from "../api";
import type { RunView } from "../api";
import AuthPanel from "../components/AuthPanel";
import Avatar from "../components/Avatar";

const DEPARTMENTS = [
  { id: "cse", name: "컴퓨터공학부" },
  { id: "ice", name: "인공지능정보통신공학부" },
  { id: "ais", name: "인공지능시스템공학과" },
] as const;

const STYLES = [
  { id: "scholar", name: "도서관 정착형", description: "평점으로 승부합니다.", stats: { 학업: 65, 인맥: 40, 멘탈: 55, 낭만: 40 } },
  { id: "social", name: "과방 상주형", description: "아는 선배가 많습니다.", stats: { 학업: 40, 인맥: 65, 멘탈: 50, 낭만: 45 } },
  { id: "romantic", name: "캠퍼스 낭만형", description: "오늘의 하늘을 확인합니다.", stats: { 학업: 45, 인맥: 45, 멘탈: 50, 낭만: 60 } },
];

const FOCUS = [
  { id: "study", name: "학업", description: "성적과 장학금" },
  { id: "network", name: "인맥", description: "학생회장, 추천" },
  { id: "mental", name: "멘탈", description: "버티는 힘" },
  { id: "romance", name: "낭만", description: "대학생활의 봄" },
];

const REGRETS = ["다른 과 친구를 한 명도 못 사귀었어요", "1학년 학점을 너무 날렸어요", "진로를 너무 늦게 고민했어요", "하고 싶은 걸 해보지도 못했어요"];

export default function StartPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [department, setDepartment] = useState<string>(params.get("department") ?? "");
  const [nickname, setNickname] = useState(params.get("nickname") ?? "");
  const [avatar, setAvatar] = useState<"m" | "f">((params.get("avatar") as "m" | "f") ?? "m");
  const [regret, setRegret] = useState("");
  const [style, setStyle] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [loggedIn, setLoggedIn] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ user: { email: string } | null }>("/me").then(({ user }) => setLoggedIn(user?.email ?? null)).catch(() => undefined);
  }, [showAuth]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const { token, run } = await api<{ token: string; run: RunView }>("/runs", {
        body: { nickname, department, avatar, regret, style, focus, previousRunId: params.get("previous") ?? undefined },
      });
      saveRunToken(run.id, token);
      navigate(`/play/${run.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  const canNext = [department !== "", nickname.trim().length > 0, regret.trim().length > 0, style !== "", focus.length > 0][step];
  const lastStep = 4;
  const toggleFocus = (id: string) => setFocus((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current);
  const titles = ["어느 학과로\n복귀하시겠습니까?", "재수강 신청자 정보를\n입력하십시오", "대학생활에서 가장\n후회되는 것은 무엇입니까?", "어떤 학생으로\n복귀하시겠습니까?", "집중해서 키울 능력을\n골라 주십시오"];

  return (
    <main className="page has-cta">
      <header className="wizard-head">
        <button className="back" aria-label="뒤로" onClick={() => (step === 0 ? navigate("/home") : setStep(step - 1))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="dots" aria-label={`${step + 1}/5 단계`}>{[0, 1, 2, 3, 4].map((index) => <i key={index} className={index === step ? "on" : ""} />)}</div>
      </header>
      <h2 className="wizard-title">{titles[step]}</h2>
      {step === 0 && (
        <div className="choices">
          {DEPARTMENTS.map((item) => (
            <button key={item.id} className={`choice ${department === item.id ? "selected" : ""}`} aria-pressed={department === item.id} onClick={() => setDepartment(item.id)}>{item.name}</button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="card form">
          <label className="field">
            <span>닉네임 (12자 이내)</span>
            <input value={nickname} maxLength={12} onChange={(event) => setNickname(event.target.value)} placeholder="랭킹에 공개되는 이름" />
          </label>
          <div className="field">
            <span>캐릭터</span>
            <div className="avatars">
              {(["m", "f"] as const).map((kind) => (
                <button key={kind} className={`avatar-pick ${avatar === kind ? "selected" : ""}`} aria-pressed={avatar === kind} onClick={() => setAvatar(kind)}>
                  <Avatar kind={kind} size={56} />
                  <span>{kind === "m" ? "남학생" : "여학생"}</span>
                </button>
              ))}
            </div>
            <p className="hint">게임 수치에는 영향을 주지 않습니다.</p>
          </div>
          {loggedIn ? <p className="hint">{loggedIn} 로 인증되었습니다. 기록이 랭킹에 쌓입니다.</p> : showAuth ? (
            <AuthPanel onDone={() => setShowAuth(false)} />
          ) : (
            <button className="link" onClick={() => setShowAuth(true)}>인천대 메일로 로그인하면 기록이 쌓여요</button>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="card form">
          <label className="field">
            <span>후회 (랭킹과 공유 화면에 공개되지 않습니다)</span>
            <textarea rows={4} maxLength={300} value={regret} onChange={(event) => setRegret(event.target.value)} placeholder="예: 다른 과 친구를 한 명도 못 사귀었어요" />
          </label>
          <div className="chips">
            {REGRETS.map((item) => <button key={item} className="chip" onClick={() => setRegret(item)}>{item}</button>)}
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="choices">
          <p className="hint">세 유형 모두 능력치 합은 같고 분포만 다릅니다.</p>
          {STYLES.map((item) => (
            <button key={item.id} className={`choice style-choice ${style === item.id ? "selected" : ""}`} aria-pressed={style === item.id} onClick={() => setStyle(item.id)}>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
              <span className="style-stats num">{Object.entries(item.stats).map(([key, value]) => <i key={key}>{key} {value}</i>)}</span>
            </button>
          ))}
        </div>
      )}
      {step === 4 && (
        <div className="choices">
          <p className="hint">최대 2개까지 고를 수 있습니다. 고른 능력이 훨씬 빨리 자랍니다.</p>
          <div className="focus-grid">
            {FOCUS.map((item) => (
              <button key={item.id} className={`choice focus-choice ${focus.includes(item.id) ? "selected" : ""}`} aria-pressed={focus.includes(item.id)} disabled={!focus.includes(item.id) && focus.length >= 2} onClick={() => toggleFocus(item.id)}>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
          {error && <p className="hint hint-error" role="alert">{error}</p>}
        </div>
      )}
      <div className="cta">
        {step < lastStep ? (
          <button className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>다음</button>
        ) : (
          <button className="btn" disabled={!canNext || busy} onClick={submit}>{busy ? "복귀 처리 중입니다" : "1학년으로 복귀하기"}</button>
        )}
      </div>
    </main>
  );
}
