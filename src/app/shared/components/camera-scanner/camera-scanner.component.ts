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
  @ViewChild('overlay') overlay?: ElementRef<HTMLCanvasElement>

  appState = signal<AppState>('idle')
  scanning = signal(false)
  scanResult = signal<ApiCardScanResponse | null>(null)
  idOnly = signal(true)
  noAlternatives = signal(false)
  fast = signal(false)
  capturedImageUrl = signal<string | null>(null)

  private stream: MediaStream | null = null
  cdnDomain = environment.cdnDomain
  stabilityProgress = signal(0)
  detectedQuad = signal<number[][] | null>(null)
  isLoadingCV = signal(false)

  private detectionCanvas: HTMLCanvasElement | null = null
  private lastQuad: number[][] | null = null
  private stabilityCount = 0
  private detectionTimeoutId: ReturnType<typeof setTimeout> | null = null
  private static opencvLoadPromise: Promise<void> | null = null
  private readonly QUAD_STABILITY_FRAMES = 4
  private readonly QUAD_DRIFT_THRESHOLD = 20

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get cv(): any {
    return (window as unknown as Record<string, unknown>)['cv']
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
      this.isLoadingCV.set(true)
      this.changeDetectorRef.markForCheck()
      try {
        await this.loadOpenCV()
      } catch {
        console.warn('OpenCV.js failed to load — card detection disabled')
      }
      this.isLoadingCV.set(false)
      this.changeDetectorRef.markForCheck()
      this.startDetectionLoop()
    } catch (e) {
      this.isLoadingCV.set(false)
      alert('Could not access the camera: ' + (e as Error).message)
    }
  }

  private startDetectionLoop() {
    const overlayEl = this.overlay?.nativeElement
    if (overlayEl) {
      // Keep overlay canvas in the same coord space as detectionCanvas so no scaling needed
      overlayEl.width = 320
      overlayEl.height = 240
    }
    this.detectionCanvas = document.createElement('canvas')
    this.detectionCanvas.width = 320
    this.detectionCanvas.height = 240
    this.lastQuad = null
    this.stabilityCount = 0
    this.stabilityProgress.set(0)
    this.detectedQuad.set(null)
    this.detectionTimeoutId = setTimeout(() => this.runDetectionStep(), 300)
  }

  private stopDetectionLoop() {
    if (this.detectionTimeoutId !== null) {
      clearTimeout(this.detectionTimeoutId)
      this.detectionTimeoutId = null
    }
    this.lastQuad = null
    this.stabilityCount = 0
    this.stabilityProgress.set(0)
    this.detectedQuad.set(null)
    const overlayEl = this.overlay?.nativeElement
    if (overlayEl) {
      overlayEl
        .getContext('2d')
        ?.clearRect(0, 0, overlayEl.width, overlayEl.height)
    }
  }

  private runDetectionStep() {
    if (this.appState() !== 'camera' || !this.stream) return

    const video = this.video?.nativeElement
    if (
      !video ||
      video.readyState < video.HAVE_ENOUGH_DATA ||
      !video.videoWidth
    ) {
      this.detectionTimeoutId = setTimeout(() => this.runDetectionStep(), 200)
      return
    }

    const dc = this.detectionCanvas!
    const ctx = dc.getContext('2d')!
    ctx.drawImage(video, 0, 0, dc.width, dc.height)
    const pixels = ctx.getImageData(0, 0, dc.width, dc.height).data

    const quad = this.findCardQuad(pixels, dc.width, dc.height)

    if (quad) {
      if (this.lastQuad) {
        const drift = quad.reduce(
          (sum, pt, i) =>
            sum +
            Math.hypot(
              pt[0] - this.lastQuad![i][0],
              pt[1] - this.lastQuad![i][1],
            ),
          0,
        )
        if (drift < this.QUAD_DRIFT_THRESHOLD) {
          this.stabilityCount = Math.min(
            this.stabilityCount + 1,
            this.QUAD_STABILITY_FRAMES,
          )
        } else {
          this.stabilityCount = Math.max(0, this.stabilityCount - 1)
        }
      } else {
        // First detection — start the count immediately
        this.stabilityCount = 1
      }
      this.lastQuad = quad
      this.detectedQuad.set(quad)
      this.drawOverlay(
        quad,
        this.stabilityCount >= Math.floor(this.QUAD_STABILITY_FRAMES * 0.75),
      )
    } else {
      this.stabilityCount = Math.max(0, this.stabilityCount - 2)
      this.lastQuad = null
      this.detectedQuad.set(null)
      this.drawOverlay(null, false)
    }

    const progress = Math.round(
      (this.stabilityCount / this.QUAD_STABILITY_FRAMES) * 100,
    )
    this.stabilityProgress.set(progress)
    this.changeDetectorRef.markForCheck()

    if (this.stabilityCount >= this.QUAD_STABILITY_FRAMES) {
      // Capture quad BEFORE stopDetectionLoop() clears it
      const capturedQuad = this.lastQuad
      this.stopDetectionLoop()
      this.doScan(capturedQuad)
      return
    }

    this.detectionTimeoutId = setTimeout(() => this.runDetectionStep(), 100)
  }

  releaseCamera(keepFreeze = false) {
    this.stopDetectionLoop()
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

  async doScan(quadOverride?: number[][] | null) {
    if (!this.stream) return

    // Use the explicitly passed quad (auto-detect path) or fall back to the current signal (manual button)
    const quad = quadOverride !== undefined ? quadOverride : this.detectedQuad()
    this.stopDetectionLoop()

    this.appState.set('scanning')
    this.scanning.set(true)

    const videoEl = this.video.nativeElement
    const canvasEl = this.canvas.nativeElement
    const freezeEl = this.freeze.nativeElement

    let dataUrl: string
    if (quad && this.cv?.Mat) {
      dataUrl = this.warpCard(videoEl, quad)
    } else {
      const crop = this.getCardCropRegion(
        videoEl.videoWidth,
        videoEl.videoHeight,
      )
      canvasEl.width = crop.w
      canvasEl.height = crop.h
      const ctx = canvasEl.getContext('2d')!
      ctx.drawImage(
        videoEl,
        crop.x,
        crop.y,
        crop.w,
        crop.h,
        0,
        0,
        crop.w,
        crop.h,
      )
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.92)
    }

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

  private findCardQuad(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): number[][] | null {
    const cv = this.cv
    if (!cv?.Mat) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mats: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (m: any) => {
      mats.push(m)
      return m
    }

    try {
      const src = t(cv.matFromArray(height, width, cv.CV_8UC4, pixels))
      const gray = t(new cv.Mat())
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
      const blurred = t(new cv.Mat())
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

      // Two Canny passes with separate kernel sizes:
      // Pass 1 — tight thresholds + 5×5 close: less noise, good for light cards.
      // Pass 2 — looser thresholds + 9×9 close: bridges larger corner gaps on dark
      //   cards where the card-to-background gradient is faint.
      for (const [lo, hi, kSize] of [
        [30, 90, 5],
        [20, 60, 9],
      ] as [number, number, number][]) {
        const edges = t(new cv.Mat())
        cv.Canny(blurred, edges, lo, hi)
        const kernel = t(
          cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kSize, kSize)),
        )
        const closed = t(new cv.Mat())
        cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel)
        const quad = this.largestCardQuad(cv, t, closed, width, height)
        if (quad) return quad
      }
      return null
    } catch {
      return null
    } finally {
      mats.forEach((m) => {
        try {
          m.delete()
        } catch {
          /* ignore */
        }
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private largestCardQuad(
    cv: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (m: any) => any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    binary: any,
    width: number,
    height: number,
  ): number[][] | null {
    const contours = t(new cv.MatVector())
    const hierarchy = t(new cv.Mat())
    cv.findContours(
      binary,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    )

    const frameArea = width * height
    const candidates: { area: number; quad: number[][] }[] = []

    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i))
      if (area < frameArea * 0.05 || area > frameArea * 0.92) continue

      const hull = t(new cv.Mat())
      cv.convexHull(contours.get(i), hull)
      const perimeter = cv.arcLength(hull, true)

      let quad: number[][] | null = null
      for (const eps of [0.02, 0.03, 0.04, 0.06, 0.08]) {
        const approx = new cv.Mat()
        cv.approxPolyDP(hull, approx, eps * perimeter, true)
        if (approx.rows === 4) {
          quad = []
          for (let j = 0; j < 4; j++) {
            quad.push([approx.data32S[j * 2], approx.data32S[j * 2 + 1]])
          }
          approx.delete()
          break
        }
        approx.delete()
      }
      if (!quad) continue

      const ordered = this.orderCorners(quad)
      const topW = Math.hypot(
        ordered[1][0] - ordered[0][0],
        ordered[1][1] - ordered[0][1],
      )
      const botW = Math.hypot(
        ordered[2][0] - ordered[3][0],
        ordered[2][1] - ordered[3][1],
      )
      const leftH = Math.hypot(
        ordered[3][0] - ordered[0][0],
        ordered[3][1] - ordered[0][1],
      )
      const rightH = Math.hypot(
        ordered[2][0] - ordered[1][0],
        ordered[2][1] - ordered[1][1],
      )
      const avgW = (topW + botW) / 2
      const avgH = (leftH + rightH) / 2
      if (avgH < 1) continue
      const ratio = avgW / avgH

      // Card 63×88 mm → W/H = 0.716 (portrait).
      // Art box ≈ 63×38 mm → W/H ≈ 1.66 — naturally excluded by the 1.05 upper bound.
      // Text box ≈ 63×44 mm → W/H ≈ 1.43 — also excluded.
      // No hierarchy or dark-border check needed: the ratio filter alone disambiguates
      // the full card from every internal card element.
      if (ratio < 0.45 || ratio > 1.05) continue

      candidates.push({ area, quad: ordered })
    }

    // Largest qualifying quad wins — the full card outline always has more area than
    // any individual internal element that happens to pass the ratio filter.
    candidates.sort((a, b) => b.area - a.area)
    return candidates[0]?.quad ?? null
  }

  private orderCorners(pts: number[][]): number[][] {
    const sumSorted = [...pts].sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
    const tl = sumSorted[0]
    const br = sumSorted[3]
    const diffSorted = [sumSorted[1], sumSorted[2]].sort(
      (a, b) => a[0] - a[1] - (b[0] - b[1]),
    )
    const bl = diffSorted[0]
    const tr = diffSorted[1]
    return [tl, tr, br, bl]
  }

  private drawOverlay(quad: number[][] | null, stable: boolean) {
    const overlayEl = this.overlay?.nativeElement
    if (!overlayEl) return
    const ctx = overlayEl.getContext('2d')!
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height)
    if (!quad) return

    // Overlay canvas is always 320×240 — same space as detectionCanvas, no scaling needed.
    // CSS width:100% height:100% stretches it to fill the viewport.
    const color = stable ? '#28a745' : '#ffc107'
    ctx.beginPath()
    ctx.moveTo(quad[0][0], quad[0][1])
    for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i][0], quad[i][1])
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = stable ? 'rgba(40,167,69,0.15)' : 'rgba(255,193,7,0.1)'
    ctx.fill()
    quad.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p[0], p[1], 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
  }

  private warpCard(videoEl: HTMLVideoElement, quad: number[][]): string {
    const cv = this.cv
    const dc = this.detectionCanvas!
    const scaleX = videoEl.videoWidth / dc.width
    const scaleY = videoEl.videoHeight / dc.height
    const scaled = quad.map((p) => [p[0] * scaleX, p[1] * scaleY])

    const outW = 400
    const outH = 560
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      ...scaled[0],
      ...scaled[1],
      ...scaled[2],
      ...scaled[3],
    ])
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      outW,
      0,
      outW,
      outH,
      0,
      outH,
    ])
    const M = cv.getPerspectiveTransform(srcPts, dstPts)

    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = videoEl.videoWidth
    tmpCanvas.height = videoEl.videoHeight
    tmpCanvas.getContext('2d')!.drawImage(videoEl, 0, 0)
    const src = cv.imread(tmpCanvas)
    const dst = new cv.Mat()
    cv.warpPerspective(src, dst, M, new cv.Size(outW, outH))

    const outCanvas = document.createElement('canvas')
    outCanvas.width = outW
    outCanvas.height = outH
    cv.imshow(outCanvas, dst)

    src.delete()
    dst.delete()
    M.delete()
    srcPts.delete()
    dstPts.delete()
    return outCanvas.toDataURL('image/jpeg', 0.92)
  }

  private loadOpenCV(): Promise<void> {
    if (CameraScannerComponent.opencvLoadPromise) {
      return CameraScannerComponent.opencvLoadPromise
    }
    CameraScannerComponent.opencvLoadPromise = new Promise<void>(
      (resolve, reject) => {
        if (this.cv?.Mat) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://docs.opencv.org/4.10.0/opencv.js'
        script.onerror = () => {
          CameraScannerComponent.opencvLoadPromise = null
          reject(new Error('Failed to load OpenCV.js'))
        }
        document.head.appendChild(script)
        let attempts = 0
        const poll = setInterval(() => {
          attempts++
          if (this.cv?.Mat) {
            clearInterval(poll)
            resolve()
          } else if (attempts > 150) {
            clearInterval(poll)
            CameraScannerComponent.opencvLoadPromise = null
            reject(new Error('OpenCV.js load timeout'))
          }
        }, 200)
      },
    )
    return CameraScannerComponent.opencvLoadPromise
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
