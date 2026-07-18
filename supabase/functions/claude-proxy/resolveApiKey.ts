/**
 * Resolve the Claude API key for a proxied request.
 *
 * Prefers the caller's per-user key (the user_settings row) and falls back to the
 * global CLAUDE_API_KEY secret. Values are trimmed, and blank/whitespace-only
 * values are treated as absent so an empty settings row falls through to the secret.
 */
export function resolveClaudeApiKey(
  perUserValue: string | null | undefined,
  envValue: string | null | undefined,
): string | undefined {
  const perUser = perUserValue?.trim()
  if (perUser) return perUser

  const env = envValue?.trim()
  if (env) return env

  return undefined
}
