import { useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { QuestVerdict, RunView } from "../api";

export default function QuestPanel({ run, onPassed, onLater, compact }: { run: RunView; onPassed: (run: RunView) => void; onLater?: () => void; compact?: boolean }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<QuestVerdict | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setVerdict(null);
    const form = new FormData();
    form.set("consent", String(consent));
    form.set("photo", file);
    try {
      const result = await api<QuestVerdict>(`/runs/${run.id}/quest`, { form, runId: run.id });
      setVerdict(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "제출하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="card notice">
      <span className="notice-tag">현실 이수 과제</span>
      <h3>{compact ? "지금 인증하면 추가 엔딩이 열립니다" : "본 과제는 게임 밖에서 진행됩니다"}</h3>
      <p className="quest-text">{run.quest.text}</p>
      <p className="hint">이수하면 전용 선택지와 엔딩이 열립니다. 사진은 판정을 통과한 경우에만 저장되고 일주일 뒤 자동 삭제됩니다.</p>
      {verdict?.passed ? (
        <div className="verdict-box pass">
          <div className="stamp" aria-hidden>이수</div>
          <p>{verdict.reason}</p>
          <button className="btn" onClick={() => onPassed(verdict.run)}>확인</button>
        </div>
      ) : (
        <>
          {verdict && <div className="verdict-box fail" role="alert"><strong>{verdict.judged ? "반려" : "판정 보류"}</strong><p>{verdict.reason}</p></div>}
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>사진에 사람 얼굴이 나오지 않았습니다.</span>
          </label>
          <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="현실 과제 사진" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          <button className="btn" disabled={!consent || busy} onClick={() => input.current?.click()}>{busy ? "학사 시스템이 심사 중입니다" : verdict ? "다시 찍기" : "사진 찍어 제출"}</button>
          {onLater && <button className="link center" disabled={busy} onClick={onLater}>나중에 인증</button>}
        </>
      )}
      {error && <p className="hint hint-error" role="alert">{error}</p>}
    </section>
  );
}
