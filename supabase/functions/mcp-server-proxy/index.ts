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

interface AddWineParams {
  name: string;
  wine_type?: string;
  vintage?: number;
  grapes?: string[];
  quantity?: number;
  drink_window_start?: number;
  drink_window_end?: number;
  price?: number;
  bottle_size?: string;
  food_pairings?: string;
  winery_id?: string;
}

interface AddWineryParams {
  name: string;
  country_code?: string;
}

interface MCPRequest {
  action:
    | 'list_wines'
    | 'get_wine'
    | 'add_wine'
    | 'list_wineries'
    | 'get_winery'
    | 'add_winery';
  params?: {
    wine_id?: string;
    wine?: AddWineParams;
    winery_id?: string;
    winery?: AddWineryParams;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

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

    const body: MCPRequest = await req.json();
    const { action, params } = body;

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

        const { data: wine, error: wineError } = await supabaseClient
          .from('wines')
          .select('*')
          .eq('id', params.wine_id)
          .maybeSingle();

        if (wineError) throw wineError;

        if (!wine) {
          result = { wine: null, tasting_notes: [] };
          break;
        }

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
          wine_type: params.wine.wine_type,
          vintage: params.wine.vintage,
          grapes: params.wine.grapes,
          quantity: params.wine.quantity ?? 1,
          drink_window_start: params.wine.drink_window_start,
          drink_window_end: params.wine.drink_window_end,
          price: params.wine.price,
          bottle_size: params.wine.bottle_size,
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

      case 'list_wineries': {
        const { data: wineries, error } = await supabaseClient
          .from('wineries')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        result = { wineries };
        break;
      }

      case 'get_winery': {
        if (!params?.winery_id) {
          return new Response(
            JSON.stringify({ error: 'winery_id parameter required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: winery, error: wineryError } = await supabaseClient
          .from('wineries')
          .select('*')
          .eq('id', params.winery_id)
          .maybeSingle();

        if (wineryError) throw wineryError;

        if (!winery) {
          result = { winery: null, wines: [] };
          break;
        }

        const { data: wines, error: winesError } = await supabaseClient
          .from('wines')
          .select('*')
          .eq('winery_id', params.winery_id)
          .order('name', { ascending: true });

        if (winesError) throw winesError;

        result = { winery, wines };
        break;
      }

      case 'add_winery': {
        if (!params?.winery) {
          return new Response(
            JSON.stringify({ error: 'winery parameter required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const name = params.winery.name?.trim();
        if (!name) {
          return new Response(
            JSON.stringify({ error: 'winery.name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let countryCode: string | undefined;
        if (params.winery.country_code) {
          countryCode = params.winery.country_code.trim().toUpperCase();
          if (!/^[A-Z]{2}$/.test(countryCode)) {
            return new Response(
              JSON.stringify({ error: 'country_code must be a 2-letter ISO 3166-1 alpha-2 code' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const { data: existingMatches, error: lookupError } = await supabaseClient
          .from('wineries')
          .select('*')
          .ilike('name', name)
          .limit(1);

        if (lookupError) throw lookupError;

        if (existingMatches && existingMatches.length > 0) {
          result = { winery: existingMatches[0] };
          break;
        }

        const { data: winery, error } = await supabaseClient
          .from('wineries')
          .insert({
            name,
            country_code: countryCode,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = { winery };
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
