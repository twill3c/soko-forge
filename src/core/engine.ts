// ゲームエンジン: 移動・箱押し・クリア判定・undo/reset・LURD リプレイ(F-02..F-05)
// すべて純関数。ブロックされた操作は「同一オブジェクト」を返す(参照比較で不変を検査できる)。

import type { Board, Dir, GameState, Level } from "./types";
import { DIRS, LETTER_TO_DIR } from "./types";

export function newGame(level: Level): GameState {
  return {
    board: level.board,
    initial: level,
    boxes: level.boxes,
    player: level.player,
    moves: 0,
    pushes: 0,
    record: "",
    history: [],
  };
}

/** dir 方向の隣接 index。盤外なら -1 */
export function neighbor(board: Board, index: number, dir: Dir): number {
  const { width, height } = board;
  const x = index % width;
  const y = Math.floor(index / width);
  const nx = x + DIRS[dir].dx;
  const ny = y + DIRS[dir].dy;
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) return -1;
  return ny * width + nx;
}

export function move(state: GameState, dir: Dir): GameState {
  const { board } = state;
  const target = neighbor(board, state.player, dir);
  if (target < 0 || board.walls[target]) return state;

  const boxAt = state.boxes.includes(target);
  let boxes = state.boxes;
  let push = false;

  if (boxAt) {
    const beyond = neighbor(board, target, dir);
    if (beyond < 0 || board.walls[beyond] || state.boxes.includes(beyond)) {
      return state;
    }
    boxes = state.boxes
      .map((b) => (b === target ? beyond : b))
      .sort((a, b) => a - b);
    push = true;
  }

  const letter = DIRS[dir].letter;
  return {
    ...state,
    boxes,
    player: target,
    moves: state.moves + 1,
    pushes: state.pushes + (push ? 1 : 0),
    record: state.record + (push ? letter.toUpperCase() : letter),
    history: [
      ...state.history,
      { boxes: state.boxes, player: state.player, pushes: state.pushes },
    ],
  };
}

export function undo(state: GameState): GameState {
  if (state.history.length === 0) return state;
  const prev = state.history[state.history.length - 1];
  return {
    ...state,
    boxes: prev.boxes,
    player: prev.player,
    moves: state.moves - 1,
    pushes: prev.pushes,
    record: state.record.slice(0, -1),
    history: state.history.slice(0, -1),
  };
}

export function reset(state: GameState): GameState {
  return newGame(state.initial);
}

export function isSolved(state: GameState): boolean {
  const goalSet = new Set(state.board.goals);
  return state.boxes.every((b) => goalSet.has(b));
}

/** LURD 文字列を逐次適用(大文字小文字は方向として等価)。不正文字は無視する */
export function applyMoves(state: GameState, lurd: string): GameState {
  let s = state;
  for (const ch of lurd) {
    const dir = LETTER_TO_DIR[ch.toLowerCase()];
    if (dir) s = move(s, dir);
  }
  return s;
}
