// 内蔵レベル生成スクリプト(F-15)
//   npx vite-node scripts/gen-levels.ts
// 手作りレベル + 生成器レベル(固定シード)をソルバーで検証し、
// 難易度・最短押し数のメタデータ付きで data/levels.json に書き出す。
// 検証に落ちるレベルがあれば非 0 終了(解けないレベルは出荷されない — F-10)。

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateLevel } from "../src/core/generator";
import { difficultyScore } from "../src/core/generator";
import { parseLevel, serializeLevel } from "../src/core/parse";
import { solve } from "../src/core/solver";

interface Entry {
  id: string;
  name: string;
  source: "handcrafted" | "generated";
  seed: number | null;
  text: string;
  pushes: number;
  moves: number;
  difficulty: number;
}

const entries: Entry[] = [];
let failed = false;

// ---- 手作りレベル(オリジナル・小品) ----
const HANDCRAFTED: { name: string; lines: string[] }[] = [
  {
    name: "はじめの一歩",
    lines: ["######", "#@$ .#", "######"],
  },
  {
    name: "ふたつの部屋",
    lines: ["########", "#  .   #", "# $@$  #", "#   .  #", "########"],
  },
  {
    name: "まわり道",
    lines: ["#######", "#.  # #", "# $@$ #", "#   . #", "#######"],
  },
];

for (let i = 0; i < HANDCRAFTED.length; i++) {
  const h = HANDCRAFTED[i];
  const text = h.lines.join("\n");
  const r = parseLevel(text);
  if (!r.ok) {
    console.error(`✗ handcrafted "${h.name}": パース失敗 ${r.error.kind}`);
    failed = true;
    continue;
  }
  const s = solve(r.level);
  if (s.status !== "solved" || (s.pushes ?? 0) < 1) {
    console.error(`✗ handcrafted "${h.name}": ${s.status}(出荷不可)`);
    failed = true;
    continue;
  }
  entries.push({
    id: `H${String(i + 1).padStart(2, "0")}`,
    name: h.name,
    source: "handcrafted",
    seed: null,
    text: serializeLevel(r.level),
    pushes: s.pushes ?? 0,
    moves: s.moves ?? 0,
    difficulty: difficultyScore(s.pushes ?? 0, r.level.boxes.length, s.stats.expanded),
  });
  console.log(`✓ handcrafted "${h.name}" pushes=${s.pushes}`);
}

// ---- 生成レベル(固定シード → 決定的に再現可能) ----
const GEN_PARAMS = [
  { seed: 101, width: 7, height: 6, boxes: 1, pulls: 8, name: "鍛造 I" },
  { seed: 102, width: 8, height: 6, boxes: 2, pulls: 10, name: "鍛造 II" },
  { seed: 103, width: 8, height: 7, boxes: 2, pulls: 12, name: "鍛造 III" },
  { seed: 104, width: 8, height: 7, boxes: 2, pulls: 16, name: "鍛造 IV" },
  { seed: 105, width: 9, height: 7, boxes: 3, pulls: 14, name: "鍛造 V" },
  { seed: 106, width: 9, height: 8, boxes: 3, pulls: 18, name: "鍛造 VI" },
  { seed: 107, width: 10, height: 8, boxes: 3, pulls: 22, name: "鍛造 VII" },
  { seed: 108, width: 10, height: 8, boxes: 4, pulls: 24, name: "鍛造 VIII" },
  { seed: 109, width: 11, height: 9, boxes: 4, pulls: 28, name: "鍛造 IX" },
];

for (let i = 0; i < GEN_PARAMS.length; i++) {
  const p = GEN_PARAMS[i];
  const g = generateLevel(p);
  if (!g.ok) {
    console.error(`✗ generated seed=${p.seed}: ${g.reason}`);
    failed = true;
    continue;
  }
  entries.push({
    id: `G${String(i + 1).padStart(2, "0")}`,
    name: p.name,
    source: "generated",
    seed: p.seed,
    text: serializeLevel(g.result.level),
    pushes: g.result.pushes,
    moves: g.result.moves,
    difficulty: g.result.difficulty,
  });
  console.log(
    `✓ generated "${p.name}" seed=${p.seed} pushes=${g.result.pushes} difficulty=${g.result.difficulty}(試行 ${g.result.attempts} 回)`,
  );
}

if (failed) {
  console.error("検証に落ちたレベルがあるため levels.json を書き出しません");
  process.exit(1);
}

// 難易度 → 押し数の昇順で並べ、遊ぶ順に整える
entries.sort((a, b) => a.difficulty - b.difficulty || a.pushes - b.pushes);

const outPath = join(__dirname, "..", "data", "levels.json");
mkdirSync(join(__dirname, "..", "data"), { recursive: true });
writeFileSync(outPath, JSON.stringify({ levels: entries }, null, 2) + "\n", "utf8");
console.log(`→ ${outPath}(${entries.length} 面)`);
