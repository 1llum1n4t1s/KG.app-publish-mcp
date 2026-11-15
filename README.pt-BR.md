[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | **Português (Brasil)**

# @kagayoi/app-publish-mcp

[![npm version](https://img.shields.io/npm/v/%40kagayoi%2Fapp-publish-mcp)](https://www.npmjs.com/package/@kagayoi/app-publish-mcp)

Um servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) unificado para o **App Store Connect** e o **Google Play Console**. Gerencie páginas de apps, capturas de tela, lançamentos, avaliações e envios para revisão, tudo a partir do seu assistente de IA.

## Quando usar

Requer **Node.js 22 ou posterior**. Atualize o Node.js antes de instalar ou atualizar
a partir de um runtime mais antigo.

Use este MCP quando precisar:

- **"Atualizar a descrição e as palavras-chave do meu app na App Store"** — modificar as localizações da versão e das informações do app
- **"Enviar novas capturas de tela para o iPhone 16 Pro"** — criar conjuntos de capturas e enviar imagens
- **"Enviar uma nova versão para revisão"** — criar a versão, atribuir o build, definir as informações de revisão e enviar
- **"Verificar o status da revisão do meu app"** — listar versões e verificar o estado da revisão
- **"Responder a uma avaliação de usuário no Google Play"** — listar avaliações e responder
- **"Criar um lançamento em etapas no Google Play"** — criar uma edição, criar um lançamento em uma trilha e confirmar
- **"Gerenciar os testadores beta do TestFlight"** — criar grupos, convidar testadores e gerenciar o acesso
- **"Configurar compras no app"** — criar e gerenciar compras no app e grupos de assinaturas nas duas plataformas
- **"Registrar um novo dispositivo para desenvolvimento"** — gerenciar dispositivos, certificados e perfis de provisionamento

## Recursos

### Apple App Store Connect (71 ferramentas)
| Categoria | Ferramentas |
|----------|-------|
| Gerenciamento de apps | `apple_list_apps`, `apple_get_app`, `apple_get_app_info`, `apple_update_category` |
| Bundle IDs | `apple_list_bundle_ids`, `apple_create_bundle_id` |
| Capacidades de Bundle ID | `apple_list_bundle_id_capabilities`, `apple_enable_capability`, `apple_disable_capability` |
| Versões | `apple_list_versions`, `apple_create_version` |
| Localizações da versão | `apple_list_version_localizations`, `apple_create_version_localization`, `apple_update_version_localization` |
| Localizações das informações do app | `apple_list_app_info_localizations`, `apple_update_app_info_localization` |
| Capturas de tela | `apple_list_screenshot_sets`, `apple_create_screenshot_set`, `apple_upload_screenshot`, `apple_delete_screenshot` |
| Builds | `apple_list_builds`, `apple_assign_build` |
| Classificação etária | `apple_get_age_rating`, `apple_update_age_rating` |
| Informações de revisão | `apple_update_review_detail` |
| Envio | `apple_submit_for_review`, `apple_cancel_submission` |
| Preços | `apple_get_pricing`, `apple_get_app_price_points`, `apple_set_price`, `apple_list_availability` |
| Avaliações de clientes | `apple_list_reviews`, `apple_respond_to_review` |
| Certificados | `apple_list_certificates`, `apple_create_certificate`, `apple_revoke_certificate` |
| Perfis de provisionamento | `apple_list_profiles`, `apple_create_profile`, `apple_delete_profile` |
| Dispositivos | `apple_list_devices`, `apple_register_device`, `apple_update_device` |
| Grupos beta do TestFlight | `apple_list_beta_groups`, `apple_create_beta_group`, `apple_delete_beta_group`, `apple_add_beta_testers_to_group`, `apple_remove_beta_testers_from_group` |
| Testadores beta do TestFlight | `apple_list_beta_testers`, `apple_invite_beta_tester`, `apple_delete_beta_tester` |
| Compras no app | `apple_list_iap`, `apple_create_iap`, `apple_get_iap`, `apple_delete_iap` |
| Grupos de assinaturas | `apple_list_subscription_groups`, `apple_create_subscription_group`, `apple_delete_subscription_group` |
| Declarações de acessibilidade | `apple_list_accessibility_declarations`, `apple_create_accessibility_declaration`, `apple_update_accessibility_declaration`, `apple_delete_accessibility_declaration` |
| Pontos de preço | `apple_get_subscription_price_points`, `apple_get_iap_price_points` |
| Códigos de oferta | `apple_list_subscription_offer_codes`, `apple_get_subscription_offer_code`, `apple_create_subscription_offer_code`, `apple_list_iap_offer_codes`, `apple_get_iap_offer_code`, `apple_create_iap_offer_code` |
| Ofertas de reconquista | `apple_list_win_back_offers`, `apple_get_win_back_offer` |

### Google Play Console (47 ferramentas)
| Categoria | Ferramentas |
|----------|-------|
| Ciclo de vida das edições | `google_create_edit`, `google_commit_edit`, `google_validate_edit`, `google_delete_edit` |
| Play App Signing³ | `google_enroll_app_signing`, `google_rotate_app_signing_key` |
| Detalhes do app | `google_get_details`, `google_update_details` |
| Página da loja | `google_list_listings`, `google_get_listing`, `google_update_listing`, `google_delete_listing` |
| Disponibilidade por país | `google_get_country_availability` |
| Testadores | `google_get_testers`, `google_update_testers` |
| Imagens | `google_list_images`, `google_upload_image`, `google_delete_image`, `google_delete_all_images` |
| Trilhas e lançamentos | `google_list_tracks`, `google_get_track`, `google_create_release`, `google_promote_release`, `google_halt_release` |
| Bundle / APK | `google_upload_bundle`, `google_upload_apk` |
| Avaliações¹ | `google_list_reviews`, `google_get_review`, `google_reply_to_review` |
| Produtos no app | `google_list_iap`, `google_get_iap`, `google_create_iap`, `google_update_iap`, `google_delete_iap` |
| Assinaturas | `google_list_subscriptions`, `google_get_subscription`, `google_create_subscription`, `google_archive_subscription`, `google_activate_subscription_base_plan`, `google_deactivate_subscription_base_plan` |
| Produtos de compra única² | `google_list_one_time_products`, `google_get_one_time_product`, `google_create_one_time_product`, `google_update_one_time_product`, `google_delete_one_time_product`, `google_activate_purchase_option`, `google_deactivate_purchase_option` |

¹ Se `google_list_reviews` retornar um array vazio para um app que tem avaliações visíveis no Play Console, verifique primeiro se a conta de serviço vinculada tem a permissão de conta **"Responder a avaliações"** (Play Console → Usuários e permissões) — a API não gera um erro específico quando falta a permissão, ela apenas não retorna resultados. Observe também que o endpoint só expõe avaliações recentes; use `pageToken` para paginar e obter mais.

² Produtos de compra única (`monetization.onetimeproducts`) são o modelo de compra mais recente do Google Play para itens de compra ou aluguel, distinto da API mais antiga `inappproducts`. `google_create_one_time_product` rejeita IDs de produto existentes; use `google_update_one_time_product` para atualizações. As opções de compra são criadas ativas por padrão; use `google_deactivate_purchase_option` para retirar uma sem excluir o produto.

³ As ferramentas do Play App Signing só oferecem suporte a apps corporativos que usam chaves do Google Cloud KMS hospedadas pelo próprio cliente. A inscrição e a rotação com assinatura gerenciada pelo Google padrão continuam sendo operações do Play Console.

### Prompts (2)
| Prompt | Descrição |
|--------|-------------|
| `app_release_checklist` | Checklist guiado para lançar uma atualização do app — percorre a criação da versão, os metadados, a atribuição do build e o envio para iOS e/ou Android |
| `app_store_optimization` | Auditoria de ASO que analisa os metadados atuais da página (título, descrição, palavras-chave, capturas de tela, localização) e fornece recomendações práticas de melhoria |

### Recursos (2)
| URI | Descrição |
|-----|-------------|
| `app-publish://config` | Configuração atual do servidor — contas conectadas, métodos de autenticação e contagem de ferramentas |
| `app-publish://supported-platforms` | Todas as ferramentas compatíveis agrupadas por plataforma, com descrições |

## Configuração

### 1. Executar a partir do npm

Não é necessário clonar nem instalar nada localmente. A configuração do cliente MCP abaixo executa a versão mais recente publicada no npm com `npx`.

Se você já registrou o servidor com uma versão fixa (por exemplo, `@kagayoi/app-publish-mcp@1.0.5`), altere o argumento do pacote nesse registro para `@kagayoi/app-publish-mcp@latest`. Atualizar este README não altera os registros existentes, mas, depois dessa edição, cada inicialização usará automaticamente a versão mais recente.

Para executar com Bun em vez de Node.js, use `bunx --bun` e o mesmo nome de pacote:

```sh
bunx --bun @kagayoi/app-publish-mcp@latest
```

Na configuração de um cliente MCP, use `bunx` como comando e
`["--bun", "@kagayoi/app-publish-mcp@latest"]` como argumentos.

### 2. Credenciais da Apple

1. Acesse [App Store Connect > Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Crie uma chave de API com a função **App Manager**
3. Baixe o arquivo `.p8`
4. Anote o **Key ID** e o **Issuer ID**

### 3. Credenciais do Google

Escolha uma conta de serviço ou OAuth. Você pode configurar apenas a Apple ou apenas o Google;
omita as variáveis de credenciais da outra plataforma.

**Conta de serviço:**

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Ative a **Google Play Android Developer API**
3. Crie uma **conta de serviço** e baixe a chave JSON
4. No Google Play Console, conceda acesso à conta de serviço em **Settings > API access**

**OAuth:** crie um cliente OAuth do tipo aplicativo para computador no Google Cloud Console, defina
`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente do seu terminal e execute:

```sh
npx --yes @kagayoi/app-publish-mcp@latest auth google
```

Com o Bun, execute `bunx --bun @kagayoi/app-publish-mcp@latest auth google` no lugar.

Conclua o login no navegador no mesmo computador. O comando escuta em
`127.0.0.1:19847` e salva as credenciais em `~/.app-publish-mcp/google.json`.
Reinicie o servidor MCP para carregá-las. Como alternativa, forneça ao servidor as três variáveis
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REFRESH_TOKEN`.
Uma conta de serviço tem precedência sobre o OAuth; um ambiente OAuth completo tem
precedência sobre as credenciais salvas. Um ambiente OAuth incompleto ainda permite
que as credenciais salvas sejam carregadas.

As mensagens exibidas por `auth google` e a página de login do navegador aparecem no
seu idioma (japonês, inglês, chinês simplificado, chinês tradicional,
coreano, espanhol, francês, alemão ou português do Brasil). A linha de comando
segue `APP_PUBLISH_MCP_LANGUAGE`, depois `LC_ALL`, `LC_MESSAGES`, `LANG` e a
localidade do sistema operacional; defina `APP_PUBLISH_MCP_LANGUAGE` (por exemplo, `ja` ou `pt-BR`) para escolher
um idioma explicitamente. A página do navegador segue o `Accept-Language` do navegador.
As descrições das ferramentas MCP e os erros retornados ao assistente de IA permanecem em inglês,
e os idiomas da página da loja, como `locale` e `languageCode`, são argumentos da API
que essa configuração não altera.

### 4. Adicionar ao Claude Code

Adicione a configuração a seguir ao `.mcp.json` na raiz do seu projeto, conforme descrito
na [documentação de MCP do Claude Code](https://code.claude.com/docs/en/mcp).
As entradas `${...}` leem as credenciais do ambiente que inicia o Claude
Code; remova as entradas de uma plataforma ou de um método de autenticação que você não use.

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

## Exemplos de uso

### Enviar uma atualização de app iOS

```
1. apple_list_apps → obter o ID do app
2. apple_create_version → criar a versão 1.1.0
3. apple_list_version_localizations → obter os IDs de localização
4. apple_update_version_localization → definir whatsNew e description
5. apple_list_builds → encontrar o build enviado
6. apple_assign_build → associar o build à versão
7. apple_update_review_detail → definir as informações de contato do revisor
8. apple_submit_for_review → enviar!
```

Se você já preparou um envio para revisão no App Store Connect (por exemplo,
uma versão do app junto com assinaturas), passe o `submissionId` dele para
`apple_submit_for_review` junto com `appId`, `versionId` e `platform`.
A ferramenta verifica o app, a plataforma e a versão anexada e, em seguida, envia **todos
os itens desse envio existente** sem substituí-los. Sem
`submissionId`, ela cria um novo envio contendo apenas a versão do app.

Se a solicitação final de envio falhar ou expirar, a ferramenta preserva o envio
e informa o ID dele: a Apple pode ter aceitado a solicitação. Verifique o estado no
App Store Connect antes de tentar novamente com esse mesmo `submissionId`. Não crie
um novo envio nem cancele uma revisão aceita apenas para recuperar uma resposta perdida.
Tentar novamente um envio correspondente em `WAITING_FOR_REVIEW` ou `IN_REVIEW` retorna
o estado atual sem enviá-lo de novo.

### Lançar um app Android

```
1. google_create_edit → iniciar a sessão de edição
2. google_update_details → atualizar as informações de contato
3. google_update_listing → atualizar a página da loja
4. google_upload_bundle → enviar o arquivo .aab
5. google_create_release → criar um lançamento em rascunho na trilha de produção (versionCodes obrigatório; defina status explicitamente para liberar)
6. google_validate_edit → verificar se há erros
7. google_commit_edit → publicar as alterações
```

### Gerenciar os produtos no app do Google Play

```
1. google_list_iap → listar todos os produtos
2. google_create_iap → criar um novo produto gerenciado
3. google_update_iap → atualizar o preço ou a descrição
4. google_delete_iap → remover um produto
```

### Criar uma assinatura do Google Play

```
1. google_create_subscription → criar a assinatura com listagens e um
   plano base (período de cobrança, período de carência, preços regionais em micros).
   O plano base é criado no estado DRAFT.
2. google_activate_subscription_base_plan → mudar o plano base para ACTIVE para
   que ele possa ser comprado na Play Store.
3. google_deactivate_subscription_base_plan → pausar as vendas sem excluir
   o plano.
4. google_archive_subscription → arquivar a assinatura quando ela for descontinuada.
```

Exemplo de argumentos para `google_create_subscription`:

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

Os preços são informados em **micros** (1 USD = 1.000.000 de micros) e convertidos
internamente para o formato `Money` da API do Play (`units` + `nanos`). `regionsVersion`
tem como padrão `2022/02`, que a API do Play atualmente exige quando preços regionais
são informados.

## Licença

MIT
