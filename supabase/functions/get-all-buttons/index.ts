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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role key

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL or Service Role Key environment variables not set.');
    }

    // Create Supabase client with the service role key to bypass RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: buttons, error } = await supabaseClient
      .from('buttons')
      .select('*, cards(title)') // Select all button fields and join with cards table, removed webhooks join
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching buttons:', error.message);
      throw new Error(`Failed to fetch buttons: ${error.message}`);
    }

    // Add the execute-button-action URL to each button
    const executeButtonActionUrl = `https://qeuaqcgiriahfwwzenqw.supabase.co/functions/v1/execute-button-action`;
    const buttonsWithActionUrl = buttons.map(button => ({
      ...button,
      execute_action_url: executeButtonActionUrl,
    }));

    return new Response(JSON.stringify({ data: buttonsWithActionUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-all-buttons function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});