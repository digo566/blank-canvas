

## Plano: Clonar Grape System para este projeto

### Situacao Atual

- **Banco de dados**: Completamente vazio. Os arquivos de migracoes existem no projeto mas nunca foram aplicados ao novo Supabase (quofxsvpgpbsjqldrcyd).
- **Frontend**: Foi limpo anteriormente -- so existem `Index.tsx` (tela em branco) e `NotFound.tsx`. Todos os componentes, paginas, hooks e libs foram deletados.
- **Edge Functions**: Foram deletadas na limpeza anterior.
- **config.toml**: Tem conflito de merge nao resolvido.
- **types.ts**: Vazio (sem tabelas definidas).

### O que precisa ser feito

#### 1. Aplicar o schema completo do banco de dados

Criar uma unica migracao consolidada que cria todo o schema do Grape System de uma vez:

**Enums**: `order_status`, `app_role`

**Tabelas (22 total)**:
- `profiles` (perfis de restaurantes)
- `user_roles` (roles admin/restaurant)
- `products` (produtos com preco de custo e margem)
- `product_categories` (categorias com imagem)
- `product_option_groups` e `product_option_items` (opcoes de produtos)
- `clients` (clientes dos restaurantes)
- `orders` (pedidos com tracking code)
- `order_items` e `order_item_options` (itens dos pedidos)
- `carts` e `cart_items` (carrinhos abandonados)
- `interactions` (historico WhatsApp)
- `expenses` e `expense_categories` (despesas)
- `accounts_payable` e `accounts_receivable` (contas)
- `inventory` e `inventory_movements` (estoque)
- `financial_summaries` (resumos financeiros)
- `ai_conversations` (chat IA)
- `suggestion_feedback` (feedback de sugestoes)
- `analytics_alerts` e `analytics_predictions` (analytics)
- `leads` (leads da landing page)
- `subscriptions` (assinaturas Asaas)

**Funcoes**: `has_role`, `handle_new_user`, `update_updated_at_column`, `update_order_timestamps`, `mark_abandoned_carts`, `generate_tracking_code`, `set_tracking_code_on_insert`, `clear_tracking_code_on_delivery`, `get_public_profile`, `get_public_profile_with_phone`, `get_public_products`, `get_public_products_safe`, `check_restaurant_subscription`, `get_my_subscription`

**Triggers**: Auto-update `updated_at`, tracking code auto, status timestamps, cart timestamps, new user handler

**RLS Policies**: Todas as politicas de seguranca (restaurant owner, admin, client, public)

**Storage Buckets**: `restaurant-images`, `product-images`, `category-images`

**Realtime**: Habilitado para `orders`

#### 2. Copiar todos os arquivos frontend do Grape System

- **13 componentes**: `AuthRecoveryListener`, `CartModal`, `CategoryManager`, `CategorySelectionGrid`, `ClientAuth`, `DashboardLayout`, `ImageUpload`, `NavLink`, `ProductOptionsDialog`, `ProductOptionsManager` + analytics (6) + finance (5)
- **16 paginas**: `Index`, `Auth`, `Dashboard`, `Products`, `Orders`, `Customers`, `AbandonedCarts`, `Analytics`, `Finance`, `Settings`, `PublicStore`, `TrackOrder`, `Admin`, `ResetPassword`, `Subscription`, `NotFound`
- **8 hooks**: `useAdminCheck`, `useAnalyticsAI`, `useAnalyticsData`, `useFinancialAI`, `useFinancialData`, `useIntelligentAnalytics`, `useOrderNotifications`, `useSubscription`
- **7 arquivos lib**: `analytics/*`, `finance/*`, `errorHandler`

#### 3. Copiar Edge Functions

- `public-checkout` (checkout publico)
- `analytics-ai-chat` (chat IA analytics)
- `financial-ai-chat` (chat IA financeiro)
- `asaas-subscription` (assinaturas)

#### 4. Corrigir arquivos de configuracao

- **config.toml**: Resolver merge conflict, adicionar configuracoes das edge functions
- **App.tsx**: Restaurar todas as rotas do Grape System
- **types.ts**: Sera auto-atualizado apos a migracao

#### 5. Auditoria de integracao

Apos tudo aplicado, verificar:
- Todas as tabelas existem no banco
- Types.ts reflete o schema completo
- Todas as paginas compilam sem erro TypeScript
- Edge functions deployam corretamente
- RLS policies estao ativas
- Storage buckets existem
- Tirar screenshots para confirmar

### Observacao importante

A edge function `financial-ai-chat` usa `GEMINI_API_KEY` que pode nao estar configurada neste projeto. A `asaas-subscription` usa `ASAAS_API_KEY`. Sera necessario configurar esses secrets separadamente.

