[English](README.md) | [日本語](README.ja.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

统一的 [MCP（Model Context Protocol，模型上下文协议）](https://modelcontextprotocol.io)服务器，同时支持 **App Store Connect** 和 **Google Play Console**。你可以直接在 AI 助手中管理应用商店信息、截图、发布、评论和提交审核。

## 适用场景

需要 **Bun 1.4.4 或更高版本**。运行或更新服务器之前，请先安装或升级 Bun。

在以下情况下可以使用此 MCP：

- **“更新我的应用在 App Store 上的描述和关键词”** — 修改版本本地化、应用信息本地化
- **“为 iPhone 16 Pro 上传新的截图”** — 创建截图集并上传图片
- **“提交新版本以供审核”** — 创建版本、关联构建版本、设置审核信息并提交
- **“查看我的应用审核状态”** — 列出版本并查看审核状态
- **“回复 Google Play 上的用户评论”** — 列出评论并回复
- **“在 Google Play 上创建分阶段发布”** — 创建编辑、在轨道上创建发布、提交
- **“管理 TestFlight 测试人员”** — 创建测试组、邀请测试人员、管理访问权限
- **“设置应用内购买”** — 在两个平台上创建和管理应用内购买及订阅组
- **“注册新的开发设备”** — 管理设备、证书和描述文件

## 功能特性

### Apple App Store Connect（71 个工具）
| 类别 | 工具 |
|----------|-------|
| 应用管理 | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Bundle ID 功能 | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| 版本 | `apple_list_versions`, `apple_create_version` |
| 版本本地化 | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| 应用信息本地化 | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| 截图 | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| 构建版本 | `apple_list_builds`, `apple_assign_build` |
| 年龄分级 | `apple_get_age_rating`, `apple_update_age_rating` |
| 审核信息 | `apple_update_review_detail` |
| 提交 | `apple_submit_for_review`, `apple_cancel_submission` |
| 定价 | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| 用户评论 | `apple_list_reviews`, `apple_respond_to_review` |
| 证书 | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| 描述文件 | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| 设备 | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| TestFlight 测试组 | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| TestFlight 测试人员 | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| 应用内购买 | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| 订阅组 | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| 无障碍声明 | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| 价格点 | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| 优惠码 | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| 赢回优惠 | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console（47 个工具）
| 类别 | 工具 |
|----------|-------|
| 编辑生命周期 | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play 应用签名³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| 应用详情 | `google_get_details`, `google_update_details` |
| 商店信息 | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| 国家/地区可用性 | `google_get_country_availability` |
| 测试人员 | `google_get_testers`, `google_update_testers` |
| 图片 | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| 轨道与发布 | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| 评论¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| 应用内商品 | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| 订阅 | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| 一次性商品² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ 如果 Play Console 中能看到评论，但 `google_list_reviews` 对该应用返回空数组，请先检查所关联的服务账号是否拥有 **“回复评价”** 账号权限（Play Console → 用户和权限）——缺少该权限时 API 不会返回明确的错误，只会返回空结果。另外请注意，该接口只会返回近期的评论；可使用 `pageToken` 翻页获取更多评论。

² 一次性商品（`monetization.onetimeproducts`）是 Google Play 较新的购买模型，适用于买断/租赁类商品，有别于旧版的 `inappproducts` API。`google_create_one_time_product` 会拒绝已存在的商品 ID；更新请使用 `google_update_one_time_product`。购买选项默认以启用状态创建；如需下架而不删除商品，请使用 `google_deactivate_purchase_option`。

³ Play 应用签名工具仅支持使用自托管 Google Cloud KMS 密钥的企业应用。标准的 Google 托管签名注册和密钥轮换仍需在 Play Console 中操作。

### 提示词（2 个）
| 提示词 | 说明 |
|--------|-------------|
| `app_release_checklist` | 应用更新发布的引导式清单 — 逐步完成 iOS 和/或 Android 的版本创建、元数据、构建版本关联和提交 |
| `app_store_optimization` | ASO 审计 — 检查当前商店信息元数据（标题、描述、关键词、截图、本地化），并给出可执行的改进建议 |

### 资源（2 个）
| URI | 说明 |
|-----|-------------|
| `app-publish://config` | 当前服务器配置 — 已连接的账号、认证方式、工具数量 |
| `app-publish://supported-platforms` | 按平台分组的所有支持的工具及其说明 |

## 配置

### 1. 从 npm 运行

无需本地克隆或安装。下面的 MCP 客户端配置会通过 Bun 运行 npm 上的最新版本：

```sh
bun x --bun @kagayoi/app-publish-mcp@latest
```

在 MCP 客户端配置中，将 `bun` 作为命令，将 `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]` 作为其参数。`bunx` 是 `bun x` 的别名。不支持使用 `npx` 或 Node.js 运行该服务器。`@latest` 表示使用最新版本。

如果你之前通过 `npx` 或以固定版本（例如 `@kagayoi/app-publish-mcp@1.0.5`）注册了该服务器，请修改该注册信息：将命令改为 `bun`，将参数改为 `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]`。更新本 README 不会改变已有的注册信息。

### 2. Apple 凭据

1. 前往 [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. 创建一个具有 **App Manager** 角色的 API Key
3. 下载 `.p8` 文件
4. 记下 **Key ID** 和 **Issuer ID**

### 3. Google 凭据

可选择服务账号或 OAuth。你可以只配置 Apple 或只配置 Google；
省略另一个平台的凭据变量即可。

**服务账号：**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 启用 **Google Play Android Developer API**
3. 创建一个 **Service Account** 并下载 JSON 密钥
4. 在 Google Play Console 的 **Settings > API access** 中为该服务账号授予访问权限

**OAuth：** 在 Google Cloud Console 中创建“桌面应用”类型的 OAuth 客户端，在终端环境中设置
`GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`，然后运行：

```sh
bun x --bun @kagayoi/app-publish-mcp@latest auth google
```

请在同一台计算机上完成浏览器登录。该命令会监听
`127.0.0.1:19847`，并将凭据保存到 `~/.app-publish-mcp/google.json`。
重启 MCP 服务器即可加载这些凭据。你也可以向服务器同时提供
`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 和 `GOOGLE_REFRESH_TOKEN` 这三个变量。
服务账号的优先级高于 OAuth；完整的 OAuth 环境变量优先于已保存的凭据。
如果 OAuth 环境变量不完整，仍会加载已保存的凭据。

`auth google` 输出的消息和浏览器登录页面会以你的语言显示（日语、英语、简体中文、
繁体中文、韩语、西班牙语、法语、德语或巴西葡萄牙语）。命令行依次遵循
`APP_PUBLISH_MCP_LANGUAGE`、`LC_ALL`、`LC_MESSAGES`、`LANG` 和操作系统区域设置；
如需明确指定语言，请设置 `APP_PUBLISH_MCP_LANGUAGE`（例如 `ja` 或 `pt-BR`）。
浏览器页面则遵循浏览器的 `Accept-Language`。
返回给 AI 助手的 MCP 工具说明和错误信息仍为英文，
而 `locale`、`languageCode` 等商店信息语言属于 API 参数，
不受此设置影响。

### 4. 添加到 Claude Code

按照 [Claude Code MCP 文档](https://code.claude.com/docs/en/mcp)的说明，
将以下配置添加到项目根目录的 `.mcp.json` 中。
其中的 `${...}` 条目会从启动 Claude Code 的环境中读取凭据；
请删除你不使用的平台或认证方式对应的条目。

```json
{
  "mcpServers": {
    "app-publish-mcp": {
      "command": "bun",
      "args": ["x", "--bun", "@kagayoi/app-publish-mcp@latest"],
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

## 使用示例

### 提交 iOS 应用更新

```
1. apple_list_apps → 获取应用 ID
2. apple_create_version → 创建版本 1.1.0
3. apple_list_version_localizations → 获取本地化 ID
4. apple_update_version_localization → 设置 whatsNew、description
5. apple_list_builds → 找到已上传的构建版本
6. apple_assign_build → 将构建版本关联到该版本
7. apple_update_review_detail → 设置审核联系人信息
8. apple_submit_for_review → 提交！
```

如果你已经在 App Store Connect 中准备好了审核提交（例如应用版本连同订阅），
请在调用 `apple_submit_for_review` 时，除 `appId`、`versionId` 和 `platform` 外，
再传入它的 `submissionId`。
该工具会校验应用、平台以及已关联的版本，然后提交**该现有提交中的所有
项目**，且不会替换它们。如果不传 `submissionId`，则会新建一个仅包含该应用版本的提交。

如果最终的提交请求失败或超时，该工具会保留该提交并报告其 ID：Apple 可能已经受理了该请求。
请先在 App Store Connect 中确认其状态，再使用同一个 `submissionId` 重试。
不要为了补回丢失的响应而新建提交，或取消已受理的审核。
对处于 `WAITING_FOR_REVIEW` 或 `IN_REVIEW` 状态的匹配提交进行重试时，
会返回其当前状态，而不会再次提交。

### 发布 Android 应用

```
1. google_create_edit → 开始编辑会话
2. google_update_details → 更新联系信息
3. google_update_listing → 更新商店信息
4. google_upload_bundle → 上传 .aab 文件
5. google_create_release → 在生产轨道上创建草稿发布（必须提供 versionCodes；如需推出，请明确设置 status）
6. google_validate_edit → 检查错误
7. google_commit_edit → 发布更改
```

### 管理 Google Play 应用内商品

```
1. google_list_iap → 列出所有商品
2. google_create_iap → 创建新的托管商品
3. google_update_iap → 更新价格或描述
4. google_delete_iap → 删除商品
```

### 创建 Google Play 订阅

```
1. google_create_subscription → 创建订阅，包含商品信息和一个
   基础方案（计费周期、宽限期、以 micros 表示的分地区定价）。
   基础方案以 DRAFT 状态创建。
2. google_activate_subscription_base_plan → 将基础方案切换为 ACTIVE，
   使其可在 Play 商店中购买。
3. google_deactivate_subscription_base_plan → 暂停销售，
   但不删除该方案。
4. google_archive_subscription → 订阅停止运营时将其归档。
```

`google_create_subscription` 的参数示例：

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

价格以 **micros** 为单位给出（1 USD = 1,000,000 micros），并在内部转换为
Play API 的 `Money` 结构（`units` + `nanos`）。`regionsVersion`
默认为 `2022/02`，这是 Play API 目前在提供分地区定价时所要求的值。

## 许可证

MIT
