const MALE = [
  "....HHHHHH....",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  "...HSSSSSSH...",
  "...SSSSSSSS...",
  "...SESSSSES...",
  "...SSSSSSSS...",
  "....SSMMSS....",
  "....NNSSNN....",
  "...NNNWWNNN...",
  "..SNNNNNNNNS..",
  "..SNNNNNNNNS..",
  "....NNNNNN....",
  "....PP..PP....",
  "....PP..PP....",
  "...WWW..WWW...",
];

const FEMALE = [
  "....HHHHHH....",
  "...HHHHHHHH...",
  "..HHHHHHHHHH..",
  "..HHSSSSSSHH..",
  "..HSSSSSSSSH..",
  "..HSESSSSESH..",
  "..HSSSSSSSSH..",
  "..HHSSMMSSHH..",
  "..HHNNSSNNHH..",
  "..HNNNWWNNNH..",
  "..SNNNNNNNNS..",
  "..SNNNNNNNNS..",
  "....NNNNNN....",
  "....PP..PP....",
  "....PP..PP....",
  "...WWW..WWW...",
];

const COLORS: Record<string, string> = { H: "#2a2230", S: "#f4cdb0", E: "#1b1b24", N: "#1f3a6e", W: "#f2f4f8", P: "#3a4252" };

export type Mood = "normal" | "happy" | "tired";

export default function Avatar({ kind, mood = "normal", size = 112 }: { kind: "m" | "f"; mood?: Mood; size?: number }) {
  const rows = kind === "m" ? MALE : FEMALE;
  const mouth = mood === "happy" ? "#c8322b" : mood === "tired" ? "#8a6a5c" : "#b5674f";
  return (
    <svg className="avatar" width={size} height={(size * 16) / 14} viewBox="0 0 14 16" shapeRendering="crispEdges" role="img" aria-label={kind === "m" ? "남학생 캐릭터" : "여학생 캐릭터"}>
      {rows.flatMap((row, y) => [...row].map((cell, x) => cell === "." ? null : (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cell === "M" ? mouth : COLORS[cell]} />
      )))}
      {mood === "tired" && <rect x={12} y={4} width={1} height={2} fill="#6fa8dc" />}
    </svg>
  );
}
