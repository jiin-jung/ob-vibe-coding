# Git Commit Message Convention

## 기본 형식

```txt
<type>(<scope>): <description>
```

## Scope

| Scope | 적용 범위 |
| --- | --- |
| `game` | 게임 규칙, 이벤트, 엔딩, 업적 |
| `ranking` | 랭킹 |
| `auth` | 메일 인증, 세션 |
| `mail` | 메일 발송 |
| `ai` | AI 호출과 프롬프트 |
| `ui` | 공용 화면과 디자인 |
| `global` | 공통 응답, 예외, 보안 설정 |

Scope는 영문 소문자 단수형이다. 변경 대상이 명확할 때만 쓰고, 공통 변경은 생략한다.

## Type

`feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`, `chore`, `revert`

주된 목적으로 고르고, 목적이 여럿이면 커밋을 나눈다.

## Description

- 한글, 명사형 종결, 마침표 없음, 50자 이내 권장
- 구현 과정이 아니라 무엇이 바뀌었는지 쓴다

```txt
feat(game): 학년 진행 규칙 추가
fix(auth): 코드 재전송 제한 수정
build: sharp 의존성 추가
```

## 커밋 단위

- 하나의 커밋은 하나의 논리적 변경만 담는다.
- 구현과 그 테스트는 같은 커밋에 넣을 수 있다.
- 공유 브랜치에 `WIP`, `수정`, `최종` 커밋을 남기지 않는다.

## 선정 이유

> 커밋 목록만으로 변경 내용을 빠르게 파악하고, 심사 때 개발 과정을 설명하기 쉽게 한다.
