import { AsyncPipe, NgClass } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core'
import { Meta } from '@angular/platform-browser'
import { ActivatedRoute } from '@angular/router'
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco'
import { ApiCard, ApiDeck } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { DeckQuery } from '@state/deck/deck.query'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { LIBRARY_TYPE_LIST } from '@utils'
import { Observable, combineLatest, map, of, switchMap, timer } from 'rxjs'
import { environment } from '@environments/environment'
import { SUPPORTED_LANGUAGES } from '../../transloco-root.module'

interface EmbedCryptRow {
  number: number
  name?: string
  capacity?: number
  image?: string
}

interface EmbedLibraryGroup {
  type: string
  label: string
  count: number
  rows: { number: number; name?: string; image?: string }[]
}

interface EmbedViewModel {
  deck: ApiDeck
  cryptRows: EmbedCryptRow[]
  libraryGroups: EmbedLibraryGroup[]
}

export interface EmbedSections {
  stats: boolean
  crypt: boolean
  library: boolean
}

@UntilDestroy()
@Component({
  selector: 'app-deck-embed',
  templateUrl: './deck-embed.component.html',
  styleUrls: ['./deck-embed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, NgClass, TranslocoPipe],
})
export class DeckEmbedComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly deckQuery = inject(DeckQuery)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly cryptService = inject(CryptService)
  private readonly libraryService = inject(LibraryService)
  private readonly apiDataService = inject(ApiDataService)
  private readonly translocoService = inject(TranslocoService)
  private readonly meta = inject(Meta)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)

  sections: EmbedSections = { stats: true, crypt: true, library: true }

  vm$!: Observable<EmbedViewModel | undefined>

  deckUrl!: string

  hoverPreview = signal<{
    url: string
    top: number
    left: number
    maxHeight: number
  } | null>(null)

  private static readonly hoverImageWidth = 230
  private static readonly hoverImageHeight = 322
  private static readonly hoverImageGap = 6

  private readonly cdnDomain = environment.cdnDomain

  private mediaQuery?: MediaQueryList
  private mediaQueryListener?: () => void
  private resizeObserver?: ResizeObserver

  ngOnInit() {
    const queryParams = this.route.snapshot.queryParamMap
    const deckId = this.route.snapshot.paramMap.get('id')!
    this.deckUrl = `https://${environment.domain}/deck/${deckId}`

    // Absent param → every section; present (even empty) → only the listed ones
    const sections = queryParams.get('sections')
    if (sections != null) {
      const list = sections.split(',')
      this.sections = {
        stats: list.includes('stats'),
        crypt: list.includes('crypt'),
        library: list.includes('library'),
      }
    }

    this.applyTheme(queryParams.get('theme') ?? 'auto')

    const lang = queryParams.get('lang')
    if (lang && SUPPORTED_LANGUAGES.some((l) => l.code === lang)) {
      this.translocoService.setActiveLang(lang)
    }

    // Embed pages should never be indexed
    this.meta.updateTag({ name: 'robots', content: 'noindex' })

    // Card database is only needed to resolve names for the enabled lists
    if (this.sections.crypt) {
      this.cryptService.getCryptCards().pipe(untilDestroyed(this)).subscribe()
    }
    if (this.sections.library) {
      this.libraryService
        .getLibraryCards()
        .pipe(untilDestroyed(this))
        .subscribe()
    }

    this.vm$ = combineLatest([
      this.deckQuery.selectDeck(),
      this.sections.crypt ? this.cryptQuery.selectAll({}) : of([]),
      this.sections.library ? this.libraryQuery.selectAll({}) : of([]),
      // Rebuild when translations load so type labels resolve
      this.translocoService.selectTranslation(),
    ]).pipe(
      untilDestroyed(this),
      map(([deck]) => (deck ? this.buildViewModel(deck) : undefined)),
    )
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.postHeight())
      this.resizeObserver.observe(this.elementRef.nativeElement)
    }
    this.postHeight()
    timer(10000)
      .pipe(
        untilDestroyed(this),
        switchMap(() =>
          this.apiDataService.deckView(
            this.route.snapshot.paramMap.get('id')!,
            `embed:${document.referrer || 'unknown'}`,
          ),
        ),
      )
      .subscribe()
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener)
    }
  }

  postHeight(): void {
    if (window.parent === window) {
      return
    }
    // Measure the widget itself: body/documentElement are viewport-sized
    // (html, body { height: 100% }) so they can never shrink the iframe
    const rect = this.elementRef.nativeElement.getBoundingClientRect()
    const height = Math.ceil(document.documentElement.scrollTop + rect.bottom)
    if (height <= 0) {
      // Nothing rendered yet — a 0 would collapse the iframe and the browser
      // stops rendering 0-height iframes, so the correction would never come
      return
    }
    window.parent.postMessage(
      {
        type: 'vtesdecks-embed-resize',
        deckId: this.route.snapshot.paramMap.get('id'),
        height,
      },
      '*',
    )
  }

  onRowEnter(event: MouseEvent, image?: string): void {
    if (!image) {
      return
    }
    const width = DeckEmbedComponent.hoverImageWidth
    const height = DeckEmbedComponent.hoverImageHeight
    const gap = DeckEmbedComponent.hoverImageGap
    // Anchor to the hovered row and place the image fully above or below it,
    // so the card name under the pointer is never covered
    const row = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const spaceBelow = window.innerHeight - row.bottom - gap - 8
    const spaceAbove = row.top - gap - 8
    let top: number
    let maxHeight: number
    if (spaceBelow >= height || spaceBelow >= spaceAbove) {
      maxHeight = Math.min(height, Math.max(spaceBelow, 80))
      top = row.bottom + gap
    } else {
      maxHeight = Math.min(height, Math.max(spaceAbove, 80))
      top = row.top - gap - maxHeight
    }
    const fitsRight = event.clientX + 24 + width <= window.innerWidth - 8
    const left = fitsRight
      ? event.clientX + 24
      : Math.max(8, event.clientX - 24 - width)
    this.hoverPreview.set({ url: image, top, left, maxHeight })
  }

  onRowLeave(): void {
    this.hoverPreview.set(null)
  }

  private applyTheme(theme: string): void {
    if (theme === 'dark' || theme === 'light') {
      document.body.setAttribute('data-bs-theme', theme)
    } else {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.mediaQueryListener = () =>
        document.body.setAttribute(
          'data-bs-theme',
          this.mediaQuery!.matches ? 'dark' : 'light',
        )
      this.mediaQueryListener()
      this.mediaQuery.addEventListener('change', this.mediaQueryListener)
    }
  }

  private buildViewModel(deck: ApiDeck): EmbedViewModel {
    return {
      deck,
      cryptRows: this.sections.crypt ? this.buildCryptRows(deck) : [],
      libraryGroups: this.sections.library ? this.buildLibraryGroups(deck) : [],
    }
  }

  private buildCryptRows(deck: ApiDeck): EmbedCryptRow[] {
    return [...(deck.crypt ?? [])]
      .map((card) => {
        const entity = this.cryptQuery.getEntity(card.id)
        return {
          number: card.number,
          name: entity ? (entity.i18n?.name ?? entity.name) : undefined,
          capacity: entity?.capacity,
          image: entity ? this.cdnDomain + entity.image : undefined,
        }
      })
      .sort(
        (a, b) => (b.capacity ?? 0) - (a.capacity ?? 0) || b.number - a.number,
      )
  }

  private buildLibraryGroups(deck: ApiDeck): EmbedLibraryGroup[] {
    const groups = new Map<string, ApiCard[]>()
    for (const card of deck.library ?? []) {
      const type = card.type ?? 'Unknown'
      groups.set(type, [...(groups.get(type) ?? []), card])
    }
    return [...groups.entries()]
      .sort(([a], [b]) => this.libraryTypeOrder(a) - this.libraryTypeOrder(b))
      .map(([type, cards]) => ({
        type,
        label: this.libraryTypeLabel(type),
        count: cards.reduce((acc, card) => acc + card.number, 0),
        rows: cards
          .map((card) => {
            const entity = this.libraryQuery.getEntity(card.id)
            return {
              image: entity ? this.cdnDomain + entity.image : undefined,
              number: card.number,
              name: entity ? (entity.i18n?.name ?? entity.name) : undefined,
            }
          })
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      }))
  }

  private libraryTypeLabel(type: string): string {
    return type
      .split('/')
      .map((subType) => {
        const libraryType = LIBRARY_TYPE_LIST.find((t) => t.name === subType)
        return libraryType
          ? this.translocoService.translate(libraryType.label)
          : subType
      })
      .join('/')
  }

  private libraryTypeOrder(type: string): number {
    const index = LIBRARY_TYPE_LIST.findIndex(
      (libraryType) => libraryType.name === type.split('/')[0],
    )
    return index === -1 ? LIBRARY_TYPE_LIST.length : index
  }
}
