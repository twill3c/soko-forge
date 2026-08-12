# soko-forge

倉庫番(Sokoban)を「遊ぶ・解く・作る」ブラウザアプリ。
ハーネスエンジニアリング / ループエンジニアリングの実践課題として、
スペック駆動 + テスト先行 + ループ可観測性(loop-observability)で開発されている。

## 3 つの柱

| 柱 | 実装 | 保証 |
|---|---|---|
| エンジン | `src/core/engine.ts` | 純関数・イミュータブル。LURD リプレイが逐次操作と厳密一致(T-040) |
| ソルバー | `src/core/solver.ts` | BFS で**押し数最小**の解。デッドマス枝刈り・探索予算付き 3 値結果(T-100..T-120) |
| 生成器 | `src/core/generator.ts` | 逆再生(pull)方式 + シード PRNG 注入。**生成レベルは必ずソルバーで検証**され、解けないレベルは出荷されない(T-140..T-144) |

内蔵レベル(`data/levels.json`)は `npm run gen:levels` がソルバー検証付きで生成し、
テスト(T-150/T-151)が独立に再計算して出荷を守る。

## コマンド

```bash
npm run dev           # 開発サーバ
npm run verify        # 品質ゲート: typecheck + lint + test(coverage 閾値)+ build
npm run gen:levels    # 内蔵レベルの再生成(ソルバー検証付き)
```

## ハーネス

- 正本ルール: `AGENTS.md`(7 段階ループプロトコル・品質ゲート・変更禁止領域)
- 仕様の正本: `SPEC.md` / テストの正本: `TEST_SPEC.md`
- ループログ: `logs/loops/*.jsonl`(append-only、`python harness/looplog.py validate` が完了条件)
- 失敗 → ハーネス改良の台帳: `HARNESS_CHANGELOG.md`
