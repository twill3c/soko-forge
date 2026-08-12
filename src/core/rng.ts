// シード付き PRNG(F-09)— core 内で Math.random を呼ばないための注入用実装。
// mulberry32: 32bit 状態の高速 PRNG。同一シード → 同一列(決定性)。

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [0, n) の整数 */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** 配列から 1 要素(空配列は undefined) */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randInt(rng, items.length)];
}
