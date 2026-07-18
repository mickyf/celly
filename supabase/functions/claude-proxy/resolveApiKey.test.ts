import { describe, it, expect } from 'vitest'
import { resolveClaudeApiKey } from './resolveApiKey.ts'

describe('resolveClaudeApiKey', () => {
  it('prefers the per-user key over the env secret', () => {
    expect(resolveClaudeApiKey('sk-user', 'sk-env')).toBe('sk-user')
  })

  it('falls back to the env secret when no per-user key is set', () => {
    expect(resolveClaudeApiKey(null, 'sk-env')).toBe('sk-env')
    expect(resolveClaudeApiKey(undefined, 'sk-env')).toBe('sk-env')
  })

  it('treats a blank per-user value as absent and falls back', () => {
    expect(resolveClaudeApiKey('', 'sk-env')).toBe('sk-env')
    expect(resolveClaudeApiKey('   ', 'sk-env')).toBe('sk-env')
  })

  it('trims surrounding whitespace from the chosen key', () => {
    expect(resolveClaudeApiKey('  sk-user\n', 'sk-env')).toBe('sk-user')
    expect(resolveClaudeApiKey(null, ' sk-env ')).toBe('sk-env')
  })

  it('returns undefined when neither key is available', () => {
    expect(resolveClaudeApiKey(null, undefined)).toBeUndefined()
    expect(resolveClaudeApiKey('  ', '')).toBeUndefined()
  })
})
