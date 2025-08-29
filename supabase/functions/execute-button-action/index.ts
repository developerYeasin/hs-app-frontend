import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to map objectTypeId to objectType string
const getHubspotObjectType = (objectTypeId: string): string | null => {
  switch (objectTypeId) {
    case '0-1': return 'contacts';
    case '0-2': return 'companies';
    case '0-3': return 'deals';
    case '0-4': return 'tickets';
    // Add other mappings if needed
    default: return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { button_id, objectId, objectTypeId, hub_id } = await req.json();

    if (!button_id || !hub_id) {
      return new Response(JSON.stringify({ error: 'button_id and hub_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('CLIENT_SECRET');
    const HUBSPOT_REDIRECT_URI = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/oauth-callback-hubspot`;

    if (!supabaseUrl || !supabaseServiceRoleKey || !HUBSPOT_CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Missing required environment variables for Supabase or HubSpot.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch Button Details
    const { data: button, error: buttonError } = await supabaseClient
      .from('buttons')
      .select('api_url, api_method, api_body_template, queries')
      .eq('id', button_id)
      .single();

    if (buttonError || !button) {
      console.error('Error fetching button details:', buttonError);
      return new Response(JSON.stringify({ error: `Button not found or error fetching details: ${buttonError?.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let { api_url, api_method, api_body_template, queries } = button;

    // 2. Retrieve client data by hub_id
    let { data: clientData, error: clientError } = await supabaseClient
      .from('client')
      .select('id, accessToken, refresh_token, expires_at')
      .eq('hub_id', hub_id)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client data by hub_id:', clientError);
      return new Response(JSON.stringify({ error: `HubSpot integration not found for hub_id: ${hub_id}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let currentAccessToken = clientData.accessToken;
    const refreshToken = clientData.refresh_token;
    let expiresAt = new Date(clientData.expires_at);

    // 3. Token Refresh Logic
    if (expiresAt < new Date()) {
      console.log('Access token expired, refreshing...');
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
        console.error('Failed to refresh access token:', errorData);
        throw new Error(`Failed to refresh access token: ${errorData.message || JSON.stringify(errorData)}`);
      }

      const newTokens = await refreshResponse.json();
      currentAccessToken = newTokens.access_token;
      expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));

      // Update tokens in Supabase
      const { error: updateError } = await supabaseClient
        .from('client')
        .update({
          accessToken: currentAccessToken,
          refresh_token: newTokens.refresh_token || refreshToken,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', clientData.id);

      if (updateError) {
        console.error('Supabase update error after token refresh:', updateError);
        throw new Error(`Failed to update tokens in database: ${updateError.message}`);
      }
    }

    // 4. Fetch Object Details (e.g., Contact) if objectId and objectTypeId are provided
    let objectDetails = null;
    if (objectId && objectTypeId) {
      const objectType = getHubspotObjectType(objectTypeId);
      if (!objectType) {
        console.warn(`Unsupported objectTypeId: ${objectTypeId}`);
      } else {
        const hubspotObjectResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}`, {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!hubspotObjectResponse.ok) {
          const errorData = await hubspotObjectResponse.json();
          console.error(`Failed to fetch object ${objectId} (type ${objectType}) from HubSpot:`, errorData);
          throw new Error(`Failed to fetch object ${objectId} (type ${objectType}) from HubSpot: ${errorData.message || JSON.stringify(errorData)}`);
        }
        objectDetails = await hubspotObjectResponse.json();
      }
    }

    // 5. Prepare dynamic data for placeholder replacement
    const dynamicContext = {
      objectId: objectId || '',
      objectTypeId: objectTypeId || '',
      hub_id: hub_id || '',
      button_id: button_id || '',
      contact: objectDetails?.properties || {}, // Use 'contact' for properties for backward compatibility with existing templates
      object: objectDetails || {}, // General object details
    };

    // Helper function to replace placeholders
    const replacePlaceholders = (template: string, context: any) => {
      let result = template;
      // Replace {{contact.property}}
      for (const prop in context.contact) {
        result = result.replace(new RegExp(`{{contact.${prop}}}`, 'g'), context.contact[prop]);
      }
      // Replace {{object.property}}
      if (context.object?.properties) {
        for (const prop in context.object.properties) {
          result = result.replace(new RegExp(`{{object.${prop}}}`, 'g'), context.object.properties[prop]);
        }
      }
      // Replace {{objectId}}, {{objectTypeId}}, {{hub_id}}, {{button_id}}
      result = result.replace(/{{objectId}}/g, context.objectId);
      result = result.replace(/{{objectTypeId}}/g, context.objectTypeId);
      result = result.replace(/{{hub_id}}/g, context.hub_id);
      result = result.replace(/{{button_id}}/g, context.button_id);
      return result;
    };

    // 6. Construct the target URL with query parameters for GET requests
    let finalApiUrl = replacePlaceholders(api_url, dynamicContext);
    if (api_method.toUpperCase() === 'GET' && queries && queries.length > 0) {
      const urlSearchParams = new URLSearchParams();
      queries.forEach(q => {
        if (q.key && q.value) {
          urlSearchParams.append(q.key, replacePlaceholders(q.value, dynamicContext));
        }
      });
      if (urlSearchParams.toString()) {
        finalApiUrl = `${finalApiUrl}?${urlSearchParams.toString()}`;
      }
    }

    // 7. Prepare the request body for POST/PUT/DELETE requests
    let finalRequestBody = null;
    if (api_body_template && ['POST', 'PUT', 'PATCH'].includes(api_method.toUpperCase())) {
      finalRequestBody = replacePlaceholders(api_body_template, dynamicContext);
    }

    // 8. Execute the external API call
    const externalResponse = await fetch(finalApiUrl, {
      method: api_method,
      headers: {
        'Content-Type': 'application/json',
        // If the target API is a HubSpot API, you might need to add the currentAccessToken here.
        // For generic external APIs, this might not be needed or might need a different token.
        // For now, assuming external APIs might not need HubSpot's bearer token unless explicitly passed.
        // If the API URL starts with HubSpot's API domain, add the Authorization header.
        ...(finalApiUrl.startsWith('https://api.hubapi.com/') ? { 'Authorization': `Bearer ${currentAccessToken}` } : {}),
      },
      body: finalRequestBody ? finalRequestBody : undefined,
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error(`External API call failed: ${externalResponse.status} - ${errorText}`);
      return new Response(JSON.stringify({ error: `External API call failed: ${externalResponse.status} - ${errorText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: externalResponse.status,
      });
    }

    const responseData = await externalResponse.json();
    return new Response(JSON.stringify({ message: 'Button action executed successfully', response: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in execute-button-action:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});