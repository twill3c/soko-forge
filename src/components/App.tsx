"use client";

// soko-forge メイン UI(F-12..F-15)
// core は純関数なので、このコンポーネントが時間(setTimeout)とユーザー入力を注入する。

import { useEffect, useMemo, useState } from "react";
import { isSolved, move, newGame, reset, undo } from "@/core/engine";
import { generateLevel, type GeneratedLevel } from "@/core/generator";
import { parseLevel } from "@/core/parse";
import { computeDeadSquares, solve, type SolveResult } from "@/core/solver";
import type { Dir, GameState, Level } from "@/core/types";
import { LETTER_TO_DIR } from "@/core/types";
import { BUNDLED_LEVELS, type BundledLevel } from "@/lib/levels";
import { BoardView } from "./BoardView";

const KEYMAP: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

interface Playing {
  label: string;
  level: Level;
  /** 内蔵レベルなら index、生成レベルなら null */
  bundledIndex: number | null;
  meta: { difficulty: number; pushes: number } | null;
}

function loadBundled(index: number): Playing {
  const b: BundledLevel = BUNDLED_LEVELS[index];
  const r = parseLevel(b.text);
  if (!r.ok) throw new Error(`bundled level broken: ${b.id}`); // T-150 で保証済み
  return {
    label: `${b.id} ${b.name}`,
    level: r.level,
    bundledIndex: index,
    meta: { difficulty: b.difficulty, pushes: b.pushes },
  };
}

export function App() {
  const [playing, setPlaying] = useState<Playing>(() => loadBundled(0));
  const [game, setGame] = useState<GameState>(() => newGame(playing.level));
  const [showDead, setShowDead] = useState(false);
  const [solveRes, setSolveRes] = useState<SolveResult | null>(null);
  const [auto, setAuto] = useState<{ seq: string; pos: number } | null>(null);

  // 生成フォーム
  const [form, setForm] = useState({
    width: 8,
    height: 7,
    boxes: 2,
    pulls: 12,
    seed: 1,
  });
  const [genResult, setGenResult] = useState<GeneratedLevel | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const deadSquares = useMemo(
    () => (showDead ? computeDeadSquares(playing.level.board) : null),
    [showDead, playing.level],
  );

  const solved = isSolved(game);

  function startLevel(p: Playing) {
    setPlaying(p);
    setGame(newGame(p.level));
    setSolveRes(null);
    setAuto(null);
  }

  // キーボード操作(F-12)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (auto) return; // 自動再生中は手入力を無効化
      const dir = KEYMAP[e.key];
      if (dir) {
        e.preventDefault();
        setGame((g) => move(g, dir));
      } else if (e.key === "z" || e.key === "Z" || e.key === "u" || e.key === "U") {
        setGame((g) => undo(g));
      } else if (e.key === "r" || e.key === "R") {
        setGame((g) => reset(g));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [auto]);

  // ソルバー自動再生(F-14)
  useEffect(() => {
    if (!auto) return;
    if (auto.pos >= auto.seq.length) {
      setAuto(null);
      return;
    }
    const t = setTimeout(() => {
      const dir = LETTER_TO_DIR[auto.seq[auto.pos].toLowerCase()];
      if (dir) setGame((g) => move(g, dir));
      setAuto((a) => (a ? { ...a, pos: a.pos + 1 } : null));
    }, 200);
    return () => clearTimeout(t);
  }, [auto]);

  function runSolver() {
    const r = solve(playing.level);
    setSolveRes(r);
  }

  function playSolution() {
    if (!solveRes || solveRes.status !== "solved" || !solveRes.solution) return;
    setGame(newGame(playing.level));
    setAuto({ seq: solveRes.solution, pos: 0 });
  }

  function runGenerate() {
    const g = generateLevel(form);
    if (!g.ok) {
      setGenError(g.reason);
      setGenResult(null);
      return;
    }
    setGenError(null);
    setGenResult(g.result);
    startLevel({
      label: `生成 seed=${g.result.seed}`,
      level: g.result.level,
      bundledIndex: null,
      meta: { difficulty: g.result.difficulty, pushes: g.result.pushes },
    });
  }

  const nextIndex =
    playing.bundledIndex !== null && playing.bundledIndex + 1 < BUNDLED_LEVELS.length
      ? playing.bundledIndex + 1
      : null;

  return (
    <div className="app">
      <header>
        <h1>soko-forge</h1>
        <p className="tagline">
          倉庫番を「遊ぶ・解く・作る」— 生成レベルはすべてソルバー検証済み
        </p>
      </header>

      <div className="columns">
        {/* レベル選択(F-15) */}
        <aside className="panel">
          <h2>レベル選択</h2>
          <ul className="level-list">
            {BUNDLED_LEVELS.map((b, i) => (
              <li key={b.id}>
                <button
                  className={playing.bundledIndex === i ? "level active" : "level"}
                  onClick={() => startLevel(loadBundled(i))}
                >
                  <span className="level-name">
                    {b.id} {b.name}
                  </span>
                  <span className="level-meta">
                    {"★".repeat(b.difficulty)}
                    {"☆".repeat(5 - b.difficulty)} 最短 {b.pushes} 押し
                    {b.source === "generated" ? "・生成" : "・手作り"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <h2>レベル生成(F-13)</h2>
          <div className="gen-form">
            {(
              [
                ["width", "幅", 5, 16],
                ["height", "高さ", 4, 12],
                ["boxes", "箱", 1, 5],
                ["pulls", "引き回数", 4, 40],
                ["seed", "シード", 0, 999999],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({ ...form, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <button className="primary" onClick={runGenerate}>
              生成して遊ぶ
            </button>
            {genError && <p className="error">{genError}</p>}
            {genResult && (
              <p className="gen-info">
                seed={genResult.seed} / 難易度 {genResult.difficulty} / 最短{" "}
                {genResult.pushes} 押し(試行 {genResult.attempts} 回・探索{" "}
                {genResult.stats.expanded.toLocaleString()} 状態)
              </p>
            )}
          </div>
        </aside>

        {/* プレイ画面(F-12) */}
        <main className="panel play">
          <div className="play-head">
            <h2>{playing.label}</h2>
            <div className="counters">
              <span>手数 {game.moves}</span>
              <span>押し {game.pushes}</span>
              {playing.meta && <span>最短 {playing.meta.pushes} 押し</span>}
            </div>
          </div>

          <BoardView game={game} dead={deadSquares} />

          {solved && (
            <div className="clear-banner">
              🎉 クリア! {game.moves} 手 / {game.pushes} 押し
              {playing.meta && game.pushes === playing.meta.pushes && (
                <strong>(押し数最適!)</strong>
              )}
              {nextIndex !== null && (
                <button
                  className="primary"
                  onClick={() => startLevel(loadBundled(nextIndex))}
                >
                  次のレベルへ →
                </button>
              )}
            </div>
          )}

          <div className="controls">
            <button onClick={() => setGame((g) => undo(g))}>undo (Z)</button>
            <button onClick={() => setGame((g) => reset(g))}>reset (R)</button>
            <button onClick={() => setShowDead((v) => !v)}>
              {showDead ? "デッドマス非表示" : "デッドマス表示"}
            </button>
            <button onClick={runSolver}>ソルバーで解く</button>
            {solveRes?.status === "solved" && (
              <button className="primary" onClick={playSolution} disabled={!!auto}>
                {auto ? "再生中…" : "解を自動再生"}
              </button>
            )}
            {auto && <button onClick={() => setAuto(null)}>停止</button>}
          </div>

          {solveRes && (
            <div className="solve-info">
              {solveRes.status === "solved" ? (
                <>
                  <p>
                    最短 {solveRes.pushes} 押し / {solveRes.moves} 手(探索{" "}
                    {solveRes.stats.expanded.toLocaleString()} 状態)
                  </p>
                  <code className="lurd">{solveRes.solution}</code>
                </>
              ) : solveRes.status === "unsolvable" ? (
                <p className="error">この盤面は解けません(unsolvable)</p>
              ) : (
                <p className="error">
                  探索予算 {solveRes.stats.budget.toLocaleString()} 状態を超過
                  (budget-exceeded)
                </p>
              )}
            </div>
          )}

          <p className="help">
            矢印キー / WASD で移動。箱(■)をすべてゴール(◎)へ押し込む。
            Z=undo, R=reset。「デッドマス表示」はソルバーが枝刈りに使う
            「箱を置いたら詰むマス」の可視化。
          </p>
        </main>
      </div>
    </div>
  );
}
