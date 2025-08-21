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
    const stateParam = url.searchParams.get('state'); // Get the state parameter

    if (!code || !stateParam) {
      return new Response(JSON.stringify({ error: 'Authorization code or state parameter missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Decode and parse the state parameter to get the client_id
    let client_id;
    try {
      const decodedState = JSON.parse(decodeURIComponent(stateParam));
      client_id = decodedState.client_id;
    } catch (parseError) {
      throw new Error('Invalid state parameter format.');
    }

    if (!client_id) {
      throw new Error('Client ID missing from state parameter.');
    }

    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    const HUBSPOT_CLIENT_SECRET = Deno.env.get('HUBSPOT_CLIENT_SECRET');
    // The redirect URI should be static, matching the one configured in HubSpot
    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
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
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code: code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Failed to exchange code for tokens: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const tokens = await tokenResponse.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Upsert (insert or update) the client record with new tokens
    const { data, error } = await supabaseClient
      .from('client')
      .upsert({
        id: client_id, // Use client_id from state as the primary key
        contacts: 'hubspot_integration', // Placeholder, can be updated later
        accessToken: tokens.access_token,
        sessionID: client_id, // Using client_id as sessionID for consistency
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'id' }) // Conflict on 'id' to update existing record
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      throw new Error(`Failed to save tokens to database: ${error.message}`);
    }

    // Redirect to the contacts page after successful installation
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/contacts?client_id=${client_id}`, // Redirect to contacts page with client_id
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in oauth-callback-hubspot:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});