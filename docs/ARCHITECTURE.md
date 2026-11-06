# 개발 구조 (초안)

## 원칙

마감이 15:00라서 앱은 하나로 만들고, 외부 서비스는 S3, Claude API, 메일 발송만 쓴다. 흐름은 `USERFLOW.md`, AI 프롬프트는 `DEMO.md`를 따른다.

## 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프론트 | Vite, React, TypeScript (`frontend/`) | 정적 빌드라 배포 위치를 나중에 정할 수 있음 |
| 백엔드 | Node.js, Hono, TypeScript (`backend/`) | API 서버. 빌드 도구 없이 실행 |
| DB | SQLite (`node:sqlite`) | 설치 없음. 노트북 로컬 시연용 |
| 사진 | AWS S3 비공개 버킷, 서버 업로드, 임시 조회 URL | 버킷을 공개하지 않음 |
| 메일 | Gmail SMTP (`nodemailer`) | 인증 코드, 매칭 알림 |
| AI | Claude API (`claude-opus-5-5`), 구조화 출력, 이미지 입력 | 카드 생성과 사진 판정 |
| 스타일 | CSS Modules | 추가 의존성 없음 |

## 시연 환경

프론트는 API를 항상 상대 경로 `/api`로 호출한다. 그래서 배포 방식이 바뀌어도 프론트 코드는 그대로다.

1. 개발: Vite 프록시가 `/api`를 백엔드로 전달한다.
2. 시연: 노트북의 백엔드가 프론트 빌드 결과도 함께 제공하고, 같은 네트워크의 폰으로 접속한다. 학교 Wi-Fi가 기기 간 접속을 막으면 핫스팟을 쓴다.
3. 배포 (시간이 남을 때): 프론트는 S3와 CloudFront, 백엔드는 EC2에 올리고 CloudFront에서 `/api`를 EC2로 보낸다. S3 단독으로는 HTTPS와 `/api` 전달이 안 된다. SQLite는 EC2 디스크에 그대로 둘 수 있다.

## 화면

| 경로 | 내용 |
| --- | --- |
| `/login` | `@inu.ac.kr` 입력, 메일로 받은 코드 확인 |
| `/onboarding` | 학과, 학번, 성별 입력 |
| `/` | 내 모임, 혼자 신청, 방 만들기 |
| `/rooms/new` | 형식(1대1, 2대2, 3대3), 시간, 관심사, 분위기, 불편한 주제 |
| `/invite/[code]` | 초대 링크로 팀 합류 |
| `/rooms/[id]` | 날짜, 장소, 과, 인원, 참가자, 수락과 거절, 오픈채팅 링크 |
| `/rooms/[id]/live` | AI 주도자 진행, 활동 카드, 미션 촬영 |
| `/rooms/[id]/reward` | 뱃지, 추억 카드, 다시 만나기 선택 |

## 데이터

| 테이블 | 주요 필드 |
| --- | --- |
| `users` | email, department, student_no, gender |
| `auth_codes`, `sessions` | 코드 해시, 만료, 시도 횟수, 재전송 시각, 로그인 세션 |
| `teams` | 신청 단위. 혼자 신청도 1인 팀. format, time_slot, mode, invite_code, leader_id, interests, mood, avoid_topics, status |
| `team_members` | team_id, user_id, status |
| `rooms` | team_a_id, team_b_id, host_id, date, place, kakao_url, match_reason, status |
| `activities` | room_id, order, type, title, script, options, requires_photo, status |
| `photos` | activity_id, uploaded_by, s3_key, verdict, reason, skipped, consented_at, created_at, deleted_at |
| `rewards` | room_id, badge, memory_card |
| `ai_logs` | feature, prompt_version, input, raw_output, parse_ok, is_fallback, created_at |

## 핵심 모듈

| 파일 | 역할 | 테스트 |
| --- | --- | --- |
| `backend/src/email.ts` | `isInuEmail`. 프론트와 서버가 함께 사용 | 도메인 위장 주소 차단 |
| `backend/src/match.ts` | 빈자리 채우기와 팀 매칭 순수 함수 | 혼합 인원, 다른 과 우선, 대기 |
| `backend/src/ai.ts` | 주도자 카드, 매칭 이유, 사진 판정, 추억 카드. 스키마 검증과 `ai_logs` 저장 | 키가 없을 때 샘플 응답 사용 |
| `backend/src/s3.ts` | 업로드, 임시 조회 URL, 삭제 | 실제 버킷으로 수동 확인 |
| `backend/src/mail.ts` | 인증 코드와 매칭 알림 발송 | 실제 `@inu.ac.kr` 수신 확인 |

## 사진 흐름

1. `<input type="file" capture>`로 촬영하고, 업로더가 "얼굴이 나오지 않았고 참가자가 동의했다"고 확인한다.
2. 서버가 로그인, 방 소속, 미션 일치, 크기, 실제 파일 형식을 확인한다.
3. 서버가 `sharp`로 다시 인코딩해 EXIF를 지우고 크기를 줄인다.
4. 그 이미지를 Claude에 보내 판정한다.
5. 통과하거나 참가자가 직접 넘긴 사진만 비공개 S3에 저장하고, 재시도 사진은 저장하지 않는다.
6. 조회할 때만 임시 URL을 만든다. 버킷의 S3 Lifecycle 규칙으로 일주일 뒤 자동 삭제하고, 앱은 일주일이 지난 사진을 보여주지 않는다.

## AI 안전

- 사용자 입력은 프롬프트 안에서 데이터로 구분한다.
- 활동은 스키마로 검증하고, 불편한 주제와 금지 주제는 프롬프트와 코드 양쪽에서 거른다.
- AI 호출이 실패하거나 키가 없으면 샘플 카드로 넘어가고, 화면에 샘플이라고 표시한다.

## 개발 순서

| 목표 시각 | 작업 |
| --- | --- |
| 11:00 | 프로젝트 생성, 폰 접속과 사진 업로드 실기기 확인 |
| 12:00 | 샘플 방 기준 AI 주도자, 활동 카드, 미션 사진, 리워드 (핵심 흐름) |
| 13:00 | `@inu.ac.kr` 로그인, 프로필, 방 만들기, 초대, 혼자 신청 |
| 13:45 | 매칭 연결, 방 현황, 약속 입력, 오픈채팅 링크 |
| 14:15 | 디자인 다듬기, 전체 점검. 이후 기능 추가 금지 |
| 15:00 | 프롬프트 로그, README 출처, 발표와 리허설 |

## 시간이 부족할 때 줄이는 순서

1. 다시 만나기 선택
2. 대기자 교체
3. 방 현황의 세부 항목

핵심 흐름, `@inu.ac.kr` 차단, 친구 초대는 유지한다.

## 역할

- Claude: 앱, 화면, DB, AI, S3
- Codex: `backend/src/match.ts`, `backend/src/match.test.ts`

## 사용자가 준비할 것

`.local/.env`에 직접 넣는다. 채팅에는 붙여넣지 않는다.

- `ANTHROPIC_API_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- 권한은 해당 버킷의 객체 읽기, 쓰기, 삭제로만 제한한다.
- 버킷에 7일 만료 Lifecycle 규칙을 설정한다.
