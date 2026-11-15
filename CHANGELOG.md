# 変更履歴
## 1.0.8 — 2026-11-15

- 実行環境を Bun 1.4.4 以上に変更しました。npx・Node.js での起動には対応しなくなりました。MCP クライアントの登録は `"command": "bun"`、`"args": ["x", "--bun", "@kagayoi/app-publish-mcp@latest"]` へ書き換えてください（Google 認証は `bun x --bun @kagayoi/app-publish-mcp@latest auth google`）。
- 依存ライブラリ（googleapis・google-auth-library など）を更新し、MCP SDK が使う `@hono/node-server` の既知の脆弱性 2 件を解消しました。
- `llms.txt` のツール一覧に `apple_get_app_price_points` を追加し、`apple_set_price` の説明を現在の価格設定方式に合わせました。

## 1.0.7 — 2026-11-15

- `auth google` のメッセージと Google 認証のブラウザー画面を 9 言語（日本語・英語・簡体字中国語・繁体字中国語・韓国語・スペイン語・フランス語・ドイツ語・ブラジルポルトガル語）に対応し、`APP_PUBLISH_MCP_LANGUAGE` などで切り替えられるようにしました。MCP ツールの説明は英語のままです。
- README を英語版に合わせて 9 言語（`README.ja.md`・`README.zh-CN.md`・`README.zh-TW.md`・`README.ko.md`・`README.es.md`・`README.fr.md`・`README.de.md`・`README.pt-BR.md`）へ更新・追加し、`README.zh.md` を `README.zh-CN.md` へ改名しました。

## 1.0.6 — 2026-11-15

- App Store Connect の認証トークンの有効期限を19分にし、20分ちょうどで認証が拒否される問題を回避しました。
- smithery.yaml の起動引数を `--yes` 表記に揃え、固定版で登録済みの場合に起動引数を `@latest` へ書き換える移行案内を README（英語・日本語・韓国語・中国語）に追加しました。

## 1.0.5 — 2026-11-02

- 起動時にGoogle API全体を読み込まず、Android Publisher APIだけを読み込むよう改善しました。
- Appleスクリーンショットの分割アップロードで画像の重複読み込みを削減しました。
- Google商品の価格変換を共通化し、大きな金額の精度を維持しました。
- 認証情報の読み込みと依存関係を整理しました。


Git のバージョン記録・コミット差分と既存の変更履歴をもとに、確認できた版ごとの変更点をまとめています。「Git 記録日」は公開日ではありません。番号の欠番だけから未確認のリリースは補っていません。

## 未リリース

- Apple のツール応答から、入力に使われない JSON:API の `links`（リソースと関連ごとの URL）を除き、応答サイズを削減しました。ページングの `links.next` と `meta`、関連先の `data` は残ります。Google の応答は変わりません。
- Apple のツール応答で、審査用アカウントのパスワード（`demoAccountPassword`）を `<redacted>` に置き換え、会話に表示されないようにしました（値の有無は分かります）。
- 提出前に現状を確認できるよう、`apple_get_review_detail`（審査情報の取得。未作成は `exists: false`）と `apple_list_review_submissions`（審査提出の一覧、状態で絞り込み）を追加しました。
- TestFlight の内部配信に必要な操作として、`apple_add_build_to_beta_groups`・`apple_remove_build_from_beta_groups`（ビルドのベータグループへの追加・削除）、`apple_set_build_whats_new`（「テスト内容」の設定。locale が既にあれば更新、無ければ作成）、`apple_list_build_beta_localizations`（一覧）を追加しました。

## [1.0.4] — 2026-09-12

- 対応環境を Node.js 22 以上へ統一。Node.js 18・20 を使用している場合は、更新前に Node.js をアップグレードしてください。
- App Store の既存審査下書きを指定し、アプリ本体と購読などの項目をまとめて提出できるようにしました。
- 審査提出の応答が途切れても自動で取り消さず、同じ下書きIDで提出済み状態を確認できるようにしました。
- 下書きのアプリ・プラットフォーム・バージョンの不一致と空のIDを拒否し、意図しない提出を防ぎます。

## [1.0.3] — Git 記録日: 2026-09-01

- アプリ公開操作の安全性と対応機能を拡張する

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/2521cc27c17e2cf2ead09aedebf928b181755740) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/a9a95d85418bd4b4cdf3a9c1dee960061511c071...2521cc27c17e2cf2ead09aedebf928b181755740)。

## [1.0.2] — Git 記録日: 2026-09-01

- Docker の実行環境を Node.js 26 へ更新し、npm パッケージを公開。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/a9a95d85418bd4b4cdf3a9c1dee960061511c071) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/e0c6b88bd9ab9460feb71bd0701c46c83a82e4a1...a9a95d85418bd4b4cdf3a9c1dee960061511c071)。

## [1.0.1] — Git 記録日: 2026-08-09

- 画像MIME判定とリリース上書きガードを追加
- Google OAuth フローのESM互換性・Windows起動・権限を修正
- 価格設定・配信地域・スクリーンショットcommitを現行API仕様へ修正

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/e0c6b88bd9ab9460feb71bd0701c46c83a82e4a1) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/9749d8d352872321941e351c58dffb55fe93fa6b...e0c6b88bd9ab9460feb71bd0701c46c83a82e4a1)。

## [1.0.0] — Git 記録日: 2026-08-08

- パッケージバージョンを 1.0.0 へ変更。機能変更はありません。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/282d59a42b25240ba8732244245c88e6edb9cddc) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/95d958523a536486e28e3a44781e5b30fdce56e2...282d59a42b25240ba8732244245c88e6edb9cddc)。

## [0.4.1] — Git 記録日: 2026-08-06

- 上流の変更履歴。一回払い商品の更新パラメーターを型定義に対応させ、型検査を改善。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/9749d8d352872321941e351c58dffb55fe93fa6b) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/1bc6fab9539cf310e5ac8e0dcd6918d2cceb098f...9749d8d352872321941e351c58dffb55fe93fa6b)。

## [0.4.0] — Git 記録日: 2026-08-06

- 上流の変更履歴。googleapis を更新し、App Store Connect・Google Play の収益化ツールを追加。審査取り消し処理を修正。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/1bc6fab9539cf310e5ac8e0dcd6918d2cceb098f) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/282d59a42b25240ba8732244245c88e6edb9cddc...1bc6fab9539cf310e5ac8e0dcd6918d2cceb098f)。

## [0.3.4] — Git 記録日: 2026-08-08

- TypeScript、Node.js 型定義、Google API・認証ライブラリ、Zod を更新。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/95d958523a536486e28e3a44781e5b30fdce56e2) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/3d47672984a104c879239d928109654c57dc859e...95d958523a536486e28e3a44781e5b30fdce56e2)。

## [0.3.3] — Git 記録日: 2026-08-04

- create subscriptions + activate base plans (#3)

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/3d47672984a104c879239d928109654c57dc859e) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/6ba2255dfcd6b406096501cda440ccd26716bbc5...3d47672984a104c879239d928109654c57dc859e)。

## [0.3.2] — Git 記録日: 2026-08-04

- Apple の審査提出 API、Google Play のレビューページ取得を更新し、紹介動画の設定に対応。

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/6ba2255dfcd6b406096501cda440ccd26716bbc5) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/8e48b5d18844cfd034448f44dda017c8dc651080...6ba2255dfcd6b406096501cda440ccd26716bbc5)。

## [0.3.1] — Git 記録日: 2026-03-20

- bump version to 0.3.1 for MCP Registry publish
- add createSandboxServer for Smithery registry
- Add mcpName to package.json and server.json for official MCP Registry
- Add smithery.yaml for Smithery registry listing
- add agent-first distribution files (llms.txt, templates, when-to-use)

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/8e48b5d18844cfd034448f44dda017c8dc651080) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/8941d6e8127667443db274ace494de219fb216f8...8e48b5d18844cfd034448f44dda017c8dc651080)。

## [0.3.0] — Git 記録日: 2026-03-19

- add MCP prompts, resources, and MIT LICENSE for LobeHub compliance

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/8941d6e8127667443db274ace494de219fb216f8) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/2e3ec6819819af6639e89226038ff2d9eb18e952...8941d6e8127667443db274ace494de219fb216f8)。

## [0.2.0] — Git 記録日: 2026-03-19

- auth.js main() guard to prevent process.exit when imported
- add OAuth + auto-token auth for Google Play API
- add npm publish metadata (repository, files, engines)
- add 30 missing Apple API tools

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/2e3ec6819819af6639e89226038ff2d9eb18e952) / [変更差分](https://github.com/1llum1n4t1s/KG.app-publish-mcp/compare/3307466af5b6bc3653acc367a9a99ee53a7dfd5c...2e3ec6819819af6639e89226038ff2d9eb18e952)。

## [0.1.0] — Git 記録日: 2026-02-16

- implement unified MCP server for App Store Connect & Google Play

出典: [版の記録](https://github.com/1llum1n4t1s/KG.app-publish-mcp/commit/3307466af5b6bc3653acc367a9a99ee53a7dfd5c)。
