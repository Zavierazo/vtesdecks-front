import { afterEach, describe, expect, it } from 'vitest'
import { takeEmailActionToken } from './email-action-security'

describe('email action URL handling', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('reads the fragment token and immediately clears sensitive URL content', () => {
    const token = 'a'.repeat(43)
    window.history.replaceState(
      null,
      '',
      `/reset-password?email=old@example.com#token=${token}`,
    )
    expect(takeEmailActionToken('/reset-password')).toBe(token)
    expect(window.location.pathname).toBe('/reset-password')
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(takeEmailActionToken('/reset-password')).toBeUndefined()
  })

  it('also clears legacy query links so the form can show replacement-link guidance', () => {
    window.history.replaceState(null, '', '/verify?token=legacy-jwt')
    expect(takeEmailActionToken('/verify')).toBe('legacy-jwt')
    expect(window.location.search).toBe('')
  })
})
