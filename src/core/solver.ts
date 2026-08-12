// ソルバー(F-06..F-08)
// 押し数最小の BFS。状態 =(箱集合, プレイヤー到達可能領域の正規化位置)。
// デッドマス(そこに置かれた箱がどのゴールにも到達し得ないマス)を pull 到達性で
// 前計算し、押し込む手を探索から除外する — ゴールのないコーナー・壁沿い区間を包含する。

import type { Board, Dir, Level } from "./types";
import { DIRS } from "./types";

export type SolveStatus = "solved" | "unsolvable" | "budget-exceeded";

export interface SolveStats {
  /** 展開(キューから取り出して処理)した状態数 */
  readonly expanded: number;
  /** 生成した状態数(重複排除前) */
  readonly generated: number;
  readonly budget: number;
}

export interface SolveResult {
  readonly status: SolveStatus;
  /** solved のときのみ: LURD(移動=小文字 / 押し=大文字) */
  readonly solution?: string;
  readonly pushes?: number;
  readonly moves?: number;
  readonly stats: SolveStats;
}

export const DEFAULT_BUDGET = 200_000;

const DIR_LIST: readonly Dir[] = ["up", "down", "left", "right"];

function delta(board: Board, dir: Dir): number {
  return DIRS[dir].dy * board.width + DIRS[dir].dx;
}

/** 盤外に出ない移動か(index 一次元表現の折り返しを防ぐ) */
function stepOk(board: Board, from: number, dir: Dir): boolean {
  const x = from % board.width;
  const y = Math.floor(from / board.width);
  const nx = x + DIRS[dir].dx;
  const ny = y + DIRS[dir].dy;
  return nx >= 0 && nx < board.width && ny >= 0 && ny < board.height;
}

/**
 * デッドマス前計算(F-07)。
 * ゴール集合から「引き(pull)」で逆向きに到達可能なマスを求め、
 * 到達できない床マスをデッドとする。箱 s → s+d の押しには s-d(プレイヤー位置)と
 * s+d が床である必要があるため、逆向きには t から s = t-d を
 * 「s と s-d が床」のとき追加する。他の箱の存在は無視する楽観近似
 * (= 検出されるデッドは真にデッド)。
 */
export function computeDeadSquares(board: Board): ReadonlySet<number> {
  const live = new Set<number>(board.goals);
  const queue: number[] = [...board.goals];
  while (queue.length > 0) {
    const t = queue.pop()!;
    for (const dir of DIR_LIST) {
      // t = s + d となる s(d の逆方向の隣)
      if (!stepOk(board, t, opposite(dir))) continue;
      const s = t - delta(board, dir);
      if (board.walls[s] || live.has(s)) continue;
      if (!stepOk(board, s, opposite(dir))) continue;
      const playerPos = s - delta(board, dir);
      if (board.walls[playerPos]) continue;
      live.add(s);
      queue.push(s);
    }
  }
  const dead = new Set<number>();
  for (let i = 0; i < board.walls.length; i++) {
    if (!board.walls[i] && !live.has(i)) dead.add(i);
  }
  return dead;
}

function opposite(dir: Dir): Dir {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

/** boxes を除いた床をプレイヤーが移動できる範囲(flood fill)。戻り値[0] は最小 index(正規化位置) */
function reachable(
  board: Board,
  boxSet: ReadonlySet<number>,
  player: number,
): Set<number> {
  const seen = new Set<number>([player]);
  const queue = [player];
  while (queue.length > 0) {
    const p = queue.pop()!;
    for (const dir of DIR_LIST) {
      if (!stepOk(board, p, dir)) continue;
      const n = p + delta(board, dir);
      if (board.walls[n] || boxSet.has(n) || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

interface Node {
  boxes: readonly number[];
  player: number; // 実プレイヤー位置(経路復元用)
  parent: Node | null;
  /** この状態に至った押し: 箱の位置(押す前)と方向 */
  pushBox: number;
  pushDir: Dir | null;
}

function stateKey(boxes: readonly number[], normPlayer: number): string {
  return `${boxes.join(",")}|${normPlayer}`;
}

function allOnGoals(boxes: readonly number[], goalSet: ReadonlySet<number>): boolean {
  return boxes.every((b) => goalSet.has(b));
}

export function solve(
  level: Level,
  options?: { budget?: number },
): SolveResult {
  const board = level.board;
  const budget = options?.budget ?? DEFAULT_BUDGET;
  const goalSet = new Set(board.goals);
  const dead = computeDeadSquares(board);

  // 初期盤面で非ゴールの箱がデッドマスにある → 即 unsolvable
  const initialDead = level.boxes.some((b) => !goalSet.has(b) && dead.has(b));

  let expanded = 0;
  let generated = 1;
  const stats = () => ({ expanded, generated, budget });

  if (initialDead) {
    return { status: "unsolvable", stats: stats() };
  }

  const root: Node = {
    boxes: level.boxes,
    player: level.player,
    parent: null,
    pushBox: -1,
    pushDir: null,
  };
  const visited = new Set<string>();
  const queue: Node[] = [root];
  let head = 0;

  while (head < queue.length) {
    if (expanded >= budget) {
      return { status: "budget-exceeded", stats: stats() };
    }
    const node = queue[head++];
    expanded++;

    if (allOnGoals(node.boxes, goalSet)) {
      return reconstruct(level, node, stats());
    }

    const boxSet = new Set(node.boxes);
    const reach = reachable(board, boxSet, node.player);
    const normPlayer = Math.min(...reach);
    const key = stateKey(node.boxes, normPlayer);
    if (visited.has(key)) continue;
    visited.add(key);

    for (const b of node.boxes) {
      for (const dir of DIR_LIST) {
        if (!stepOk(board, b, dir) || !stepOk(board, b, opposite(dir))) continue;
        const target = b + delta(board, dir);
        const pushPos = b - delta(board, dir);
        if (board.walls[target] || boxSet.has(target)) continue;
        if (!goalSet.has(target) && dead.has(target)) continue; // デッドマス枝刈り
        if (!reach.has(pushPos)) continue;
        const boxes = node.boxes
          .map((x) => (x === b ? target : x))
          .sort((p, q) => p - q);
        generated++;
        queue.push({ boxes, player: b, parent: node, pushBox: b, pushDir: dir });
      }
    }
  }
  return { status: "unsolvable", stats: stats() };
}

/** 押し列から完全な LURD 手順を復元する(押し位置まではグリッド BFS の最短歩行) */
function reconstruct(level: Level, goalNode: Node, stats: SolveStats): SolveResult {
  const board = level.board;
  const chain: Node[] = [];
  for (let n: Node | null = goalNode; n; n = n.parent) chain.push(n);
  chain.reverse(); // root → goal

  let player = level.player;
  let boxes: readonly number[] = level.boxes;
  let solution = "";
  let pushes = 0;

  for (const node of chain) {
    if (node.pushDir === null) continue; // root
    const pushPos = node.pushBox - delta(board, node.pushDir);
    const walk = shortestWalk(board, new Set(boxes), player, pushPos);
    solution += walk;
    solution += DIRS[node.pushDir].letter.toUpperCase();
    pushes++;
    player = node.pushBox;
    boxes = node.boxes;
  }

  return {
    status: "solved",
    solution,
    pushes,
    moves: solution.length,
    stats,
  };
}

/** from → to の最短歩行(箱・壁を避ける)を小文字 LURD で返す */
function shortestWalk(
  board: Board,
  boxSet: ReadonlySet<number>,
  from: number,
  to: number,
): string {
  if (from === to) return "";
  const prev = new Map<number, { at: number; dir: Dir }>();
  const queue = [from];
  let head = 0;
  const seen = new Set<number>([from]);
  while (head < queue.length) {
    const p = queue[head++];
    for (const dir of DIR_LIST) {
      if (!stepOk(board, p, dir)) continue;
      const n = p + delta(board, dir);
      if (board.walls[n] || boxSet.has(n) || seen.has(n)) continue;
      seen.add(n);
      prev.set(n, { at: p, dir });
      if (n === to) {
        let path = "";
        let cur = to;
        while (cur !== from) {
          const e = prev.get(cur)!;
          path = DIRS[e.dir].letter + path;
          cur = e.at;
        }
        return path;
      }
      queue.push(n);
    }
  }
  // solver が到達可能と判定した位置のみ渡されるため、ここには来ない
  throw new Error("shortestWalk: unreachable target");
}
