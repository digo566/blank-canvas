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

    const [profileRes, productsRes, categoriesRes] = await Promise.all([
      supabase.from("profiles").select("restaurant_name, phone, min_delivery_time, max_delivery_time, opening_hours").eq("id", restaurantId).single(),
      supabase.from("products").select("id, name, description, price, category_id, available").eq("restaurant_id", restaurantId).eq("available", true),
      supabase.from("product_categories").select("id, name").eq("restaurant_id", restaurantId).order("display_order"),
    ]);

    const profile = profileRes.data;
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];

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

    const systemPrompt = `Você é o atendente virtual do restaurante "${profile?.restaurant_name || 'Restaurante'}". 
Seja simpático, prestativo e objetivo. Fale de forma natural e amigável como um atendente real.

INFORMAÇÕES DO RESTAURANTE:
- Nome: ${profile?.restaurant_name || 'Restaurante'}
${profile?.phone ? `- Telefone: ${profile.phone}` : ''}
- Tempo de entrega: ${profile?.min_delivery_time || 30} a ${profile?.max_delivery_time || 60} minutos

CARDÁPIO DISPONÍVEL:
${menuText || 'Nenhum produto disponível no momento.'}

PRODUTOS (referência para IDs):
${JSON.stringify(productListJson)}

OPÇÕES (referência para IDs):
${JSON.stringify(optionItemsJson)}

REGRAS IMPORTANTES:
1. Só ofereça produtos que estão no cardápio acima. NUNCA invente produtos.
2. Ajude o cliente a escolher, sugira combinações e explique os produtos.
3. ANTES de finalizar o pedido, você DEVE coletar TODAS estas informações obrigatórias:
   - **Nome completo** do cliente
   - **Telefone/WhatsApp** do cliente  
   - **Endereço completo** de entrega (rua, número, bairro, complemento se houver)
   - **Itens do pedido** com quantidades e opções escolhidas
   - **Forma de pagamento**: Pix, Dinheiro ou Cartão
   - Se for Dinheiro, perguntar se **precisa de troco** e para quanto
   - **Observações** do pedido (alguma restrição, alergia, etc.)

4. Se o cliente não fornecer alguma informação obrigatória, PERGUNTE antes de confirmar.
5. Faça um RESUMO COMPLETO do pedido antes de confirmar, incluindo todos os dados coletados.
6. Quando o cliente CONFIRMAR o pedido (disser "sim", "confirmo", "pode fechar", etc.), ALÉM da mensagem de confirmação, adicione no FINAL da sua resposta um bloco JSON no seguinte formato EXATO:

\`\`\`json_order
{
  "order_confirmed": true,
  "customer_name": "Nome do Cliente",
  "customer_phone": "telefone",
  "customer_address": "endereço completo",
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

IMPORTANTE: O bloco json_order deve ser incluído APENAS quando o cliente CONFIRMAR o pedido. NÃO inclua antes da confirmação.

7. Se perguntarem algo fora do contexto do restaurante, educadamente redirecione para o cardápio.
8. Use emojis de forma moderada para deixar a conversa mais agradável.
9. SEMPRE responda em português brasileiro.`;

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
          console.log("Order confirmed, creating order:", JSON.stringify(orderData));

          // 1. Find or create client
          let clientId: string | null = null;
          
          const { data: existingClients } = await supabase
            .from("clients")
            .select("id")
            .eq("restaurant_id", restaurantId)
            .eq("phone", orderData.customer_phone)
            .limit(1);

          if (existingClients && existingClients.length > 0) {
            clientId = existingClients[0].id;
            // Update client info
            await supabase.from("clients").update({
              name: orderData.customer_name,
              address: orderData.customer_address,
            }).eq("id", clientId);
          } else {
            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                restaurant_id: restaurantId,
                name: orderData.customer_name,
                phone: orderData.customer_phone,
                address: orderData.customer_address,
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

          // Build notes
          const noteParts: string[] = [];
          if (orderData.customer_name) noteParts.push(`Cliente: ${orderData.customer_name}`);
          if (orderData.customer_phone) noteParts.push(`Tel: ${orderData.customer_phone}`);
          if (orderData.customer_address) noteParts.push(`Endereço: ${orderData.customer_address}`);
          if (orderData.notes) noteParts.push(`Obs: ${orderData.notes}`);
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
        aiResponse += `\n\n📋 **Código de rastreio do seu pedido: ${orderTrackingCode}**\nVocê pode acompanhar seu pedido usando este código!`;
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
