import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseMock } from '../test/supabaseMock'

vi.mock('./supabase', async () => {
  const { getSupabaseMock } = await import('../test/supabaseMock')
  return { supabase: getSupabaseMock().supabase }
})

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  startSpan: <T,>(_opts: unknown, fn: (span: { setStatus: () => void }) => T) =>
    fn({ setStatus: vi.fn() }),
}))

import { parseOrderDocument } from './claude'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.functionsInvoke.mockReset()
})

function makeFile(type: string, contents = 'hello'): File {
  return new File([contents], 'order.bin', { type })
}

describe('parseOrderDocument', () => {
  it('forwards a PDF as base64 with the correct mediaType', async () => {
    mockClient.functionsInvoke.mockResolvedValueOnce({
      data: { wines: [], explanation: 'empty' },
      error: null,
    })

    const file = makeFile('application/pdf', 'pdf-data')
    const result = await parseOrderDocument(file)

    expect(result.wines).toEqual([])
    expect(mockClient.functionsInvoke).toHaveBeenCalledTimes(1)
    const [name, options] = mockClient.functionsInvoke.mock.calls[0]
    expect(name).toBe('claude-proxy')
    const body = options.body as { type: string; mediaType: string; base64File: string }
    expect(body.type).toBe('parse-order-document')
    expect(body.mediaType).toBe('application/pdf')
    expect(typeof body.base64File).toBe('string')
    expect(body.base64File.length).toBeGreaterThan(0)
    // FileReader.readAsDataURL strips the prefix; base64 should not contain a comma.
    expect(body.base64File).not.toContain(',')
  })

  it('forwards a JPEG as image with the correct mediaType', async () => {
    mockClient.functionsInvoke.mockResolvedValueOnce({
      data: {
        wines: [
          { name: 'Barolo', vintage: 2018, quantity: 6, price: null, bottleSize: '75cl', winery: null },
        ],
        explanation: 'ok',
      },
      error: null,
    })

    const result = await parseOrderDocument(makeFile('image/jpeg'))

    expect(result.wines).toHaveLength(1)
    const body = mockClient.functionsInvoke.mock.calls[0][1].body as { mediaType: string }
    expect(body.mediaType).toBe('image/jpeg')
  })

  it('rejects unsupported mime types without calling the edge function', async () => {
    await expect(parseOrderDocument(makeFile('image/heic'))).rejects.toThrow(
      /Unsupported file type/,
    )
    expect(mockClient.functionsInvoke).not.toHaveBeenCalled()
  })

  it('surfaces edge-function errors', async () => {
    mockClient.functionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    })
    await expect(parseOrderDocument(makeFile('application/pdf'))).rejects.toThrow(/boom/)
  })
})
