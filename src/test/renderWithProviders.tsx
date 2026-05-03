import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import '../i18n/config'

export function renderWithProviders(ui: ReactNode, options?: RenderOptions) {
  return render(<MantineProvider>{ui}</MantineProvider>, options)
}
