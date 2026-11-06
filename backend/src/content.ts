export type Department = "cse" | "ice" | "ais";
export type GoalType = "network" | "study" | "career" | "challenge" | "romance" | "balance";
export type StatKey = "study" | "network" | "mental" | "romance" | "luck" | "reputation" | "career" | "money";
export type Effects = Partial<Record<StatKey, number>>;

export const DEPARTMENTS: Record<Department, { name: string; short: string }> = {
  cse: { name: "컴퓨터공학부", short: "컴공" },
  ice: { name: "인공지능정보통신공학부", short: "정통" },
  ais: { name: "인공지능시스템공학과", short: "시스템" },
};

export const GOAL_NAMES: Record<GoalType, string> = {
  network: "인맥", study: "학업", career: "진로", challenge: "도전", romance: "낭만", balance: "균형",
};

export const COURSES: Record<Department, string[][]> = {
  cse: [["프로그래밍 입문", "대학수학", "컴퓨팅적 사고"], ["자료구조", "컴퓨터구조", "이산수학"], ["운영체제", "알고리즘", "데이터베이스"], ["소프트웨어공학", "컴퓨터네트워크", "졸업 프로젝트"]],
  ice: [["프로그래밍 입문", "대학수학", "회로이론 기초"], ["신호와 시스템", "자료구조", "확률과 통계"], ["통신이론", "디지털통신", "머신러닝 기초"], ["무선통신", "네트워크 프로그래밍", "졸업 프로젝트"]],
  ais: [["프로그래밍 입문", "대학수학", "논리회로"], ["마이크로프로세서", "자료구조", "전자회로"], ["임베디드 시스템", "운영체제", "제어공학"], ["인공지능 시스템", "로봇 프로그래밍", "졸업 프로젝트"]],
};

export const LABS: Record<Department, { id: string; name: string; route: string }[]> = {
  cse: [
    { id: "gen-ai", name: "생성 AI 연구실", route: "대학원, AI 스타트업" },
    { id: "security", name: "사이버보안 연구실", route: "대기업, 보안 전문가" },
    { id: "graphics", name: "게임 그래픽스 연구실", route: "창업, 게임 개발자" },
  ],
  ice: [
    { id: "next-comm", name: "차세대 통신 연구실", route: "대학원, 통신 대기업" },
    { id: "network", name: "지능형 네트워크 연구실", route: "대기업, 공공기관" },
    { id: "iot", name: "사물인터넷 서비스 연구실", route: "창업, 서비스 개발자" },
  ],
  ais: [
    { id: "robot", name: "자율주행 로봇 연구실", route: "대학원, 로봇 기업" },
    { id: "chip", name: "온디바이스 AI 칩 연구실", route: "반도체 대기업" },
    { id: "device", name: "스마트 디바이스 연구실", route: "창업, 제조 기업" },
  ],
};

export interface Activity {
  id: string;
  name: string;
  income: number;
  effects: Effects;
  description: string;
}

export const ACTIVITIES: Activity[] = [
  { id: "work", name: "국가근로", income: 90, effects: { mental: -3 }, description: "안정적인 수입. 직전 평점 C0 이상" },
  { id: "parttime", name: "알바", income: 130, effects: { mental: -8, network: 1 }, description: "많이 벌지만 멘탈이 깎임" },
  { id: "dream", name: "홍보대사 드림이", income: 60, effects: { reputation: 8, network: 5, mental: -3 }, description: "2학년부터. 평판과 인맥 상승" },
  { id: "lab", name: "연구실", income: 40, effects: { career: 10, study: 3, mental: -4 }, description: "3학년부터. 가상 연구실" },
  { id: "club", name: "동아리", income: 0, effects: { romance: 8, network: 6, study: -2 }, description: "돈은 없지만 낭만이 있음" },
  { id: "tutor", name: "과외", income: 110, effects: { mental: -3, study: 2 }, description: "직전 평점 3.5 이상" },
  { id: "contest", name: "공모전", income: 20, effects: { career: 4, mental: -3 }, description: "운이 좋으면 상금" },
  { id: "english", name: "영어 공부", income: 0, effects: { study: 2, mental: -2 }, description: "영어졸업인증 준비" },
];

export interface Item {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const ITEMS: Item[] = [
  { id: "energy", name: "에너지 음료", price: 10, description: "이번 학기 멘탈 소모 감소" },
  { id: "notes", name: "선배의 필기 노트", price: 25, description: "이번 학기 성적 상승" },
  { id: "book", name: "중고 전공책", price: 20, description: "학업 소폭 상승" },
  { id: "pass", name: "통학 패스", price: 30, description: "매 학기 멘탈 회복" },
  { id: "suit", name: "면접 정장", price: 40, description: "진로 상승" },
  { id: "charm", name: "부적", price: 15, description: "운 상승" },
];

export interface EventOption {
  label: string;
  effects: Effects;
  result: string;
  tag?: string;
  chance?: number;
  failEffects?: Effects;
  failResult?: string;
  requiresRomance?: boolean;
}

export interface GameEvent {
  id: string;
  year: number;
  title: string;
  body: string;
  options: EventOption[];
}

const opt = (label: string, effects: Effects, result: string, tag?: string): EventOption => ({ label, effects, result, tag });

export const EVENTS: GameEvent[] = [
  { id: "signup-fail", year: 1, title: "[통지] 수강신청 결과", body: "수강신청이 완료되었습니다. 귀하의 희망은 반영되지 않았습니다.", options: [
    opt("1교시로 채운다", { study: 6, mental: -8 }, "1교시 출석이 시작되었습니다. 귀하의 아침은 폐지되었습니다."),
    opt("정정 기간을 노린다", { luck: 6, study: -3 }, "정정 대기 명단에 등록되었습니다. 새로고침 횟수가 집계됩니다."),
  ] },
  { id: "ot", year: 1, title: "[안내] 신입생 OT 참석 조사", body: "참석 여부를 제출하십시오. 미제출 시 어색함이 유지됩니다.", options: [
    opt("참석한다", { network: 12, money: -10 }, "동기 연락처가 등록되었습니다. 이름은 추후 확인 바랍니다.", "ot"),
    opt("집에 있는다", { mental: 6, network: -5 }, "귀하의 휴식이 승인되었습니다. 단체방 알림은 계속됩니다."),
  ] },
  { id: "club-fair", year: 1, title: "[안내] 동아리 박람회", body: "동아리 박람회가 개최 중입니다. 귀하의 손에 전단지 7장이 확인되었습니다.", options: [
    opt("가입한다", { romance: 10, network: 6, study: -3 }, "가입 처리되었습니다. 모임비 납부 안내가 곧 도착합니다.", "club"),
    opt("지나친다", { study: 5 }, "전단지가 반납되었습니다. 귀하의 얼굴은 기록되었습니다.", "club-avoid"),
  ] },
  { id: "first-exam", year: 1, title: "[공고] 첫 시험 일정", body: "첫 시험 일정이 공고되었습니다. 귀하의 복습 내역은 조회되지 않습니다.", options: [
    opt("밤샌다", { study: 10, mental: -10 }, "밤샘 내역이 확인되었습니다. 기억의 보존은 보장되지 않습니다."),
    opt("운에 맡긴다", { luck: 6, study: -6 }, "귀하의 운이 답안지에 제출되었습니다."),
  ] },
  { id: "team-project", year: 2, title: "[통지] 조별 과제 조 편성 결과", body: "귀하의 조원 3인 중 2인이 연락 두절 상태입니다. 나머지 1인은 귀하입니다.", options: [
    opt("혼자 다 한다", { study: 10, mental: -13 }, "1인 조 운영이 승인되었습니다. 발표자는 귀하입니다.", "team-carry"),
    opt("교수님께 메일을 보낸다", { reputation: 6, network: -4 }, "메일이 접수되었습니다. 조원들의 연락이 재개되었습니다."),
  ] },
  { id: "dream-recruit", year: 2, title: "[공고] 홍보대사 드림이 모집", body: "홍보대사 드림이 모집 공고가 게시되었습니다. 면접 복장을 점검하십시오.", options: [
    opt("지원한다", { reputation: 12, network: 8, mental: -5 }, "지원서가 접수되었습니다. 캠퍼스 길을 외우시기 바랍니다.", "dream"),
    opt("넘긴다", { study: 5 }, "공고가 지나갔습니다. 귀하의 주말은 보존되었습니다."),
  ] },
  { id: "double-major", year: 2, title: "[안내] 복수전공 신청", body: "복수전공 신청 기간입니다. 귀하의 시간표는 이미 사과하고 있습니다.", options: [
    opt("신청한다", { career: 12, mental: -10 }, "복수전공이 승인되었습니다. 공강은 기록으로만 남습니다.", "double-major"),
    opt("본전공에 집중한다", { study: 10 }, "본전공 집중이 확인되었습니다. 전공 교수님이 귀하를 알아보기 시작합니다."),
  ] },
  { id: "academic-warning", year: 2, title: "[경고] 평점 경계 구간 진입", body: "귀하의 평점이 경계 구간에 진입하였습니다. 이는 격려가 아닙니다.", options: [
    opt("계절학기를 듣는다", { study: 10, money: -20 }, "계절학기가 신청되었습니다. 방학은 추후 재공지합니다."),
    opt("다음 학기의 나를 믿는다", { mental: 6, study: -5 }, "미래의 귀하에게 업무가 이관되었습니다.", "warning-survive"),
  ] },
  { id: "campus-crush", year: 2, title: "[안내] 도서관 옆자리 변동", body: "학산도서관 귀하의 옆자리 이용자가 3일 연속 동일합니다. 시스템은 판단을 유보합니다.", options: [
    opt("커피를 건넨다", { romance: 15, network: 5, money: -5 }, "커피가 전달되었습니다. 이후의 일은 학사 시스템 소관이 아닙니다.", "romance"),
    opt("공부에 집중한다", { study: 7 }, "공부 시간이 인정되었습니다. 옆자리는 다음 주에 비었습니다."),
  ] },
  { id: "lab-offer", year: 3, title: "[통지] 가상 연구실 면담 요청", body: "가상 연구실에서 귀하를 찾습니다. 사유는 \"손이 부족함\"입니다.", options: [
    opt("들어간다", { career: 15, mental: -8 }, "연구실 출입 권한이 부여되었습니다. 퇴근 권한은 별도 문의 바랍니다.", "lab"),
    opt("사양한다", { mental: 5, romance: 5 }, "정중한 거절이 접수되었습니다."),
  ] },
  { id: "exchange", year: 3, title: "[공고] 교환학생 지원", body: "교환학생 지원 기간입니다. 귀하의 어학 점수를 확인 중입니다.", options: [
    opt("지원한다", { romance: 12, career: 6, money: -20 }, "교환학생이 승인되었습니다. 귀하의 시차가 조정됩니다.", "exchange"),
    opt("남는다", { money: 10, network: 5 }, "잔류가 확인되었습니다. 학식 메뉴는 변동 없습니다."),
  ] },
  { id: "election", year: 3, title: "[공고] 학생회 선거", body: "학생회 선거 공고입니다. 출마 시 귀하의 수면 시간이 공약에서 제외됩니다.", options: [
    opt("출마한다", { reputation: 18, network: 12, study: -8 }, "후보 등록이 완료되었습니다. 귀하의 얼굴이 게시판에 부착되었습니다.", "council"),
    opt("투표만 한다", { study: 5 }, "투표가 완료되었습니다. 민주주의가 귀하를 기억합니다."),
  ] },
  { id: "startup", year: 3, title: "[공고] 창업 공모전", body: "창업 공모전 접수 중입니다. 귀하의 아이디어는 이미 있을 수 있습니다.", options: [
    opt("도전한다", { luck: 8, network: 8, mental: -8 }, "사업계획서가 접수되었습니다. 매출 항목은 공란으로 처리되었습니다.", "startup"),
    opt("다음에 한다", { study: 5 }, "다음이 등록되었습니다. 다음의 일정은 미정입니다."),
  ] },
  { id: "job-prep", year: 4, title: "[공고] 채용 공고 게시", body: "채용 공고가 게시되었습니다. 신입의 자격 요건은 경력 3년입니다.", options: [
    opt("자기소개서를 쓴다", { career: 15, mental: -8 }, "자기소개서 1번 문항이 완료되었습니다. 남은 문항은 8개입니다."),
    opt("포트폴리오를 만든다", { career: 12, study: 5, money: -10 }, "포트폴리오가 생성되었습니다. 귀하의 과거가 재해석되었습니다."),
  ] },
  { id: "grad-check", year: 4, title: "[통지] 졸업 사정 조회", body: "졸업 사정 결과를 조회하십시오. 조회 전 심호흡을 권장합니다.", options: [
    opt("부족분을 점검한다", { study: 6, mental: -4 }, "이수 내역이 점검되었습니다. 교양 한 과목이 말을 걸어옵니다."),
    opt("마지막으로 평점을 관리한다", { study: 8, money: -10 }, "평점 관리가 시작되었습니다. 귀하의 어깨가 무거워졌습니다."),
  ] },
  { id: "grad-school", year: 4, title: "[안내] 대학원 진학 상담", body: "대학원 진학 상담 신청이 가능합니다. 지도교수는 가상 인물입니다.", options: [
    opt("진학을 준비한다", { career: 10, study: 6, money: -10 }, "진학 상담이 접수되었습니다. 졸업의 정의가 변경될 수 있습니다.", "grad-prep"),
    opt("취업에 집중한다", { career: 10, mental: -4 }, "취업 트랙이 확인되었습니다. 메일함 확인 빈도가 증가합니다."),
  ] },
];

export const ENGLISH_EVENT: GameEvent = {
  id: "english-deadline", year: 4, title: "[긴급] 영어졸업인증 마감 임박",
  body: "영어졸업인증 제출 기한이 임박했습니다. 귀하의 영어는 임박하지 않았습니다.",
  options: [
    opt("지금 준비한다", { mental: -10 }, "영어졸업인증이 제출되었습니다. 귀하의 영어가 잠시 임박했습니다.", "english-cert"),
    opt("미룬다", { mental: 5 }, "제출이 미뤄졌습니다. 졸업도 함께 미뤄질 수 있습니다."),
  ],
};

export const INTERVIEW_EVENT: GameEvent = {
  id: "advisor-interview", year: 3, title: "[통지] 지도교수 면담 배정",
  body: "지도교수 면담이 배정되었습니다. 귀하의 성적표가 이미 책상 위에 있습니다.",
  options: [
    { label: "준비한 계획을 말한다", chance: 0.8, effects: { career: 5 }, result: "계획이 수리되었습니다. 교수님이 고개를 끄덕였습니다.", failEffects: { mental: -5 }, failResult: "계획이 반려되었습니다. 재작성 기한은 다음 주입니다." },
    { label: "솔직하게 고민을 말한다", chance: 0.6, effects: { career: 10, reputation: 5 }, result: "면담이 길어졌습니다. 귀하의 고민이 접수되었습니다.", failEffects: { mental: -5 }, failResult: "교수님도 고민에 빠졌습니다. 면담이 종료되었습니다." },
    { label: "연구 주제를 제안한다", chance: 0.3, effects: { career: 20, reputation: 10 }, tag: "lab", result: "제안이 채택되었습니다. 귀하의 이름이 연구실 문에 임시 부착되었습니다.", failEffects: { mental: -15, reputation: -5 }, failResult: "제안이 선행 연구 12편과 일치합니다. 면담이 종료되었습니다." },
  ],
};

export const CHAINS: { year: number; flag: string; title: string; body: string; effects: Effects }[] = [
  { year: 3, flag: "club", title: "그때 그 선배", body: "1학년 때 함께한 동아리 선배가 귀하를 추천했습니다. 추천 사유: 모임비를 제때 냈음.", effects: { network: 15, career: 5 } },
  { year: 3, flag: "club-avoid", title: "그때 그 선배", body: "동아리 박람회의 그 선배가 귀하를 기억합니다. 귀하는 기억하지 못합니다.", effects: { romance: 5, reputation: 3 } },
  { year: 4, flag: "team-carry", title: "조별 과제의 귀환", body: "2학년 조별 과제 조원이 귀하에게 내부 추천을 제안했습니다. 연락은 이제 됩니다.", effects: { career: 15 } },
  { year: 3, flag: "ot", title: "동기의 부름", body: "OT에서 만난 동기가 시험 자료를 공유했습니다. 이름은 아직 확인 중입니다.", effects: { study: 6, network: 4 } },
];

export const INCIDENTS: { id: string; title: string; body: string; effects: Effects }[] = [
  { id: "scholarship", title: "장학금 당첨", body: "장학금 대상자로 선정되었습니다. 전산 오류가 아님을 재차 확인했습니다.", effects: { money: 20 } },
  { id: "festival", title: "대동제", body: "대동제 기간입니다. 귀하의 과제 제출 기한은 연장되지 않습니다.", effects: { romance: 10, study: -4 } },
  { id: "shuttle", title: "셔틀 놓침", body: "셔틀버스가 귀하 없이 출발했습니다. 1교시는 귀하를 기다리지 않습니다.", effects: { mental: -5, study: -3 } },
  { id: "laptop", title: "노트북 고장", body: "귀하의 노트북이 응답하지 않습니다. 과제 파일의 안부를 확인할 수 없습니다.", effects: { money: -20, mental: -5 } },
  { id: "cram", title: "벼락치기 성공", body: "전날 본 부분이 출제되었습니다. 재현은 보장되지 않습니다.", effects: { study: 8, luck: 5 } },
  { id: "allowance", title: "부모님 용돈", body: "부모님이 입금하셨습니다. 메모: 밥은 먹고 다니니.", effects: { money: 30, mental: 5 } },
  { id: "bookresale", title: "중고 전공책 판매", body: "지난 학기 전공책이 판매되었습니다. 필기는 무상 제공되었습니다.", effects: { money: 15 } },
];

export const START_CARDS: { id: string; name: string; body: string; effects: Effects }[] = [
  { id: "commuter", name: "장거리 통학러", body: "왕복 통학 시간이 수강 내역에 포함되지 않습니다.", effects: { mental: -5, money: 20 } },
  { id: "dorm", name: "생활원 입주자", body: "1교시까지의 거리가 단축되었습니다. 변명도 함께 단축되었습니다.", effects: { study: 5, network: 5, money: -10 } },
  { id: "scholar", name: "입학 장학생", body: "입학 장학금이 지급되었습니다. 기대치도 함께 지급되었습니다.", effects: { money: 50, study: 5 } },
  { id: "worker", name: "알바 경력자", body: "주문을 받는 능력이 확인되었습니다. 수강신청과는 별개입니다.", effects: { money: 30, network: 5, study: -5 } },
];

export const ACHIEVEMENTS = {
  warning: { name: "학사경고 생존", rarity: "일반", points: 10 },
  retaker: { name: "재수강 장인", rarity: "일반", points: 10 },
  fossil: { name: "화석 선배", rarity: "일반", points: 10 },
  spaceGap: { name: "우주공강 수집가", rarity: "일반", points: 10 },
  parttime: { name: "알바의 신", rarity: "일반", points: 10 },
  exchange: { name: "교환학생", rarity: "고급", points: 30 },
  fullScholar: { name: "전액 장학금", rarity: "고급", points: 30 },
  romantic: { name: "낭만왕", rarity: "고급", points: 30 },
  noDebt: { name: "무대출 졸업", rarity: "고급", points: 30 },
  early: { name: "조기 졸업", rarity: "희귀", points: 50 },
  bigCompany: { name: "대기업 취업", rarity: "전설", points: 80 },
  startup: { name: "창업 성공", rarity: "전설", points: 80 },
  topStudent: { name: "과 수석", rarity: "전설", points: 80 },
  president: { name: "학생회장", rarity: "전설", points: 80 },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

export const ENDINGS = {
  overtime: { name: "초과 학기", titles: ["졸업 유예의 수호자", "캠퍼스의 터줏대감"] },
  president: { name: "학생회장", titles: ["공약을 지킨 사람", "게시판의 얼굴"] },
  startup: { name: "창업 성공", titles: ["매출 칸을 채운 자", "다음을 실행한 사람"] },
  bigCompany: { name: "대기업 취업", titles: ["조원을 구한 자", "경력 3년의 신입"] },
  topStudent: { name: "과 수석", titles: ["평점의 지배자", "교수님이 아는 학생"] },
  early: { name: "조기 졸업", titles: ["학교를 먼저 나간 사람", "공강 없는 3년"] },
  gradSchool: { name: "대학원 진학", titles: ["졸업을 재정의한 사람", "연구실의 주민"] },
  romantic: { name: "낭만왕", titles: ["학점보다 봄날", "캠퍼스의 시인"] },
  normal: { name: "무사 졸업", titles: ["무사히 다시 쓴 사람", "평범이라는 업적"] },
} as const;

export type EndingId = keyof typeof ENDINGS;

export type FocusStat = "study" | "network" | "mental" | "romance";

export const STYLES: { id: string; name: string; description: string; stats: Record<FocusStat, number> }[] = [
  { id: "scholar", name: "도서관 정착형", description: "학업 위주. 평점으로 승부합니다.", stats: { study: 65, network: 40, mental: 55, romance: 40 } },
  { id: "social", name: "과방 상주형", description: "인맥 위주. 아는 선배가 많습니다.", stats: { study: 40, network: 65, mental: 50, romance: 45 } },
  { id: "romantic", name: "캠퍼스 낭만형", description: "낭만 위주. 오늘의 하늘을 확인합니다.", stats: { study: 45, network: 45, mental: 50, romance: 60 } },
];

export const SIGNUP_RESULTS = {
  allClear: { title: "수강신청 올클", body: "수강신청 올클 처리되었습니다. 귀하의 손가락이 학사 시스템에 기록되었습니다.", effects: { mental: 8, luck: 3 } as Effects },
  partial: { title: "일부 성공", body: "일부 과목만 신청되었습니다. 나머지는 정정 기간의 귀하에게 이관합니다.", effects: { mental: -2 } as Effects },
  spaceGap: { title: "우주공강 발생", body: "큰일났습니다. 귀하의 시간표에 우주공강이 생성되었습니다. 복구는 불가능합니다.", effects: { mental: -8, study: -2 } as Effects },
};

export const REACTIONS = {
  high: ["이번 학기 평점 올라온 거 봄? 사람이 아니던데", "저 정도면 교수님이 이름 외웠을 듯", "같은 수업 들었는데 왜 결과가 다르죠"],
  low: ["이번 시험 그거 나만 어려웠던 거 아니지", "재수강 동지 구합니다", "성적 조회 버튼 누르기 전에 심호흡 필수"],
  normal: ["평범하게 사는 게 제일 어렵다", "이번 학기도 살아남았으면 된 거다", "학식 메뉴 공지가 성적 공지보다 궁금함"],
  spaceGap: ["우주공강 생긴 사람 손. 같이 학식이나 먹자", "4시간 공강 동안 도서관 지박령 됨"],
  allClear: ["수강신청 올클이라니 전생에 나라를 구했나", "서버 터지기 전에 들어가는 손가락이 있다던데"],
  debt: ["졸업하고 갚으면 되지. 일단 오늘 학식부터", "등록금 고지서는 왜 이렇게 빨리 오는 걸까"],
};
