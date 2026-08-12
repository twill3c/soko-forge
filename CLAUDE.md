# CLAUDE.md

@AGENTS.md

上記ハーネスがこのリポジトリの正本ルール。要点のみ再掲する:

- 仕様の正本は SPEC.md、内蔵レベルの正本は `data/levels.json`。
  変更は スペック → テスト → 実装(データ)の順。
- すべてのタスクは 7 段階ループプロトコル(AGENTS.md 末尾の共通規律)で進め、
  `python harness/looplog.py append` で `logs/loops/{loop_id}.jsonl` に記録する。
  失敗は気づいた瞬間に FAILURE_TAXONOMY のコード付きで記録する。
- 完了条件は `npm run verify` green + `looplog.py validate` 合格。
- `src/core` は純関数のみ(乱数はシード付き PRNG を注入)・カバレッジ 90% 以上を維持。
- 生成レベルは必ずソルバーで検証(F-10)。解けないレベルを出荷しない。
- scaffold ブロック(AGENTS.md 末尾)と `.wt/gate.json` の上限は直接編集しない。
