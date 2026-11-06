# 인천대 대학생활 시뮬레이션 — 백엔드 전달 패키지

이 폴더 전체 또는 `inu-backend-handoff.zip`을 전달하면 됩니다. 특정 백엔드 언어/DB를 전제하지 않는 UTF-8 JSON입니다. 외부로 자동 전송하지 않았습니다.

## 먼저 읽기

현재 상태는 **수집 자료 스냅샷**입니다. 학교 규칙 전체가 검증·구현된 운영용 seed가 아닙니다. 실제 건수와 수집 원본 해시는 `manifest.json`에 있습니다. 원자료의 verified는 수집자가 공식 원문에서 확인했다는 보고입니다. 적용 학번·학과·예외를 최종 승인한 상태와 구분합니다.

| 파일 | 용도 |
|---|---|
| `data/facts.json` | 동일한 필드 구조로 정리한 학교 정보. 우선 staging 테이블에 적재 |
| `data/sources.json` | source_id로 연결하는 공식 출처 목록 |
| `data/approved-rules.json` | 승인된 실행 규칙. 현재 빈 배열이며 학점/선발 판정에 바로 사용할 수 없음 |
| `data/review-queue.json` | 전체 검토 대기 목록 |
| `data/overlap-candidates.json` | 공통/전공 수집자가 같은 출처를 쓴 항목 쌍. 중복 또는 동일 주장이라는 확정은 아님 |
| `raw/` | 수집자가 저장한 JSON을 변경 없이 보존 |
| `reports/` | 정정 사항·적용 한계·부족한 데이터 설명 |
| `examples/game-event.example.json` | 학교 사실을 참조하는 가상 사건 구조 예시. 운영 데이터 아님 |
| `facts.schema.json` | JSON Schema 구조 설명 |
| `validate.py` | 기본 형식·참조·승인 게이트·체크섬 검증. 원문 사실 검증은 수행하지 않음 |

## 백엔드 담당자에게 요청할 작업

1. `python validate.py`로 전달 파일을 검사합니다(외부 패키지 불필요).
2. `sources`를 먼저, `facts`를 그다음 staging/관리자 전용 영역에 적재합니다. 기본키는 각 `id`, 출처 외래키는 `source_id`입니다.
3. `review_status=pending`, `publish_enabled=false`, `rule_execution_enabled=false`를 유지합니다. 미확인/충돌 항목과 출처 URL은 일반 사용자 API로 자동 공개하지 않습니다.
4. 해당 학번·학과·연도와 조건·예외를 원문과 대조하고, 중복/충돌을 해결한 항목만 사람이 승인합니다. 검증 상태를 이유 없이 verified로 올리지 않습니다.
5. 실제 판정 규칙은 검증한 사실 ID, 정확한 기준값/단위/비교 연산자, 적용 범위, 예외, 검토자/검토일과 함께 별도로 작성합니다. 자연어 문장에서 GPA/학점 숫자를 자동 추출해 바로 실행하지 않습니다.
6. 사건은 `fact_ids`와 승인된 `rule_ids`로 연결합니다. 시간/체력/흥미 같은 게임 수치와 실제 학점·학사 규칙을 별도 필드에 저장합니다.

## 데이터 계약

- `id`: `inu.common.<원본ID>` 또는 `inu.it.<원본ID>`. 같은 버전 내 고유. 갱신은 ID 기준 upsert; 삭제는 별도 검토하며 파일에서 사라졌다고 자동 삭제하지 않습니다.
- `source_id`: `sources.json` 참조. URL 없는 미확인 항목은 null. 출처 제목은 안내용이며 사실의 증거는 각 항목의 인용·위치입니다.
- `research_status`: verified(원문 확인 보고), conditional(범위/최신 공고 등 추가 조건), unverified(확인 못함), conflicting(출처 또는 기존 주장과 불일치).
- `review_status`: pending/approved/rejected. 조사 상태와 별개인 서비스 적용 검토 상태입니다. 이번 패키지는 전부 pending입니다.
- `scope.cohort/department/year`: 수집자가 보고한 적용 범위 원문입니다. **null은 '전체 적용'이 아니라 '모름'**입니다. '연도 선택형' 자료를 2026학번 전용으로 변환하지 않습니다.
- `conditions/exceptions`: 문자열 배열로 통일. 빈 배열은 별도 조건을 수집하지 못했을 수 있으며 예외 없음의 보장이 아닙니다.
- `checked_at`: 열람일, `source_updated_at`: 원문 갱신일. 적용 시작일/종료일과 같지 않습니다. unknown은 null로 보존합니다.
- `evidence.quote/location`: 원문 인용과 조항/본문 위치. '본문 N행'은 수집 도구의 렌더링 위치여서 원본 HTML 행번호와 다를 수 있습니다.
- `game_use_proposal`: 활용 제안이며 학교 사실이 아닙니다.
- `provenance`: 원본 파일·원본 ID·수집자. 원본 수정 이력을 추적할 때 사용합니다.

## DB/API 구현 제안 (확정된 서버 사양 아님)

테이블은 `sources`, `facts`, `fact_revisions`, `approved_rules`, `game_events`로 분리하면 됩니다. 원본 문자열과 scope JSON을 보존하고, 실제 규칙용 정규화 필드는 별도로 검토해서 채웁니다. 공개 조회는 승인 및 publish_enabled가 모두 참인 정보만 노출합니다. 자격 조회에서 데이터가 없거나 scope가 불명확하면 `unknown/review_required`를 반환하며 자격 충족/미충족으로 추정하지 않습니다.

API 예: `GET /facts?cohort=2026&department=...`, `GET /sources/:id`, `GET /opportunities`, `POST /eligibility/check`. 경로는 제안일 뿐 실제 서버에 구현된 API가 아닙니다. 공식 안내 링크로 보내는 것과 지원 자격을 판정하는 기능을 구분합니다.

## 남은 일

학과별 2026학번 교육과정·졸업요건, INURF 최신 공고, 개편 적용시점, 학석사연계 조건은 전공 보고서의 잔여 공백을 우선 확인합니다. 동아리 개수 등 상충 항목은 공식 목록의 기준일과 개수를 재대조합니다. 학칙 조문 원문, 영어졸업인증 및 학과별 예외도 확인해야 합니다. '미확인'은 기존 주장이 거짓이라는 뜻이 아닙니다.

조사 중 원본 파일이 갱신돼도 이 전달 스냅샷은 자동으로 바뀌지 않습니다. `raw/`의 후속 조사본과 정리 데이터를 함께 갱신하고, 실제 건수·입력 해시를 manifest에 반영하고 checksums를 재생성한 뒤 검증합니다. 기존 원본의 이력은 보존합니다. 저장소 내 연결 방법은 [HANDOFF.md](HANDOFF.md)를 따릅니다.

## 친구에게 보낼 문구

> 인천대 대학생활 시뮬 데이터 전달해. ZIP의 README부터 읽고 facts/sources를 staging에 넣어줘. 출처·조건·예외가 포함돼 있고, 미확인/충돌 항목도 분리해 뒀어. 아직 운영 승인된 판정 규칙은 없으니 자연어의 숫자를 바로 게임 분기에 쓰면 안 돼. 사건의 가상 스탯과 학교 사실은 분리하고, 학번·학과 적용을 검토한 항목부터 활성화하면 돼. 실제 건수와 수집 상태는 manifest에 있어.
