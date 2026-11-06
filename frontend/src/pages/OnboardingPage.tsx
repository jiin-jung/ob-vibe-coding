import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main className="onboarding">
      <header className="onboarding-head">
        <h1 className="logo">재수강</h1>
        <button className="link" onClick={() => navigate("/home")}>메인 화면으로 건너뛰기</button>
      </header>

      {!confirmed ? (
        <section className="onboarding-question">
          <Avatar kind="m" mood="tired" size={112} />
          <div className="onboarding-copy">
            <h2>대학생활에서<br />놓친 선택이 있습니까?</h2>
            <p>학점, 친구, 진로, 낭만. 하나라도 다시 고르고 싶다면 학사 시스템이 귀하의 기록을 확인합니다.</p>
          </div>
          <button className="btn" onClick={() => setConfirmed(true)}>네, 다시 선택하고 싶습니다</button>
        </section>
      ) : (
        <section className="onboarding-result" aria-live="polite">
          <div className="onboarding-document">
            <span className="onboarding-stamp">대상</span>
            <p className="notice-tag">복귀 처리 사전 통지</p>
            <h2>귀하의 대학생활은<br /><strong>재수강 대상</strong>입니다.</h2>
            <dl className="doc-meta">
              <div><dt>복귀 시점</dt><dd>1학년 1학기</dd></div>
              <div><dt>이수 기간</dt><dd>총 8학기</dd></div>
              <div><dt>처리 상태</dt><dd>신청 가능</dd></div>
            </dl>
            <p>후회는 삭제되지 않습니다. 대신 8학기의 선택을 다시 제출할 수 있습니다.</p>
          </div>
          <button className="btn" onClick={() => navigate("/home")}>재수강 시작하기</button>
          <button className="link" onClick={() => setConfirmed(false)}>질문으로 돌아가기</button>
        </section>
      )}

      <p className="onboarding-disclaimer">인천대학교 비공식 대회 출품작이며 실제 학사 처리가 아닙니다.</p>
    </main>
  );
}
