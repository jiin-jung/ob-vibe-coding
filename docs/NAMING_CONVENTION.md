# Naming Convention

노션 양식은 Spring 기준이지만 프로젝트 백엔드가 Node와 Hono이므로 같은 구조를 TypeScript에 맞춰 적는다.

## 1. 기본 원칙

```txt
권장: createRun, judgeQuestPhoto, RankingPage
지양: doProcess, data2, handleStuff
```

이름은 줄이지 않는다. 다만 `id`, `url`, `ai`처럼 널리 쓰는 약어는 쓴다.

## 2. 폴더 구조

```txt
backend/src/
  app.ts        라우트
  game.ts       게임 규칙 (순수 함수)
  content.ts    이벤트, 활동, 아이템 데이터
  ai.ts         AI 호출
  db.ts, email.ts, mail.ts
frontend/src/
  api.ts        API 호출
  pages/        화면
  components/   공용 컴포넌트
```

도메인이 작아 기능별 파일로 나눈다. 파일이 커지면 그때 폴더로 나눈다.

## 3. 라우트

복수 명사와 kebab-case를 쓴다. 동작은 하위 경로로 표현한다.

```txt
POST /api/runs
POST /api/runs/:id/plan
POST /api/runs/:id/choice
```

## 4. 서비스 함수

동사 + 대상: `applyChoice`, `calculateEnding`, `sendMail`.

## 5. 저장소

DB 호출은 `db.prepare`로 라우트 근처에 둔다. 저장소 계층은 만들지 않는다.

## 6. DB 테이블

복수형 snake_case: `runs`, `ai_logs`. 외래 키는 `run_id`.

## 7. 타입

- 요청 스키마: `CreateRunBody`
- 응답과 화면 상태: `RunView`
- 내부 상태: `GameState`

## 8. 변환 함수

`toRunView`처럼 `to` + 결과 타입으로 쓴다.

## 9. 상수와 유니언

```ts
const TUITION = 200;
type Department = "cse" | "ice" | "ais";
```

## 10. 오류 코드

snake_case로 원인을 쓴다: `invalid_domain`, `run_not_found`.

## 11. 테스트

대상 파일 옆에 `파일명.test.ts`로 둔다. 테스트 이름은 동작을 문장으로 쓴다.

## 12. React 컴포넌트

파일명과 컴포넌트명을 PascalCase로 맞추고, 화면은 `Page`로 끝낸다. CSS 클래스는 kebab-case.
