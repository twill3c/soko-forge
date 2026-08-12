# HARNESS_CHANGELOG.md — ハーネス改訂台帳(soko-forge)

原則: **エージェントがミスをするたびに、そのミスが二度と起きないようハーネスを改良する。**
起票条件: 同一失敗コード累計 2 回(LL-10)、または severity S1(LL-12)。

各エントリは「どの失敗が、どの文書のどの改訂を生み、効いたかをどう確認するか」を 1 レコードで残す。

---

## HC-001

| 項目 | 内容 |
|---|---|
| 起票日 | 2026-08-13 |
| トリガー | `TOOL-MISUSE` × 2(loop_001: append のスキーマ違反引数 / loop_005: test_run の passed 誤記) |
| 診断 | looplog append の引数を記憶・目視で組み立てている。(1) 新イベント種別の必須フィールドを確認せず推測で渡した (2) テスト結果の数値をコマンド出力から転記せず記憶で書いた |
| 改訂 | AGENTS.md §2 に追記: 「looplog の新しいイベント種別を初めて使う前に `harness/looplog.py` の EVENT_SPECS を確認する」「`test_run` の passed/failed は直前のテスト出力の数値をそのまま転記する(記憶で書かない)」 |
| 種別 | agents_md(プロジェクト局所。再発が他プロジェクトでも見られたらレジストリ還流候補) |
| SCAFFOLD_VERSION | 変更なし(scaffold ブロック外の改訂) |
| 効果検証 | 以後 5 ループで TOOL-MISUSE 再発 0 件なら Closed |
| propagation | soko-forge ✅(他プロジェクトは還流判断待ち) |
| 状態 | Verifying |

## HC-002

| 項目 | 内容 |
|---|---|
| 起票日 | 2026-08-13 |
| トリガー | `TOOL-ENV` S2 × 1(loop_007)— デプロイ阻害のため個別起票 |
| 診断 | scaffold web-static プロファイルの vercel.json が `web/` サブディレクトリ前提で、ルート直下 Next.js の本プロジェクトでは Vercel ビルド不成立。managed file のため直接編集はドリフトになる |
| 改訂 | エスカレーション → 人間承認(2026-08-13): 正規経路でレジストリ改訂。harness-kit HC-011 / registry v1.8.0(vercel_json・check_links を project-owned へ再分類、scaffoldctl SC-06d 撤去掃除)。本プロジェクトは update 適用後、vercel.json / web/ を撤去(ルート構成では不要 — command-type 前例) |
| 種別 | tooling(fleet 還流 — harness-kit HC-011 参照) |
| SCAFFOLD_VERSION | 1.7.1 → 1.8.0 |
| 効果検証 | Vercel 本番公開の成功をもって Closed |
| propagation | soko-forge ✅ / 他プロジェクトは次回 update で自動掃除(HC-011 管理) |
| 状態 | Verifying |
