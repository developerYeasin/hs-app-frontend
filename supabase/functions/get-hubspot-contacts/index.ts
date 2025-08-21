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
    const client_id = url.searchParams.get('client_id');

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Retrieve client tokens from database
    let { data: clientData, error: clientError } = await supabaseClient
      .from('client')
      .select('accessToken, refresh_token, expires_at')
      .eq('id', client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client data:', clientError);
      throw new Error('HubSpot integration not found for this client_id. Please install the app.');
    }

    let accessToken = clientData.accessToken;
    const refreshToken = clientData.refresh_token;
    const expiresAt = new Date(clientData.expires_at);

    // Check if access token is expired and refresh if needed
    if (expiresAt < new Date()) {
      console.log('Access token expired, refreshing...');
      const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
      const HUBSPOT_CLIENT_SECRET = Deno.env.get('HUBSPOT_CLIENT_SECRET');
      // Corrected: The redirect URI for refresh token flow should also be static
      const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`; 

      if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
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
          client_secret: HUBSPOT_CLIENT_SECRET,
          redirect_uri: HUBSPOT_REDIRECT_URI, // Required for refresh token flow
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

      // Update tokens in database
      const { error: updateError } = await supabaseClient
        .from('client')
        .update({
          accessToken: accessToken,
          refresh_token: newTokens.refresh_token || refreshToken, // Use new refresh token if provided
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', client_id);

      if (updateError) {
        console.error('Supabase update error after refresh:', updateError);
        throw new Error(`Failed to update tokens in database: ${updateError.message}`);
      }
    }

    // Fetch contacts from HubSpot API
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

    // Map HubSpot contacts to match your existing table structure if needed
    // The current `contacts` table has `id`, `name`, `deal_id`, `created_at`.
    // HubSpot API returns `id`, `properties.firstname`, `properties.lastname`, etc.
    // We need to transform this.
    const transformedContacts = hubspotContacts.results.map((contact: any) => ({
      id: contact.id,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      deal_id: contact.properties.deal_id || null, // Assuming deal_id might come from properties
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