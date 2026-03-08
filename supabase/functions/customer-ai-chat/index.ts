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

    // Fetch restaurant info and products
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

    const systemPrompt = `Você é o atendente virtual do restaurante "${profile?.restaurant_name || 'Restaurante'}". 
Seja simpático, prestativo e objetivo. Fale de forma natural e amigável como um atendente real.

INFORMAÇÕES DO RESTAURANTE:
- Nome: ${profile?.restaurant_name || 'Restaurante'}
${profile?.phone ? `- Telefone: ${profile.phone}` : ''}
- Tempo de entrega: ${profile?.min_delivery_time || 30} a ${profile?.max_delivery_time || 60} minutos

CARDÁPIO DISPONÍVEL:
${menuText || 'Nenhum produto disponível no momento.'}

REGRAS:
1. Só ofereça produtos que estão no cardápio acima. NUNCA invente produtos.
2. Ajude o cliente a escolher, sugira combinações e explique os produtos.
3. Quando o cliente decidir o pedido, faça um resumo claro com:
   - Itens escolhidos com quantidades e opções
   - Preço de cada item
   - Total do pedido
4. Pergunte o endereço de entrega, forma de pagamento (Pix, Dinheiro, Cartão) e se precisa de troco.
5. Pergunte se tem alguma observação para o pedido.
6. Após confirmar tudo, diga que o pedido foi anotado e informe o tempo estimado de entrega.
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
            maxOutputTokens: 1024,
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
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({ response: aiResponse }), {
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
