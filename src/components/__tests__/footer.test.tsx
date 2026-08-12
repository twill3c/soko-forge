// T-160: ライセンス表示(F-16)— Footer が MIT オープンソースであることを明示する
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer, REPO_URL } from "../Footer";

describe("T-160 ライセンス表示", () => {
  const html = () => renderToStaticMarkup(<Footer />);

  it("「MIT License」を含む", () => {
    expect(html()).toContain("MIT License");
  });

  it("著作権者表記が LICENSE と同一", () => {
    expect(html()).toContain("坂田哲朗 (Tetsuro Sakata)");
  });

  it("GitHub リポジトリと LICENSE 本文へのリンクを含む", () => {
    const h = html();
    expect(REPO_URL).toBe("https://github.com/twill3c/soko-forge");
    expect(h).toContain(`href="${REPO_URL}"`);
    expect(h).toContain(`href="${REPO_URL}/blob/main/LICENSE"`);
  });
});
