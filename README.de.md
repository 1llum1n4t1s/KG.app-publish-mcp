[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | **Deutsch** | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

Ein einheitlicher [MCP-Server (Model Context Protocol)](https://modelcontextprotocol.io) für **App Store Connect** und **Google Play Console**. Verwalten Sie App-Einträge, Screenshots, Releases, Rezensionen und Einreichungen – alles direkt aus Ihrem KI-Assistenten.

## Einsatzszenarien

Erfordert **Bun 1.4.4 oder neuer**. Installieren oder aktualisieren Sie Bun, bevor Sie den Server ausführen oder aktualisieren.

Verwenden Sie diesen MCP, wenn Sie Folgendes tun möchten:

- **„Beschreibung und Keywords meiner App im App Store aktualisieren“** – Versionslokalisierungen und App-Info-Lokalisierungen ändern
- **„Neue Screenshots für das iPhone 16 Pro hochladen“** – Screenshot-Sets erstellen und Bilder hochladen
- **„Eine neue Version zur Prüfung einreichen“** – Version erstellen, Build zuweisen, Prüfinformationen festlegen, einreichen
- **„Den Status der Prüfung meiner App abfragen“** – Versionen auflisten und den Prüfstatus ansehen
- **„Auf eine Nutzerrezension bei Google Play antworten“** – Rezensionen auflisten und antworten
- **„Ein gestaffeltes Release bei Google Play erstellen“** – Edit erstellen, Release auf einem Track anlegen, committen
- **„TestFlight-Betatester verwalten“** – Gruppen erstellen, Tester einladen, Zugriff verwalten
- **„In-App-Käufe einrichten“** – In-App-Käufe und Abonnementgruppen auf beiden Plattformen erstellen und verwalten
- **„Ein neues Gerät für die Entwicklung registrieren“** – Geräte, Zertifikate und Provisioning-Profile verwalten

## Funktionen

### Apple App Store Connect (77 Tools)
| Kategorie | Tools |
|----------|-------|
| App-Verwaltung | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle-IDs | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Bundle-ID-Capabilities | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| Versionen | `apple_list_versions`, `apple_create_version` |
| Versionslokalisierungen | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| App-Info-Lokalisierungen | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| Screenshots | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| Builds | `apple_list_builds`, `apple_assign_build` |
| Altersfreigabe | `apple_get_age_rating`, `apple_update_age_rating` |
| Prüfinformationen | `apple_get_review_detail`, `apple_update_review_detail` |
| Einreichung | `apple_list_review_submissions`, `apple_submit_for_review`, `apple_cancel_submission` |
| Preisgestaltung | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| Kundenrezensionen | `apple_list_reviews`, `apple_respond_to_review` |
| Zertifikate | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| Provisioning-Profile | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| Geräte | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| TestFlight-Betagruppen | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| TestFlight-Builds | `apple_add_build_to_beta_groups`, `apple_remove_build_from_beta_groups`, `apple_list_build_beta_localizations`, `apple_set_build_whats_new` |
| TestFlight-Betatester | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| In-App-Käufe | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| Abonnementgruppen | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| Barrierefreiheitserklärungen | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| Preisstufen | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| Angebotscodes | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| Win-Back-Angebote | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (47 Tools)
| Kategorie | Tools |
|----------|-------|
| Edit-Lebenszyklus | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play App Signing³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| App-Details | `google_get_details`, `google_update_details` |
| Store-Eintrag | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| Länderverfügbarkeit | `google_get_country_availability` |
| Tester | `google_get_testers`, `google_update_testers` |
| Bilder | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| Tracks und Releases | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| Rezensionen¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| In-App-Produkte | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| Abonnements | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| Einmalprodukte² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Wenn `google_list_reviews` für eine App, deren Rezensionen in der Play Console sichtbar sind, ein leeres Array zurückgibt, prüfen Sie zuerst, ob das verknüpfte Dienstkonto die Kontoberechtigung **„Auf Rezensionen antworten“** besitzt (Play Console → Nutzer und Berechtigungen). Die API meldet eine fehlende Berechtigung nicht mit einem eigenen Fehler, sondern liefert einfach keine Ergebnisse. Beachten Sie außerdem, dass der Endpunkt nur aktuelle Rezensionen liefert; mit `pageToken` blättern Sie durch weitere.

² Einmalprodukte (`monetization.onetimeproducts`) sind das neuere Kaufmodell von Google Play für Kauf- und Mietartikel und unterscheiden sich von der älteren `inappproducts`-API. `google_create_one_time_product` lehnt bereits vorhandene Produkt-IDs ab; verwenden Sie für Aktualisierungen `google_update_one_time_product`. Kaufoptionen werden standardmäßig aktiv angelegt; mit `google_deactivate_purchase_option` nehmen Sie eine Option außer Betrieb, ohne das Produkt zu löschen.

³ Die Play-App-Signing-Tools unterstützen nur Enterprise-Apps mit selbst gehosteten Google-Cloud-KMS-Schlüsseln. Die Registrierung für die von Google verwaltete Standardsignierung und deren Schlüsselrotation bleiben Vorgänge der Play Console.

### Prompts (2)
| Prompt | Beschreibung |
|--------|-------------|
| `app_release_checklist` | Geführte Checkliste für die Veröffentlichung eines App-Updates – führt für iOS und/oder Android durch Versionserstellung, Metadaten, Build-Zuweisung und Einreichung |
| `app_store_optimization` | ASO-Audit, das die aktuellen Metadaten des Eintrags (Titel, Beschreibung, Keywords, Screenshots, Lokalisierung) prüft und konkrete Verbesserungsempfehlungen gibt |

### Ressourcen (2)
| URI | Beschreibung |
|-----|-------------|
| `app-publish://config` | Aktuelle Serverkonfiguration – verbundene Konten, Authentifizierungsmethoden, Anzahl der Tools |
| `app-publish://supported-platforms` | Alle unterstützten Tools, nach Plattform gruppiert und mit Beschreibung |

## Einrichtung

### 1. Über npm ausführen

Ein lokaler Klon oder eine Installation ist nicht erforderlich. Die untenstehende MCP-Client-Konfiguration führt mit Bun das neueste npm-Release aus:

```sh
bun x --bun @kagayoi/app-publish-mcp@latest
```

Verwenden Sie in einer MCP-Client-Konfiguration `bun` als Befehl und `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]` als Argumente. `bunx` ist ein Alias für `bun x`. Der Start des Servers mit `npx` oder Node.js wird nicht unterstützt. `@latest` verwendet das neueste Release.

Wenn Sie den Server bereits mit `npx` oder mit einer festen Version registriert haben (zum Beispiel `@kagayoi/app-publish-mcp@1.0.5`), ändern Sie diese Registrierung: Setzen Sie den Befehl auf `bun` und die Argumente auf `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]`. Die Aktualisierung dieser README ändert bestehende Registrierungen nicht.

### 2. Apple-Zugangsdaten

1. Öffnen Sie [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Erstellen Sie einen API-Schlüssel mit der Rolle **App Manager**
3. Laden Sie die `.p8`-Datei herunter
4. Notieren Sie sich die **Key ID** und die **Issuer ID**

### 3. Google-Zugangsdaten

Wählen Sie ein Dienstkonto oder OAuth. Sie können nur Apple oder nur Google
konfigurieren; lassen Sie die Zugangsdaten-Variablen der jeweils anderen Plattform weg.

**Dienstkonto:**

1. Öffnen Sie die [Google Cloud Console](https://console.cloud.google.com/)
2. Aktivieren Sie die **Google Play Android Developer API**
3. Erstellen Sie ein **Dienstkonto** und laden Sie den JSON-Schlüssel herunter
4. Gewähren Sie dem Dienstkonto in der Google Play Console unter **Einstellungen > API-Zugriff** Zugriff

**OAuth:** Erstellen Sie in der Google Cloud Console einen OAuth-Client vom Typ Desktop-App, setzen Sie
`GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET` in der Umgebung Ihres Terminals und führen Sie dann Folgendes aus:

```sh
bun x --bun @kagayoi/app-publish-mcp@latest auth google
```

Schließen Sie die Anmeldung im Browser auf demselben Computer ab. Der Befehl lauscht auf
`127.0.0.1:19847` und speichert die Zugangsdaten in `~/.app-publish-mcp/google.json`.
Starten Sie den MCP-Server neu, um sie zu laden. Alternativ übergeben Sie dem Server alle drei Variablen
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` und `GOOGLE_REFRESH_TOKEN`.
Ein Dienstkonto hat Vorrang vor OAuth; eine vollständige OAuth-Umgebung hat
Vorrang vor gespeicherten Zugangsdaten. Eine unvollständige OAuth-Umgebung erlaubt
weiterhin das Laden gespeicherter Zugangsdaten.

Die von `auth google` ausgegebenen Meldungen und die Anmeldeseite im Browser werden in
Ihrer Sprache angezeigt (Japanisch, Englisch, Chinesisch (vereinfacht), Chinesisch (traditionell),
Koreanisch, Spanisch, Französisch, Deutsch oder brasilianisches Portugiesisch). Die Befehlszeile
richtet sich nach `APP_PUBLISH_MCP_LANGUAGE`, dann nach `LC_ALL`, `LC_MESSAGES`, `LANG` und der
Gebietsschema-Einstellung des Betriebssystems; setzen Sie `APP_PUBLISH_MCP_LANGUAGE` (zum Beispiel `ja` oder `pt-BR`),
um eine Sprache explizit zu wählen. Die Browserseite richtet sich nach dem `Accept-Language`-Header des Browsers.
MCP-Tool-Beschreibungen und Fehlermeldungen, die an den KI-Assistenten zurückgegeben werden, bleiben auf Englisch,
und Sprachen von Store-Einträgen wie `locale` und `languageCode` sind API-Argumente,
die von dieser Einstellung nicht verändert werden.

### 4. Zu Claude Code hinzufügen

Fügen Sie die folgende Konfiguration, wie in der
[MCP-Dokumentation von Claude Code](https://code.claude.com/docs/en/mcp) beschrieben, in die Datei `.mcp.json` im Stammverzeichnis Ihres Projekts ein.
Die `${...}`-Einträge lesen Zugangsdaten aus der Umgebung, die Claude
Code startet; entfernen Sie Einträge für eine Plattform oder Authentifizierungsmethode, die Sie nicht verwenden.

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

## Anwendungsbeispiele

### Ein iOS-App-Update einreichen

```
1. apple_list_apps → App-ID ermitteln
2. apple_create_version → Version 1.1.0 erstellen
3. apple_list_version_localizations → Lokalisierungs-IDs ermitteln
4. apple_update_version_localization → whatsNew, description setzen
5. apple_list_builds → hochgeladenen Build finden
6. apple_assign_build → Build der Version zuweisen
7. apple_update_review_detail → Kontaktdaten für die Prüfung festlegen
8. apple_submit_for_review → einreichen!
```

Wenn Sie in App Store Connect bereits eine Einreichung zur Prüfung vorbereitet haben (zum Beispiel
eine App-Version zusammen mit Abonnements), übergeben Sie deren `submissionId` zusammen mit `appId`, `versionId` und `platform`
an `apple_submit_for_review`.
Das Tool prüft App, Plattform und angehängte Version und reicht dann **alle
Elemente dieser bestehenden Einreichung** ein, ohne sie zu ersetzen. Ohne
`submissionId` wird eine neue Einreichung erstellt, die nur die App-Version enthält.

Schlägt die abschließende Einreichungsanfrage fehl oder läuft sie in ein Timeout, bleibt die Einreichung erhalten
und das Tool meldet ihre ID: Apple hat die Anfrage möglicherweise angenommen. Prüfen Sie ihren Status in
App Store Connect, bevor Sie mit derselben `submissionId` erneut versuchen. Erstellen Sie
keine neue Einreichung und brechen Sie keine angenommene Prüfung ab, nur um eine fehlende Antwort auszugleichen.
Der erneute Versuch bei einer passenden Einreichung im Status `WAITING_FOR_REVIEW` oder `IN_REVIEW` gibt
deren aktuellen Status zurück, ohne sie erneut einzureichen.

### Eine Android-App veröffentlichen

```
1. google_create_edit → Edit-Sitzung starten
2. google_update_details → Kontaktdaten aktualisieren
3. google_update_listing → Store-Eintrag aktualisieren
4. google_upload_bundle → .aab-Datei hochladen
5. google_create_release → Entwurfs-Release auf dem Produktions-Track erstellen (versionCodes erforderlich; status explizit setzen, um den Rollout zu starten)
6. google_validate_edit → auf Fehler prüfen
7. google_commit_edit → Änderungen veröffentlichen
```

### Google-Play-In-App-Produkte verwalten

```
1. google_list_iap → alle Produkte auflisten
2. google_create_iap → neues verwaltetes Produkt erstellen
3. google_update_iap → Preis oder Beschreibung aktualisieren
4. google_delete_iap → ein Produkt entfernen
```

### Ein Google-Play-Abonnement erstellen

```
1. google_create_subscription → Abonnement mit Einträgen und einem
   Basisabo erstellen (Abrechnungszeitraum, Kulanzfrist, regionale Preise in Micros).
   Das Basisabo wird im Status DRAFT angelegt.
2. google_activate_subscription_base_plan → Basisabo auf ACTIVE setzen, damit
   es im Play Store kaufbar wird.
3. google_deactivate_subscription_base_plan → Verkauf pausieren, ohne
   das Abo zu löschen.
4. google_archive_subscription → Abonnement archivieren, wenn es eingestellt wird.
```

Beispielargumente für `google_create_subscription`:

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

Preise werden in **Micros** angegeben (1 USD = 1.000.000 Micros) und intern in
die `Money`-Struktur der Play-API (`units` + `nanos`) umgerechnet. `regionsVersion`
hat den Standardwert `2022/02`, den die Play-API derzeit verlangt, wenn
regionale Preise angegeben werden.

## Lizenz

MIT
