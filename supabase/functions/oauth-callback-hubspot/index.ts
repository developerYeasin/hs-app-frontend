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
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    console.log('oauth-callback-hubspot: Received code:', code);
    console.log('oauth-callback-hubspot: Received stateParam (raw):', stateParam);

    if (!code || !stateParam) {
      return new Response(JSON.stringify({ error: 'Authorization code or state parameter missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let internal_client_id; // Our internal UUID for the client record
    let user_id = null;
    let existing_hub_id = null;
    try {
      const decodedStateString = decodeURIComponent(stateParam);
      console.log('oauth-callback-hubspot: Decoded state string:', decodedStateString);
      const decodedState = JSON.parse(decodedStateString);
      internal_client_id = decodedState.client_id; // This is our internal UUID
      user_id = decodedState.user_id || null;
      existing_hub_id = decodedState.hub_id || null;
    } catch (parseError) {
      console.error('oauth-callback-hubspot: Error parsing state parameter:', parseError.message);
      return new Response(JSON.stringify({ error: `Invalid state parameter format: ${parseError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!internal_client_id || !user_id) {
      throw new Error('Internal Client ID or User ID missing from state parameter.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL or Service Role Key environment variables not set.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch client-specific HubSpot credentials from our database
    let hubspotClientIdToUse = Deno.env.get('HUBSPOT_CLIENT_ID'); // Default to env
    let hubspotClientSecretToUse = Deno.env.get('CLIENT_SECRET'); // Default to env

    let clientRecordForCredentials = null;
    if (internal_client_id) {
      const { data: fetchedClient, error: fetchClientError } = await supabaseClient
        .from('client')
        .select('hubspot_client_id, hubspot_client_secret')
        .eq('id', internal_client_id)
        .single();

      if (fetchClientError && fetchClientError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('oauth-callback-hubspot: Error fetching client credentials:', fetchClientError);
        // Continue with default env vars if there's an error, but log it
      } else if (fetchedClient && fetchedClient.hubspot_client_id && fetchedClient.hubspot_client_secret) {
        hubspotClientIdToUse = fetchedClient.hubspot_client_id;
        hubspotClientSecretToUse = fetchedClient.hubspot_client_secret;
        clientRecordForCredentials = fetchedClient; // Store for later update if needed
        console.log('oauth-callback-hubspot: Using client-specific HubSpot credentials.');
      } else {
        console.log('oauth-callback-hubspot: Client-specific credentials not found or incomplete, falling back to environment variables.');
      }
    }

    if (!hubspotClientIdToUse || !hubspotClientSecretToUse) {
      throw new Error('HubSpot API credentials (Client ID, Client Secret) not available.');
    }

    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: hubspotClientIdToUse, // Use client-specific or default
        client_secret: hubspotClientSecretToUse, // Use client-specific or default
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code: code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Failed to exchange code for tokens: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const tokens = await tokenResponse.json();

    const hubspotMeResponse = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!hubspotMeResponse.ok) {
      const errorData = await hubspotMeResponse.json();
      console.error('oauth-callback-hubspot: Failed to fetch HubSpot hub_id:', errorData);
      throw new Error(`Failed to fetch HubSpot hub_id: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const hubspotMeData = await hubspotMeResponse.json();
    const hub_id = hubspotMeData.hub_id;

    if (!hub_id) {
      throw new Error('Hub ID not found in HubSpot access token response.');
    }
    console.log('oauth-callback-hubspot: Fetched hub_id from HubSpot:', hub_id);

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    const upsertData = {
      id: internal_client_id, // Use our internal UUID
      contacts: 'hubspot_integration',
      accessToken: tokens.access_token,
      sessionID: internal_client_id,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      user_id: user_id,
      hub_id: hub_id,
      hubspot_client_id: hubspotClientIdToUse, // Store the client ID used
      hubspot_client_secret: hubspotClientSecretToUse, // Store the client secret used
    };

    console.log('oauth-callback-hubspot: Upserting client data:', upsertData);

    const { data, error } = await supabaseClient
      .from('client')
      .upsert(upsertData, { onConflict: 'user_id,hub_id' })
      .select();

    if (error) {
      console.error('oauth-callback-hubspot: Supabase upsert error:', error);
      throw new Error(`Failed to save tokens to database: ${error.message}`);
    }
    console.log('oauth-callback-hubspot: Supabase upsert successful:', data);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://hsmini.netlify.app/thank-you`,
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('oauth-callback-hubspot: Error in oauth-callback-hubspot:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});