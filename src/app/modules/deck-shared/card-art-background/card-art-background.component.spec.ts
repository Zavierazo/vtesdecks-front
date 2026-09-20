import { TestBed } from '@angular/core/testing'
import { BehaviorSubject, Observable } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineImagesService } from '../../../services/offline-images.service'
import { environment } from '@environments/environment'
import { CardArtBackgroundComponent } from './card-art-background.component'

describe('CardArtBackgroundComponent', () => {
  const source = new BehaviorSubject('')
  const release = vi.fn()
  const observe = vi.fn(
    () =>
      new Observable<string>((subscriber) => {
        const subscription = source.subscribe(subscriber)
        return () => {
          subscription.unsubscribe()
          release()
        }
      }),
  )

  beforeEach(() => {
    vi.clearAllMocks()
    source.next('')
    TestBed.configureTestingModule({
      providers: [{ provide: OfflineImagesService, useValue: { observe } }],
    })
  })

  async function setup() {
    const fixture = TestBed.createComponent(CardArtBackgroundComponent)
    fixture.componentRef.setInput('cardId', 200001)
    fixture.componentRef.setInput('type', 'crypt')
    await fixture.whenStable()
    return fixture
  }

  it('hides unavailable artwork and displays a decoded cached image', async () => {
    const fixture = await setup()
    expect(observe).toHaveBeenCalledWith(
      `${environment.cdnDomain}/img/cards/200001.jpg`,
      undefined,
      '',
    )
    expect(fixture.nativeElement.querySelector('img')).toBeNull()
    source.next('blob:cached-card')
    await fixture.whenStable()
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement
    expect(image.style.visibility).toBe('hidden')
    Object.defineProperties(image, {
      naturalWidth: { value: 358 },
      naturalHeight: { value: 500 },
    })
    image.dispatchEvent(new Event('load'))
    await fixture.whenStable()
    expect(image.style.visibility).toBe('visible')
    image.dispatchEvent(new Event('error'))
    await fixture.whenStable()
    expect(image.style.visibility).toBe('hidden')
    source.next('')
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('img')).toBeNull()
  })

  it('releases the previous image on card changes and destruction', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('cardId', 100001)
    fixture.componentRef.setInput('type', 'library')
    await fixture.whenStable()
    expect(release).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenLastCalledWith(
      `${environment.cdnDomain}/img/cards/100001.jpg`,
      undefined,
      '',
    )
    fixture.destroy()
    expect(release).toHaveBeenCalledTimes(2)
  })

  it('does not show images too small to contain the crop rectangle', async () => {
    const fixture = await setup()
    source.next('https://example.invalid/small.jpg')
    await fixture.whenStable()
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement
    Object.defineProperties(image, {
      naturalWidth: { value: 100 },
      naturalHeight: { value: 100 },
    })
    image.dispatchEvent(new Event('load'))
    await fixture.whenStable()
    expect(image.style.visibility).toBe('hidden')
  })
})
