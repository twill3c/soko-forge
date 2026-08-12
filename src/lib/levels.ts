// 内蔵レベル(data/levels.json)の型付きアクセサ(F-15)
import levelsJson from "../../data/levels.json";

export interface BundledLevel {
  readonly id: string;
  readonly name: string;
  readonly source: "handcrafted" | "generated";
  readonly seed: number | null;
  readonly text: string;
  readonly pushes: number;
  readonly moves: number;
  readonly difficulty: number;
}

export const BUNDLED_LEVELS: readonly BundledLevel[] = (
  levelsJson as { levels: BundledLevel[] }
).levels;
