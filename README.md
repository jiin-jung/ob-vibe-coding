# ob-vibe-coding

[인천대학교 바이브코딩 대회] 팀 늙은이들

**재수강:** 대학생활의 후회를 입력하고 1학년으로 돌아가 다시 플레이하면, 게임 속 선택이 현실의 행동으로 이어지는 웹 게임.

## 구조

| 경로 | 내용 |
| --- | --- |
| `frontend/` | 웹 화면 |
| `backend/` | API 서버 |
| `docs/` | 기획과 대회 문서. [목록](docs/README.md) |
| `.local/` | 비밀 값과 개인 파일. Git에 올리지 않음 |

## 실행

필요 환경: Node.js 22.13 이상

```bash
cd backend && npm install && npm run dev      # API, http://localhost:8787
cd frontend && npm install && npm run dev     # 화면, http://localhost:5173
```

비밀 값은 `.local/.env`에 둔다.

## 참고 코드와 라이브러리 출처

대회 규칙에 따라 참고하거나 활용한 코드를 여기에 적는다.

| 이름 | 용도 | 링크 |
| --- | --- | --- |
| Vite, React | 프론트엔드 | https://vite.dev, https://react.dev |
| Hono | 백엔드 | https://hono.dev |
