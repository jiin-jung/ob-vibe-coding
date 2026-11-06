import { useState } from "react";
import { api, ApiError, isInuEmail } from "../api";

export default function AuthPanel({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { setError(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요."); } finally { setBusy(false); }
  }

  const requestCode = () => run(async () => {
    await api("/auth/request", { body: { email } });
    setSent(true);
  });
  const verify = () => run(async () => {
    await api("/auth/verify", { body: { email, code } });
    onDone();
  });

  const validEmail = isInuEmail(email);
  return (
    <div className="auth">
      <label className="field">
        <span>학교 이메일 계정</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (sent) {
              setSent(false);
              setCode("");
              setError("");
            }
          }}
          placeholder="아이디@inu.ac.kr"
        />
      </label>
      <p className="hint">인천대학교에서 사용하는 이메일 계정을 입력해 주세요.</p>
      {email && !validEmail && <p className="hint hint-error">@inu.ac.kr 메일만 사용할 수 있어요.</p>}
      {!sent ? (
        <button className="btn btn-secondary" disabled={!validEmail || busy} onClick={requestCode}>{busy ? "보내는 중" : "인증 코드 받기"}</button>
      ) : (
        <>
          <label className="field">
            <span>메일로 받은 6자리 코드</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <p className="hint">메일이 안 보이면 스팸함도 확인해 주세요. 코드는 10분 동안 유효해요.</p>
          <button className="btn btn-secondary" disabled={code.length !== 6 || busy} onClick={verify}>{busy ? "확인 중" : "인증하기"}</button>
          <button className="link" disabled={busy} onClick={requestCode}>코드 다시 받기</button>
        </>
      )}
      {error && <p className="hint hint-error" role="alert">{error}</p>}
    </div>
  );
}
