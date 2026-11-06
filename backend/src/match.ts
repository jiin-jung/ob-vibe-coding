export interface Team {
  id: string;
  size: number;
  format: 1 | 2 | 3;
  timeSlot: string;
  mode: "dating" | "friend";
  gender: "M" | "F" | null;
  departments: string[];
  createdAt: number;
}

export interface FilledTeam {
  memberTeamIds: string[];
  format: 1 | 2 | 3;
  timeSlot: string;
  mode: "dating" | "friend";
  gender: "M" | "F" | null;
  departments: string[];
  createdAt: number;
}

export interface MatchResult {
  filledTeams: FilledTeam[];
  matches: { teamA: FilledTeam; teamB: FilledTeam }[];
  waiting: string[];
}

const byCreatedAt = <T extends { createdAt: number }>(a: T, b: T) =>
  a.createdAt - b.createdAt;

const byTeamPriority = (a: Team, b: Team) =>
  byCreatedAt(a, b) || a.id.localeCompare(b.id);

const byFilledPriority = (a: FilledTeam, b: FilledTeam) =>
  byCreatedAt(a, b) ||
  a.memberTeamIds.join("\0").localeCompare(b.memberTeamIds.join("\0"));

function validate(teams: Team[]) {
  const ids = new Set<string>();

  for (const team of teams) {
    if (ids.has(team.id)) throw new Error(`Duplicate team id: ${team.id}`);
    if (!Number.isInteger(team.size) || team.size < 1 || team.size > team.format) {
      throw new RangeError(`Invalid size for team ${team.id}`);
    }
    ids.add(team.id);
  }
}

function toFilledTeam(parts: Team[]): FilledTeam {
  const ordered = [...parts].sort(byTeamPriority);
  const first = ordered[0];
  const genders = new Set(ordered.map((part) => part.gender));

  return {
    memberTeamIds: ordered.map((part) => part.id),
    format: first.format,
    timeSlot: first.timeSlot,
    mode: first.mode,
    gender: genders.size === 1 ? first.gender : null,
    departments: [...new Set(ordered.flatMap((part) => part.departments))].sort(),
    createdAt: first.createdAt,
  };
}

function fillPool(pool: Team[]): FilledTeam[] {
  const ordered = [...pool].sort(byTeamPriority);
  const format = ordered[0]?.format;
  if (!format) return [];

  const full = ordered.filter((team) => team.size === format).map((team) => toFilledTeam([team]));
  const ones = ordered.filter((team) => team.size === 1);
  const twos = ordered.filter((team) => team.size === 2 && format === 3);
  const combined: FilledTeam[] = [];

  if (format === 2) {
    while (ones.length >= 2) combined.push(toFilledTeam(ones.splice(0, 2)));
  }

  if (format === 3) {
    while (twos.length && ones.length) {
      combined.push(toFilledTeam([twos.shift()!, ones.shift()!]));
    }
    while (ones.length >= 3) combined.push(toFilledTeam(ones.splice(0, 3)));
  }

  return [...full, ...combined].sort(byFilledPriority);
}

function departmentsOverlap(a: FilledTeam, b: FilledTeam) {
  const departments = new Set(a.departments);
  return b.departments.some((department) => departments.has(department));
}

function canMatch(a: FilledTeam, b: FilledTeam) {
  return a.mode === "friend" ||
    (a.gender !== null && b.gender !== null && a.gender !== b.gender);
}

export function matchTeams(teams: Team[]): MatchResult {
  validate(teams);

  const sorted = [...teams].sort(byTeamPriority);
  const fillPools = new Map<string, Team[]>();

  for (const team of sorted) {
    if (team.mode === "dating" && team.gender === null) continue;
    const gender = team.mode === "dating" ? team.gender : "any";
    const key = `${team.format}\0${team.timeSlot}\0${team.mode}\0${gender}`;
    const pool = fillPools.get(key) ?? [];
    pool.push(team);
    fillPools.set(key, pool);
  }

  const filledTeams = [...fillPools.keys()]
    .sort()
    .flatMap((key) => fillPool(fillPools.get(key)!));
  const matchPools = new Map<string, FilledTeam[]>();

  for (const team of filledTeams) {
    const key = `${team.format}\0${team.timeSlot}\0${team.mode}`;
    const pool = matchPools.get(key) ?? [];
    pool.push(team);
    matchPools.set(key, pool);
  }

  const matches: MatchResult["matches"] = [];

  for (const key of [...matchPools.keys()].sort()) {
    const available = matchPools.get(key)!.sort(byFilledPriority);

    while (available.length > 1) {
      const teamA = available.shift()!;
      const candidates = available
        .map((team, index) => ({ team, index }))
        .filter(({ team }) => canMatch(teamA, team));
      if (!candidates.length) continue;

      const chosen = candidates.find(({ team }) => !departmentsOverlap(teamA, team)) ?? candidates[0];
      const [teamB] = available.splice(chosen.index, 1);
      matches.push({ teamA, teamB });
    }
  }

  const matchedIds = new Set(
    matches.flatMap(({ teamA, teamB }) => [teamA, teamB])
      .flatMap((team) => team.memberTeamIds),
  );
  const waiting = sorted.filter((team) => !matchedIds.has(team.id)).map((team) => team.id);

  return { filledTeams, matches, waiting };
}
