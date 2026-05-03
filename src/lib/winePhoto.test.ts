import { describe, it, expect } from 'vitest'
import { extractPhotoPath } from './winePhoto'

describe('extractPhotoPath', () => {
  it('returns null for empty input', () => {
    expect(extractPhotoPath(null)).toBeNull()
    expect(extractPhotoPath(undefined)).toBeNull()
    expect(extractPhotoPath('')).toBeNull()
    expect(extractPhotoPath('   ')).toBeNull()
  })

  it('extracts the path from a Supabase public URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/wine-images/user-1/wine-2.jpg'
    expect(extractPhotoPath(url)).toBe('user-1/wine-2.jpg')
  })

  it('extracts the path from a Supabase signed URL (drops the query string)', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/sign/wine-images/user-1/wine-2.jpg?token=abc'
    expect(extractPhotoPath(url)).toBe('user-1/wine-2.jpg')
  })

  it('returns the input verbatim when already a bare path', () => {
    expect(extractPhotoPath('user-1/wine-2.jpg')).toBe('user-1/wine-2.jpg')
  })

  it('strips a leading slash from a bare path', () => {
    expect(extractPhotoPath('/user-1/wine-2.jpg')).toBe('user-1/wine-2.jpg')
  })

  it('handles a localhost dev URL', () => {
    const url = 'http://127.0.0.1:54321/storage/v1/object/public/wine-images/user-1/wine-2.png'
    expect(extractPhotoPath(url)).toBe('user-1/wine-2.png')
  })
})
