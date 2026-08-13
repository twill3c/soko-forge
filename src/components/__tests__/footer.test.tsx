// T-160: ライセンス表示(F-16)— Footer がフリート統一書式で MIT オープンソースであることを明示する
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer, REPO_URL } from "../Footer";

describe("T-160 ライセンス表示", () => {
  const html = () => renderToStaticMarkup(<Footer />);

  it("統一書式「MIT License © 2026 坂田哲朗 ・ GitHub」で表示する", () => {
    const text = html().replace(/<[^>]+>/g, "");
    expect(text).toContain("MIT License");
    expect(text).toContain("© 2026 坂田哲朗 ・ GitHub");
  });

  it("GitHub リポジトリと LICENSE 本文へのリンクを含む", () => {
    const h = html();
    expect(REPO_URL).toBe("https://github.com/twill3c/soko-forge");
    expect(h).toContain(`href="${REPO_URL}"`);
    expect(h).toContain(`href="${REPO_URL}/blob/main/LICENSE"`);
  });
});
