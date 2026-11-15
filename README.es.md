[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | **Español** | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

Un servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) unificado para **App Store Connect** y **Google Play Console**. Gestiona fichas de apps, capturas de pantalla, lanzamientos, reseñas y envíos a revisión, todo desde tu asistente de IA.

## Cuándo usarlo

Requiere **Node.js 22 o posterior**. Actualiza Node.js antes de instalar o actualizar
desde un entorno de ejecución anterior.

Usa este MCP cuando necesites:

- **"Actualizar la descripción y las palabras clave de mi app en App Store"** — modificar las localizaciones de la versión y de la información de la app
- **"Subir nuevas capturas de pantalla para iPhone 16 Pro"** — crear conjuntos de capturas y subir imágenes
- **"Enviar una nueva versión a revisión"** — crear la versión, asignar la compilación, definir la información de revisión y enviar
- **"Consultar el estado de la revisión de mi app"** — listar versiones y comprobar el estado de revisión
- **"Responder a una reseña de usuario en Google Play"** — listar reseñas y responder
- **"Crear un lanzamiento por etapas en Google Play"** — crear una edición, crear un lanzamiento en un track y confirmar
- **"Gestionar los testers beta de TestFlight"** — crear grupos, invitar testers y gestionar el acceso
- **"Configurar compras dentro de la app"** — crear y gestionar compras integradas y grupos de suscripciones en ambas plataformas
- **"Registrar un nuevo dispositivo para desarrollo"** — gestionar dispositivos, certificados y perfiles de aprovisionamiento

## Funciones

### Apple App Store Connect (71 herramientas)
| Categoría | Herramientas |
|----------|-------|
| Gestión de apps | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle ID | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Capacidades de Bundle ID | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| Versiones | `apple_list_versions`, `apple_create_version` |
| Localizaciones de versión | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| Localizaciones de información de la app | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| Capturas de pantalla | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| Compilaciones | `apple_list_builds`, `apple_assign_build` |
| Clasificación por edad | `apple_get_age_rating`, `apple_update_age_rating` |
| Información de revisión | `apple_update_review_detail` |
| Envío | `apple_submit_for_review`, `apple_cancel_submission` |
| Precios | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| Reseñas de clientes | `apple_list_reviews`, `apple_respond_to_review` |
| Certificados | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| Perfiles de aprovisionamiento | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| Dispositivos | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| Grupos beta de TestFlight | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| Testers beta de TestFlight | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| Compras dentro de la app | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| Grupos de suscripciones | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| Declaraciones de accesibilidad | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| Puntos de precio | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| Códigos de oferta | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| Ofertas de recuperación | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (47 herramientas)
| Categoría | Herramientas |
|----------|-------|
| Ciclo de vida de ediciones | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play App Signing³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| Detalles de la app | `google_get_details`, `google_update_details` |
| Ficha de Play Store | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| Disponibilidad por país | `google_get_country_availability` |
| Testers | `google_get_testers`, `google_update_testers` |
| Imágenes | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| Tracks y lanzamientos | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| Reseñas¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| Productos integrados en la app | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| Suscripciones | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| Productos de pago único² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Si `google_list_reviews` devuelve un array vacío para una app que tiene reseñas visibles en Play Console, comprueba primero que la cuenta de servicio vinculada tenga el permiso de cuenta **"Responder a las reseñas"** (Play Console → Usuarios y permisos): la API no genera un error específico cuando falta el permiso, simplemente no devuelve resultados. Ten en cuenta también que el endpoint solo muestra las reseñas recientes; usa `pageToken` para paginar y obtener más.

² Los productos de pago único (`monetization.onetimeproducts`) son el modelo de compra más reciente de Google Play para artículos de compra o alquiler, distinto de la antigua API `inappproducts`. `google_create_one_time_product` rechaza los ID de producto existentes; usa `google_update_one_time_product` para actualizar. Las opciones de compra se crean activas de forma predeterminada; usa `google_deactivate_purchase_option` para retirar una sin eliminar el producto.

³ Las herramientas de Play App Signing solo admiten apps empresariales que usen claves de Google Cloud KMS autoalojadas. La inscripción y la rotación con firma gestionada por Google estándar siguen siendo operaciones de Play Console.

### Prompts (2)
| Prompt | Descripción |
|--------|-------------|
| `app_release_checklist` | Lista de verificación guiada para publicar una actualización de la app: recorre la creación de la versión, los metadatos, la asignación de la compilación y el envío para iOS y/o Android |
| `app_store_optimization` | Auditoría ASO que revisa los metadatos actuales de la ficha (título, descripción, palabras clave, capturas de pantalla, localización) y ofrece recomendaciones de mejora aplicables |

### Recursos (2)
| URI | Descripción |
|-----|-------------|
| `app-publish://config` | Configuración actual del servidor: cuentas conectadas, métodos de autenticación y número de herramientas |
| `app-publish://supported-platforms` | Todas las herramientas compatibles agrupadas por plataforma, con descripciones |

## Configuración

### 1. Ejecutar desde npm

No se necesita clonar ni instalar nada en local. La configuración del cliente MCP que se muestra más abajo ejecuta la última versión publicada en npm mediante `npx`.

Si ya registraste el servidor con una versión fija (por ejemplo `@kagayoi/app-publish-mcp@1.0.5`), cambia el argumento del paquete en ese registro a `@kagayoi/app-publish-mcp@latest`. Actualizar este README no modifica los registros existentes, pero tras ese cambio cada inicio usará automáticamente la última versión.

Para ejecutar con Bun en lugar de Node.js, usa `bunx --bun` con el mismo nombre de paquete:

```sh
bunx --bun @kagayoi/app-publish-mcp@latest
```

En la configuración de un cliente MCP, usa `bunx` como comando y
`["--bun", "@kagayoi/app-publish-mcp@latest"]` como argumentos.

### 2. Credenciales de Apple

1. Ve a [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Crea una clave de API con el rol **App Manager**
3. Descarga el archivo `.p8`
4. Anota el **Key ID** y el **Issuer ID**

### 3. Credenciales de Google

Elige una cuenta de servicio u OAuth. Puedes configurar solo Apple o solo Google;
omite las variables de credenciales de la otra plataforma.

**Cuenta de servicio:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Activa la **Google Play Android Developer API**
3. Crea una **cuenta de servicio** y descarga la clave JSON
4. En Google Play Console, concede acceso a la cuenta de servicio en **Settings > API access**

**OAuth:** crea un cliente OAuth de tipo aplicación de escritorio en Google Cloud Console, define
`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el entorno de tu terminal y ejecuta:

```sh
npx --yes @kagayoi/app-publish-mcp@latest auth google
```

Con Bun, ejecuta en su lugar `bunx --bun @kagayoi/app-publish-mcp@latest auth google`.

Completa el inicio de sesión en el navegador desde el mismo equipo. El comando escucha en
`127.0.0.1:19847` y guarda las credenciales en `~/.app-publish-mcp/google.json`.
Reinicia el servidor MCP para cargarlas. Como alternativa, proporciona al servidor las tres variables
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`.
Una cuenta de servicio tiene prioridad sobre OAuth; un entorno OAuth completo tiene
prioridad sobre las credenciales guardadas. Un entorno OAuth incompleto aún permite
cargar las credenciales guardadas.

Los mensajes que muestra `auth google` y la página de inicio de sesión del navegador aparecen en
tu idioma (japonés, inglés, chino simplificado, chino tradicional,
coreano, español, francés, alemán o portugués de Brasil). La línea de comandos
sigue `APP_PUBLISH_MCP_LANGUAGE`, luego `LC_ALL`, `LC_MESSAGES`, `LANG` y la
configuración regional del sistema operativo; define `APP_PUBLISH_MCP_LANGUAGE` (por ejemplo `ja` o `pt-BR`) para elegir
un idioma de forma explícita. La página del navegador sigue el `Accept-Language` del navegador.
Las descripciones de las herramientas MCP y los errores devueltos al asistente de IA permanecen en inglés,
y los idiomas de la ficha de la tienda, como `locale` y `languageCode`, son argumentos de la API
que esta configuración no modifica.

### 4. Añadir a Claude Code

Añade la siguiente configuración a `.mcp.json` en la raíz de tu proyecto, como se describe
en la [documentación de MCP de Claude Code](https://code.claude.com/docs/en/mcp).
Las entradas `${...}` leen las credenciales del entorno que inicia Claude
Code; elimina las entradas de la plataforma o el método de autenticación que no uses.

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

## Ejemplos de uso

### Enviar una actualización de una app iOS

```
1. apple_list_apps → obtener el ID de la app
2. apple_create_version → crear la versión 1.1.0
3. apple_list_version_localizations → obtener los ID de localización
4. apple_update_version_localization → definir whatsNew y description
5. apple_list_builds → encontrar la compilación subida
6. apple_assign_build → asociar la compilación a la versión
7. apple_update_review_detail → definir los datos de contacto del revisor
8. apple_submit_for_review → ¡enviar!
```

Si ya preparaste un envío a revisión en App Store Connect (por ejemplo,
una versión de la app junto con suscripciones), pasa su `submissionId` a
`apple_submit_for_review` junto con `appId`, `versionId` y `platform`.
La herramienta verifica la app, la plataforma y la versión adjunta, y luego envía **todos
los elementos de ese envío existente** sin reemplazarlos. Sin
`submissionId`, crea un nuevo envío que contiene únicamente la versión de la app.

Si la solicitud final de envío falla o agota el tiempo de espera, la herramienta conserva el envío
e informa de su ID: es posible que Apple haya aceptado la solicitud. Comprueba su estado en
App Store Connect antes de reintentar con ese mismo `submissionId`. No crees
un nuevo envío ni canceles una revisión aceptada solo para recuperar una respuesta perdida.
Reintentar un envío coincidente en `WAITING_FOR_REVIEW` o `IN_REVIEW` devuelve
su estado actual sin volver a enviarlo.

### Publicar una app Android

```
1. google_create_edit → iniciar la sesión de edición
2. google_update_details → actualizar la información de contacto
3. google_update_listing → actualizar la ficha de la tienda
4. google_upload_bundle → subir el archivo .aab
5. google_create_release → crear un lanzamiento en borrador en el track de producción (versionCodes obligatorio; define status explícitamente para desplegarlo)
6. google_validate_edit → comprobar si hay errores
7. google_commit_edit → publicar los cambios
```

### Gestionar los productos integrados de Google Play

```
1. google_list_iap → listar todos los productos
2. google_create_iap → crear un nuevo producto gestionado
3. google_update_iap → actualizar el precio o la descripción
4. google_delete_iap → eliminar un producto
```

### Crear una suscripción de Google Play

```
1. google_create_subscription → crear la suscripción con fichas y un
   plan base (periodo de facturación, periodo de gracia, precios regionales en micros).
   El plan base se crea en estado DRAFT.
2. google_activate_subscription_base_plan → pasar el plan base a ACTIVE para
   que pueda comprarse en Play Store.
3. google_deactivate_subscription_base_plan → pausar las ventas sin eliminar
   el plan.
4. google_archive_subscription → archivar la suscripción cuando se retire.
```

Ejemplo de argumentos para `google_create_subscription`:

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

Los precios se indican en **micros** (1 USD = 1.000.000 de micros) y se convierten
internamente al formato `Money` de la API de Play (`units` + `nanos`). `regionsVersion`
tiene como valor predeterminado `2022/02`, que la API de Play exige actualmente cuando se
proporcionan precios regionales.

## Licencia

MIT
