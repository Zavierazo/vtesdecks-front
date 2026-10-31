import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LibraryTypeTranslocoPipe } from './library-type-transloco.pipe'

describe('Library type labels', () => {
  afterEach(() => TestBed.resetTestingModule())

  it.each([undefined, null, ''])(
    'renders an empty label for a missing type (%s)',
    (type) => {
      const translate = vi.fn()
      TestBed.configureTestingModule({
        providers: [{ provide: TranslocoService, useValue: { translate } }],
      })
      const pipe = TestBed.runInInjectionContext(
        () => new LibraryTypeTranslocoPipe(),
      )

      expect(pipe.transform(type)).toBe('')
      expect(translate).not.toHaveBeenCalled()
    },
  )
})
