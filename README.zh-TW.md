[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

統一的 [MCP（Model Context Protocol，模型上下文協定）](https://modelcontextprotocol.io)伺服器，同時支援 **App Store Connect** 與 **Google Play Console**。你可以直接在 AI 助理中管理應用程式商店資訊、螢幕截圖、發布、評論與送審。

## 適用情境

需要 **Node.js 22 或更新版本**。若目前的執行環境版本較舊，請先升級 Node.js，
再進行安裝或更新。

在下列情況下可以使用此 MCP：

- **「更新我的應用程式在 App Store 上的描述與關鍵字」** — 修改版本在地化、App 資訊在地化
- **「為 iPhone 16 Pro 上傳新的螢幕截圖」** — 建立螢幕截圖集並上傳圖片
- **「提交新版本以供審查」** — 建立版本、指派建置版本、設定審查資訊並送審
- **「查看我的應用程式審查狀態」** — 列出版本並查看審查狀態
- **「回覆 Google Play 上的使用者評論」** — 列出評論並回覆
- **「在 Google Play 上建立分階段發布」** — 建立編輯、在軌道上建立發布、提交
- **「管理 TestFlight 測試人員」** — 建立測試群組、邀請測試人員、管理存取權限
- **「設定應用程式內購買」** — 在兩個平台上建立並管理應用程式內購買與訂閱群組
- **「註冊新的開發裝置」** — 管理裝置、憑證與佈建描述檔

## 功能特色

### Apple App Store Connect（71 個工具）
| 類別 | 工具 |
|----------|-------|
| 應用程式管理 | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Bundle ID 功能 | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| 版本 | `apple_list_versions`, `apple_create_version` |
| 版本在地化 | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| App 資訊在地化 | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| 螢幕截圖 | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| 建置版本 | `apple_list_builds`, `apple_assign_build` |
| 年齡分級 | `apple_get_age_rating`, `apple_update_age_rating` |
| 審查資訊 | `apple_update_review_detail` |
| 送審 | `apple_submit_for_review`, `apple_cancel_submission` |
| 定價 | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| 使用者評論 | `apple_list_reviews`, `apple_respond_to_review` |
| 憑證 | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| 佈建描述檔 | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| 裝置 | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| TestFlight 測試群組 | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| TestFlight 測試人員 | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| 應用程式內購買 | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| 訂閱群組 | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| 輔助使用聲明 | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| 價格點 | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| 優惠碼 | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| 贏回優惠 | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console（47 個工具）
| 類別 | 工具 |
|----------|-------|
| 編輯生命週期 | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play 應用程式簽署³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| 應用程式詳細資料 | `google_get_details`, `google_update_details` |
| 商店資訊 | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| 國家/地區供應情形 | `google_get_country_availability` |
| 測試人員 | `google_get_testers`, `google_update_testers` |
| 圖片 | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| 軌道與發布 | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| 評論¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| 應用程式內商品 | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| 訂閱 | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| 一次性商品² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ 如果 Play Console 中看得到評論，但 `google_list_reviews` 對該應用程式回傳空陣列，請先檢查所連結的服務帳戶是否具備 **「回覆評論」** 帳戶權限（Play Console → 使用者和權限）——缺少該權限時 API 不會回報明確的錯誤，只會回傳空結果。另請注意，此端點只會顯示近期的評論；可使用 `pageToken` 翻頁取得更多評論。

² 一次性商品（`monetization.onetimeproducts`）是 Google Play 較新的購買模型，適用於買斷/租借類商品，有別於舊版的 `inappproducts` API。`google_create_one_time_product` 會拒絕已存在的商品 ID；更新請使用 `google_update_one_time_product`。購買選項預設以啟用狀態建立；若要下架而不刪除商品，請使用 `google_deactivate_purchase_option`。

³ Play 應用程式簽署工具僅支援使用自行代管 Google Cloud KMS 金鑰的企業應用程式。標準的 Google 代管簽署註冊與金鑰輪替仍須在 Play Console 中操作。

### 提示詞（2 個）
| 提示詞 | 說明 |
|--------|-------------|
| `app_release_checklist` | 應用程式更新發布的引導式檢查清單 — 逐步完成 iOS 和/或 Android 的版本建立、中繼資料、建置版本指派與送審 |
| `app_store_optimization` | ASO 稽核 — 檢視目前的商店資訊中繼資料（標題、描述、關鍵字、螢幕截圖、在地化），並提出可執行的改善建議 |

### 資源（2 個）
| URI | 說明 |
|-----|-------------|
| `app-publish://config` | 目前的伺服器設定 — 已連線的帳戶、驗證方式、工具數量 |
| `app-publish://supported-platforms` | 依平台分組的所有支援工具及其說明 |

## 設定

### 1. 從 npm 執行

不需要本機複製或安裝。下方的 MCP 用戶端設定會透過 `npx` 執行 npm 上的最新版本。

如果你已經以固定版本（例如 `@kagayoi/app-publish-mcp@1.0.5`）註冊了此伺服器，請將註冊資訊中的套件參數改為 `@kagayoi/app-publish-mcp@latest`。更新本 README 不會變更既有的註冊資訊，但修改之後，每次啟動都會自動使用最新版本。

若要改用 Bun 而非 Node.js 執行，請使用 `bunx --bun` 與相同的套件名稱：

```sh
bunx --bun @kagayoi/app-publish-mcp@latest
```

在 MCP 用戶端設定中，將 `bunx` 作為指令，並將
`["--bun", "@kagayoi/app-publish-mcp@latest"]` 作為其引數。

### 2. Apple 憑證

1. 前往 [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. 建立具有 **App Manager** 角色的 API Key
3. 下載 `.p8` 檔案
4. 記下 **Key ID** 與 **Issuer ID**

### 3. Google 憑證

可選擇服務帳戶或 OAuth。你可以只設定 Apple 或只設定 Google；
省略另一個平台的憑證變數即可。

**服務帳戶：**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 啟用 **Google Play Android Developer API**
3. 建立 **Service Account** 並下載 JSON 金鑰
4. 在 Google Play Console 的 **Settings > API access** 中，為該服務帳戶授予存取權限

**OAuth：** 在 Google Cloud Console 中建立「電腦版應用程式」類型的 OAuth 用戶端，在終端機環境中設定
`GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`，然後執行：

```sh
npx --yes @kagayoi/app-publish-mcp@latest auth google
```

使用 Bun 時，請改為執行 `bunx --bun @kagayoi/app-publish-mcp@latest auth google`。

請在同一台電腦上完成瀏覽器登入。此指令會監聽
`127.0.0.1:19847`，並將憑證儲存至 `~/.app-publish-mcp/google.json`。
重新啟動 MCP 伺服器即可載入這些憑證。你也可以向伺服器同時提供
`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 與 `GOOGLE_REFRESH_TOKEN` 這三個變數。
服務帳戶的優先順序高於 OAuth；完整的 OAuth 環境變數優先於已儲存的憑證。
若 OAuth 環境變數不完整，仍會載入已儲存的憑證。

`auth google` 輸出的訊息與瀏覽器登入頁面會以你的語言顯示（日文、英文、簡體中文、
繁體中文、韓文、西班牙文、法文、德文或巴西葡萄牙文）。命令列依序遵循
`APP_PUBLISH_MCP_LANGUAGE`、`LC_ALL`、`LC_MESSAGES`、`LANG` 與作業系統地區設定；
若要明確指定語言，請設定 `APP_PUBLISH_MCP_LANGUAGE`（例如 `ja` 或 `pt-BR`）。
瀏覽器頁面則遵循瀏覽器的 `Accept-Language`。
回傳給 AI 助理的 MCP 工具說明與錯誤訊息仍為英文，
而 `locale`、`languageCode` 等商店資訊語言屬於 API 引數，
不受此設定影響。

### 4. 加入 Claude Code

依照 [Claude Code MCP 文件](https://code.claude.com/docs/en/mcp)的說明，
將下列設定加入專案根目錄的 `.mcp.json`。
其中的 `${...}` 項目會從啟動 Claude Code 的環境中讀取憑證；
請移除你不使用的平台或驗證方式所對應的項目。

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

## 使用範例

### 提交 iOS 應用程式更新

```
1. apple_list_apps → 取得應用程式 ID
2. apple_create_version → 建立版本 1.1.0
3. apple_list_version_localizations → 取得在地化 ID
4. apple_update_version_localization → 設定 whatsNew、description
5. apple_list_builds → 找到已上傳的建置版本
6. apple_assign_build → 將建置版本附加到該版本
7. apple_update_review_detail → 設定審查聯絡人資訊
8. apple_submit_for_review → 送審！
```

如果你已經在 App Store Connect 中準備好審查提交（例如應用程式版本連同訂閱），
請在呼叫 `apple_submit_for_review` 時，除 `appId`、`versionId` 與 `platform` 外，
再傳入它的 `submissionId`。
此工具會驗證應用程式、平台以及已附加的版本，然後提交**該既有提交中的所有
項目**，且不會替換它們。若未傳入 `submissionId`，則會建立一個僅包含該應用程式版本的新提交。

如果最終的提交請求失敗或逾時，此工具會保留該提交並回報其 ID：Apple 可能已經受理該請求。
請先在 App Store Connect 中確認其狀態，再使用同一個 `submissionId` 重試。
請勿為了補回遺失的回應而建立新的提交，或取消已受理的審查。
對處於 `WAITING_FOR_REVIEW` 或 `IN_REVIEW` 狀態的相符提交進行重試時，
會回傳其目前狀態，而不會再次提交。

### 發布 Android 應用程式

```
1. google_create_edit → 開始編輯工作階段
2. google_update_details → 更新聯絡資訊
3. google_update_listing → 更新商店資訊
4. google_upload_bundle → 上傳 .aab 檔案
5. google_create_release → 在正式版軌道上建立草稿發布（必須提供 versionCodes；若要推出，請明確設定 status）
6. google_validate_edit → 檢查錯誤
7. google_commit_edit → 發布變更
```

### 管理 Google Play 應用程式內商品

```
1. google_list_iap → 列出所有商品
2. google_create_iap → 建立新的受管理商品
3. google_update_iap → 更新價格或描述
4. google_delete_iap → 移除商品
```

### 建立 Google Play 訂閱

```
1. google_create_subscription → 建立訂閱，包含商品資訊與一個
   基本方案（計費週期、寬限期、以 micros 表示的各地區定價）。
   基本方案以 DRAFT 狀態建立。
2. google_activate_subscription_base_plan → 將基本方案切換為 ACTIVE，
   使其可在 Play 商店中購買。
3. google_deactivate_subscription_base_plan → 暫停銷售，
   但不刪除該方案。
4. google_archive_subscription → 訂閱停止營運時將其封存。
```

`google_create_subscription` 的引數範例：

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

價格以 **micros** 為單位給定（1 USD = 1,000,000 micros），並在內部轉換為
Play API 的 `Money` 結構（`units` + `nanos`）。`regionsVersion`
預設為 `2022/02`，這是 Play API 目前在提供各地區定價時所要求的值。

## 授權

MIT
