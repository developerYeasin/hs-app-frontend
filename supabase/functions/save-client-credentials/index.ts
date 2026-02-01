import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, user_id, hub_id, hubspot_client_id, hubspot_client_secret } = await req.json();

    if (!id || !user_id || !hub_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: id, user_id, hub_id.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !ENCRYPTION_KEY) {
      throw new Error('Supabase URL, Service Role Key, or ENCRYPTION_KEY environment variables not set.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    let encryptedClientId = null;
    let encryptedClientSecret = null;

    // Encrypt client ID if provided
    if (hubspot_client_id) {
      const { data, error } = await supabaseClient.rpc('encrypt_secret', {
        plain_text: hubspot_client_id,
        key: ENCRYPTION_KEY
      });
      if (error) throw new Error('Failed to encrypt client ID: ' + error.message);
      encryptedClientId = data;
    }

    // Encrypt client secret if provided
    if (hubspot_client_secret) {
      const { data, error } = await supabaseClient.rpc('encrypt_secret', {
        plain_text: hubspot_client_secret,
        key: ENCRYPTION_KEY
      });
      if (error) throw new Error('Failed to encrypt client secret: ' + error.message);
      encryptedClientSecret = data;
    }

    const upsertData: any = {
      id: id,
      user_id: user_id,
      hub_id: hub_id,
      contacts: 'manual_hubspot_integration', // Default for manual entry
      sessionID: id, // Use internal ID as session ID for manual entries
    };

    if (encryptedClientId !== null) {
      upsertData.hubspot_client_id = encryptedClientId;
    }
    if (encryptedClientSecret !== null) {
      upsertData.hubspot_client_secret = encryptedClientSecret;
    }

    // If it's an update and client ID/secret are not provided, we should not overwrite them with null
    // The frontend should only send these if they are being updated.
    // For upsert, if they are null, they will be set to null.
    // For update, we only include them if they are explicitly provided.

    const { data, error } = await supabaseClient
      .from('client')
      .upsert(upsertData, { onConflict: 'id' }) // Conflict on 'id' for update, or insert new
      .select();

    if (error) {
      console.error('save-client-credentials: Supabase upsert error:', error);
      throw new Error(`Failed to save client credentials: ${error.message}`);
    }

    return new Response(JSON.stringify({ message: 'Client credentials saved successfully', data: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('save-client-credentials: Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});