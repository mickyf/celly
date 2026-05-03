import { describe, it, expect } from 'vitest'
import { validatePasswordComplexity } from './passwordPolicy'

describe('validatePasswordComplexity', () => {
  it('accepts a password meeting all requirements', () => {
    expect(validatePasswordComplexity('Abcdef1!')).toBeNull()
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePasswordComplexity('Ab1!')).toBe('validation.passwordTooShort')
    expect(validatePasswordComplexity('Abcdef1')).toBe('validation.passwordTooShort')
  })

  it('rejects passwords without an uppercase letter', () => {
    expect(validatePasswordComplexity('abcdefg1!')).toBe('validation.passwordNeedsUpper')
  })

  it('rejects passwords without a digit', () => {
    expect(validatePasswordComplexity('Abcdefgh!')).toBe('validation.passwordNeedsDigit')
  })

  it('rejects passwords without a symbol', () => {
    expect(validatePasswordComplexity('Abcdefg1')).toBe('validation.passwordNeedsSymbol')
  })

  it('reports the first failing rule (length before complexity)', () => {
    expect(validatePasswordComplexity('a')).toBe('validation.passwordTooShort')
  })
})
