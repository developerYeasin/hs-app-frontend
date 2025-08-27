import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST for invoking
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId, dynamicData } = await req.json();

    if (!webhookId) {
      return new Response(JSON.stringify({ error: 'webhookId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role key for secure access

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseServiceRoleKey ?? ''
    );

    // Fetch webhook details from the database
    const { data: webhook, error: fetchError } = await supabaseClient
      .from('webhooks')
      .select('url, method, body_template')
      .eq('id', webhookId)
      .single();

    if (fetchError || !webhook) {
      console.error('Error fetching webhook:', fetchError?.message || 'Webhook not found');
      return new Response(JSON.stringify({ error: `Webhook not found or access denied: ${fetchError?.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let requestBody = webhook.body_template;
    if (requestBody && dynamicData) {
      // Simple placeholder replacement for {{key}} in body_template
      for (const key in dynamicData) {
        requestBody = requestBody.replace(new RegExp(`{{${key}}}`, 'g'), dynamicData[key]);
      }
    }

    const externalResponse = await fetch(webhook.url, {
      method: webhook.method,
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers required by the external webhook, e.g., Authorization
      },
      body: requestBody ? requestBody : undefined, // Only send body if it exists
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error(`External webhook call failed: ${externalResponse.status} - ${errorText}`);
      return new Response(JSON.stringify({ error: `External webhook call failed: ${externalResponse.status} - ${errorText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: externalResponse.status,
      });
    }

    const responseData = await externalResponse.json();
    return new Response(JSON.stringify({ message: 'Webhook invoked successfully', response: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in invoke-webhook:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});