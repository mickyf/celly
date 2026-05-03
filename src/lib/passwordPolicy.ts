export const PASSWORD_MIN_LENGTH = 8

export type PasswordPolicyError =
  | 'validation.passwordTooShort'
  | 'validation.passwordNeedsUpper'
  | 'validation.passwordNeedsDigit'
  | 'validation.passwordNeedsSymbol'

export function validatePasswordComplexity(value: string): PasswordPolicyError | null {
  if (value.length < PASSWORD_MIN_LENGTH) return 'validation.passwordTooShort'
  if (!/[A-Z]/.test(value)) return 'validation.passwordNeedsUpper'
  if (!/[0-9]/.test(value)) return 'validation.passwordNeedsDigit'
  if (!/[^A-Za-z0-9]/.test(value)) return 'validation.passwordNeedsSymbol'
  return null
}
