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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key environment variables not set.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: buttons, error } = await supabaseClient
      .from('buttons')
      .select('*, cards(title)') // Select all button fields and the title from the associated card
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching buttons:', error.message);
      throw new Error(`Failed to fetch buttons: ${error.message}`);
    }

    return new Response(JSON.stringify({ data: buttons }), {
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