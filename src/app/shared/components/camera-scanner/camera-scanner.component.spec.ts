import { ChangeDetectorRef, ElementRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SetQuery } from '@state/set/set.query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraScannerComponent } from './camera-scanner.component'

describe('Camera scanner lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    TestBed.resetTestingModule()
  })

  function setup() {
    let resolve!: (stream: MediaStream) => void
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((done) => {
          resolve = done
        }),
    )
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    TestBed.configureTestingModule({
      providers: [
        ...[
          NgbActiveModal,
          NgbModal,
          ApiDataService,
          CryptQuery,
          LibraryQuery,
          SetQuery,
          CardImagePipe,
        ].map((provide) => ({ provide, useValue: {} })),
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new CameraScannerComponent(),
    )
    component.video = new ElementRef(document.createElement('video'))
    component.freeze = new ElementRef(document.createElement('img'))
    const stop = vi.fn()
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
    return { component, getUserMedia, stop, grant: () => resolve(stream) }
  }

  it('stops a stream granted after the scanner is closed', async () => {
    const { component, stop, grant } = setup()
    const starting = component.startCamera()
    component.ngOnDestroy()
    grant()
    await starting
    expect(stop).toHaveBeenCalledOnce()
    expect(component.video.nativeElement.srcObject).toBeNull()
    expect(component.appState()).toBe('idle')
  })

  it('does not request multiple streams while camera permission is pending', async () => {
    const { component, getUserMedia, stop, grant } = setup()
    const starting = component.startCamera()
    await component.startCamera()
    expect(getUserMedia).toHaveBeenCalledOnce()
    grant()
    await starting
    expect(component.appState()).toBe('camera')
    component.ngOnDestroy()
    expect(stop).toHaveBeenCalledOnce()
  })
})
