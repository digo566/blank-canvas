import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const phoneRegex = /^\+?55?\d{10,11}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: Array<{
    optionItemId: string;
    optionItemName: string;
    priceModifier: number;
  }>;
}

interface SaveDataRequest {
  step: "save-data";
  restaurantId: string;
  name: string;
  phone: string;
  address: string;
  items: CheckoutItem[];
}

interface FinalizeRequest {
  step: "finalize";
  restaurantId: string;
  cartId: string;
  paymentMethod: string;
  needsChange?: boolean;
  changeAmount?: number | null;
  notes?: string;
  totalAmount: number;
}

type CheckoutRequest = SaveDataRequest | FinalizeRequest;

// Validation functions
function validateSaveData(body: unknown): { valid: true; data: SaveDataRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Dados inválidos" };
  }

  const data = body as Record<string, unknown>;

  // Validate step
  if (data.step !== "save-data") {
    return { valid: false, error: "Step inválido" };
  }

  // Validate restaurantId
  if (typeof data.restaurantId !== "string" || !uuidRegex.test(data.restaurantId)) {
    return { valid: false, error: "ID do restaurante inválido" };
  }

  // Validate name
  if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.length > 100) {
    return { valid: false, error: "Nome deve ter entre 2 e 100 caracteres" };
  }

  // Validate phone
  if (typeof data.phone !== "string") {
    return { valid: false, error: "Telefone inválido" };
  }
  const cleanPhone = data.phone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 13) {
    return { valid: false, error: "Telefone deve ter 10 a 13 dígitos" };
  }

  // Validate address
  if (typeof data.address !== "string" || data.address.trim().length < 5 || data.address.length > 500) {
    return { valid: false, error: "Endereço deve ter entre 5 e 500 caracteres" };
  }

  // Validate items
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 50) {
    return { valid: false, error: "Carrinho deve ter entre 1 e 50 itens" };
  }

  for (const item of data.items) {
    if (!item || typeof item !== "object") {
      return { valid: false, error: "Item inválido no carrinho" };
    }
    if (typeof item.id !== "string" || !uuidRegex.test(item.id)) {
      return { valid: false, error: "ID de produto inválido" };
    }
    if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 100 || !Number.isInteger(item.quantity)) {
      return { valid: false, error: "Quantidade deve ser entre 1 e 100" };
    }
    if (typeof item.name !== "string" || item.name.length > 200) {
      return { valid: false, error: "Nome do produto inválido" };
    }
    if (typeof item.price !== "number" || item.price < 0 || item.price > 100000) {
      return { valid: false, error: "Preço do produto inválido" };
    }
  }

  return {
    valid: true,
    data: {
      step: "save-data",
      restaurantId: data.restaurantId,
      name: data.name.trim(),
      phone: data.phone,
      address: data.address.trim(),
      items: data.items as CheckoutItem[],
    },
  };
}

function validateFinalize(body: unknown): { valid: true; data: FinalizeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Dados inválidos" };
  }

  const data = body as Record<string, unknown>;

  // Validate step
  if (data.step !== "finalize") {
    return { valid: false, error: "Step inválido" };
  }

  // Validate restaurantId
  if (typeof data.restaurantId !== "string" || !uuidRegex.test(data.restaurantId)) {
    return { valid: false, error: "ID do restaurante inválido" };
  }

  // Validate cartId
  if (typeof data.cartId !== "string" || !uuidRegex.test(data.cartId)) {
    return { valid: false, error: "ID do carrinho inválido" };
  }

  // Validate paymentMethod
  const validPaymentMethods = ["pix", "dinheiro", "cartao", "debito", "credito"];
  if (typeof data.paymentMethod !== "string" || !validPaymentMethods.includes(data.paymentMethod.toLowerCase())) {
    return { valid: false, error: "Método de pagamento inválido" };
  }

  // Validate totalAmount
  if (typeof data.totalAmount !== "number" || data.totalAmount < 0 || data.totalAmount > 1000000) {
    return { valid: false, error: "Valor total inválido" };
  }

  // Validate optional fields
  if (data.needsChange !== undefined && typeof data.needsChange !== "boolean") {
    return { valid: false, error: "Campo troco inválido" };
  }

  if (data.changeAmount !== undefined && data.changeAmount !== null) {
    if (typeof data.changeAmount !== "number" || data.changeAmount < 0 || data.changeAmount > 10000) {
      return { valid: false, error: "Valor do troco inválido" };
    }
  }

  if (data.notes !== undefined && data.notes !== null && data.notes !== "") {
    if (typeof data.notes !== "string" || data.notes.length > 1000) {
      return { valid: false, error: "Observações muito longas (máximo 1000 caracteres)" };
    }
  }

  return {
    valid: true,
    data: {
      step: "finalize",
      restaurantId: data.restaurantId,
      cartId: data.cartId,
      paymentMethod: data.paymentMethod,
      totalAmount: data.totalAmount,
      needsChange: data.needsChange as boolean | undefined,
      changeAmount: data.changeAmount as number | null | undefined,
      notes: typeof data.notes === "string" ? data.notes.trim() : undefined,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Formato de dados inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine step and validate
    const step = (body as Record<string, unknown>)?.step;

    if (step === "save-data") {
      const validation = validateSaveData(body);
      if (!validation.valid) {
        console.log("Validation failed for save-data:", validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = validation.data;

      // Format phone to WhatsApp standard
      const cleanPhone = data.phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? `+${cleanPhone}` : `+55${cleanPhone}`;

      // Check if client exists
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", formattedPhone)
        .eq("restaurant_id", data.restaurantId)
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        clientId = existingClient.id;
        // Update client data
        await supabase
          .from("clients")
          .update({ name: data.name, address: data.address })
          .eq("id", clientId);
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: data.name,
            phone: formattedPhone,
            address: data.address,
            restaurant_id: data.restaurantId,
            is_registered: false,
          })
          .select()
          .single();

        if (clientError) {
          console.error("Error creating client:", clientError);
          throw new Error("Erro ao criar cliente");
        }
        clientId = newClient.id;
      }

      // Create cart
      const { data: newCart, error: cartError } = await supabase
        .from("carts")
        .insert({
          client_id: clientId,
          restaurant_id: data.restaurantId,
          is_abandoned: false,
        })
        .select()
        .single();

      if (cartError) {
        console.error("Error creating cart:", cartError);
        throw new Error("Erro ao criar carrinho");
      }

      // Insert cart items
      const cartItems = data.items.map((item) => ({
        cart_id: newCart.id,
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("cart_items")
        .insert(cartItems);

      if (itemsError) {
        console.error("Error inserting cart items:", itemsError);
        throw new Error("Erro ao adicionar itens ao carrinho");
      }

      console.log(`Checkout save-data completed: clientId=${clientId}, cartId=${newCart.id}`);

      return new Response(
        JSON.stringify({ success: true, cartId: newCart.id, clientId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (step === "finalize") {
      const validation = validateFinalize(body);
      if (!validation.valid) {
        console.log("Validation failed for finalize:", validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = validation.data;

      // Get cart to retrieve client_id
      const { data: cart, error: cartFetchError } = await supabase
        .from("carts")
        .select("client_id")
        .eq("id", data.cartId)
        .single();

      if (cartFetchError || !cart) {
        console.error("Cart not found:", data.cartId);
        return new Response(
          JSON.stringify({ error: "Carrinho não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          cart_id: data.cartId,
          client_id: cart.client_id,
          restaurant_id: data.restaurantId,
          total_amount: data.totalAmount,
          status: "pending",
          payment_method: data.paymentMethod,
          needs_change: data.needsChange || false,
          change_amount: data.changeAmount || null,
          notes: data.notes || null,
        })
        .select("id, tracking_code")
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw new Error("Erro ao criar pedido");
      }

      // Get cart items to create order items
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("product_id, quantity")
        .eq("cart_id", data.cartId);

      if (cartItems && cartItems.length > 0) {
        // Get product prices
        const productIds = cartItems.map(item => item.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("id, price")
          .in("id", productIds);

        const productPrices = new Map(products?.map(p => [p.id, p.price]) || []);

        // Create order items
        const orderItems = cartItems.map(item => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: productPrices.get(item.product_id) || 0,
          subtotal: (productPrices.get(item.product_id) || 0) * item.quantity,
        }));

        await supabase.from("order_items").insert(orderItems);
      }

      console.log(`Checkout finalize completed: orderId=${newOrder.id}, trackingCode=${newOrder.tracking_code}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: newOrder.id, 
          trackingCode: newOrder.tracking_code 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Step inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar checkout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
