import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, restaurantId } = await req.json();

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurantId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [profileRes, productsRes, categoriesRes, zonesRes, couponsRes, loyaltyRes] = await Promise.all([
      supabase.from("profiles").select("restaurant_name, phone, min_delivery_time, max_delivery_time, opening_hours, delivery_mode").eq("id", restaurantId).single(),
      supabase.from("products").select("id, name, description, price, category_id, available").eq("restaurant_id", restaurantId).eq("available", true),
      supabase.from("product_categories").select("id, name").eq("restaurant_id", restaurantId).order("display_order"),
      supabase.from("delivery_zones").select("neighborhood_name, delivery_fee, is_active").eq("restaurant_id", restaurantId).eq("is_active", true).order("neighborhood_name"),
      supabase.from("coupons").select("id, code, description, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, expires_at").eq("restaurant_id", restaurantId).eq("is_active", true),
      supabase.from("loyalty_config").select("*").eq("restaurant_id", restaurantId).eq("is_enabled", true).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const deliveryZones = zonesRes.data || [];
    const coupons = (couponsRes.data || []).filter((c: any) => {
      if (c.max_uses && c.current_uses >= c.max_uses) return false;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
      return true;
    });
    const deliveryMode = profile?.delivery_mode || "delivery_and_pickup";
    const loyaltyConfig = loyaltyRes.data;

    // Fetch product options
    const productIds = products.map((p: any) => p.id);
    let optionGroups: any[] = [];
    let optionItems: any[] = [];

    if (productIds.length > 0) {
      const ogRes = await supabase.from("product_option_groups").select("id, name, product_id, is_required, min_selections, max_selections").in("product_id", productIds);
      optionGroups = ogRes.data || [];

      if (optionGroups.length > 0) {
        const ogIds = optionGroups.map((og: any) => og.id);
        const oiRes = await supabase.from("product_option_items").select("id, name, option_group_id, price_modifier").in("option_group_id", ogIds);
        optionItems = oiRes.data || [];
      }
    }

    // Build product lookup for order creation
    const productLookup = new Map(products.map((p: any) => [p.name.toLowerCase().trim(), p]));
    const optionItemLookup = new Map(optionItems.map((oi: any) => [oi.name.toLowerCase().trim(), oi]));

    // Build menu text
    const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));
    
    let menuText = "";
    for (const cat of categories) {
      const catProducts = products.filter((p: any) => p.category_id === cat.id);
      if (catProducts.length === 0) continue;
      menuText += `\n📂 ${cat.name}:\n`;
      for (const p of catProducts) {
        menuText += `  • ${p.name} - R$ ${Number(p.price).toFixed(2)}`;
        if (p.description) menuText += ` (${p.description})`;
        menuText += "\n";
        
        const pGroups = optionGroups.filter((og: any) => og.product_id === p.id);
        for (const og of pGroups) {
          const items = optionItems.filter((oi: any) => oi.option_group_id === og.id);
          if (items.length > 0) {
            menuText += `    ⚙️ ${og.name}${og.is_required ? ' (obrigatório)' : ' (opcional)'}:\n`;
            for (const item of items) {
              const mod = Number(item.price_modifier || 0);
              menuText += `      - ${item.name}${mod > 0 ? ` (+R$ ${mod.toFixed(2)})` : mod < 0 ? ` (-R$ ${Math.abs(mod).toFixed(2)})` : ''}\n`;
            }
          }
        }
      }
    }

    const uncategorized = products.filter((p: any) => !p.category_id);
    if (uncategorized.length > 0) {
      menuText += `\n📂 Outros:\n`;
      for (const p of uncategorized) {
        menuText += `  • ${p.name} - R$ ${Number(p.price).toFixed(2)}`;
        if (p.description) menuText += ` (${p.description})`;
        menuText += "\n";
      }
    }

    // Build product list for JSON reference
    const productListJson = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
    }));

    const optionItemsJson = optionItems.map((oi: any) => ({
      id: oi.id,
      name: oi.name,
      option_group_id: oi.option_group_id,
      price_modifier: Number(oi.price_modifier || 0),
    }));

    // Build delivery zones text
    let deliveryZonesText = "";
    if (deliveryZones.length > 0) {
      deliveryZonesText = "\nBAIRROS ATENDIDOS E TAXAS DE ENTREGA:\n";
      for (const zone of deliveryZones) {
        deliveryZonesText += `  • ${zone.neighborhood_name} - Taxa: R$ ${Number(zone.delivery_fee).toFixed(2)}\n`;
      }
    }

    // Build coupons text
    let couponsText = "";
    if (coupons.length > 0) {
      couponsText = "\nCUPONS DE DESCONTO DISPONÍVEIS:\n";
      for (const coupon of coupons) {
        const discountStr = coupon.discount_type === "percentage"
          ? `${coupon.discount_value}% de desconto`
          : `R$ ${Number(coupon.discount_value).toFixed(2)} de desconto`;
        couponsText += `  • ${coupon.code} - ${discountStr}`;
        if (coupon.description) couponsText += ` (${coupon.description})`;
        if (coupon.min_order_amount > 0) couponsText += ` - pedido mínimo R$ ${Number(coupon.min_order_amount).toFixed(2)}`;
        couponsText += "\n";
      }
    }

    const couponsJson = coupons.map((c: any) => ({
      id: c.id,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount || 0),
    }));

    // Build loyalty text
    let loyaltyText = "";
    if (loyaltyConfig) {
      const rewardStr = loyaltyConfig.reward_type === "percentage"
        ? `${loyaltyConfig.reward_value}% de desconto`
        : loyaltyConfig.reward_type === "fixed"
          ? `R$ ${Number(loyaltyConfig.reward_value).toFixed(2)} de desconto`
          : "entrega grátis";
      loyaltyText = `\nPROGRAMA DE FIDELIDADE ATIVO:\n- A cada R$ ${Number(loyaltyConfig.spend_threshold).toFixed(2)} em compras acumuladas, o cliente ganha ${rewardStr}.\n- ${loyaltyConfig.reward_description || ""}\n- Quando o cliente informar o telefone, você pode consultar o progresso de fidelidade dele.\n`;
    }

    const deliveryModeText = deliveryMode === "delivery_only"
      ? "MODO: Apenas DELIVERY (entrega no endereço do cliente)"
      : "MODO: DELIVERY (entrega) ou RETIRADA NO LOCAL (o cliente escolhe)";

    const systemPrompt = `Você é o atendente virtual do restaurante "${profile?.restaurant_name || 'Restaurante'}". 
Seja simpático, prestativo e objetivo. Fale de forma natural e amigável como um atendente real.

INFORMAÇÕES DO RESTAURANTE:
- Nome: ${profile?.restaurant_name || 'Restaurante'}
${profile?.phone ? `- Telefone: ${profile.phone}` : ''}
- Tempo de entrega: ${profile?.min_delivery_time || 30} a ${profile?.max_delivery_time || 60} minutos
- ${deliveryModeText}
${deliveryZonesText}
${couponsText}
${loyaltyText}

CARDÁPIO DISPONÍVEL:
${menuText || 'Nenhum produto disponível no momento.'}

PRODUTOS (referência para IDs):
${JSON.stringify(productListJson)}

OPÇÕES (referência para IDs):
${JSON.stringify(optionItemsJson)}

CUPONS (referência para IDs):
${JSON.stringify(couponsJson)}

REGRAS IMPORTANTES:
1. Só ofereça produtos que estão no cardápio acima. NUNCA invente produtos.
2. Ajude o cliente a escolher, sugira combinações e explique os produtos.

3. **MODO DE ENTREGA**: 
   ${deliveryMode === "delivery_and_pickup" 
     ? `- Pergunte ao cliente se prefere DELIVERY (entrega) ou RETIRADA NO LOCAL.
   - Se for RETIRADA, NÃO precisa coletar endereço nem cobrar taxa de entrega. Defina "delivery_type": "pickup" no JSON.
   - Se for DELIVERY, siga as regras de bairro e taxa abaixo. Defina "delivery_type": "delivery" no JSON.`
     : `- Todos os pedidos são DELIVERY (entrega). Defina "delivery_type": "delivery" no JSON.`}

4. **BAIRROS E TAXA DE ENTREGA** (para delivery):
   ${deliveryZones.length > 0 
     ? `- Apresente a lista de bairros atendidos ao cliente e peça para ele escolher.
   - Mostre a taxa de entrega do bairro escolhido.
   - Se o bairro do cliente NÃO estiver na lista, diga que o bairro não está na lista de entrega padrão, peça para o cliente digitar o bairro e informe que o restaurante entrará em contato para confirmar a taxa de entrega. Neste caso, coloque "delivery_fee": 0 e adicione uma nota no campo "notes" com "BAIRRO NÃO CADASTRADO: [nome do bairro] - taxa a confirmar".
   - O total do pedido deve INCLUIR a taxa de entrega.`
     : `- Não há bairros cadastrados. Colete o endereço normalmente.`}

5. **CUPONS DE DESCONTO**:
   ${coupons.length > 0
     ? `- Se o cliente perguntar sobre promoções, descontos ou cupons, informe os cupons disponíveis listados acima.
   - Quando o cliente informar um cupom, VALIDE: verifique se o código existe na lista, se o pedido mínimo é atingido.
   - Aplique o desconto ao total e mostre o valor original, o desconto e o total final.
   - No JSON do pedido, inclua "coupon_code", "coupon_id" e "coupon_discount".`
     : `- Não há cupons de desconto disponíveis no momento. Se o cliente perguntar, informe que não há promoções ativas.`}

6. ANTES de finalizar o pedido, você DEVE coletar TODAS estas informações obrigatórias, uma por vez se necessário:
   a) **Nome completo** do cliente
   b) **Telefone/WhatsApp** do cliente - DEVE ter DDD + número (ex: 85999998888). Se o cliente enviar sem DDD, PEÇA o DDD. Sempre salve no formato com DDD (11 dígitos).
   ${deliveryMode === "delivery_and_pickup" ? `c) **Tipo de entrega**: Delivery ou Retirada no local` : ""}
   ${deliveryMode === "delivery_and_pickup" ? `d)` : `c)`} **Endereço COMPLETO** de entrega (apenas para delivery) - colete SEPARADAMENTE se necessário:
      - Rua/Avenida com número
      - Bairro (${deliveryZones.length > 0 ? "apresente a lista de bairros e peça para escolher" : "pergunte"})
      - Complemento (apto, bloco, referência) - pergunte mesmo que pareça simples
      - Cidade (se necessário)
   ${deliveryMode === "delivery_and_pickup" ? `e)` : `d)`} **Itens do pedido** com quantidades e opções/observações de cada item
   ${deliveryMode === "delivery_and_pickup" ? `f)` : `e)`} **Cupom de desconto** (pergunte se o cliente tem algum cupom)
   ${deliveryMode === "delivery_and_pickup" ? `g)` : `f)`} **CPF na nota fiscal** - Pergunte se o cliente quer CPF na nota fiscal. Se sim, peça o CPF (apenas números, 11 dígitos). Se não, deixe vazio.
   ${deliveryMode === "delivery_and_pickup" ? `h)` : `g)`} **Forma de pagamento**: Pix, Dinheiro ou Cartão
   ${deliveryMode === "delivery_and_pickup" ? `i)` : `h)`} Se for Dinheiro, perguntar se **precisa de troco** e para quanto
   ${deliveryMode === "delivery_and_pickup" ? `j)` : `i)`} **Observações** gerais do pedido (alergia, restrição, etc.)

7. Se o cliente não fornecer alguma informação obrigatória, PERGUNTE antes de confirmar. NÃO pule nenhum campo.
8. TELEFONE: Se o cliente informar um número com menos de 10 dígitos, peça para confirmar com DDD. Salve APENAS números (sem traços, parênteses ou espaços). Formato esperado: DDD + número = 10 ou 11 dígitos.
9. ENDEREÇO: Sempre monte o endereço completo no formato: "Rua X, Nº Y, Bairro Z, Complemento W". Se faltar alguma parte, pergunte.
10. Faça um RESUMO COMPLETO e ORGANIZADO do pedido antes de confirmar, listando:
   - 👤 Nome
   - 📞 Telefone
   - ${deliveryMode === "delivery_and_pickup" ? "🚚 Tipo: Delivery ou Retirada\n   - " : ""}📍 Endereço completo (rua, número, bairro, complemento) ${deliveryMode === "delivery_and_pickup" ? "- se delivery" : ""}
   - 🛒 Itens (quantidade x nome - preço)
   ${deliveryZones.length > 0 ? "- 🏘️ Bairro: [nome] - Taxa: R$ X,XX\n   " : ""}- 🎟️ Cupom (se aplicado): desconto de X
   - 💰 Total ${deliveryZones.length > 0 ? "(itens + taxa de entrega - desconto)" : ""}
   - 📄 CPF na nota: informar se foi fornecido
   - 💳 Forma de pagamento
   - 📝 Observações
   
   Peça ao cliente para conferir TODOS os dados antes de confirmar.
11. Quando o cliente CONFIRMAR o pedido (disser "sim", "confirmo", "pode fechar", etc.), ALÉM da mensagem de confirmação, adicione no FINAL da sua resposta um bloco JSON no seguinte formato EXATO:

\`\`\`json_order
{
  "order_confirmed": true,
  "customer_name": "Nome Completo do Cliente",
  "customer_phone": "85999998888",
  "customer_cpf": "12345678901" ou null,
  "customer_address": "Rua Exemplo, 123, Bairro Centro, Apto 101 - Cidade",
  "delivery_type": "delivery" ou "pickup",
  "delivery_fee": 5.00,
  "delivery_neighborhood": "Centro",
  "coupon_code": "DESC10" ou null,
  "coupon_id": "uuid-do-cupom" ou null,
  "coupon_discount": 5.00,
  "payment_method": "pix" ou "dinheiro" ou "cartao",
  "needs_change": false,
  "change_amount": 0,
  "notes": "observações do pedido ou vazio",
  "items": [
    {
      "product_id": "uuid-do-produto",
      "product_name": "Nome do Produto",
      "quantity": 1,
      "unit_price": 10.00,
      "options": [
        {
          "option_item_id": "uuid-da-opcao",
          "option_item_name": "Nome da Opção",
          "price_modifier": 2.00
        }
      ]
    }
  ],
  "total_amount": 12.00
}
\`\`\`

IMPORTANTE: 
- O bloco json_order deve ser incluído APENAS quando o cliente CONFIRMAR o pedido. NÃO inclua antes da confirmação.
- O campo "customer_phone" DEVE conter APENAS números (sem +55, sem traços, sem parênteses). Exemplo: "85999998888" (DDD + número).
- O campo "customer_cpf" deve conter APENAS números (11 dígitos) se o cliente quiser CPF na nota, ou null se não quiser. Sempre pergunte ao cliente.
- O campo "customer_address" DEVE ser o endereço completo e organizado: "Rua, Número, Bairro, Complemento - Cidade". Se for retirada, coloque "Retirada no local".
- O campo "delivery_type" deve ser "delivery" ou "pickup".
- O campo "delivery_fee" deve ser a taxa de entrega (0 se for retirada ou bairro não cadastrado).
- O campo "delivery_neighborhood" deve ser o nome do bairro (vazio se for retirada).
- Os campos de cupom: "coupon_code" e "coupon_id" são null se não houver cupom. "coupon_discount" é o valor do desconto aplicado (0 se não houver).
- Os preços no JSON devem ser números (não strings), usando ponto como separador decimal.
- O "total_amount" deve ser: soma dos itens + delivery_fee - coupon_discount.

12. Se perguntarem algo fora do contexto do restaurante, educadamente redirecione para o cardápio.
13. Use emojis de forma moderada para deixar a conversa mais agradável.
14. SEMPRE responda em português brasileiro.`;

    // Build Gemini messages
    const geminiContents = [];
    
    for (const msg of messages) {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";


    // Check if the AI response contains an order confirmation JSON
    let orderCreated = false;
    let orderTrackingCode: string | null = null;

    const normalizeNumberString = (input: string) => {
      const t = input.trim().replace(/[^0-9,.-]/g, "");
      if (t.includes(",") && t.includes(".")) {
        // Common pt-BR pattern: 1.234,56
        return t.replace(/\./g, "").replace(",", ".");
      }
      if (t.includes(",")) return t.replace(",", ".");
      return t;
    };

    const toNumber = (v: unknown, fallback = 0) => {
      if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
      if (typeof v === "string") {
        const n = Number(normalizeNumberString(v));
        return Number.isFinite(n) ? n : fallback;
      }
      return fallback;
    };

    const extractOrderJson = (text: string): { raw: string; json: any } | null => {
      // 1) Prefer fenced blocks (json_order OR json) - Gemini sometimes outputs ```json```
      const fenced = text.match(/```(?:json_order|json)\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        const raw = fenced[0];
        const jsonText = fenced[1].trim();
        try {
          return { raw, json: JSON.parse(jsonText) };
        } catch {
          // fallthrough
        }
      }

      // 2) Heuristic: find an object containing "order_confirmed": true even without code fences
      const keyIdx = text.search(/"order_confirmed"\s*:\s*true/i);
      if (keyIdx === -1) return null;

      // Find nearest '{' before the key
      const start = text.lastIndexOf("{", keyIdx);
      if (start === -1) return null;

      // Scan forward to matching '}'
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (ch === "{") depth++;
        if (ch === "}") depth--;
        if (depth === 0) {
          const raw = text.slice(start, i + 1);
          try {
            return { raw, json: JSON.parse(raw) };
          } catch {
            return null;
          }
        }
      }

      return null;
    };

    const extracted = extractOrderJson(aiResponse);

    if (extracted) {
      try {
        const orderData = extracted.json;

        if (orderData?.order_confirmed && Array.isArray(orderData.items) && orderData.items.length > 0) {
          // Sanitize phone: keep only digits
          const sanitizedPhone = String(orderData.customer_phone || "").replace(/\D/g, "");
          const sanitizedName = String(orderData.customer_name || "").trim();
          const sanitizedAddress = String(orderData.customer_address || "").trim();
          const sanitizedCpf = orderData.customer_cpf ? String(orderData.customer_cpf).replace(/\D/g, "") : null;

          console.log("Order confirmed. Name:", sanitizedName, "Phone:", sanitizedPhone, "Address:", sanitizedAddress);

          // 1. Find or create client (only if we have a phone)
          let clientId: string | null = null;

          if (sanitizedPhone) {
            // Try to find by phone (exact match and also with +55 prefix)
            const phonesToSearch = [sanitizedPhone];
            if (sanitizedPhone.length === 11 || sanitizedPhone.length === 10) {
              phonesToSearch.push(`+55${sanitizedPhone}`);
            }

            const { data: existingClients } = await supabase
              .from("clients")
              .select("id")
              .eq("restaurant_id", restaurantId)
              .in("phone", phonesToSearch)
              .limit(1);

            if (existingClients && existingClients.length > 0) {
              clientId = existingClients[0].id;
              await supabase
                .from("clients")
                .update({ name: sanitizedName, address: sanitizedAddress })
                .eq("id", clientId);
            } else {
              const { data: newClient, error: clientError } = await supabase
                .from("clients")
                .insert({
                  restaurant_id: restaurantId,
                  name: sanitizedName || "Cliente",
                  phone: sanitizedPhone,
                  address: sanitizedAddress || null,
                })
                .select("id")
                .single();

              if (clientError) {
                console.error("Error creating client:", clientError);
              } else {
                clientId = newClient.id;
              }
            }
          }

          // Resolve products more robustly
          const normalizeName = (s: unknown) => String(s || "").toLowerCase().trim();
          const resolveProduct = (item: any) => {
            const id = item?.product_id;
            const name = normalizeName(item?.product_name);
            const exact = products.find((p: any) => p.id === id || normalizeName(p.name) === name);
            if (exact) return exact;

            // contains match (helps when model adds size/extra text)
            const contains = products.find((p: any) => {
              const pn = normalizeName(p.name);
              return (name && (name.includes(pn) || pn.includes(name)));
            });
            return contains || null;
          };

          // 2. Calculate total (never NaN)
          let itemsTotal = 0;
          const resolvedItems: Array<{ product: any; quantity: number; unit_price: number; options: any[] }>=[];

          for (const item of orderData.items) {
            const matchedProduct = resolveProduct(item);
            if (!matchedProduct) {
              console.warn("Unresolved product in order JSON:", item);
              continue;
            }

            const qty = Math.max(1, Math.floor(toNumber(item.quantity, 1)));
            const unitPrice = toNumber(item.unit_price, Number(matchedProduct.price));

            const options = Array.isArray(item.options) ? item.options : [];
            let optionMods = 0;
            for (const opt of options) {
              optionMods += toNumber(opt.price_modifier, 0);
            }

            const lineTotal = (unitPrice + optionMods) * qty;
            itemsTotal += lineTotal;

            resolvedItems.push({ product: matchedProduct, quantity: qty, unit_price: Number(matchedProduct.price), options });
          }

          const deliveryFee = toNumber(orderData.delivery_fee, 0);
          const couponDiscount = toNumber(orderData.coupon_discount, 0);

          // Use AI's total if valid, else compute
          const aiTotal = toNumber(orderData.total_amount, 0);
          const totalAmount = aiTotal > 0 ? aiTotal : Math.max(0, itemsTotal + deliveryFee - couponDiscount);

          // Map payment method
          let paymentMethod = String(orderData.payment_method || "dinheiro");
          const pmMap: Record<string, string> = {
            pix: "Pix",
            dinheiro: "Dinheiro",
            cartao: "Cartão",
            "cartão": "Cartão",
            credito: "Cartão",
            debito: "Cartão",
          };
          paymentMethod = pmMap[paymentMethod.toLowerCase()] || paymentMethod;

          // Build notes - organized and clear
          const noteParts: string[] = [];
          noteParts.push(`👤 Cliente: ${sanitizedName || "(não informado)"}`);
          noteParts.push(`📞 Tel: ${sanitizedPhone || "(não informado)"}`);

          const deliveryType = String(orderData.delivery_type || "delivery");
          if (deliveryType === "pickup") {
            noteParts.push("🏪 Retirada no local");
          } else {
            noteParts.push(`📍 Endereço: ${sanitizedAddress || "(não informado)"}`);
            if (orderData.delivery_neighborhood) {
              noteParts.push(`🏘️ Bairro: ${String(orderData.delivery_neighborhood)}`);
            }
            if (deliveryFee > 0) {
              noteParts.push(`🛵 Taxa de entrega: R$ ${deliveryFee.toFixed(2)}`);
            }
          }

          if (orderData.notes && String(orderData.notes).trim()) noteParts.push(`📝 Obs: ${String(orderData.notes).trim()}`);

          // Handle coupon
          const couponId = orderData.coupon_id || null;
          if (orderData.coupon_code && couponDiscount > 0) {
            noteParts.push(`🎟️ Cupom: ${String(orderData.coupon_code)} (-R$ ${couponDiscount.toFixed(2)})`);
          }
          noteParts.push("📱 Pedido via Atendente Virtual");

          if (resolvedItems.length === 0) {
            console.warn("No valid items resolved; skipping order creation.");
          } else {
            // Generate tracking code (DB has no trigger currently)
            const { data: trackingCodeFromRpc, error: tcError } = await supabase.rpc("generate_tracking_code" as any);
            if (tcError) console.error("Error generating tracking code:", tcError);

            // 3. Create order
            const { data: newOrder, error: orderError } = await supabase
              .from("orders")
              .insert({
                restaurant_id: restaurantId,
                client_id: clientId,
                tracking_code: trackingCodeFromRpc || null,
                total_amount: totalAmount,
                delivery_fee: deliveryFee,
                coupon_id: couponId,
                coupon_discount: couponDiscount,
                payment_method: paymentMethod,
                needs_change: Boolean(orderData.needs_change || false),
                change_amount: orderData.needs_change ? toNumber(orderData.change_amount, 0) : null,
                notes: noteParts.join("\n"),
                status: "pending",
              })
              .select("id, tracking_code")
              .single();

            if (orderError) {
              console.error("Error creating order:", orderError);
            } else {
              orderTrackingCode = newOrder.tracking_code;
              orderCreated = true;

              // Increment coupon usage
              if (couponId) {
                await supabase.rpc("increment_coupon_usage" as any, { coupon_id_param: couponId }).catch(() => {
                  supabase
                    .from("coupons")
                    .update({ current_uses: (coupons.find((c: any) => c.id === couponId)?.current_uses ?? 0) + 1 })
                    .eq("id", couponId);
                });
              }

              // 4. Create order items
              for (const item of resolvedItems) {
                const options = item.options || [];
                let optionsTotal = 0;
                for (const opt of options) optionsTotal += toNumber(opt.price_modifier, 0);

                const subtotal = (item.unit_price + optionsTotal) * item.quantity;

                const { data: newItem, error: itemError } = await supabase
                  .from("order_items")
                  .insert({
                    order_id: newOrder.id,
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal,
                  })
                  .select("id")
                  .single();

                if (itemError) {
                  console.error("Error creating order item:", itemError);
                } else if (Array.isArray(options) && options.length > 0 && newItem) {
                  // 5. Create order item options (best-effort)
                  for (const opt of options) {
                    const matchedOption = optionItems.find((oi: any) =>
                      oi.id === opt.option_item_id ||
                      normalizeName(oi.name) === normalizeName(opt.option_item_name)
                    );

                    if (matchedOption) {
                      const { error: optError } = await supabase.from("order_item_options").insert({
                        order_item_id: newItem.id,
                        option_item_id: matchedOption.id,
                        option_item_name: matchedOption.name,
                        price_modifier: toNumber(matchedOption.price_modifier, 0),
                      });
                      if (optError) console.error("Error creating order item option:", optError);
                    }
                  }
                }
              }

              console.log("Order created successfully:", newOrder.id, "tracking:", orderTrackingCode);

              // Update loyalty progress
              if (loyaltyConfig && sanitizedPhone) {
                try {
                  const { data: existingProgress } = await supabase
                    .from("loyalty_progress")
                    .select("id, total_spent, rewards_earned")
                    .eq("restaurant_id", restaurantId)
                    .eq("phone", sanitizedPhone)
                    .maybeSingle();

                  const orderTotal = totalAmount;
                  if (existingProgress) {
                    const newTotal = Number(existingProgress.total_spent) + orderTotal;
                    const newRewards = Math.floor(newTotal / Number(loyaltyConfig.spend_threshold));
                    await supabase
                      .from("loyalty_progress")
                      .update({
                        total_spent: newTotal,
                        rewards_earned: newRewards,
                        client_id: clientId,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", existingProgress.id);
                  } else {
                    const newRewards = Math.floor(orderTotal / Number(loyaltyConfig.spend_threshold));
                    await supabase.from("loyalty_progress").insert({
                      restaurant_id: restaurantId,
                      client_id: clientId,
                      phone: sanitizedPhone,
                      total_spent: orderTotal,
                      rewards_earned: newRewards,
                    });
                  }
                } catch (loyaltyError) {
                  console.error("Error updating loyalty:", loyaltyError);
                }
              }
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing order JSON:", parseError);
      }

      // Remove the JSON from the visible message (remove fenced block if present, else remove raw object)
      aiResponse = aiResponse
        .replace(/```(?:json_order|json)\s*[\s\S]*?```/i, "")
        .replace(extracted.raw, "")
        .trim();

      // Append tracking code info if order was created
      if (orderCreated && orderTrackingCode) {
        aiResponse += `\n\n📋 **Código de rastreio do seu pedido: ${orderTrackingCode}**\n\nVocê pode acompanhar seu pedido clicando no botão abaixo! 👇\n\n[TRACK:${orderTrackingCode}]`;
      }
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      orderCreated,
      trackingCode: orderTrackingCode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("customer-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
