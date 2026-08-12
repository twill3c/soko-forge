// 盤面描画(表示専用)— ロジックは持たない
import type { GameState } from "@/core/types";

export function BoardView({
  game,
  dead,
}: {
  game: GameState;
  dead: ReadonlySet<number> | null;
}) {
  const { board } = game;
  const goalSet = new Set(board.goals);
  const boxSet = new Set(game.boxes);
  const cells = [];
  for (let i = 0; i < board.width * board.height; i++) {
    const isWall = board.walls[i];
    const isGoal = goalSet.has(i);
    const isBox = boxSet.has(i);
    const isPlayer = game.player === i;
    let cls = "cell";
    if (isWall) cls += " wall";
    else {
      cls += " floor";
      if (isGoal) cls += " goal";
      if (dead?.has(i)) cls += " dead";
    }
    cells.push(
      <div key={i} className={cls}>
        {isBox && <div className={isGoal ? "box on-goal" : "box"} />}
        {isPlayer && <div className="player" />}
        {!isWall && isGoal && !isBox && !isPlayer && <div className="goal-dot" />}
      </div>,
    );
  }
  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${board.width}, var(--cell))` }}
    >
      {cells}
    </div>
  );
}
