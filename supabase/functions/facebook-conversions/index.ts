import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIXEL_ID = Deno.env.get('FACEBOOK_PIXEL_ID');
    const ACCESS_TOKEN = Deno.env.get('FACEBOOK_ACCESS_TOKEN');

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      throw new Error('Facebook credentials not configured');
    }

    const { event_name, user_data, custom_data, event_source_url } = await req.json();

    const payload = {
      data: [
        {
          event_name: event_name || 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: event_source_url || 'https://blank-canvas-start-5982.lovable.app',
          user_data: {
            em: user_data?.email ? [await hashSHA256(user_data.email.toLowerCase().trim())] : undefined,
            ph: user_data?.phone ? [await hashSHA256(user_data.phone.replace(/\D/g, ''))] : undefined,
            fn: user_data?.first_name ? [await hashSHA256(user_data.first_name.toLowerCase().trim())] : undefined,
            client_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
            client_user_agent: req.headers.get('user-agent') || undefined,
          },
          custom_data: custom_data || {},
        },
      ],
    };

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Facebook API error:', JSON.stringify(result));
      throw new Error(`Facebook API error [${response.status}]: ${JSON.stringify(result)}`);
    }

    console.log('Facebook event sent successfully:', JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
