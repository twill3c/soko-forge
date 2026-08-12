// 標準 Sokoban テキスト記法のパース/シリアライズ(F-01)
//   # 壁 / 空白 床 / . ゴール / $ 箱 / * ゴール上の箱 / @ プレイヤー / + ゴール上のプレイヤー
// 非矩形入力は右パディング(床扱い)で矩形に正規化する。

import type { Level, ParseErrorKind, ParseResult } from "./types";

const VALID = new Set(["#", " ", ".", "$", "*", "@", "+"]);

export function parseLevel(text: string): ParseResult {
  const rawLines = text.replace(/\r/g, "").split("\n");
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === "") {
    rawLines.pop();
  }
  const lines = rawLines;
  const width = Math.max(0, ...lines.map((l) => l.length));
  const height = lines.length;
  if (width === 0 || height === 0 || lines.every((l) => l.trim() === "")) {
    return err("empty", "盤面が空です");
  }

  const walls: boolean[] = new Array(width * height).fill(false);
  const goals: number[] = [];
  const boxes: number[] = [];
  const players: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = x < lines[y].length ? lines[y][x] : " ";
      if (!VALID.has(ch)) {
        return err("invalid-char", `不正な文字 '${ch}'(${x},${y})`);
      }
      const i = y * width + x;
      if (ch === "#") walls[i] = true;
      if (ch === "." || ch === "*" || ch === "+") goals.push(i);
      if (ch === "$" || ch === "*") boxes.push(i);
      if (ch === "@" || ch === "+") players.push(i);
    }
  }

  if (players.length === 0) return err("no-player", "プレイヤーがいません");
  if (players.length > 1) {
    return err("multiple-players", `プレイヤーが ${players.length} 人います`);
  }
  if (boxes.length !== goals.length) {
    return err(
      "box-goal-mismatch",
      `箱 ${boxes.length} 個に対しゴール ${goals.length} 個です`,
    );
  }
  if (boxes.length === 0) {
    return err("empty", "箱がありません");
  }

  const level: Level = {
    board: { width, height, walls, goals: goals.sort((a, b) => a - b) },
    boxes: boxes.sort((a, b) => a - b),
    player: players[0],
  };
  return { ok: true, level };
}

function err(kind: ParseErrorKind, message: string): ParseResult {
  return { ok: false, error: { kind, message } };
}

/** レベルをテキスト記法へ(各行の右端空白はトリム)*/
export function serializeLevel(level: Level): string {
  const { width, height, walls, goals } = level.board;
  const goalSet = new Set(goals);
  const boxSet = new Set(level.boxes);
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (walls[i]) row += "#";
      else if (boxSet.has(i)) row += goalSet.has(i) ? "*" : "$";
      else if (level.player === i) row += goalSet.has(i) ? "+" : "@";
      else if (goalSet.has(i)) row += ".";
      else row += " ";
    }
    rows.push(row.replace(/ +$/, ""));
  }
  return rows.join("\n");
}
