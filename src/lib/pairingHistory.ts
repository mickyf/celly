import type { PairingRecommendation } from './claude'

const STORAGE_KEY = 'celly:pairing-history'
const MAX_ENTRIES = 20
export const PAIRING_CACHE_TTL_MS = 5 * 60 * 1000

export interface PairingHistoryEntry {
  id: string
  menu: string
  wineIds: string[]
  language: 'en' | 'de-CH'
  recommendations: PairingRecommendation[]
  createdAt: number
}

interface CacheKeyInput {
  menu: string
  wineIds: string[]
  language: 'en' | 'de-CH'
}

export function pairingCacheKey({ menu, wineIds, language }: CacheKeyInput): string {
  const normalizedMenu = menu.trim().toLowerCase().replace(/\s+/g, ' ')
  const sortedIds = [...wineIds].sort().join(',')
  return `${language}|${normalizedMenu}|${sortedIds}`
}

export function loadPairingHistory(): PairingHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e): e is PairingHistoryEntry =>
      e &&
      typeof e.id === 'string' &&
      typeof e.menu === 'string' &&
      Array.isArray(e.wineIds) &&
      (e.language === 'en' || e.language === 'de-CH') &&
      Array.isArray(e.recommendations) &&
      typeof e.createdAt === 'number',
    )
  } catch {
    return []
  }
}

export function savePairingHistory(entries: PairingHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Quota exceeded or storage disabled — nothing useful to do.
  }
}

export function addPairingEntry(
  history: PairingHistoryEntry[],
  entry: Omit<PairingHistoryEntry, 'id' | 'createdAt'>,
  now: number = Date.now(),
): PairingHistoryEntry[] {
  const newEntry: PairingHistoryEntry = {
    ...entry,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  }
  return [newEntry, ...history].slice(0, MAX_ENTRIES)
}

export function findCachedPairing(
  history: PairingHistoryEntry[],
  input: CacheKeyInput,
  now: number = Date.now(),
  ttlMs: number = PAIRING_CACHE_TTL_MS,
): PairingHistoryEntry | null {
  const key = pairingCacheKey(input)
  return (
    history.find(
      (e) =>
        pairingCacheKey({ menu: e.menu, wineIds: e.wineIds, language: e.language }) === key &&
        now - e.createdAt < ttlMs,
    ) ?? null
  )
}

export function clearPairingHistory(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
