import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCardScanResponse, ApiCrypt, ApiLibrary } from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId } from '@utils'
import { catchError, of, tap } from 'rxjs'
import { CryptCardComponent } from 'src/app/modules/deck-shared/crypt-card/crypt-card.component'
import { LibraryCardComponent } from 'src/app/modules/deck-shared/library-card/library-card.component'
import { environment } from 'src/environments/environment'

type AppState = 'idle' | 'camera' | 'scanning' | 'result'

@UntilDestroy()
@Component({
  selector: 'app-camera-scanner',
  templateUrl: './camera-scanner.component.html',
  styleUrls: ['./camera-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoDirective, TranslocoPipe],
})
export class CameraScannerComponent implements OnDestroy {
  activeModal = inject(NgbActiveModal)
  private modalService = inject(NgbModal)
  private apiDataService = inject(ApiDataService)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)
  private changeDetectorRef = inject(ChangeDetectorRef)

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>
  @ViewChild('freeze') freeze!: ElementRef<HTMLImageElement>
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>

  appState = signal<AppState>('idle')
  scanning = signal(false)
  scanResult = signal<ApiCardScanResponse | null>(null)
  idOnly = signal(true)
  noAlternatives = signal(false)
  fast = signal(false)
  capturedImageUrl = signal<string | null>(null)

  private stream: MediaStream | null = null
  cdnDomain = environment.cdnDomain

  ngOnDestroy() {
    this.releaseCamera()
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })
      this.video.nativeElement.srcObject = this.stream
      this.freeze.nativeElement.style.display = 'none'
      this.freeze.nativeElement.src = ''
      this.video.nativeElement.style.display = 'block'
      this.appState.set('camera')
      this.changeDetectorRef.markForCheck()
    } catch (e) {
      alert('Could not access the camera: ' + (e as Error).message)
    }
  }

  releaseCamera(keepFreeze = false) {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.video.nativeElement) {
      this.video.nativeElement.srcObject = null
      this.video.nativeElement.style.display = 'none'
    }
    if (!keepFreeze && this.freeze.nativeElement) {
      this.freeze.nativeElement.style.display = 'none'
      this.freeze.nativeElement.src = ''
    }
    if (this.appState() === 'camera') {
      this.appState.set('idle')
    }
  }

  async doScan() {
    if (!this.stream) return

    this.appState.set('scanning')
    this.scanning.set(true)

    const videoEl = this.video.nativeElement
    const canvasEl = this.canvas.nativeElement
    const freezeEl = this.freeze.nativeElement

    // Capture the centered card region (5:7 aspect ratio)
    const crop = this.getCardCropRegion(videoEl.videoWidth, videoEl.videoHeight)
    canvasEl.width = crop.w
    canvasEl.height = crop.h
    const ctx = canvasEl.getContext('2d')!
    ctx.drawImage(videoEl, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)

    const dataUrl = canvasEl.toDataURL('image/jpeg', 0.92)
    const base64 = dataUrl.split(',')[1]

    // Freeze the video
    videoEl.style.display = 'none'
    freezeEl.src = dataUrl
    freezeEl.style.display = 'block'
    this.capturedImageUrl.set(dataUrl)

    // Release camera after capturing
    this.releaseCamera(true)

    this.apiDataService
      .scanCard({
        image: base64,
        idOnly: this.idOnly(),
        noAlternatives: this.noAlternatives(),
        fast: this.fast(),
      })
      .pipe(
        untilDestroyed(this),
        tap((result) => {
          this.scanResult.set(result)
          this.appState.set('result')
          this.scanning.set(false)
          this.changeDetectorRef.markForCheck()
        }),
        catchError((error) => {
          console.error('Scan error:', error)
          this.scanResult.set({
            found: false,
            message: 'Server connection error.',
          })
          this.appState.set('result')
          this.scanning.set(false)
          this.changeDetectorRef.markForCheck()
          return of(null)
        }),
      )
      .subscribe()
  }

  scanAgain() {
    this.scanResult.set(null)
    this.capturedImageUrl.set(null)
    this.startCamera()
  }

  private getCardCropRegion(vw: number, vh: number) {
    const cardRatio = 5 / 7
    const margin = 0.88
    let cropH = vh * margin
    let cropW = cropH * cardRatio
    if (cropW > vw * margin) {
      cropW = vw * margin
      cropH = cropW / cardRatio
    }
    return {
      x: Math.round((vw - cropW) / 2),
      y: Math.round((vh - cropH) / 2),
      w: Math.round(cropW),
      h: Math.round(cropH),
    }
  }

  openCard(cardId: string) {
    const id = parseInt(cardId, 10)
    if (isCryptId(id)) {
      this.openCryptCard(id)
    } else {
      this.openLibraryCard(id)
    }
  }

  private openCryptCard(cardId: number): void {
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = [this.cryptQuery.getEntity(cardId)]
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = 0
  }

  private openLibraryCard(cardId: number): void {
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const libraryList = [this.libraryQuery.getEntity(cardId)]
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = 0
  }

  getCardImageUrl(cardId: string, set?: string): string {
    return set
      ? `${this.cdnDomain}/img/cards/sets/${set}/${cardId}.jpg`
      : `${this.cdnDomain}/img/cards/${cardId}.jpg`
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 60) return 'high'
    if (confidence >= 35) return 'medium'
    return 'low'
  }

  getCardData(cardId: string): ApiCrypt | ApiLibrary | undefined {
    const id = parseInt(cardId, 10)
    if (isCryptId(id)) {
      return this.cryptQuery.getEntity(id)
    } else {
      return this.libraryQuery.getEntity(id)
    }
  }

  isCrypt(cardId: string): boolean {
    return isCryptId(parseInt(cardId, 10))
  }
}
