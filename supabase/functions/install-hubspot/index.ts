import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const initial_client_id = url.searchParams.get('client_id');
    const stateParamFromFrontend = url.searchParams.get('state'); // Get the state param from frontend

    if (!initial_client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    const HUBSPOT_SCOPES = 'crm.objects.contacts.read'; // Default scopes
    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    if (!HUBSPOT_CLIENT_ID) {
      throw new Error('HUBSPOT_CLIENT_ID environment variable not set.');
    }

    // Pass the state parameter received from the frontend directly to HubSpot
    const state = stateParamFromFrontend ? stateParamFromFrontend : encodeURIComponent(JSON.stringify({ client_id: initial_client_id }));

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