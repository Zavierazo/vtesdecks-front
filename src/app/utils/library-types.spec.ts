import { describe, expect, it } from 'vitest'
import { getLibraryTypeIcons } from './library-types'

describe('Library type icons', () => {
  it.each([undefined, null, ''])(
    'renders no icons for a missing type (%s)',
    (type) => {
      expect(getLibraryTypeIcons(type)).toEqual([])
    },
  )

  it('keeps all recognized icons for a combined type', () => {
    expect(getLibraryTypeIcons('Action/Reaction')).toEqual([
      'action',
      'reaction',
    ])
  })
})
