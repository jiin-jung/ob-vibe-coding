# ob-vibe-coding

[인천대학교 바이브코딩 대회] 팀 늙은이들

**재수강:** 대학생활의 후회를 입력하고 1학년으로 돌아가, 인천대 규칙 그대로 다시 플레이하는 웹 게임.

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

비밀 값은 `.local/.env`에 둔다. 값이 없어도 실행된다. AI는 샘플 문구로, 메일은 서버 콘솔로 대체된다.

시연:

```bash
cd frontend && npm run build
cd ../backend && npm run seed && npm start   # http://<노트북 IP>:8787
```

## 참고 코드와 라이브러리 출처

대회 규칙에 따라 참고하거나 활용한 코드를 여기에 적는다.

| 이름 | 용도 | 링크 |
| --- | --- | --- |
| Vite, React | 프론트엔드 | https://vite.dev, https://react.dev |
| Hono | 백엔드 | https://hono.dev |
| Anthropic SDK | AI 호출 | https://github.com/anthropics/anthropic-sdk-typescript |
| nodemailer | 메일 발송 | https://nodemailer.com |
| zod | 입력 검증 | https://zod.dev |
| React Router | 화면 이동 | https://reactrouter.com |
| html-to-image | 성적표 이미지 저장 | https://github.com/bubkoo/html-to-image |
| Pretendard | 본문 글꼴 | https://github.com/orioncactus/pretendard |
| Gasoek One | 로고 글꼴 | https://fontsource.org/fonts/gasoek-one |

게임 장르와 재미 구조는 [벤치에서 발롱까지](https://kickru.com/), [이번 생은 야구다!](https://slbcareer.com/)를 참고했다. 코드, 이름, 문구, 그림은 가져오지 않았다.
