# 프로젝트 규칙

인천대 바이브코딩 대회 출품작이다. 마감은 15:00이고, 발표와 시연 준비까지 포함한다.

## 먼저 읽을 문서

`docs/PLANNING.md`, `docs/USERFLOW.md`, `docs/ARCHITECTURE.md`. 심사 기준은 `docs/JUDGING_CRITERIA.md`다.

## 범위

- 기능을 더하기 전에 심사 항목 점수를 올리는지 확인한다. 아니면 만들지 않는다.
- 후회 맞춤 AI 이벤트와 현실 퀘스트 분기가 차별점이다. 시간이 부족하면 `docs/ARCHITECTURE.md`의 순서대로 줄인다.
- 14:15 이후에는 기능을 추가하지 않는다.
- 기획이 바뀌면 코드와 같은 변경에서 문서도 고친다.

## 금지

- 비밀 값은 `.local/.env`에만 둔다. 코드, 문서, 로그, 채팅에 넣지 않는다.
- 술, 신체 접촉, 외모 평가, 실존 교수와 학생을 소재로 쓰지 않는다. 학교 제도와 일정을 지어내지 않는다.
- `docs/RESEARCH.md`에 출처 없는 수치를 넣지 않는다. 추정이면 추정이라고 쓴다.

## 대회 규칙

- 참고하거나 활용한 코드와 라이브러리는 `README.md`에 출처를 적는다.
- 프롬프트 로그가 심사 대상이다. 지어내지 말고 `docs/DEMO.md` 형식을 따른다.

## 작업 방식

- `docs/BRANCH_CONVENTION.md`, `docs/COMMIT_CONVENTION.md`, `docs/CODE_CONVENTION.md`, `docs/NAMING_CONVENTION.md`를 따른다.
- 영역별 규칙은 `frontend/AGENTS.md`, `backend/AGENTS.md`를 따른다.
- 끝났다고 하기 전에 실제로 실행해서 확인하고, 확인하지 못한 것은 그렇게 말한다.
