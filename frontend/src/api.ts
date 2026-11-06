export interface SignupResult {
  tier: "allClear" | "partial" | "spaceGap";
  credits: number;
  reactionMs: number;
  title: string;
  body: string;
}

export interface PlanOptions {
  signup: SignupResult | null;
  retakeOptions: { id: string; name: string; grade: string; credits: number }[];
  activities: { id: string; name: string; income: number; description: string; locked: string | null }[];
  labs: { id: string; name: string; route: string }[];
  items: { id: string; name: string; price: number; description: string }[];
  tuition: number;
  living: number;
  allowance: number;
  loanLimit: number;
  debtRoom: number;
  leaveActivities: string[];
}

export interface RunView {
  id: string;
  nickname: string;
  department: string;
  departmentName: string;
  avatar: "m" | "f";
  round: number;
  goalType: string;
  goalText: string;
  notice: string;
  serious: boolean;
  isGoalSample: boolean;
  startCard: { name: string; body: string };
  style: string;
  focus: string[];
  courses: { id: string; name: string; year: number; credits: number; grade: string; retaken: boolean }[];
  year: number;
  semester: number;
  term: number;
  totalSemesters: number;
  phase: "plan" | "event" | "report" | "early" | "done";
  stats: { study: number; network: number; mental: number; romance: number };
  money: number;
  debt: number;
  credits: number;
  gpa: number;
  graduationCredits: number;
  englishCert: boolean;
  plan: PlanOptions | null;
  event: { title: string; body: string; isSample: boolean; options: { label: string; chance: number | null; changes: Record<string, number> }[] } | null;
  lastResult: { title: string; result: string; changes: Record<string, number>; success: boolean } | null;
  report: { semester: number; semesterGpa: number; earned: number; growth: Record<string, number>; notices: { title: string; body: string }[]; reactions: string[] } | null;
  canEarly: boolean;
}

export interface ResultView {
  run: RunView;
  endingName: string;
  endingId: string;
  title: string;
  ending: string;
  nextAction: string;
  isSample: boolean;
  score: number;
  grades: Record<string, string>;
  achievements: { id: string; name: string; rarity: string; points: number }[];
  registered: boolean;
}

export interface RankingView {
  hasDemoData: boolean;
  overall: { rank: number; nickname: string; department: string; score: number; plays: number }[];
  departments: { department: string; score: number; plays: number }[];
  achievements: { id: string; name: string; rarity: string; points: number; leader: { nickname: string; department: string; count: number } | null }[];
  legendCount: number;
}

export class ApiError extends Error {}

export const runToken = (id: string) => localStorage.getItem(`run:${id}`) ?? "";
export const saveRunToken = (id: string, token: string) => {
  localStorage.setItem(`run:${id}`, token);
  localStorage.setItem("lastRun", id);
};

export async function api<T>(path: string, options: { method?: string; body?: unknown; form?: FormData; runId?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.runId) headers["x-run-token"] = runToken(options.runId);
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`/api${path}`, {
    method: options.method ?? (options.body !== undefined || options.form ? "POST" : "GET"),
    headers,
    body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const data = await response.json().catch(() => ({ message: "서버 응답을 읽을 수 없어요." }));
  if (!response.ok) throw new ApiError(data.message ?? "요청을 처리하지 못했어요.");
  return data as T;
}

export const isInuEmail = (email: string) => /^[^\s@]+@inu\.ac\.kr$/.test(email.trim().toLowerCase());
