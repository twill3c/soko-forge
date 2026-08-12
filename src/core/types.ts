// 盤面・状態の型定義(F-01)
// マスは index = y * width + x の一次元表現。boxes / goals は昇順ソート済み index 配列。

export type Dir = "up" | "down" | "left" | "right";

/** 静的な盤面(壁とゴール)— ゲーム中は不変 */
export interface Board {
  readonly width: number;
  readonly height: number;
  /** index → 壁か */
  readonly walls: readonly boolean[];
  /** ゴールの index(昇順) */
  readonly goals: readonly number[];
}

/** パース済みレベル = 盤面 + 初期配置 */
export interface Level {
  readonly board: Board;
  /** 箱の index(昇順) */
  readonly boxes: readonly number[];
  readonly player: number;
}

export type ParseErrorKind =
  | "empty"
  | "no-player"
  | "multiple-players"
  | "box-goal-mismatch"
  | "invalid-char";

export interface ParseError {
  readonly kind: ParseErrorKind;
  readonly message: string;
}

export type ParseResult =
  | { readonly ok: true; readonly level: Level }
  | { readonly ok: false; readonly error: ParseError };

/** プレイ中のゲーム状態(イミュータブル)*/
export interface GameState {
  readonly board: Board;
  readonly initial: Level;
  readonly boxes: readonly number[];
  readonly player: number;
  readonly moves: number;
  readonly pushes: number;
  /** LURD 記法(移動=小文字 / 押し=大文字) */
  readonly record: string;
  /** undo 用スナップショット(直前の状態が末尾) */
  readonly history: readonly {
    readonly boxes: readonly number[];
    readonly player: number;
    readonly pushes: number;
  }[];
}

export const DIRS: Record<Dir, { dx: number; dy: number; letter: string }> = {
  up: { dx: 0, dy: -1, letter: "u" },
  down: { dx: 0, dy: 1, letter: "d" },
  left: { dx: -1, dy: 0, letter: "l" },
  right: { dx: 1, dy: 0, letter: "r" },
};

export const LETTER_TO_DIR: Record<string, Dir> = {
  u: "up",
  d: "down",
  l: "left",
  r: "right",
};
