// T-001..T-004: 盤面パース/シリアライズ(F-01)
import { describe, expect, it } from "vitest";
import { parseLevel, serializeLevel } from "../parse";

const SIMPLE = ["#####", "#@$.#", "#####"].join("\n");

describe("T-001 ラウンドトリップ", () => {
  it("パース → シリアライズで正規化テキストと一致する", () => {
    const r = parseLevel(SIMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(serializeLevel(r.level)).toBe(SIMPLE);
  });

  it("非矩形入力は右パディングで正規化され、再パースで同一盤面になる", () => {
    // 2 行目が短い非矩形入力(末尾の壁は 3 行目にのみある)
    const ragged = ["#####", "#@$.#", "###", "  ###"].join("\n");
    const r1 = parseLevel(ragged);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const text = serializeLevel(r1.level);
    const r2 = parseLevel(text);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.level).toEqual(r1.level);
  });
});

describe("T-002 プレイヤー数の検証", () => {
  it("プレイヤー 0 人は no-player", () => {
    const r = parseLevel(["#####", "# $.#", "#####"].join("\n"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no-player");
  });

  it("プレイヤー 2 人は multiple-players", () => {
    const r = parseLevel(["######", "#@@$.#", "######"].join("\n"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("multiple-players");
  });
});

describe("T-003 箱とゴールの数", () => {
  it("箱数≠ゴール数は box-goal-mismatch", () => {
    const r = parseLevel(["#####", "#@$ #", "#####"].join("\n"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("box-goal-mismatch");
  });

  it("空盤面は empty", () => {
    const r = parseLevel("   \n  ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("empty");
  });
});

describe("T-004 合成マス(* と +)", () => {
  it("* はゴール上の箱、+ はゴール上のプレイヤー", () => {
    // 箱 2($ と *)、ゴール 2(+ と *)で数が釣り合う正当な盤面
    const r = parseLevel(["#####", "#+$*#", "#####"].join("\n"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { level } = r;
    const idx = (x: number, y: number) => y * level.board.width + x;
    expect(level.player).toBe(idx(1, 1));
    expect([...level.boxes].sort((a, b) => a - b)).toEqual([idx(2, 1), idx(3, 1)]);
    expect([...level.board.goals].sort((a, b) => a - b)).toEqual([
      idx(1, 1),
      idx(3, 1),
    ]);
  });
});
