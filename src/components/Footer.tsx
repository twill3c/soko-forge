// ライセンス表示フッター(F-16)— 全ページに MIT オープンソースであることを明示する
export const REPO_URL = "https://github.com/twill3c/soko-forge";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
          MIT License
        </a>{" "}
        © 2026 坂田哲朗 ・{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>{" "}
        ・{" "}
        <a
          href="https://claude.ai/code/artifact/306c15d9-e034-476f-8318-f023ccb66613"
          target="_blank"
          rel="noreferrer"
        >
          遊ぶ・解く・作るのしくみ
        </a>{" "}
        ・{" "}
        <a
          href="https://claude.ai/code/artifact/56666318-1231-4e4e-b543-43557598edfb"
          target="_blank"
          rel="noreferrer"
        >
          soko-forge アーキテクチャ
        </a>{" "}
        ・{" "}
        <a href="https://app-menu-amber.vercel.app" target="_blank" rel="noopener">
          App Menu
        </a>
      </p>
    </footer>
  );
}
