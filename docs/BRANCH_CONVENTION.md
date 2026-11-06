# Git Branch Naming Convention

## 브랜치 구조

```txt
main ← develop ← feat/*, fix/*, refactor/*, chore/*
main ← hotfix/*
```

## 기본 형식

```txt
<prefix>/<kebab-case-설명>
```

이슈를 사용하는 경우:

```txt
<prefix>/<이슈번호>-<kebab-case-설명>
```

## Prefix

| Prefix | 사용 기준 | 예시 |
| --- | --- | --- |
| `main` | 제출과 배포 버전 | `main` |
| `develop` | 개발 통합, PR 기본 도착지 | `develop` |
| `feat/` | 새 기능 | `feat/game-core` |
| `fix/` | 버그 수정 | `fix/photo-upload` |
| `hotfix/` | 배포 후 긴급 수정 | `hotfix/demo-crash` |
| `refactor/` | 기능 변화 없는 구조 개선 | `refactor/game-rules` |
| `chore/` | 설정, 문서, 테스트 등 보조 작업 | `chore/conventions` |

## 작성 기준

- 영문 소문자와 하이픈만 쓴다.
- 한 브랜치는 한 목적만 다루고, 머지 후 지운다.

## 선정 이유

> 대회 중에도 `main`을 시연 가능한 상태로 지키고, 작업은 PR로 합쳐 기록을 남긴다.
