// レベル生成器(F-09..F-11)— 逆再生(pull)方式
//
// 1 試行の流れ:
//   (1) 外周壁 + 内部ランダム障害物の盤面を作る
//   (2) ランダムな床マスにゴールを置き、その上に箱を置く(= 完成状態)
//   (3) プレイヤーを置き、「引き(pull)」をランダムに pulls 回適用して初期配置へ巻き戻す
//   (4) 得られた盤面をソルバーで検証し、solved かつ押し数 ≥ 1 でなければ棄却
// 乱数は mulberry32 を注入(同一シード → 同一レベル)。試行ごとにシードから
// 派生した独立ストリームを使うため、失敗しても後続試行は決定的に再現される。

import type { Board, Dir, Level } from "./types";
import { DIRS } from "./types";
import { mulberry32, pick, randInt, type Rng } from "./rng";
import { DEFAULT_BUDGET, solve, type SolveStats } from "./solver";

export interface GenerateOptions {
  /** 外周壁を含む盤面の幅・高さ */
  readonly width: number;
  readonly height: number;
  readonly boxes: number;
  /** 逆再生の引き回数(大きいほど初期配置が完成形から遠くなる) */
  readonly pulls: number;
  readonly seed: number;
  /** 採用する解の最短押し数の下限(既定 max(2, floor(pulls / 4)))。未満は自明として棄却(F-10) */
  readonly minPushes?: number;
  /** 棄却時の再試行上限(既定 50) */
  readonly maxAttempts?: number;
  /** ソルバー予算(既定 DEFAULT_BUDGET) */
  readonly budget?: number;
  /** 内部障害物の密度 0..1(既定 0.15) */
  readonly wallDensity?: number;
}

export interface GeneratedLevel {
  readonly level: Level;
  /** 検証に使った最短解(LURD) */
  readonly solution: string;
  readonly pushes: number;
  readonly moves: number;
  /** 難易度 1..5 */
  readonly difficulty: number;
  readonly stats: SolveStats;
  readonly seed: number;
  /** 成功までに要した試行回数(1 始まり) */
  readonly attempts: number;
}

export type GenerateResult =
  | { readonly ok: true; readonly result: GeneratedLevel }
  | { readonly ok: false; readonly reason: string };

const DIR_LIST: readonly Dir[] = ["up", "down", "left", "right"];

export function generateLevel(opts: GenerateOptions): GenerateResult {
  const maxAttempts = opts.maxAttempts ?? 50;
  const budget = opts.budget ?? DEFAULT_BUDGET;
  const minPushes = opts.minPushes ?? Math.max(2, Math.floor(opts.pulls / 4));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 試行ごとに独立した決定的ストリーム(失敗混じりでも再現可能)
    const rng = mulberry32(opts.seed * 100003 + attempt);
    const level = tryBuild(opts, rng);
    if (!level) continue;

    const solved = solve(level, { budget });
    if (solved.status !== "solved") continue;
    if ((solved.pushes ?? 0) < minPushes) continue; // 下限未満は自明として棄却(F-10)

    return {
      ok: true,
      result: {
        level,
        solution: solved.solution ?? "",
        pushes: solved.pushes ?? 0,
        moves: solved.moves ?? 0,
        difficulty: difficultyScore(
          solved.pushes ?? 0,
          opts.boxes,
          solved.stats.expanded,
        ),
        stats: solved.stats,
        seed: opts.seed,
        attempts: attempt,
      },
    };
  }
  return {
    ok: false,
    reason: `maxAttempts=${maxAttempts} 回の試行で検証済みレベルを生成できませんでした`,
  };
}

/** 1 試行分の盤面構築。引きが 1 回も成立しない等の早期失敗は null */
function tryBuild(opts: GenerateOptions, rng: Rng): Level | null {
  const { width, height } = opts;
  if (width < 5 || height < 4 || opts.boxes < 1) return null;

  // (1) 外周壁 + 内部障害物
  const walls: boolean[] = new Array(width * height).fill(false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const i = y * width + x;
      if (border) walls[i] = true;
      else if (rng() < (opts.wallDensity ?? 0.15)) walls[i] = true;
    }
  }
  const board: Board = { width, height, walls, goals: [] };
  const floors: number[] = [];
  for (let i = 0; i < walls.length; i++) if (!walls[i]) floors.push(i);
  if (floors.length < opts.boxes * 2 + 1) return null;

  // (2) ゴール = 完成状態の箱位置
  const goals = new Set<number>();
  while (goals.size < opts.boxes) {
    const g = pick(rng, floors);
    if (g === undefined) return null;
    goals.add(g);
  }
  let boxes = new Set<number>(goals);

  // (3) プレイヤー配置 → 引きの逆再生
  const playerStart = pick(
    rng,
    floors.filter((f) => !boxes.has(f)),
  );
  if (playerStart === undefined) return null;
  let player = playerStart;

  const delta = (dir: Dir) => DIRS[dir].dy * width + DIRS[dir].dx;
  const inBounds = (from: number, dir: Dir) => {
    const x = from % width;
    const y = Math.floor(from / width);
    const nx = x + DIRS[dir].dx;
    const ny = y + DIRS[dir].dy;
    return nx >= 0 && nx < width && ny >= 0 && ny < height;
  };

  let applied = 0;
  for (let step = 0; step < opts.pulls; step++) {
    // プレイヤーの現在到達可能領域を求める
    const reach = new Set<number>([player]);
    const queue = [player];
    while (queue.length > 0) {
      const p = queue.pop()!;
      for (const dir of DIR_LIST) {
        if (!inBounds(p, dir)) continue;
        const n = p + delta(dir);
        if (walls[n] || boxes.has(n) || reach.has(n)) continue;
        reach.add(n);
        queue.push(n);
      }
    }
    // 実行可能な引きを列挙: 箱 b の dir 側(t = b+dir)にプレイヤーが立て、
    // さらに 1 歩下がれる(t+dir が床)とき、箱を t へ引ける
    const pulls: { box: number; dir: Dir }[] = [];
    for (const b of boxes) {
      for (const dir of DIR_LIST) {
        if (!inBounds(b, dir)) continue;
        const t = b + delta(dir);
        if (walls[t] || boxes.has(t) || !reach.has(t)) continue;
        if (!inBounds(t, dir)) continue;
        const back = t + delta(dir);
        if (walls[back] || boxes.has(back)) continue;
        pulls.push({ box: b, dir });
      }
    }
    const chosen = pick(rng, pulls);
    if (!chosen) break; // 引けなくなったら打ち切り(検証で棄却される可能性はある)
    const t = chosen.box + delta(chosen.dir);
    boxes = new Set(boxes);
    boxes.delete(chosen.box);
    boxes.add(t);
    player = t + delta(chosen.dir);
    applied++;
  }
  if (applied === 0) return null; // 1 回も引けなければ自明(押し 0)確定

  return {
    board: { width, height, walls, goals: [...goals].sort((a, b) => a - b) },
    boxes: [...boxes].sort((a, b) => a - b),
    player,
  };
}

/**
 * 難易度スコア(F-11): 押し数・箱数・探索展開数の単調非減少な合成。
 * raw = pushes + 3(boxes-1) + 2·log10(expanded+1) を閾値で 1..5 に量子化する。
 */
export function difficultyScore(
  pushes: number,
  boxes: number,
  expanded: number,
): number {
  const raw = pushes + 3 * (boxes - 1) + 2 * Math.log10(expanded + 1);
  if (raw < 10) return 1;
  if (raw < 16) return 2;
  if (raw < 24) return 3;
  if (raw < 34) return 4;
  return 5;
}
