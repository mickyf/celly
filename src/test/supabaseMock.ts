import { vi, type Mock } from 'vitest'

export type QueryResult<T = unknown> = {
  data: T | null
  error: { message: string; code?: string; hint?: string; details?: string } | null
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'contains',
  'order',
  'limit',
  'range',
  'not',
  'filter',
  'match',
  'single',
  'maybeSingle',
] as const

export type ChainMethod = (typeof CHAIN_METHODS)[number]

export type QueryBuilder<T = unknown> = {
  [K in ChainMethod]: Mock
} & {
  then: <R>(onFulfilled: (value: QueryResult<T>) => R) => Promise<R>
  catch: <R>(onRejected: (reason: unknown) => R) => Promise<R>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __resolve: (result: QueryResult<any>) => void
}

// Builds a thenable, chainable query builder. Every chain method returns the
// same builder, so a sequence like .select().eq().order() resolves with the
// preset result when awaited.
export function makeQueryBuilder<T = unknown>(
  initial: QueryResult<T> = { data: null, error: null },
): QueryBuilder<T> {
  let result: QueryResult<T> = initial
  const builder = {} as QueryBuilder<T>

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }

  builder.then = (onFulfilled) => Promise.resolve(result).then(onFulfilled)
  builder.catch = <R>(onRejected: (reason: unknown) => R) =>
    Promise.resolve(result).catch(onRejected) as Promise<R>
  builder.__resolve = (next) => {
    result = next as QueryResult<T>
  }

  return builder
}

export type StorageBucketMock = {
  upload: Mock
  remove: Mock
  download: Mock
  createSignedUrl: Mock
  getPublicUrl: Mock
  list: Mock
}

function makeStorageBucket(): StorageBucketMock {
  return {
    upload: vi.fn(async () => ({ data: { path: 'mock/path' }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    download: vi.fn(async () => ({ data: new Blob(), error: null })),
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: 'https://mock/signed' },
      error: null,
    })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock/public' } })),
    list: vi.fn(async () => ({ data: [], error: null })),
  }
}

export interface SupabaseMock {
  // The fake client to inject in place of `../lib/supabase`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fromMock: Mock
  storageFromMock: Mock
  functionsInvoke: Mock
  authGetUser: Mock
  authGetSession: Mock
  // Helper: register a query builder (or per-table factory) for `from(table)`.
  setTable: (table: string, builder: QueryBuilder | (() => QueryBuilder)) => void
}

const TEST_USER = { id: 'test-user-id', email: 'test@example.com' }

// Singleton helpers — required because vi.mock factories are hoisted above
// top-level imports, so a test file can't construct the mock and pass it into
// vi.mock(). Both the factory and the test reach for the same instance via
// getSupabaseMock(); resetSupabaseMock() rebuilds it between test files.
let _instance: SupabaseMock | null = null
export function getSupabaseMock(): SupabaseMock {
  if (!_instance) _instance = createSupabaseMock()
  return _instance
}
export function resetSupabaseMock(): SupabaseMock {
  _instance = createSupabaseMock()
  return _instance
}

export function createSupabaseMock(): SupabaseMock {
  const tableBuilders = new Map<string, QueryBuilder | (() => QueryBuilder)>()

  const fromMock = vi.fn((table: string) => {
    const entry = tableBuilders.get(table)
    if (typeof entry === 'function') return entry()
    if (entry) return entry
    return makeQueryBuilder({ data: [], error: null })
  })

  const storageFromMock = vi.fn(() => makeStorageBucket())
  const functionsInvoke = vi.fn(async () => ({ data: null, error: null }))
  const authGetUser = vi.fn(async () => ({
    data: { user: TEST_USER },
    error: null,
  }))
  const authGetSession = vi.fn(async () => ({
    data: { session: { user: TEST_USER } },
    error: null,
  }))

  return {
    supabase: {
      from: fromMock,
      storage: { from: storageFromMock },
      functions: { invoke: functionsInvoke },
      auth: { getUser: authGetUser, getSession: authGetSession },
    },
    fromMock,
    storageFromMock,
    functionsInvoke,
    authGetUser,
    authGetSession,
    setTable: (table, builder) => tableBuilders.set(table, builder),
  }
}
