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
    const hub_id_param = url.searchParams.get('hub_id'); // Expect hub_id as a query parameter

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseServiceRoleKey ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error in get-hubspot-contacts:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Could not get user from token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!hub_id_param) {
      return new Response(JSON.stringify({ error: 'hub_id is required as a query parameter.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch the client data associated with this user and hub_id
    let { data: clientData, error: clientLinkError } = await supabaseClient
      .from('client')
      .select('id, accessToken, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('hub_id', hub_id_param)
      .single();

    if (clientLinkError || !clientData) {
      console.error('Error fetching client data for user and hub_id:', clientLinkError);
      throw new Error(`No HubSpot integration found for this user and hub_id (${hub_id_param}). Please ensure the app is installed and linked.`);
    }

    let accessToken = clientData.accessToken;
    const refreshToken = clientData.refresh_token;
    const expiresAt = new Date(clientData.expires_at);

    if (expiresAt < new Date()) {
      console.log('Access token expired, refreshing...');
      const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
      const CLIENT_SECRET = Deno.env.get('CLIENT_SECRET');
      const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`; 

      if (!HUBSPOT_CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('HubSpot API credentials (CLIENT_ID, CLIENT_SECRET) not set in environment variables.');
      }

      const refreshResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: HUBSPOT_CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: HUBSPOT_REDIRECT_URI,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        throw new Error(`Failed to refresh access token: ${errorData.message || JSON.stringify(errorData)}`);
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));

      const { error: updateError } = await supabaseClient
        .from('client')
        .update({
          accessToken: accessToken,
          refresh_token: newTokens.refresh_token || refreshToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', clientData.id); // Update by our internal client ID

      if (updateError) {
        console.error('Supabase update error after refresh:', updateError);
        throw new Error(`Failed to update tokens in database: ${updateError.message}`);
      }
    }

    const hubspotResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,email,company', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!hubspotResponse.ok) {
      const errorData = await hubspotResponse.json();
      throw new Error(`Failed to fetch contacts from HubSpot: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const hubspotContacts = await hubspotResponse.json();

    const transformedContacts = hubspotContacts.results.map((contact: any) => ({
      id: contact.id,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      deal_id: contact.properties.deal_id || null,
      created_at: contact.createdAt,
    }));

    return new Response(JSON.stringify({ data: transformedContacts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-hubspot-contacts:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});