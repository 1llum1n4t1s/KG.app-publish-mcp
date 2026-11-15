[English](README.md) | **日本語** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

**App Store Connect** と **Google Play Console** のための統合 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) サーバーです。アプリのストア掲載情報、スクリーンショット、リリース、レビュー、審査提出まで、すべて AI アシスタントから管理できます。

## 利用シーン

**Node.js 22 以降**が必要です。古いランタイムを使っている場合は、インストールや更新の前に
Node.js をアップグレードしてください。

この MCP は次のような場面で使います。

- **「App Store の説明文とキーワードを更新したい」** — バージョンのローカライズ情報、アプリ情報のローカライズ情報を変更
- **「iPhone 16 Pro 用の新しいスクリーンショットをアップロードしたい」** — スクリーンショットセットを作成して画像をアップロード
- **「新しいバージョンを審査に提出したい」** — バージョン作成、ビルドの割り当て、審査情報の設定、提出
- **「アプリの審査状況を確認したい」** — バージョンを一覧表示して審査状態を確認
- **「Google Play のユーザーレビューに返信したい」** — レビューを一覧表示して返信
- **「Google Play で段階的リリースを行いたい」** — edit を作成し、トラックにリリースを作成してコミット
- **「TestFlight のベータテスターを管理したい」** — グループの作成、テスターの招待、アクセス管理
- **「アプリ内課金を設定したい」** — 両プラットフォームでアプリ内課金とサブスクリプショングループを作成・管理
- **「開発用の新しいデバイスを登録したい」** — デバイス、証明書、プロビジョニングプロファイルを管理

## 機能

### Apple App Store Connect (71 ツール)
| カテゴリ | ツール |
|----------|-------|
| アプリ管理 | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Bundle ID の Capability | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| バージョン | `apple_list_versions`, `apple_create_version` |
| バージョンのローカライズ | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| アプリ情報のローカライズ | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| スクリーンショット | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| ビルド | `apple_list_builds`, `apple_assign_build` |
| 年齢制限 | `apple_get_age_rating`, `apple_update_age_rating` |
| 審査情報 | `apple_update_review_detail` |
| 審査提出 | `apple_submit_for_review`, `apple_cancel_submission` |
| 価格設定 | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| カスタマーレビュー | `apple_list_reviews`, `apple_respond_to_review` |
| 証明書 | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| プロビジョニングプロファイル | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| デバイス | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| TestFlight ベータグループ | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| TestFlight ベータテスター | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| アプリ内課金 | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| サブスクリプショングループ | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| アクセシビリティ宣言 | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| 価格ポイント | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| オファーコード | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| ウィンバックオファー | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (47 ツール)
| カテゴリ | ツール |
|----------|-------|
| Edit のライフサイクル | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play App Signing³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| アプリの詳細 | `google_get_details`, `google_update_details` |
| ストア掲載情報 | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| 国別の提供状況 | `google_get_country_availability` |
| テスター | `google_get_testers`, `google_update_testers` |
| 画像 | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| トラックとリリース | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| バンドル / APK | `google_upload_bundle`, `google_upload_apk` |
| レビュー¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| アプリ内商品 | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| サブスクリプション | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| 単発商品² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Play Console 上では表示されているレビューがあるのに `google_list_reviews` が空の配列を返す場合は、まず連携しているサービスアカウントに **「レビューへの返信」** アカウント権限（Play Console → ユーザーと権限）があるか確認してください。権限が不足していてもこの API は専用のエラーを返さず、単に結果が空になります。また、このエンドポイントが返すのは最近のレビューのみです。さらに取得するには `pageToken` でページ送りしてください。

² 単発商品（`monetization.onetimeproducts`）は、購入・レンタル向けの商品を扱う Google Play の新しい購入モデルで、従来の `inappproducts` API とは別のものです。`google_create_one_time_product` は既存の商品 ID を拒否します。更新には `google_update_one_time_product` を使ってください。購入オプションはデフォルトで有効な状態で作成されます。商品を削除せずに販売を止めるには `google_deactivate_purchase_option` を使います。

³ Play App Signing ツールが対応するのは、自己ホスト型の Google Cloud KMS 鍵を使うエンタープライズアプリのみです。Google 管理の標準的な署名の登録とローテーションは、引き続き Play Console での操作になります。

### プロンプト (2)
| プロンプト | 説明 |
|--------|-------------|
| `app_release_checklist` | アプリのアップデートをリリースするためのガイド付きチェックリスト — iOS や Android のバージョン作成、メタデータ、ビルドの割り当て、審査提出までを順に案内します |
| `app_store_optimization` | 現在のストア掲載メタデータ（タイトル、説明、キーワード、スクリーンショット、ローカライズ）を確認し、実行しやすい改善案を示す ASO 監査 |

### リソース (2)
| URI | 説明 |
|-----|-------------|
| `app-publish://config` | 現在のサーバー設定 — 接続済みアカウント、認証方式、ツール数 |
| `app-publish://supported-platforms` | 対応する全ツールをプラットフォーム別にまとめ、説明を付けたもの |

## セットアップ

### 1. npm から実行

ローカルへの clone やインストールは不要です。以下の MCP クライアント設定により、`npx` で npm の最新リリースが実行されます。

すでにバージョンを固定して（例: `@kagayoi/app-publish-mcp@1.0.5`）サーバーを登録している場合は、その登録内のパッケージ引数を `@kagayoi/app-publish-mcp@latest` に変更してください。この README を更新しても既存の登録は変わりませんが、上記の変更後は起動のたびに自動で最新リリースが使われます。

Node.js の代わりに Bun で実行するには、`bunx --bun` と同じパッケージ名を使います。

```sh
bunx --bun @kagayoi/app-publish-mcp@latest
```

MCP クライアントの設定では、コマンドに `bunx`、引数に
`["--bun", "@kagayoi/app-publish-mcp@latest"]` を指定します。

### 2. Apple の認証情報

1. [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api) を開く
2. **App Manager** ロールで API キーを作成する
3. `.p8` ファイルをダウンロードする
4. **Key ID** と **Issuer ID** を控える

### 3. Google の認証情報

サービスアカウントか OAuth のどちらかを選びます。Apple のみ、または Google のみの設定も可能です。
使わないプラットフォームの認証情報用変数は設定しないでください。

**サービスアカウント:**

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. **Google Play Android Developer API** を有効にする
3. **サービスアカウント**を作成し、JSON キーをダウンロードする
4. Google Play Console の **設定 > API アクセス** で、サービスアカウントにアクセス権を付与する

**OAuth:** Google Cloud Console でデスクトップアプリ用の OAuth クライアントを作成し、
ターミナルの環境変数に `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を設定してから、次を実行します。

```sh
npx --yes @kagayoi/app-publish-mcp@latest auth google
```

Bun を使う場合は、代わりに `bunx --bun @kagayoi/app-publish-mcp@latest auth google` を実行します。

ブラウザでのサインインは同じコンピューターで完了させてください。このコマンドは
`127.0.0.1:19847` で待ち受け、認証情報を `~/.app-publish-mcp/google.json` に保存します。
読み込ませるには MCP サーバーを再起動します。別の方法として、
`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN` の 3 つの変数をすべてサーバーに渡すこともできます。
サービスアカウントは OAuth より優先され、完全な OAuth 環境変数は保存済みの認証情報より
優先されます。OAuth の環境変数が不完全な場合でも、保存済みの認証情報は読み込まれます。

`auth google` が表示するメッセージとブラウザのサインインページは、お使いの言語
（日本語、英語、簡体字中国語、繁体字中国語、韓国語、スペイン語、フランス語、ドイツ語、ブラジルのポルトガル語）で表示されます。
コマンドラインでは `APP_PUBLISH_MCP_LANGUAGE`、次に `LC_ALL`、`LC_MESSAGES`、`LANG`、
OS のロケールの順に参照します。言語を明示的に選ぶには `APP_PUBLISH_MCP_LANGUAGE`
（例: `ja` や `pt-BR`）を設定してください。ブラウザのページはブラウザの `Accept-Language` に従います。
AI アシスタントに返される MCP ツールの説明とエラーは英語のままで、
`locale` や `languageCode` などストア掲載情報の言語は API の引数であるため、この設定では変わりません。

### 4. Claude Code に追加

[Claude Code の MCP ドキュメント](https://code.claude.com/docs/en/mcp)に従い、
プロジェクトルートの `.mcp.json` に次の設定を追加します。
`${...}` の項目は、Claude Code を起動した環境から認証情報を読み取ります。
使わないプラットフォームや認証方式の項目は削除してください。

```json
{
  "mcpServers": {
    "app-publish-mcp": {
      "command": "npx",
      "args": ["--yes", "@kagayoi/app-publish-mcp@latest"],
      "env": {
        "APPLE_KEY_ID": "${APPLE_KEY_ID}",
        "APPLE_ISSUER_ID": "${APPLE_ISSUER_ID}",
        "APPLE_P8_PATH": "${APPLE_P8_PATH}",
        "GOOGLE_SERVICE_ACCOUNT_PATH": "${GOOGLE_SERVICE_ACCOUNT_PATH}"
      }
    }
  }
}
```

## 使用例

### iOS アプリのアップデートを提出する

```
1. apple_list_apps → アプリ ID を取得
2. apple_create_version → バージョン 1.1.0 を作成
3. apple_list_version_localizations → ローカライズ ID を取得
4. apple_update_version_localization → whatsNew と description を設定
5. apple_list_builds → アップロード済みのビルドを探す
6. apple_assign_build → ビルドをバージョンに紐付け
7. apple_update_review_detail → 審査担当者向けの連絡先を設定
8. apple_submit_for_review → 提出!
```

App Store Connect で審査提出をすでに準備している場合（たとえば、アプリのバージョンとサブスクリプションを
まとめたもの）は、`appId`、`versionId`、`platform` に加えて、その `submissionId` を
`apple_submit_for_review` に渡してください。このツールはアプリ、プラットフォーム、紐付けられたバージョンを検証したうえで、
**既存の提出に含まれるすべての項目**を置き換えずにそのまま提出します。`submissionId` を指定しない場合は、
アプリのバージョンだけを含む新しい提出を作成します。

最後の提出リクエストが失敗またはタイムアウトした場合、ツールは提出を保持したままその ID を報告します。
Apple がリクエストを受理している可能性があるためです。同じ `submissionId` で再試行する前に、
App Store Connect で状態を確認してください。応答が得られなかったことを埋め合わせるために、
新しい提出を作成したり、受理済みの審査を取り消したりしないでください。
`WAITING_FOR_REVIEW` または `IN_REVIEW` の状態にある一致する提出を再試行した場合は、
再提出せずに現在の状態を返します。

### Android アプリをリリースする

```
1. google_create_edit → edit セッションを開始
2. google_update_details → 連絡先情報を更新
3. google_update_listing → ストア掲載情報を更新
4. google_upload_bundle → .aab ファイルをアップロード
5. google_create_release → 本番トラックにドラフトリリースを作成（versionCodes は必須。公開するには status を明示的に設定）
6. google_validate_edit → エラーを確認
7. google_commit_edit → 変更を公開
```

### Google Play のアプリ内商品を管理する

```
1. google_list_iap → すべての商品を一覧表示
2. google_create_iap → 新しい管理対象商品を作成
3. google_update_iap → 価格や説明を更新
4. google_delete_iap → 商品を削除
```

### Google Play のサブスクリプションを作成する

```
1. google_create_subscription → 掲載情報とベースプラン（課金期間、猶予期間、
   マイクロ単位の地域別価格）を指定してサブスクリプションを作成。
   ベースプランは DRAFT 状態で作成されます。
2. google_activate_subscription_base_plan → ベースプランを ACTIVE にして、
   Play ストアで購入できるようにする。
3. google_deactivate_subscription_base_plan → プランを削除せずに
   販売を一時停止する。
4. google_archive_subscription → 提供を終了したらサブスクリプションをアーカイブする。
```

`google_create_subscription` の引数の例:

```jsonc
{
  "packageName": "com.example.app",
  "productId": "com.example.app.pro_monthly",
  "listings": [
    {
      "languageCode": "en-US",
      "title": "Pro Monthly",
      "description": "Unlock all premium features.",
      "benefits": ["Ad-free", "Cloud sync", "Priority support"]
    }
  ],
  "basePlans": [
    {
      "basePlanId": "pro-monthly",
      "autoRenewing": {
        "billingPeriodDuration": "P1M",
        "gracePeriodDuration": "P3D",
        "accountHoldDuration": "P30D"
      },
      "regionalConfigs": [
        { "regionCode": "US", "priceMicros": "3990000", "currency": "USD" },
        { "regionCode": "TR", "priceMicros": "99000000", "currency": "TRY" }
      ]
    }
  ]
}
```

価格は**マイクロ単位**（1 USD = 1,000,000 マイクロ）で指定し、内部で Play API の
`Money` 形式（`units` + `nanos`）に変換されます。`regionsVersion` の
デフォルトは `2022/02` で、地域別価格を指定する場合に Play API が現在これを必須としています。

## ライセンス

MIT
