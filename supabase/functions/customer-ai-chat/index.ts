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

    const [profileRes, productsRes, categoriesRes, zonesRes] = await Promise.all([
      supabase.from("profiles").select("restaurant_name, phone, min_delivery_time, max_delivery_time, opening_hours, delivery_mode").eq("id", restaurantId).single(),
      supabase.from("products").select("id, name, description, price, category_id, available").eq("restaurant_id", restaurantId).eq("available", true),
      supabase.from("product_categories").select("id, name").eq("restaurant_id", restaurantId).order("display_order"),
      supabase.from("delivery_zones").select("neighborhood_name, delivery_fee, is_active").eq("restaurant_id", restaurantId).eq("is_active", true).order("neighborhood_name"),
    ]);

    const profile = profileRes.data;
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const deliveryZones = zonesRes.data || [];
    const deliveryMode = profile?.delivery_mode || "delivery_and_pickup";

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

CARDÁPIO DISPONÍVEL:
${menuText || 'Nenhum produto disponível no momento.'}

PRODUTOS (referência para IDs):
${JSON.stringify(productListJson)}

OPÇÕES (referência para IDs):
${JSON.stringify(optionItemsJson)}

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

5. ANTES de finalizar o pedido, você DEVE coletar TODAS estas informações obrigatórias, uma por vez se necessário:
   a) **Nome completo** do cliente
   b) **Telefone/WhatsApp** do cliente - DEVE ter DDD + número (ex: 85999998888). Se o cliente enviar sem DDD, PEÇA o DDD. Sempre salve no formato com DDD (11 dígitos).
   ${deliveryMode === "delivery_and_pickup" ? `c) **Tipo de entrega**: Delivery ou Retirada no local` : ""}
   ${deliveryMode === "delivery_and_pickup" ? `d)` : `c)`} **Endereço COMPLETO** de entrega (apenas para delivery) - colete SEPARADAMENTE se necessário:
      - Rua/Avenida com número
      - Bairro (${deliveryZones.length > 0 ? "apresente a lista de bairros e peça para escolher" : "pergunte"})
      - Complemento (apto, bloco, referência) - pergunte mesmo que pareça simples
      - Cidade (se necessário)
   ${deliveryMode === "delivery_and_pickup" ? `e)` : `d)`} **Itens do pedido** com quantidades e opções/observações de cada item
   ${deliveryMode === "delivery_and_pickup" ? `f)` : `e)`} **Forma de pagamento**: Pix, Dinheiro ou Cartão
   ${deliveryMode === "delivery_and_pickup" ? `g)` : `f)`} Se for Dinheiro, perguntar se **precisa de troco** e para quanto
   ${deliveryMode === "delivery_and_pickup" ? `h)` : `g)`} **Observações** gerais do pedido (alergia, restrição, etc.)

6. Se o cliente não fornecer alguma informação obrigatória, PERGUNTE antes de confirmar. NÃO pule nenhum campo.
7. TELEFONE: Se o cliente informar um número com menos de 10 dígitos, peça para confirmar com DDD. Salve APENAS números (sem traços, parênteses ou espaços). Formato esperado: DDD + número = 10 ou 11 dígitos.
8. ENDEREÇO: Sempre monte o endereço completo no formato: "Rua X, Nº Y, Bairro Z, Complemento W". Se faltar alguma parte, pergunte.
9. Faça um RESUMO COMPLETO e ORGANIZADO do pedido antes de confirmar, listando:
   - 👤 Nome
   - 📞 Telefone
   - ${deliveryMode === "delivery_and_pickup" ? "🚚 Tipo: Delivery ou Retirada\n   - " : ""}📍 Endereço completo (rua, número, bairro, complemento) ${deliveryMode === "delivery_and_pickup" ? "- se delivery" : ""}
   - 🛒 Itens (quantidade x nome - preço)
   ${deliveryZones.length > 0 ? "- 🏘️ Bairro: [nome] - Taxa: R$ X,XX\n   " : ""}- 💰 Total ${deliveryZones.length > 0 ? "(itens + taxa de entrega)" : ""}
   - 💳 Forma de pagamento
   - 📝 Observações
   
   Peça ao cliente para conferir TODOS os dados antes de confirmar.
10. Quando o cliente CONFIRMAR o pedido (disser "sim", "confirmo", "pode fechar", etc.), ALÉM da mensagem de confirmação, adicione no FINAL da sua resposta um bloco JSON no seguinte formato EXATO:

\`\`\`json_order
{
  "order_confirmed": true,
  "customer_name": "Nome Completo do Cliente",
  "customer_phone": "85999998888",
  "customer_address": "Rua Exemplo, 123, Bairro Centro, Apto 101 - Cidade",
  "delivery_type": "delivery" ou "pickup",
  "delivery_fee": 5.00,
  "delivery_neighborhood": "Centro",
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
  "total_amount": 17.00
}
\`\`\`

IMPORTANTE: 
- O bloco json_order deve ser incluído APENAS quando o cliente CONFIRMAR o pedido. NÃO inclua antes da confirmação.
- O campo "customer_phone" DEVE conter APENAS números (sem +55, sem traços, sem parênteses). Exemplo: "85999998888" (DDD + número).
- O campo "customer_address" DEVE ser o endereço completo e organizado: "Rua, Número, Bairro, Complemento - Cidade". Se for retirada, coloque "Retirada no local".
- O campo "delivery_type" deve ser "delivery" ou "pickup".
- O campo "delivery_fee" deve ser a taxa de entrega (0 se for retirada ou bairro não cadastrado).
- O campo "delivery_neighborhood" deve ser o nome do bairro (vazio se for retirada).
- Os preços no JSON devem ser números (não strings), usando ponto como separador decimal.
- O "total_amount" deve incluir a taxa de entrega: soma dos itens + delivery_fee.

11. Se perguntarem algo fora do contexto do restaurante, educadamente redirecione para o cardápio.
12. Use emojis de forma moderada para deixar a conversa mais agradável.
13. SEMPRE responda em português brasileiro.`;

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
    let orderTrackingCode = null;

    const jsonOrderMatch = aiResponse.match(/```json_order\s*([\s\S]*?)```/);
    if (jsonOrderMatch) {
      try {
        const orderData = JSON.parse(jsonOrderMatch[1].trim());
        
        if (orderData.order_confirmed && orderData.items?.length > 0) {
          // Sanitize phone: keep only digits
          const sanitizedPhone = (orderData.customer_phone || "").replace(/\D/g, "");
          const sanitizedName = (orderData.customer_name || "").trim();
          const sanitizedAddress = (orderData.customer_address || "").trim();
          
          console.log("Order confirmed. Name:", sanitizedName, "Phone:", sanitizedPhone, "Address:", sanitizedAddress);

          // 1. Find or create client
          let clientId: string | null = null;
          
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
            await supabase.from("clients").update({
              name: sanitizedName,
              address: sanitizedAddress,
            }).eq("id", clientId);
          } else {
            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                restaurant_id: restaurantId,
                name: sanitizedName,
                phone: sanitizedPhone,
                address: sanitizedAddress,
              })
              .select("id")
              .single();

            if (clientError) {
              console.error("Error creating client:", clientError);
            } else {
              clientId = newClient.id;
            }
          }

          // 2. Calculate total
          let totalAmount = 0;
          for (const item of orderData.items) {
            let itemTotal = Number(item.unit_price) * Number(item.quantity);
            if (item.options) {
              for (const opt of item.options) {
                itemTotal += Number(opt.price_modifier || 0) * Number(item.quantity);
              }
            }
            totalAmount += itemTotal;
          }

          // Use AI's total if available
          if (orderData.total_amount && Number(orderData.total_amount) > 0) {
            totalAmount = Number(orderData.total_amount);
          }

          // Map payment method
          let paymentMethod = orderData.payment_method || "dinheiro";
          const pmMap: Record<string, string> = {
            "pix": "Pix",
            "dinheiro": "Dinheiro", 
            "cartao": "Cartão",
            "cartão": "Cartão",
            "credito": "Cartão",
            "debito": "Cartão",
          };
          paymentMethod = pmMap[paymentMethod.toLowerCase()] || paymentMethod;

          // Build notes - organized and clear
          const noteParts: string[] = [];
          noteParts.push(`👤 Cliente: ${sanitizedName}`);
          noteParts.push(`📞 Tel: ${sanitizedPhone}`);
          const deliveryType = orderData.delivery_type || "delivery";
          if (deliveryType === "pickup") {
            noteParts.push("🏪 Retirada no local");
          } else {
            noteParts.push(`📍 Endereço: ${sanitizedAddress}`);
            if (orderData.delivery_neighborhood) {
              noteParts.push(`🏘️ Bairro: ${orderData.delivery_neighborhood}`);
            }
            const deliveryFee = Number(orderData.delivery_fee || 0);
            if (deliveryFee > 0) {
              noteParts.push(`🛵 Taxa de entrega: R$ ${deliveryFee.toFixed(2)}`);
            }
          }
          if (orderData.notes && orderData.notes.trim()) noteParts.push(`📝 Obs: ${orderData.notes.trim()}`);
          noteParts.push("📱 Pedido via Atendente Virtual");

          // 3. Create order
          const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert({
              restaurant_id: restaurantId,
              client_id: clientId,
              total_amount: totalAmount,
              payment_method: paymentMethod,
              needs_change: orderData.needs_change || false,
              change_amount: orderData.change_amount || null,
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

            // 4. Create order items
            for (const item of orderData.items) {
              // Try to find the product by ID first, then by name
              let productId = item.product_id;
              let unitPrice = Number(item.unit_price);

              // Validate product exists
              const matchedProduct = products.find((p: any) => 
                p.id === productId || 
                p.name.toLowerCase().trim() === (item.product_name || "").toLowerCase().trim()
              );

              if (matchedProduct) {
                productId = matchedProduct.id;
                unitPrice = Number(matchedProduct.price);
              }

              let optionsTotal = 0;
              if (item.options) {
                for (const opt of item.options) {
                  optionsTotal += Number(opt.price_modifier || 0);
                }
              }

              const subtotal = (unitPrice + optionsTotal) * Number(item.quantity);

              const { data: newItem, error: itemError } = await supabase
                .from("order_items")
                .insert({
                  order_id: newOrder.id,
                  product_id: productId,
                  quantity: Number(item.quantity),
                  unit_price: unitPrice,
                  subtotal: subtotal,
                })
                .select("id")
                .single();

              if (itemError) {
                console.error("Error creating order item:", itemError);
              } else if (item.options && item.options.length > 0 && newItem) {
                // 5. Create order item options
                for (const opt of item.options) {
                  const matchedOption = optionItems.find((oi: any) =>
                    oi.id === opt.option_item_id ||
                    oi.name.toLowerCase().trim() === (opt.option_item_name || "").toLowerCase().trim()
                  );

                  if (matchedOption) {
                    await supabase.from("order_item_options").insert({
                      order_item_id: newItem.id,
                      option_item_id: matchedOption.id,
                      option_item_name: matchedOption.name,
                      price_modifier: Number(matchedOption.price_modifier || 0),
                    });
                  }
                }
              }
            }

            console.log("Order created successfully:", newOrder.id, "tracking:", orderTrackingCode);
          }
        }
      } catch (parseError) {
        console.error("Error parsing order JSON:", parseError);
      }

      // Remove the JSON block from the visible message
      aiResponse = aiResponse.replace(/```json_order\s*[\s\S]*?```/, "").trim();

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
