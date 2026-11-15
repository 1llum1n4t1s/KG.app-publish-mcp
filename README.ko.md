[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **한국어** | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

**App Store Connect**와 **Google Play Console**을 위한 통합 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) 서버입니다. 앱 스토어 정보, 스크린샷, 릴리스, 리뷰, 심사 제출까지 모두 AI 어시스턴트에서 관리할 수 있습니다.

## 사용 시나리오

**Node.js 22 이상**이 필요합니다. 이전 런타임을 사용 중이라면 설치하거나 업데이트하기 전에
Node.js를 업그레이드하세요.

다음과 같은 경우에 이 MCP를 사용합니다.

- **"앱의 App Store 설명과 키워드를 업데이트하고 싶어"** — 버전 현지화 정보와 앱 정보 현지화 정보를 수정
- **"iPhone 16 Pro용 새 스크린샷을 업로드하고 싶어"** — 스크린샷 세트를 만들고 이미지를 업로드
- **"새 버전을 심사에 제출하고 싶어"** — 버전 생성, 빌드 지정, 심사 정보 설정, 제출
- **"앱 심사 상태를 확인하고 싶어"** — 버전 목록을 조회하고 심사 상태를 확인
- **"Google Play의 사용자 리뷰에 답글을 달고 싶어"** — 리뷰 목록을 조회하고 답글 작성
- **"Google Play에서 단계적 출시를 하고 싶어"** — edit를 만들고 트랙에 릴리스를 생성한 뒤 커밋
- **"TestFlight 베타 테스터를 관리하고 싶어"** — 그룹 생성, 테스터 초대, 접근 권한 관리
- **"인앱 결제를 설정하고 싶어"** — 두 플랫폼에서 인앱 결제와 구독 그룹을 생성하고 관리
- **"개발용 새 기기를 등록하고 싶어"** — 기기, 인증서, 프로비저닝 프로파일을 관리

## 기능

### Apple App Store Connect (도구 71개)
| 카테고리 | 도구 |
|----------|-------|
| 앱 관리 | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Bundle ID 기능(Capability) | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| 버전 | `apple_list_versions`, `apple_create_version` |
| 버전 현지화 | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| 앱 정보 현지화 | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| 스크린샷 | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| 빌드 | `apple_list_builds`, `apple_assign_build` |
| 연령 등급 | `apple_get_age_rating`, `apple_update_age_rating` |
| 심사 정보 | `apple_update_review_detail` |
| 심사 제출 | `apple_submit_for_review`, `apple_cancel_submission` |
| 가격 | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| 고객 리뷰 | `apple_list_reviews`, `apple_respond_to_review` |
| 인증서 | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| 프로비저닝 프로파일 | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| 기기 | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| TestFlight 베타 그룹 | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| TestFlight 베타 테스터 | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| 인앱 결제 | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| 구독 그룹 | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| 접근성 선언 | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| 가격 포인트 | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| 오퍼 코드 | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| 윈백 오퍼 | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (도구 47개)
| 카테고리 | 도구 |
|----------|-------|
| Edit 수명 주기 | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play 앱 서명³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| 앱 세부정보 | `google_get_details`, `google_update_details` |
| 스토어 등록정보 | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| 국가별 제공 여부 | `google_get_country_availability` |
| 테스터 | `google_get_testers`, `google_update_testers` |
| 이미지 | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| 트랙 및 릴리스 | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| 번들 / APK | `google_upload_bundle`, `google_upload_apk` |
| 리뷰¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| 인앱 상품 | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| 구독 | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| 일회성 상품² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Play Console에는 리뷰가 보이는데 `google_list_reviews`가 빈 배열을 반환한다면, 먼저 연결된 서비스 계정에 **"리뷰에 답글 달기"** 계정 권한(Play Console → 사용자 및 권한)이 있는지 확인하세요. 권한이 없어도 API는 별도의 오류를 내지 않고 결과를 비워서 반환합니다. 또한 이 엔드포인트는 최근 리뷰만 반환하므로, 더 가져오려면 `pageToken`으로 페이지를 넘기세요.

² 일회성 상품(`monetization.onetimeproducts`)은 구매·대여 상품을 위한 Google Play의 새로운 구매 모델로, 기존 `inappproducts` API와는 별개입니다. `google_create_one_time_product`는 이미 존재하는 상품 ID를 거부하므로, 업데이트에는 `google_update_one_time_product`를 사용하세요. 구매 옵션은 기본적으로 활성 상태로 생성됩니다. 상품을 삭제하지 않고 판매만 중단하려면 `google_deactivate_purchase_option`을 사용하세요.

³ Play 앱 서명 도구는 자체 호스팅 Google Cloud KMS 키를 사용하는 엔터프라이즈 앱만 지원합니다. Google이 관리하는 표준 서명의 등록과 교체는 계속 Play Console에서 수행해야 합니다.

### 프롬프트 (2개)
| 프롬프트 | 설명 |
|--------|-------------|
| `app_release_checklist` | 앱 업데이트 릴리스를 위한 가이드 체크리스트 — iOS 및/또는 Android의 버전 생성, 메타데이터, 빌드 지정, 제출 과정을 단계별로 안내합니다 |
| `app_store_optimization` | 현재 스토어 등록정보 메타데이터(제목, 설명, 키워드, 스크린샷, 현지화)를 검토하고 실행 가능한 개선 방안을 제시하는 ASO 점검 |

### 리소스 (2개)
| URI | 설명 |
|-----|-------------|
| `app-publish://config` | 현재 서버 설정 — 연결된 계정, 인증 방식, 도구 수 |
| `app-publish://supported-platforms` | 지원하는 모든 도구를 플랫폼별로 묶고 설명을 붙인 목록 |

## 설정

### 1. npm에서 실행

로컬 clone이나 설치는 필요 없습니다. 아래 MCP 클라이언트 설정이 `npx`로 npm의 최신 릴리스를 실행합니다.

이미 버전을 고정해서(예: `@kagayoi/app-publish-mcp@1.0.5`) 서버를 등록했다면, 해당 등록의 패키지 인수를 `@kagayoi/app-publish-mcp@latest`로 바꾸세요. README를 업데이트해도 기존 등록은 바뀌지 않지만, 이렇게 수정한 뒤에는 실행할 때마다 자동으로 최신 릴리스가 사용됩니다.

Node.js 대신 Bun으로 실행하려면 `bunx --bun`과 같은 패키지 이름을 사용하세요.

```sh
bunx --bun @kagayoi/app-publish-mcp@latest
```

MCP 클라이언트 설정에서는 명령으로 `bunx`를, 인수로
`["--bun", "@kagayoi/app-publish-mcp@latest"]`를 사용하세요.

### 2. Apple 자격 증명

1. [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)로 이동합니다
2. **App Manager** 역할로 API 키를 생성합니다
3. `.p8` 파일을 다운로드합니다
4. **Key ID**와 **Issuer ID**를 메모해 둡니다

### 3. Google 자격 증명

서비스 계정 또는 OAuth 중 하나를 선택하세요. Apple만 또는 Google만 설정해도 됩니다.
사용하지 않는 플랫폼의 자격 증명 변수는 생략하세요.

**서비스 계정:**

1. [Google Cloud Console](https://console.cloud.google.com/)로 이동합니다
2. **Google Play Android Developer API**를 활성화합니다
3. **서비스 계정**을 만들고 JSON 키를 다운로드합니다
4. Google Play Console의 **설정 > API 액세스**에서 서비스 계정에 접근 권한을 부여합니다

**OAuth:** Google Cloud Console에서 데스크톱 앱용 OAuth 클라이언트를 만들고,
터미널 환경에 `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`을 설정한 뒤 다음을 실행하세요.

```sh
npx --yes @kagayoi/app-publish-mcp@latest auth google
```

Bun을 사용한다면 대신 `bunx --bun @kagayoi/app-publish-mcp@latest auth google`을 실행하세요.

브라우저 로그인은 같은 컴퓨터에서 완료해야 합니다. 이 명령은
`127.0.0.1:19847`에서 대기하며 자격 증명을 `~/.app-publish-mcp/google.json`에 저장합니다.
자격 증명을 불러오려면 MCP 서버를 다시 시작하세요. 또는
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` 세 변수를 모두 서버에 전달해도 됩니다.
서비스 계정이 OAuth보다 우선하며, 완전한 OAuth 환경 변수 세트는 저장된 자격 증명보다
우선합니다. OAuth 환경 변수가 불완전한 경우에도 저장된 자격 증명은 불러옵니다.

`auth google`이 출력하는 메시지와 브라우저 로그인 페이지는 사용자의 언어
(일본어, 영어, 중국어 간체, 중국어 번체, 한국어, 스페인어, 프랑스어, 독일어, 브라질 포르투갈어)로 표시됩니다.
명령줄에서는 `APP_PUBLISH_MCP_LANGUAGE`, 그다음 `LC_ALL`, `LC_MESSAGES`, `LANG`,
OS 로캘 순으로 따릅니다. 언어를 직접 지정하려면 `APP_PUBLISH_MCP_LANGUAGE`
(예: `ja` 또는 `pt-BR`)를 설정하세요. 브라우저 페이지는 브라우저의 `Accept-Language`를 따릅니다.
AI 어시스턴트에 반환되는 MCP 도구 설명과 오류는 영어로 유지되며,
`locale`, `languageCode` 같은 스토어 등록정보 언어는 API 인수이므로 이 설정으로 바뀌지 않습니다.

### 4. Claude Code에 추가

[Claude Code MCP 문서](https://code.claude.com/docs/en/mcp)에 설명된 대로
프로젝트 루트의 `.mcp.json`에 다음 설정을 추가하세요.
`${...}` 항목은 Claude Code를 시작한 환경에서 자격 증명을 읽습니다.
사용하지 않는 플랫폼이나 인증 방식의 항목은 제거하세요.

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

## 사용 예시

### iOS 앱 업데이트 제출

```
1. apple_list_apps → 앱 ID 가져오기
2. apple_create_version → 버전 1.1.0 생성
3. apple_list_version_localizations → 현지화 ID 가져오기
4. apple_update_version_localization → whatsNew, description 설정
5. apple_list_builds → 업로드된 빌드 찾기
6. apple_assign_build → 빌드를 버전에 연결
7. apple_update_review_detail → 심사자 연락처 정보 설정
8. apple_submit_for_review → 제출!
```

App Store Connect에서 이미 심사 제출 항목을 준비해 두었다면(예: 앱 버전과 구독을 함께 묶은 경우),
`appId`, `versionId`, `platform`과 함께 해당 `submissionId`를
`apple_submit_for_review`에 전달하세요. 이 도구는 앱, 플랫폼, 연결된 버전을 확인한 다음
**기존 제출에 포함된 모든 항목**을 교체하지 않고 그대로 제출합니다. `submissionId`를 전달하지 않으면
앱 버전만 포함한 새 제출을 생성합니다.

마지막 제출 요청이 실패하거나 시간 초과되면, 도구는 제출을 그대로 보존하고 그 ID를 알려 줍니다.
Apple이 요청을 이미 수락했을 수 있기 때문입니다. 같은 `submissionId`로 다시 시도하기 전에
App Store Connect에서 상태를 확인하세요. 응답을 받지 못했다는 이유만으로
새 제출을 만들거나 이미 수락된 심사를 취소하지 마세요.
`WAITING_FOR_REVIEW` 또는 `IN_REVIEW` 상태인 일치하는 제출을 다시 시도하면,
다시 제출하지 않고 현재 상태를 반환합니다.

### Android 앱 릴리스

```
1. google_create_edit → edit 세션 시작
2. google_update_details → 연락처 정보 업데이트
3. google_update_listing → 스토어 등록정보 업데이트
4. google_upload_bundle → .aab 파일 업로드
5. google_create_release → 프로덕션 트랙에 초안 릴리스 생성 (versionCodes 필수, 출시하려면 status를 명시적으로 설정)
6. google_validate_edit → 오류 확인
7. google_commit_edit → 변경 사항 게시
```

### Google Play 인앱 상품 관리

```
1. google_list_iap → 모든 상품 목록 조회
2. google_create_iap → 새 관리형 상품 생성
3. google_update_iap → 가격 또는 설명 업데이트
4. google_delete_iap → 상품 삭제
```

### Google Play 구독 생성

```
1. google_create_subscription → 등록정보와 기본 요금제(결제 주기, 유예 기간,
   마이크로 단위 지역별 가격)를 지정해 구독을 생성합니다.
   기본 요금제는 DRAFT 상태로 생성됩니다.
2. google_activate_subscription_base_plan → 기본 요금제를 ACTIVE로 전환해
   Play 스토어에서 구매할 수 있게 합니다.
3. google_deactivate_subscription_base_plan → 요금제를 삭제하지 않고
   판매를 일시 중지합니다.
4. google_archive_subscription → 판매를 종료한 구독을 보관 처리합니다.
```

`google_create_subscription`의 인수 예시:

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

가격은 **마이크로 단위**(1 USD = 1,000,000 마이크로)로 지정하며, 내부적으로
Play API의 `Money` 형식(`units` + `nanos`)으로 변환됩니다. `regionsVersion`의
기본값은 `2022/02`이며, 지역별 가격을 지정할 때 Play API가 현재 이 값을 요구합니다.

## 라이선스

MIT
