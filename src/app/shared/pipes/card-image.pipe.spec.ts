import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CardImagePipe } from './card-image.pipe'
import { CardImageSetService } from '../../services/card-image-set.service'
import { OfflineImagesService } from '../../services/offline-images.service'
import { environment } from '@environments/environment'

describe('CardImagePipe shared offline images', () => {
  let pipe: CardImagePipe
  const changed = new Subject<string>()
  const acquire = vi.fn(() => 'back')
  const release = vi.fn()
  const markForCheck = vi.fn()
  const resolveSet = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    resolveSet.mockReturnValue(undefined)
    TestBed.configureTestingModule({
      providers: [
        { provide: CardImageSetService, useValue: { resolveSet } },
        {
          provide: OfflineImagesService,
          useValue: { changed, acquire, release, display: () => 'blob:cached' },
        },
        { provide: ChangeDetectorRef, useValue: { markForCheck } },
      ],
    })
    pipe = TestBed.runInInjectionContext(() => new CardImagePipe())
  })
  it('uses local images, updates the view and releases the previous card', () => {
    const card = { id: 200001, image: '/img/cards/200001.jpg' }
    expect(pipe.transform(card)).toBe('back')
    expect(pipe.transform(card)).toBe('blob:cached')
    expect(acquire).toHaveBeenCalledOnce()
    changed.next(environment.cdnDomain + card.image)
    expect(markForCheck).toHaveBeenCalledOnce()
    pipe.transform({ id: 100001 })
    expect(release).toHaveBeenCalledWith(environment.cdnDomain + card.image)
    pipe.ngOnDestroy()
    expect(release).toHaveBeenCalledTimes(2)
  })
  it('keeps printing preferences and provides the correct card back', () => {
    resolveSet.mockReturnValue('Jyhad:C')
    pipe.transform({ id: 200001 })
    expect(acquire).toHaveBeenCalledWith(
      environment.cdnDomain + '/img/cards/sets/jyhad/200001.jpg',
      expect.any(String),
      '/assets/img/cardbackcrypt.jpg',
    )
    pipe.transform({ id: 100001 })
    expect(acquire).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      '/assets/img/cardbacklibrary.jpg',
    )
    pipe.ngOnDestroy()
  })
  it('preserves localized URL resolution for callers that need a stable URL', () => {
    expect(
      pipe.resolveUrl({
        id: 100001,
        i18n: { image: '/localized.jpg' },
      }),
    ).toBe(environment.cdnDomain + '/localized.jpg')
    expect(acquire).not.toHaveBeenCalled()
    pipe.ngOnDestroy()
  })
})
