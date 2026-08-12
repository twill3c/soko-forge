// T-010..T-040: 移動・押し・クリア判定・undo/reset・LURD リプレイ(F-02..F-05)
import { describe, expect, it } from "vitest";
import { applyMoves, isSolved, move, newGame, reset, undo } from "../engine";
import { parseLevel } from "../parse";

function game(lines: string[]) {
  const r = parseLevel(lines.join("\n"));
  if (!r.ok) throw new Error(`fixture parse failed: ${r.error.kind}`);
  return newGame(r.level);
}

// #####
// #@$.#  プレイヤー(1,1) 箱(2,1) ゴール(3,1)
// #####
const PUSH_LINE = ["#####", "#@$.#", "#####"];

// 広い部屋(自由移動用): ゴールと箱は右端
const ROOM = ["######", "#@   #", "# $. #", "######"];

describe("T-010 床/壁への移動", () => {
  it("床へは移動し moves が増える", () => {
    const g0 = game(ROOM);
    const g1 = move(g0, "right");
    expect(g1.player).toBe(g0.player + 1);
    expect(g1.moves).toBe(1);
    expect(g1.pushes).toBe(0);
  });

  it("壁へは移動せず状態不変", () => {
    const g0 = game(ROOM);
    const g1 = move(g0, "up");
    expect(g1).toBe(g0); // ブロックされた move は同一オブジェクトを返す
  });
});

describe("T-011 箱押し", () => {
  it("押し先が床/ゴールなら箱とプレイヤーが 1 マス進む", () => {
    const g0 = game(PUSH_LINE);
    const g1 = move(g0, "right");
    expect(g1.player).toBe(g0.player + 1);
    expect(g1.boxes).toContain(g0.player + 2);
    expect(g1.pushes).toBe(1);
    expect(g1.moves).toBe(1);
  });
});

describe("T-012 押し不可", () => {
  it("押し先が壁なら状態不変", () => {
    // 箱の先がすぐ壁
    const g0 = game(["####", "#@$#", "#. #", "####"]);
    expect(move(g0, "right")).toBe(g0);
  });

  it("箱 2 連は押せない", () => {
    const g0 = game(["######", "#@$$.#", "#   .#", "######"]);
    expect(move(g0, "right")).toBe(g0);
  });
});

describe("T-020 クリア判定", () => {
  it("全箱ゴールで solved", () => {
    const g0 = game(PUSH_LINE);
    expect(isSolved(g0)).toBe(false);
    const g1 = move(g0, "right");
    expect(isSolved(g1)).toBe(true);
  });
});

describe("T-030/T-031 undo と reset", () => {
  it("push を undo すると初期状態と厳密一致する", () => {
    const g0 = game(PUSH_LINE);
    const g1 = move(g0, "right");
    const g2 = undo(g1);
    expect(g2.player).toBe(g0.player);
    expect([...g2.boxes]).toEqual([...g0.boxes]);
    expect(g2.moves).toBe(0);
    expect(g2.pushes).toBe(0);
    expect(g2.record).toBe("");
  });

  it("複数手の undo は各時点の状態へ戻り、reset は初期化する", () => {
    const g0 = game(ROOM);
    const g1 = move(g0, "down"); // (1,2)
    const g2 = move(g1, "right"); // 箱を押す → (2,2), 箱 (3,2)=goal
    expect(g2.pushes).toBe(1);
    const back1 = undo(g2);
    expect(back1.player).toBe(g1.player);
    expect([...back1.boxes]).toEqual([...g1.boxes]);
    expect(back1.pushes).toBe(0);
    const back2 = undo(back1);
    expect(back2.player).toBe(g0.player);
    expect(back2.moves).toBe(0);
    const r = reset(g2);
    expect(r.player).toBe(g0.player);
    expect([...r.boxes]).toEqual([...g0.boxes]);
    expect(r.moves).toBe(0);
    expect(r.record).toBe("");
  });

  it("初期状態の undo は状態不変", () => {
    const g0 = game(ROOM);
    expect(undo(g0)).toBe(g0);
  });
});

describe("T-040 LURD 記録とリプレイ", () => {
  it("record は移動を小文字、押しを大文字で記録する", () => {
    const g0 = game(ROOM);
    const g2 = move(move(g0, "down"), "right");
    expect(g2.record).toBe("dR");
  });

  it("applyMoves は逐次 move と同一状態になる", () => {
    const g0 = game(ROOM);
    const seq = move(move(g0, "down"), "right");
    const replay = applyMoves(g0, "dR");
    expect(replay.player).toBe(seq.player);
    expect([...replay.boxes]).toEqual([...seq.boxes]);
    expect(replay.moves).toBe(seq.moves);
    expect(replay.pushes).toBe(seq.pushes);
    expect(replay.record).toBe(seq.record);
    expect(isSolved(replay)).toBe(true);
  });

  it("大文字小文字は方向として等価に扱う(押しかどうかは盤面が決める)", () => {
    const g0 = game(ROOM);
    const replay = applyMoves(g0, "DR"); // 記録上は "dR" に正規化される
    expect(replay.record).toBe("dR");
  });
});
