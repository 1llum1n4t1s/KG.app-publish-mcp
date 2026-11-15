[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | **Français** | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

Un serveur [MCP (Model Context Protocol)](https://modelcontextprotocol.io) unifié pour **App Store Connect** et **Google Play Console**. Gérez les fiches d'application, les captures d'écran, les versions, les avis et les soumissions, le tout depuis votre assistant IA.

## Cas d'usage

Nécessite **Bun 1.4.4 ou version ultérieure**. Installez ou mettez à jour Bun avant d'exécuter ou de mettre à jour le serveur.

Utilisez ce MCP lorsque vous devez :

- **« Mettre à jour la description et les mots-clés App Store de mon application »** — modifier les localisations de version et les localisations des informations de l'app
- **« Téléverser de nouvelles captures d'écran pour l'iPhone 16 Pro »** — créer des jeux de captures d'écran et téléverser les images
- **« Soumettre une nouvelle version pour validation »** — créer la version, associer un build, renseigner les informations de validation, soumettre
- **« Vérifier l'état de la validation de mon application »** — lister les versions et consulter l'état de la validation
- **« Répondre à un avis d'utilisateur sur Google Play »** — lister les avis et y répondre
- **« Créer un déploiement progressif sur Google Play »** — créer une modification, créer une version sur une piste, valider
- **« Gérer les bêta-testeurs TestFlight »** — créer des groupes, inviter des testeurs, gérer les accès
- **« Configurer les achats intégrés »** — créer et gérer les achats intégrés et les groupes d'abonnements sur les deux plateformes
- **« Enregistrer un nouvel appareil pour le développement »** — gérer les appareils, les certificats et les profils de provisionnement

## Fonctionnalités

### Apple App Store Connect (71 outils)
| Catégorie | Outils |
|----------|-------|
| Gestion des apps | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Capacités des Bundle ID | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| Versions | `apple_list_versions`, `apple_create_version` |
| Localisations de version | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| Localisations des informations de l'app | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| Captures d'écran | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| Builds | `apple_list_builds`, `apple_assign_build` |
| Classification par âge | `apple_get_age_rating`, `apple_update_age_rating` |
| Informations de validation | `apple_update_review_detail` |
| Soumission | `apple_submit_for_review`, `apple_cancel_submission` |
| Tarification | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| Avis clients | `apple_list_reviews`, `apple_respond_to_review` |
| Certificats | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| Profils de provisionnement | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| Appareils | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| Groupes bêta TestFlight | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| Bêta-testeurs TestFlight | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| Achats intégrés | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| Groupes d'abonnements | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| Déclarations d'accessibilité | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| Niveaux de prix | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| Codes promotionnels | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| Offres de reconquête | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (47 outils)
| Catégorie | Outils |
|----------|-------|
| Cycle de vie des modifications | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play App Signing³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| Détails de l'app | `google_get_details`, `google_update_details` |
| Fiche du Store | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| Disponibilité par pays | `google_get_country_availability` |
| Testeurs | `google_get_testers`, `google_update_testers` |
| Images | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| Pistes et versions | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| Avis¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| Produits intégrés | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| Abonnements | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| Produits ponctuels² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Si `google_list_reviews` renvoie un tableau vide pour une application dont des avis sont visibles dans Play Console, vérifiez d'abord que le compte de service associé dispose de l'autorisation de compte **« Répondre aux avis »** (Play Console → Utilisateurs et autorisations) : l'API ne renvoie pas d'erreur distincte en cas d'autorisation manquante, elle ne renvoie simplement aucun résultat. Notez également que ce point d'accès ne fournit que les avis récents ; utilisez `pageToken` pour parcourir les suivants.

² Les produits ponctuels (`monetization.onetimeproducts`) constituent le nouveau modèle d'achat de Google Play pour les articles à acheter ou à louer, distinct de l'ancienne API `inappproducts`. `google_create_one_time_product` rejette les identifiants de produit existants ; utilisez `google_update_one_time_product` pour les mises à jour. Les options d'achat sont créées actives par défaut ; utilisez `google_deactivate_purchase_option` pour retirer une option sans supprimer le produit.

³ Les outils Play App Signing ne prennent en charge que les applications d'entreprise utilisant des clés Google Cloud KMS auto-hébergées. L'inscription et la rotation de la signature gérée par Google restent des opérations de Play Console.

### Prompts (2)
| Prompt | Description |
|--------|-------------|
| `app_release_checklist` | Liste de contrôle guidée pour publier une mise à jour d'application : elle couvre la création de la version, les métadonnées, l'association du build et la soumission pour iOS et/ou Android |
| `app_store_optimization` | Audit ASO qui examine les métadonnées actuelles de la fiche (titre, description, mots-clés, captures d'écran, localisation) et fournit des recommandations d'amélioration concrètes |

### Ressources (2)
| URI | Description |
|-----|-------------|
| `app-publish://config` | Configuration actuelle du serveur : comptes connectés, méthodes d'authentification, nombre d'outils |
| `app-publish://supported-platforms` | Tous les outils pris en charge, regroupés par plateforme avec leur description |

## Installation

### 1. Exécution depuis npm

Aucun clonage local ni installation n'est nécessaire. La configuration du client MCP ci-dessous exécute la dernière version publiée sur npm avec Bun :

```sh
bun x --bun @kagayoi/app-publish-mcp@latest
```

Dans la configuration d'un client MCP, utilisez `bun` comme commande et `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]` comme arguments. `bunx` est un alias de `bun x`. L'exécution du serveur avec `npx` ou Node.js n'est pas prise en charge. `@latest` utilise la dernière version.

Si vous avez déjà enregistré le serveur avec `npx`, ou avec une version figée (par exemple `@kagayoi/app-publish-mcp@1.0.5`), modifiez cet enregistrement : définissez la commande sur `bun` et les arguments sur `["x", "--bun", "@kagayoi/app-publish-mcp@latest"]`. La mise à jour de ce README ne modifie pas les enregistrements existants.

### 2. Identifiants Apple

1. Rendez-vous sur [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Créez une clé d'API avec le rôle **App Manager**
3. Téléchargez le fichier `.p8`
4. Notez le **Key ID** et l'**Issuer ID**

### 3. Identifiants Google

Choisissez un compte de service ou OAuth. Vous pouvez ne configurer qu'Apple ou
que Google ; omettez les variables d'identifiants de l'autre plateforme.

**Compte de service :**

1. Rendez-vous sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez la **Google Play Android Developer API**
3. Créez un **compte de service** et téléchargez la clé JSON
4. Dans Google Play Console, accordez l'accès au compte de service sous **Paramètres > Accès à l'API**

**OAuth :** créez un client OAuth de type application de bureau dans Google Cloud Console, définissez
`GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans l'environnement de votre terminal, puis exécutez :

```sh
bun x --bun @kagayoi/app-publish-mcp@latest auth google
```

Terminez la connexion dans le navigateur sur le même ordinateur. La commande écoute
sur `127.0.0.1:19847` et enregistre les identifiants dans `~/.app-publish-mcp/google.json`.
Redémarrez le serveur MCP pour les charger. Vous pouvez aussi fournir au serveur les trois variables
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_REFRESH_TOKEN`.
Un compte de service est prioritaire sur OAuth ; un environnement OAuth complet est
prioritaire sur les identifiants enregistrés. Un environnement OAuth incomplet permet
tout de même de charger les identifiants enregistrés.

Les messages affichés par `auth google` et la page de connexion du navigateur sont
présentés dans votre langue (japonais, anglais, chinois simplifié, chinois traditionnel,
coréen, espagnol, français, allemand ou portugais du Brésil). La ligne de commande
suit `APP_PUBLISH_MCP_LANGUAGE`, puis `LC_ALL`, `LC_MESSAGES`, `LANG` et la langue
du système ; définissez `APP_PUBLISH_MCP_LANGUAGE` (par exemple `ja` ou `pt-BR`) pour
choisir explicitement une langue. La page du navigateur suit l'en-tête `Accept-Language`
du navigateur. Les descriptions des outils MCP et les erreurs renvoyées à l'assistant IA
restent en anglais, et les langues des fiches de store comme `locale` et `languageCode`
sont des arguments d'API que ce paramètre ne modifie pas.

### 4. Ajout à Claude Code

Ajoutez la configuration suivante au fichier `.mcp.json` à la racine de votre projet, comme décrit
dans la [documentation MCP de Claude Code](https://code.claude.com/docs/en/mcp).
Les entrées `${...}` lisent les identifiants dans l'environnement qui lance Claude
Code ; supprimez les entrées d'une plateforme ou d'une méthode d'authentification que vous n'utilisez pas.

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

## Exemples d'utilisation

### Soumettre une mise à jour d'application iOS

```
1. apple_list_apps → obtenir l'ID de l'app
2. apple_create_version → créer la version 1.1.0
3. apple_list_version_localizations → obtenir les ID de localisation
4. apple_update_version_localization → renseigner whatsNew, description
5. apple_list_builds → trouver le build téléversé
6. apple_assign_build → associer le build à la version
7. apple_update_review_detail → renseigner les coordonnées du contact pour la validation
8. apple_submit_for_review → soumettre !
```

Si vous avez déjà préparé une soumission pour validation dans App Store Connect (par exemple,
une version d'app accompagnée d'abonnements), transmettez son `submissionId` à
`apple_submit_for_review` avec `appId`, `versionId` et `platform`.
L'outil vérifie l'app, la plateforme et la version associée, puis soumet **tous
les éléments de cette soumission existante** sans les remplacer. Sans
`submissionId`, il crée une nouvelle soumission contenant uniquement la version de l'app.

Si la requête de soumission finale échoue ou expire, l'outil conserve la soumission
et indique son ID : Apple peut avoir accepté la requête. Vérifiez son état dans
App Store Connect avant de réessayer avec ce même `submissionId`. Ne créez pas
de nouvelle soumission et n'annulez pas une validation acceptée simplement pour récupérer une réponse manquante.
Réessayer une soumission correspondante en `WAITING_FOR_REVIEW` ou `IN_REVIEW` renvoie
son état actuel sans la soumettre de nouveau.

### Publier une application Android

```
1. google_create_edit → démarrer une session de modification
2. google_update_details → mettre à jour les coordonnées de contact
3. google_update_listing → mettre à jour la fiche du Store
4. google_upload_bundle → téléverser le fichier .aab
5. google_create_release → créer une version brouillon sur la piste de production (versionCodes requis ; définir explicitement status pour lancer le déploiement)
6. google_validate_edit → rechercher les erreurs
7. google_commit_edit → publier les modifications
```

### Gérer les produits intégrés de Google Play

```
1. google_list_iap → lister tous les produits
2. google_create_iap → créer un nouveau produit géré
3. google_update_iap → modifier le prix ou la description
4. google_delete_iap → supprimer un produit
```

### Créer un abonnement Google Play

```
1. google_create_subscription → créer l'abonnement avec ses fiches et un
   forfait de base (période de facturation, période de grâce, tarifs régionaux en micros).
   Le forfait de base est créé à l'état DRAFT.
2. google_activate_subscription_base_plan → passer le forfait de base à ACTIVE afin
   qu'il puisse être acheté dans le Play Store.
3. google_deactivate_subscription_base_plan → suspendre les ventes sans supprimer
   le forfait.
4. google_archive_subscription → archiver l'abonnement lorsqu'il est retiré.
```

Exemple d'arguments pour `google_create_subscription` :

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

Les prix sont exprimés en **micros** (1 USD = 1 000 000 micros) et convertis en interne
vers la structure `Money` de l'API Play (`units` + `nanos`). `regionsVersion`
vaut par défaut `2022/02`, valeur que l'API Play exige actuellement lorsque
des tarifs régionaux sont fournis.

## Licence

MIT
