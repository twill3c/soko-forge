// T-090: src/core の純度の静的検査(N-01)
// core は React / Next / DOM / 時刻 / 直接乱数に依存しない。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_DIR = join(__dirname, "..");

const FORBIDDEN: { pattern: RegExp; label: string }[] = [
  { pattern: /from\s+["']react["']/, label: "react import" },
  { pattern: /from\s+["']next\b/, label: "next import" },
  { pattern: /\bdocument\./, label: "DOM (document)" },
  { pattern: /\bwindow\./, label: "DOM (window)" },
  { pattern: /\bDate\.now\s*\(/, label: "Date.now()" },
  { pattern: /\bMath\.random\s*\(/, label: "Math.random()" },
  { pattern: /from\s+["']node:/, label: "Node API import" },
  { pattern: /from\s+["']@\/(app|components|lib)/, label: "上位レイヤ import" },
];

describe("T-090 core 純度", () => {
  it("src/core 直下の実装ファイルに禁止参照がない", () => {
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(join(CORE_DIR, f), "utf8");
      for (const { pattern, label } of FORBIDDEN) {
        expect(pattern.test(src), `${f}: ${label} を含む`).toBe(false);
      }
    }
  });
});
