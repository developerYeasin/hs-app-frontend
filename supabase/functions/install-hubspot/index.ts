import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const internal_client_id = url.searchParams.get('client_id'); // Our internal UUID for the client record
    const stateParamFromFrontend = url.searchParams.get('state'); // Get the state param from frontend

    if (!internal_client_id) {
      return new Response(JSON.stringify({ error: 'client_id (internal UUID) is required' }), {
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

    // Fetch client-specific HubSpot credentials from our database
    const { data: fetchedClient, error: fetchClientError } = await supabaseClient
      .from('client')
      .select(`
        hubspot_client_id,
        hubspot_client_secret
      `)
      .eq('id', internal_client_id)
      .single();

    if (fetchClientError || !fetchedClient) {
      console.error('install-hubspot: Error fetching client credentials:', fetchClientError);
      throw new Error(`Failed to fetch client credentials for ID ${internal_client_id}: ${fetchClientError?.message || 'Not found'}`);
    }

    // Decrypt the fetched values
    const { data: decryptedClientId, error: decryptIdError } = await supabaseClient.rpc('decrypt_secret', {
      encrypted_data: fetchedClient.hubspot_client_id,
      key: ENCRYPTION_KEY
    });
    const { data: decryptedClientSecret, error: decryptSecretError } = await supabaseClient.rpc('decrypt_secret', {
      encrypted_data: fetchedClient.hubspot_client_secret,
      key: ENCRYPTION_KEY
    });

    if (decryptIdError || decryptSecretError) {
      console.error('install-hubspot: Error decrypting client credentials:', decryptIdError || decryptSecretError);
      throw new Error('Failed to decrypt client credentials.');
    }

    const HUBSPOT_CLIENT_ID = decryptedClientId;
    const HUBSPOT_CLIENT_SECRET = decryptedClientSecret; // Not directly used here, but good to have
    const HUBSPOT_SCOPES = 'crm.objects.contacts.read'; // Default scopes
    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    if (!HUBSPOT_CLIENT_ID) {
      throw new Error('HubSpot Client ID not available after decryption.');
    }

    // Pass the state parameter received from the frontend directly to HubSpot
    const state = stateParamFromFrontend ? stateParamFromFrontend : encodeURIComponent(JSON.stringify({ client_id: internal_client_id }));

    const authUrl =
      'https://app.hubspot.com/oauth/authorize' +
      `?client_id=${encodeURIComponent(HUBSPOT_CLIENT_ID)}` +
      `&scope=${encodeURIComponent(HUBSPOT_SCOPES)}` +
      `&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}` +
      `&state=${state}`; // Pass the state parameter

    return new Response(null, {
      status: 302, // Redirect status code
      headers: {
        'Location': authUrl,
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in install-hubspot:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});