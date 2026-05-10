import { describe, it, expect, beforeEach } from 'vitest'
import {
  pairingCacheKey,
  addPairingEntry,
  findCachedPairing,
  loadPairingHistory,
  savePairingHistory,
  clearPairingHistory,
  PAIRING_CACHE_TTL_MS,
  type PairingHistoryEntry,
} from './pairingHistory'

const baseEntry: Omit<PairingHistoryEntry, 'id' | 'createdAt'> = {
  menu: '  Grilled steak ',
  wineIds: ['w-2', 'w-1'],
  language: 'en',
  recommendations: [],
}

describe('pairingCacheKey', () => {
  it('normalizes menu casing and whitespace', () => {
    expect(pairingCacheKey({ menu: '  Grilled\tSTEAK\n', wineIds: ['a'], language: 'en' })).toBe(
      pairingCacheKey({ menu: 'grilled steak', wineIds: ['a'], language: 'en' }),
    )
  })

  it('is order-independent for wineIds', () => {
    expect(pairingCacheKey({ menu: 'x', wineIds: ['b', 'a'], language: 'en' })).toBe(
      pairingCacheKey({ menu: 'x', wineIds: ['a', 'b'], language: 'en' }),
    )
  })

  it('differs by language', () => {
    expect(pairingCacheKey({ menu: 'x', wineIds: ['a'], language: 'en' })).not.toBe(
      pairingCacheKey({ menu: 'x', wineIds: ['a'], language: 'de-CH' }),
    )
  })
})

describe('addPairingEntry', () => {
  it('prepends a new entry with id + createdAt', () => {
    const out = addPairingEntry([], baseEntry, 1000)
    expect(out).toHaveLength(1)
    expect(out[0].createdAt).toBe(1000)
    expect(out[0].id).toMatch(/^1000-/)
  })

  it('caps history to 20 entries', () => {
    let history: PairingHistoryEntry[] = []
    for (let i = 0; i < 25; i++) {
      history = addPairingEntry(history, { ...baseEntry, menu: `m-${i}` }, i)
    }
    expect(history).toHaveLength(20)
    expect(history[0].menu).toBe('m-24')
    expect(history.at(-1)?.menu).toBe('m-5')
  })
})

describe('findCachedPairing', () => {
  it('returns a matching entry within TTL', () => {
    const history = addPairingEntry([], baseEntry, 0)
    const hit = findCachedPairing(
      history,
      { menu: 'Grilled steak', wineIds: ['w-1', 'w-2'], language: 'en' },
      PAIRING_CACHE_TTL_MS - 1,
    )
    expect(hit).not.toBeNull()
  })

  it('returns null when TTL is exceeded', () => {
    const history = addPairingEntry([], baseEntry, 0)
    const miss = findCachedPairing(
      history,
      { menu: 'Grilled steak', wineIds: ['w-1', 'w-2'], language: 'en' },
      PAIRING_CACHE_TTL_MS + 1,
    )
    expect(miss).toBeNull()
  })

  it('returns null when wineIds differ', () => {
    const history = addPairingEntry([], baseEntry, 0)
    const miss = findCachedPairing(
      history,
      { menu: 'Grilled steak', wineIds: ['w-1'], language: 'en' },
      0,
    )
    expect(miss).toBeNull()
  })
})

describe('localStorage round-trip', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists and reloads entries', () => {
    const history = addPairingEntry([], baseEntry, 0)
    savePairingHistory(history)
    expect(loadPairingHistory()).toEqual(history)
  })

  it('returns [] for empty / corrupt storage', () => {
    expect(loadPairingHistory()).toEqual([])
    window.localStorage.setItem('celly:pairing-history', 'not-json')
    expect(loadPairingHistory()).toEqual([])
    window.localStorage.setItem('celly:pairing-history', JSON.stringify([{ id: 'bad' }]))
    expect(loadPairingHistory()).toEqual([])
  })

  it('clears storage', () => {
    savePairingHistory(addPairingEntry([], baseEntry, 0))
    clearPairingHistory()
    expect(loadPairingHistory()).toEqual([])
  })
})
