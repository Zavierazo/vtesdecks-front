import { NgClass } from '@angular/common'
import {
  AfterViewInit,
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
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SetQuery } from '@state/set/set.query'
import { isCryptId } from '@utils'
import { catchError, of, tap } from 'rxjs'
import { CryptCardComponent } from 'src/app/modules/deck-shared/crypt-card/crypt-card.component'
import { LibraryCardComponent } from 'src/app/modules/deck-shared/library-card/library-card.component'

type AppState = 'idle' | 'camera' | 'scanning' | 'result'

@UntilDestroy()
@Component({
  selector: 'app-camera-scanner',
  templateUrl: './camera-scanner.component.html',
  styleUrls: ['./camera-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoDirective, TranslocoPipe, CardImagePipe],
})
export class CameraScannerComponent implements AfterViewInit, OnDestroy {
  activeModal = inject(NgbActiveModal)
  private modalService = inject(NgbModal)
  private apiDataService = inject(ApiDataService)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)
  private setQuery = inject(SetQuery)
  private changeDetectorRef = inject(ChangeDetectorRef)

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>
  @ViewChild('freeze') freeze!: ElementRef<HTMLImageElement>
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>

  appState = signal<AppState>('idle')
  scanning = signal(false)
  scanResult = signal<ApiCardScanResponse | null>(null)
  idOnly = signal(true)
  noAlternatives = signal(false)
  capturedImageUrl = signal<string | null>(null)
  selectMode = signal(false)
  zoomedImageUrl = signal<string | null>(null)

  private stream: MediaStream | null = null

  ngAfterViewInit() {
    this.startCamera()
  }

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
      // Stay in idle state so the "Enable Camera" button remains visible for retry
      this.appState.set('idle')
      this.changeDetectorRef.markForCheck()
    }
  }

  releaseCamera(keepFreeze = false) {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.video?.nativeElement) {
      this.video.nativeElement.srcObject = null
      this.video.nativeElement.style.display = 'none'
    }
    if (!keepFreeze && this.freeze?.nativeElement) {
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
      })
      .pipe(
        untilDestroyed(this),
        tap((result) => {
          this.scanResult.set(this.normalizeResult(result))
          this.appState.set('result')
          this.scanning.set(false)
          this.changeDetectorRef.markForCheck()
          // Auto-act only when result is unambiguous: ≥95% confidence and no alternative also ≥95%
          const isAutoSelect =
            result.found &&
            (result.confidence ?? 0) >= 95 &&
            !result.alternatives?.some((a) => a.confidence >= 95)
          if (isAutoSelect) {
            if (this.selectMode()) {
              this.activeModal.close({
                id: result.id,
                set: this.resolveSetAbbrev(result.set),
              })
            } else {
              this.openCard(result.id!)
              this.activeModal.dismiss()
            }
          }
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
    this.appState.set('idle')
    this.changeDetectorRef.detectChanges()
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

  openCard(cardId: number) {
    if (isCryptId(cardId)) {
      this.openCryptCard(cardId)
    } else {
      this.openLibraryCard(cardId)
    }
  }

  openCardAndDismiss(cardId: number) {
    this.openCard(cardId)
    this.activeModal.dismiss()
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

  getConfidenceClass(confidence: number): string {
    if (confidence >= 60) return 'high'
    if (confidence >= 35) return 'medium'
    return 'low'
  }

  getCardData(cardId: number): ApiCrypt | ApiLibrary | undefined {
    if (isCryptId(cardId)) {
      return this.cryptQuery.getEntity(cardId)
    } else {
      return this.libraryQuery.getEntity(cardId)
    }
  }

  private cardImagePipe = new CardImagePipe()

  isCrypt(cardId: number): boolean {
    return isCryptId(cardId)
  }

  getCardImageUrl(cardId: number, set?: string): string {
    return this.cardImagePipe.transform({ id: cardId }, set)
  }

  /** Resolve a raw set abbrev (possibly lowercase) to the canonical uppercase abbrev. */
  resolveSetAbbrev(abbrev?: string): string | undefined {
    if (!abbrev) return undefined
    return (
      this.setQuery.getEntityByAbbrev(abbrev)?.abbrev ?? abbrev.toUpperCase()
    )
  }

  /** Return display label for a set abbrev: "Full Name '25" format, like the collection modal. */
  getSetDisplay(abbrev?: string): string {
    if (!abbrev) return ''
    const set = this.setQuery.getEntityByAbbrev(abbrev)
    if (!set) return abbrev.toUpperCase()
    const year = set.releaseDate
      ? `'${new Date(set.releaseDate).getFullYear().toString().slice(-2)}`
      : ''
    return year ? `${set.fullName} ${year}` : set.fullName
  }

  /** Normalize set abbreviations in a scan result to canonical uppercase values. */
  private normalizeResult(
    result: import('@models').ApiCardScanResponse,
  ): import('@models').ApiCardScanResponse {
    return {
      ...result,
      id: result.id,
      set: this.resolveSetAbbrev(result.set),
      alternatives: result.alternatives?.map((alt) => ({
        ...alt,
        id: alt.id,
        set: this.resolveSetAbbrev(alt.set),
      })),
    }
  }
}
