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
        </a>
      </p>
    </footer>
  );
}
