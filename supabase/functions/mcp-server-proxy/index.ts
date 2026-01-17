/**
 * MCP Server Proxy Edge Function
 *
 * This function acts as a proxy for the MCP server, allowing AI assistants
 * to interact with Celly through authenticated HTTP requests.
 *
 * Security: Validates user authentication before forwarding requests to
 * internal Supabase APIs.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Wine {
  id: string;
  name: string;
  vintage?: number;
  grapes?: string[];
  quantity: number;
  drink_from?: number;
  drink_until?: number;
  price?: number;
  bottle_size?: number;
  food_pairings?: string;
  photo_url?: string;
  winery_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TastingNote {
  id: string;
  wine_id: string;
  rating: number;
  notes?: string;
  tasting_date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface AddWineParams {
  name: string;
  vintage?: number;
  grapes?: string[];
  quantity?: number;
  drink_from?: number;
  drink_until?: number;
  price?: number;
  bottle_size?: number;
  food_pairings?: string;
  winery_id?: string;
}

interface MCPRequest {
  action: 'list_wines' | 'get_wine' | 'add_wine';
  params?: {
    wine_id?: string;
    wine?: AddWineParams;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: MCPRequest = await req.json();
    const { action, params } = body;

    // Handle different actions
    let result;

    switch (action) {
      case 'list_wines': {
        const { data: wines, error } = await supabaseClient
          .from('wines')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        result = { wines };
        break;
      }

      case 'get_wine': {
        if (!params?.wine_id) {
          return new Response(
            JSON.stringify({ error: 'wine_id parameter required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch wine
        const { data: wine, error: wineError } = await supabaseClient
          .from('wines')
          .select('*')
          .eq('id', params.wine_id)
          .single();

        if (wineError) throw wineError;

        // Fetch tasting notes
        const { data: notes, error: notesError } = await supabaseClient
          .from('tasting_notes')
          .select('*')
          .eq('wine_id', params.wine_id)
          .order('tasting_date', { ascending: false });

        if (notesError) throw notesError;

        result = { wine, tasting_notes: notes };
        break;
      }

      case 'add_wine': {
        if (!params?.wine) {
          return new Response(
            JSON.stringify({ error: 'wine parameter required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const wineData = {
          name: params.wine.name,
          vintage: params.wine.vintage,
          grapes: params.wine.grapes,
          quantity: params.wine.quantity ?? 1,
          drink_from: params.wine.drink_from,
          drink_until: params.wine.drink_until,
          price: params.wine.price,
          bottle_size: params.wine.bottle_size ?? 750,
          food_pairings: params.wine.food_pairings,
          winery_id: params.wine.winery_id,
          user_id: user.id,
        };

        const { data: wine, error } = await supabaseClient
          .from('wines')
          .insert(wineData)
          .select()
          .single();

        if (error) throw error;
        result = { wine };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MCP proxy error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
