// T-150/T-151: 内蔵レベルの検証(F-15, N-04)
// data/levels.json はスクリプトが生成するが、本テストはそれを信用せず
// パース・ソルバーで独立に再計算する(出荷ゲート)。
import { describe, expect, it } from "vitest";
import { parseLevel } from "../parse";
import { solve } from "../solver";
import levelsJson from "../../../data/levels.json";

interface BundledLevel {
  id: string;
  name: string;
  source: string;
  text: string;
  difficulty: number;
  pushes: number;
}

const levels = (levelsJson as { levels: BundledLevel[] }).levels;

describe("T-150 内蔵レベルのパース", () => {
  it("10 面以上あり、全てパースできる", () => {
    expect(levels.length).toBeGreaterThanOrEqual(10);
    for (const l of levels) {
      const r = parseLevel(l.text);
      expect(r.ok, `${l.id} ${l.name}: パース失敗`).toBe(true);
    }
  });

  it("id は一意である", () => {
    const ids = levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("T-151 内蔵レベルは全て既定予算内で解ける", () => {
  it("solve が solved を返し、記載の押し数・難易度と一致する", () => {
    for (const l of levels) {
      const r = parseLevel(l.text);
      if (!r.ok) continue; // T-150 で検出済み
      const s = solve(r.level); // 既定予算(N-04)
      expect(s.status, `${l.id} ${l.name}: 解けない`).toBe("solved");
      expect(s.pushes, `${l.id}: 押し数がメタデータと不一致`).toBe(l.pushes);
      expect(s.pushes).toBeGreaterThanOrEqual(1);
      expect(l.difficulty).toBeGreaterThanOrEqual(1);
      expect(l.difficulty).toBeLessThanOrEqual(5);
    }
  });
});
