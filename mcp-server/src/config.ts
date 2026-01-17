/**
 * Configuration for the Celly MCP server
 */

export interface Config {
  supabaseUrl: string;
  userAuthToken: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const supabaseUrl = process.env.SUPABASE_URL;
  const userAuthToken = process.env.USER_AUTH_TOKEN;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!userAuthToken) {
    throw new Error('USER_AUTH_TOKEN environment variable is required');
  }

  return {
    supabaseUrl,
    userAuthToken,
  };
}
