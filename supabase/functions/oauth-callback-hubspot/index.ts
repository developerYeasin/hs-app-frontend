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

    let client_id;
    let user_id = null; // Initialize user_id
    try {
      const decodedStateString = decodeURIComponent(stateParam);
      console.log('oauth-callback-hubspot: Decoded state string:', decodedStateString);
      const decodedState = JSON.parse(decodedStateString);
      client_id = decodedState.client_id;
      user_id = decodedState.user_id || null; // Extract user_id if present
    } catch (parseError) {
      console.error('oauth-callback-hubspot: Error parsing state parameter:', parseError.message);
      return new Response(JSON.stringify({ error: `Invalid state parameter format: ${parseError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!client_id) {
      throw new Error('Client ID missing from state parameter.');
    }

    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('CLIENT_SECRET');
    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    if (!HUBSPOT_CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('HubSpot API credentials (CLIENT_ID, CLIENT_SECRET) not set in environment variables.');
    }

    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: CLIENT_SECRET,
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
    console.log('oauth-callback-hubspot: Fetched hub_id from HubSpot:', hub_id); // Log the fetched hub_id

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || supabaseUrl === '') {
      console.error('oauth-callback-hubspot: SUPABASE_URL environment variable is missing or empty.');
      return new Response(JSON.stringify({ error: 'Supabase URL environment variable is missing or empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    if (!supabaseServiceRoleKey || supabaseServiceRoleKey === '') {
      console.error('oauth-callback-hubspot: SUPABASE_SERVICE_ROLE_KEY environment variable is missing or empty.');
      return new Response(JSON.stringify({ error: 'Supabase Service Role Key environment variable is missing or empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    const upsertData = {
      id: client_id,
      contacts: 'hubspot_integration',
      accessToken: tokens.access_token,
      sessionID: client_id,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      user_id: user_id,
      hub_id: hub_id,
    };

    console.log('oauth-callback-hubspot: Upserting client data:', upsertData); // Log data before upsert

    const { data, error } = await supabaseClient
      .from('client')
      .upsert(upsertData, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('oauth-callback-hubspot: Supabase upsert error:', error);
      throw new Error(`Failed to save tokens to database: ${error.message}`);
    }
    console.log('oauth-callback-hubspot: Supabase upsert successful:', data); // Log successful upsert

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