// T-140..T-144: レベル生成器(F-09..F-11)
import { describe, expect, it } from "vitest";
import { difficultyScore, generateLevel } from "../generator";
import { solve } from "../solver";
import type { GenerateOptions } from "../generator";

// 代表パラメータ(N-05): 8×7・箱 2・引き 12
const REP: Omit<GenerateOptions, "seed"> = {
  width: 8,
  height: 7,
  boxes: 2,
  pulls: 12,
};

describe("T-140 決定性", () => {
  it("同一シードで 2 回生成すると同一レベル・同一解になる", () => {
    const a = generateLevel({ ...REP, seed: 42 });
    const b = generateLevel({ ...REP, seed: 42 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.result.level).toEqual(a.result.level);
    expect(b.result.solution).toBe(a.result.solution);
    expect(b.result.pushes).toBe(a.result.pushes);
  });

  it("異なるシードは(通常)異なるレベルを生成する", () => {
    const a = generateLevel({ ...REP, seed: 1 });
    const b = generateLevel({ ...REP, seed: 2 });
    if (!a.ok || !b.ok) return;
    expect(b.result.level).not.toEqual(a.result.level);
  });
});

describe("T-141 生成レベルのソルバー検証", () => {
  it("生成結果は独立に solve しても solved で、押し数が一致する", () => {
    for (const seed of [1, 2, 3]) {
      const g = generateLevel({ ...REP, seed });
      expect(g.ok).toBe(true);
      if (!g.ok) continue;
      const r = solve(g.result.level);
      expect(r.status).toBe("solved");
      expect(r.pushes).toBeGreaterThanOrEqual(1); // 自明解(押し 0)は棄却済み
      expect(r.pushes).toBe(g.result.pushes);
    }
  });
});

describe("T-142 生成器信頼性(N-05)", () => {
  it("代表パラメータ × シード 1..10 で全て生成に成功する", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = generateLevel({ ...REP, seed });
      expect(g.ok, `seed=${seed} で生成失敗`).toBe(true);
    }
  });
});

describe("T-143 難易度の単調性", () => {
  it("他条件同一で押し数が増えるとスコアは下がらない", () => {
    let prev = 0;
    for (let pushes = 1; pushes <= 80; pushes++) {
      const s = difficultyScore(pushes, 2, 1000);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe("T-144 難易度の値域", () => {
  it("広いパラメータ域で 1..5 の整数を返す", () => {
    for (const pushes of [1, 5, 10, 20, 40, 120]) {
      for (const boxes of [1, 2, 3, 5]) {
        for (const expanded of [10, 1000, 100000]) {
          const s = difficultyScore(pushes, boxes, expanded);
          expect(Number.isInteger(s)).toBe(true);
          expect(s).toBeGreaterThanOrEqual(1);
          expect(s).toBeLessThanOrEqual(5);
        }
      }
    }
  });
});
