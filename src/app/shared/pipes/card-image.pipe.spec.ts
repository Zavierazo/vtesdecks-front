import { TestBed } from '@angular/core/testing'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  signal,
} from '@angular/core'
import { BehaviorSubject, Observable, of } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CardImagePipe } from './card-image.pipe'
import { CardImageSetService } from '../../services/card-image-set.service'
import { OfflineImagesService } from '../../services/offline-images.service'
import { environment } from '@environments/environment'

@Component({
  template: `<img
    [src]="overrideImage() || (card() | cardImage: set())"
    alt="Card"
  />`,
  imports: [CardImagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CardImageTestComponent {
  readonly card = signal({ id: 200001 })
  readonly set = signal<string | undefined>(undefined)
  readonly overrideImage = signal<string | undefined>(undefined)
}

describe('CardImagePipe', () => {
  let pipe: CardImagePipe
  const observe = vi.fn()
  const resolveSet = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    resolveSet.mockReturnValue(undefined)
    observe.mockImplementation((url: string) => of(url))
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        {
          provide: CardImageSetService,
          useValue: { resolveSet },
        },
        { provide: OfflineImagesService, useValue: { observe } },
      ],
    })
    pipe = TestBed.runInInjectionContext(() => new CardImagePipe())
  })

  it('returns a string and reuses its subscription until the resolved URL changes', () => {
    const card = { id: 200001 }
    expect(pipe.transform(card)).toBe(
      environment.cdnDomain + '/img/cards/200001.jpg',
    )
    expect(pipe.transform(card)).toBe(
      environment.cdnDomain + '/img/cards/200001.jpg',
    )
    expect(observe).toHaveBeenCalledOnce()
    resolveSet.mockReturnValue('Jyhad:C')
    expect(pipe.transform(card)).toBe(
      environment.cdnDomain + '/img/cards/sets/jyhad/200001.jpg',
    )
    expect(observe).toHaveBeenLastCalledWith(
      environment.cdnDomain + '/img/cards/sets/jyhad/200001.jpg',
      environment.cdnDomain + '/img/cards/200001.jpg',
      '/assets/img/cardbackcrypt.jpg',
    )
    pipe.ngOnDestroy()
  })

  it('uses an explicit printing and a localized fallback', () => {
    pipe.transform({ id: 100001, i18n: { image: '/localized.jpg' } }, 'Jyhad:C')
    expect(observe).toHaveBeenCalledWith(
      environment.cdnDomain + '/img/cards/sets/jyhad/100001.jpg',
      environment.cdnDomain + '/localized.jpg',
      '/assets/img/cardbacklibrary.jpg',
    )
    pipe.ngOnDestroy()
  })

  it('resolves a stable CDN URL without subscribing for scanner callers', () => {
    expect(
      pipe.resolveUrl({ id: 100001, i18n: { image: '/localized.jpg' } }),
    ).toBe(environment.cdnDomain + '/localized.jpg')
    expect(observe).not.toHaveBeenCalled()
  })

  it('updates an OnPush image with string bindings and releases old subscriptions', async () => {
    const first = new BehaviorSubject('placeholder')
    const released = vi.fn()
    observe.mockImplementation(
      (url: string) =>
        new Observable<string>((subscriber) => {
          const subscription = first.subscribe(subscriber)
          return () => {
            subscription.unsubscribe()
            released(url)
          }
        }),
    )
    const fixture = TestBed.createComponent(CardImageTestComponent)
    await fixture.whenStable()
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement
    expect(image.getAttribute('src')).toBe('placeholder')
    first.next('blob:cached')
    await fixture.whenStable()
    expect(image.getAttribute('src')).toBe('blob:cached')
    expect(observe).toHaveBeenCalledOnce()
    fixture.componentInstance.set.set('Jyhad:C')
    await fixture.whenStable()
    expect(released).toHaveBeenCalledWith(
      environment.cdnDomain + '/img/cards/200001.jpg',
    )
    expect(observe).toHaveBeenCalledTimes(2)
    fixture.destroy()
    expect(released).toHaveBeenCalledTimes(2)
  })

  it('uses an override URL without trying to interpret it as a card', async () => {
    const fixture = TestBed.createComponent(CardImageTestComponent)
    fixture.componentInstance.overrideImage.set('https://cdn.test/override.jpg')
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.test/override.jpg',
    )
    expect(observe).not.toHaveBeenCalled()
    fixture.destroy()
  })
})
