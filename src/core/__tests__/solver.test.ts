// T-100..T-120: ソルバー(F-06..F-08)
import { describe, expect, it } from "vitest";
import { applyMoves, isSolved, newGame } from "../engine";
import { parseLevel } from "../parse";
import { computeDeadSquares, solve } from "../solver";

function lvl(lines: string[]) {
  const r = parseLevel(lines.join("\n"));
  if (!r.ok) throw new Error(`fixture parse failed: ${r.error.kind}`);
  return r.level;
}

// 直線コリドー: @ (1,1) / $ (3,1) / . (5,1)
// 最短解の導出: プレイヤーは (2,1) へ 1 歩(r)、以後押し 2 回(RR)で箱が (5,1) へ。
// 押しは各 1 マスずつしか進まないため押し 2 が下限(|5-3| = 2)。moves = 3。
const CORRIDOR = ["#######", "#@ $ .#", "#######"];

// 2 箱・最短押し 3 の盤面(導出はテスト内 assert で検算):
//   ########
//   #  .   #   ゴール G1 (3,1), G2 (4,3)
//   # $@$  #   箱 A (2,2), B (4,2)
//   #   .  #
//   ########
const TWO_BOX = ["########", "#  .   #", "# $@$  #", "#   .  #", "########"];

describe("T-100 直線コリドーの最短解", () => {
  it("押し 2 / 手数 3 の解を返す", () => {
    const r = solve(lvl(CORRIDOR));
    expect(r.status).toBe("solved");
    expect(r.pushes).toBe(2); // 下限 |goal.x - box.x| = 2 と一致 → 最適
    expect(r.moves).toBe(3);
    expect(r.solution).toBe("rRR");
  });
});

describe("T-101 2 箱盤面の最短押し数", () => {
  it("マンハッタン割当下限 3 と一致する(最適性の独立検算)", () => {
    const level = lvl(TWO_BOX);
    const W = level.board.width;
    const xy = (i: number) => [i % W, Math.floor(i / W)] as const;
    const dist = (a: number, b: number) => {
      const [ax, ay] = xy(a);
      const [bx, by] = xy(b);
      return Math.abs(ax - bx) + Math.abs(ay - by);
    };
    // 下限の独立再計算: 箱→ゴールの最小コスト完全マッチング(2×2 は全列挙)
    const [b1, b2] = level.boxes;
    const [g1, g2] = level.board.goals;
    const lowerBound = Math.min(
      dist(b1, g1) + dist(b2, g2),
      dist(b1, g2) + dist(b2, g1),
    );
    expect(lowerBound).toBe(3); // フィクスチャの前提を検算(VERIF-FALSE 予防)

    const r = solve(level);
    expect(r.status).toBe("solved");
    expect(r.pushes).toBe(lowerBound); // 下限に一致 → 押し数最適
  });
});

describe("T-102 解の再生", () => {
  it("solution を applyMoves すると solved になり、大文字数 = pushes", () => {
    const level = lvl(TWO_BOX);
    const r = solve(level);
    expect(r.status).toBe("solved");
    if (r.status !== "solved" || r.solution === undefined) return;
    const end = applyMoves(newGame(level), r.solution);
    expect(isSolved(end)).toBe(true);
    const upper = r.solution.replace(/[^LURD]/g, "").length;
    expect(upper).toBe(r.pushes);
  });
});

describe("T-110 デッドマス前計算", () => {
  it("ゴールのないコーナーはデッド、ゴールとそこへ押せるマスはライブ", () => {
    const level = lvl(["#####", "#@$.#", "#####"]);
    const dead = computeDeadSquares(level.board);
    const W = level.board.width;
    expect(dead.has(1 * W + 1)).toBe(true); // (1,1) 非ゴールコーナー
    expect(dead.has(1 * W + 2)).toBe(false); // (2,1) からゴールへ押せる
    expect(dead.has(1 * W + 3)).toBe(false); // (3,1) ゴール
  });

  it("ゴールを含まない壁沿い区間はデッド", () => {
    //  x=1..4 の上辺沿い(y=1)は壁沿いでゴールがない → 全てデッド
    const level = lvl(["######", "#    #", "# $. #", "#@   #", "######"]);
    const dead = computeDeadSquares(level.board);
    const W = level.board.width;
    for (let x = 1; x <= 4; x++) {
      expect(dead.has(1 * W + x)).toBe(true);
    }
  });
});

describe("T-111 解けない盤面", () => {
  it("非ゴールコーナーに箱がある盤面は unsolvable", () => {
    const r = solve(lvl(["#####", "#$ .#", "# @ #", "#####"]));
    expect(r.status).toBe("unsolvable");
  });
});

describe("T-120 探索予算", () => {
  it("予算 1 では budget-exceeded になり統計が返る", () => {
    const r = solve(lvl(TWO_BOX), { budget: 1 });
    expect(r.status).toBe("budget-exceeded");
    expect(r.stats.expanded).toBeGreaterThanOrEqual(1);
    expect(r.stats.budget).toBe(1);
  });
});
