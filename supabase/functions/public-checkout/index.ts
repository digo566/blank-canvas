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
    const { step, restaurantId, name, phone, address, cpf, items, cartId, paymentMethod, needsChange, changeAmount, notes, totalAmount, scheduledFor } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (step === "save-data") {
      // Validate phone format
      const sanitizedPhone = String(phone || "").replace(/\D/g, "");
      if (sanitizedPhone.length < 10 || sanitizedPhone.length > 11) {
        return new Response(JSON.stringify({ error: "Telefone inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate CPF if provided
      const sanitizedCpf = cpf ? String(cpf).replace(/\D/g, "") : null;
      if (sanitizedCpf && sanitizedCpf.length !== 11) {
        return new Response(JSON.stringify({ error: "CPF deve ter 11 dígitos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find or create client
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("phone", sanitizedPhone)
        .maybeSingle();

      let clientId = existingClient?.id;

      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            restaurant_id: restaurantId,
            name: name,
            phone: sanitizedPhone,
            address: address,
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      } else {
        // Update existing client
        await supabase
          .from("clients")
          .update({ name, address })
          .eq("id", clientId);
      }

      // Create cart
      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .insert({
          restaurant_id: restaurantId,
          client_id: clientId,
        })
        .select("id")
        .single();

      if (cartError) throw cartError;

      // Add items to cart
      for (const item of items) {
        await supabase.from("cart_items").insert({
          cart_id: cart.id,
          product_id: item.id,
          quantity: item.quantity,
        });
      }

      // Store CPF in a temporary storage or in cart notes (we'll add it to order notes later)
      const tempData = {
        cartId: cart.id,
        cpf: sanitizedCpf,
        name,
        phone: sanitizedPhone,
        address,
        items,
      };

      return new Response(JSON.stringify(tempData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "finalize") {
      // Get cart and items
      const { data: cart } = await supabase
        .from("carts")
        .select("*, cart_items(*, products(*))")
        .eq("id", cartId)
        .single();

      if (!cart) {
        return new Response(JSON.stringify({ error: "Carrinho não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate tracking code
      const { data: trackingCode, error: tcError } = await supabase.rpc("generate_tracking_code");
      if (tcError) {
        console.error("Error generating tracking code:", tcError);
      }

      // Build notes
      const noteParts: string[] = [];
      if (notes) noteParts.push(`📝 Obs: ${notes}`);
      
      // Get CPF from request (it should be passed from the frontend)
      // For now, we'll check if it's in the notes or we can add a separate field
      // Since we don't have it stored in cart, we need to pass it from frontend
      
      noteParts.push("🛍️ Pedido via Loja Online");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          client_id: cart.client_id,
          cart_id: cartId,
          tracking_code: trackingCode || null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          needs_change: needsChange || false,
          change_amount: needsChange && changeAmount ? changeAmount : null,
          notes: noteParts.join("\n"),
          status: "pending",
          order_type: "delivery",
          scheduled_for: scheduledFor || null,
        })
        .select("id, tracking_code")
        .single();

      if (orderError) throw orderError;

      // Create order items from cart items
      const cartItems = cart.cart_items || [];
      for (const cartItem of cartItems) {
        const product = cartItem.products;
        if (!product) continue;

        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          unit_price: product.price,
          subtotal: product.price * cartItem.quantity,
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        trackingCode: order.tracking_code 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
