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
    case '0-1':
      return 'contacts';
    // Add other mappings if needed
    default:
      return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiUrl, apiMethod, apiBodyTemplate, queries, dynamicData } = await req.json();
    const { objectId, objectTypeId, hub_id } = dynamicData || {};

    if (!apiUrl || !apiMethod) {
      return new Response(JSON.stringify({ error: 'apiUrl and apiMethod are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!hub_id) {
      return new Response(JSON.stringify({ error: 'hub_id is required in dynamicData' }), {
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

    // 1. Retrieve client data by hub_id
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

    // 2. Token Refresh Logic
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

    // 3. Fetch Contact Details if objectId and objectTypeId are provided
    let contactDetails = null;
    if (objectId && objectTypeId) {
      const objectType = getHubspotObjectType(objectTypeId);
      if (!objectType) {
        console.warn(`Unsupported objectTypeId: ${objectTypeId}`);
      } else {
        const hubspotContactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}`, {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!hubspotContactResponse.ok) {
          const errorData = await hubspotContactResponse.json();
          console.error(`Failed to fetch contact ${objectId} from HubSpot:`, errorData);
          throw new Error(`Failed to fetch contact ${objectId} from HubSpot: ${errorData.message || JSON.stringify(errorData)}`);
        }
        contactDetails = await hubspotContactResponse.json();
      }
    }

    // Construct the target URL with query parameters for GET requests
    let targetUrl = apiUrl;
    if (apiMethod.toUpperCase() === 'GET' && queries && queries.length > 0) {
      const urlSearchParams = new URLSearchParams();
      queries.forEach(q => {
        if (q.key && q.value) {
          urlSearchParams.append(q.key, q.value);
        }
      });
      if (urlSearchParams.toString()) {
        targetUrl = `${targetUrl}?${urlSearchParams.toString()}`;
      }
    }

    // Prepare the request body for POST/PUT/DELETE requests
    let requestBody = apiBodyTemplate;
    if (requestBody) {
      // Replace dynamicData placeholders
      if (dynamicData) {
        for (const key in dynamicData) {
          requestBody = requestBody.replace(new RegExp(`{{dynamicData.${key}}}`, 'g'), dynamicData[key]);
        }
      }
      // Replace contactDetails placeholders
      if (contactDetails && contactDetails.properties) {
        for (const key in contactDetails.properties) {
          requestBody = requestBody.replace(new RegExp(`{{contact.${key}}}`, 'g'), contactDetails.properties[key]);
        }
        // Also replace top-level contact details like id
        requestBody = requestBody.replace(new RegExp(`{{contact.id}}`, 'g'), contactDetails.id);
      }
      // Replace other common placeholders
      requestBody = requestBody.replace(new RegExp(`{{objectId}}`, 'g'), objectId || '');
      requestBody = requestBody.replace(new RegExp(`{{objectTypeId}}`, 'g'), objectTypeId || '');
      requestBody = requestBody.replace(new RegExp(`{{hub_id}}`, 'g'), hub_id || '');
    }

    const externalResponse = await fetch(targetUrl, {
      method: apiMethod,
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers required by the external API, e.g., Authorization
        // If the target API is a HubSpot API, you might need to add the currentAccessToken here.
        // For generic external APIs, this might not be needed or might need a different token.
        // For now, assuming external APIs might not need HubSpot's bearer token unless explicitly passed.
      },
      body: requestBody && ['POST', 'PUT', 'PATCH'].includes(apiMethod.toUpperCase()) ? requestBody : undefined,
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