// T-000: プロジェクトメタが core から取得できる(環境疎通のスモーク)
import { describe, expect, it } from "vitest";
import { APP_NAME } from "../meta";

describe("T-000 meta", () => {
  it("APP_NAME が soko-forge", () => {
    expect(APP_NAME).toBe("soko-forge");
  });
});
