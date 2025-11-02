import { vi } from 'vitest'

vi.mock('@top-x/shared', () => ({
  analytics: null,
}))

vi.mock('firebase/analytics', () => ({
  logEvent: vi.fn(),
}))
