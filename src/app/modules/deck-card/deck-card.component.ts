import { CurrencyPipe, NgClass, NgStyle, TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoPipe } from '@jsverse/transloco'
import { TranslocoDatePipe } from '@jsverse/transloco-locale'
import { ApiCard, ApiDeck } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, MediaService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { TruncatePipe } from '@shared/pipes/truncate.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { DecksService } from '@state/decks/decks.service'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId, isSupporter } from '@utils'
import { catchError, of, tap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-deck-card',
  templateUrl: './deck-card.component.html',
  styleUrls: ['./deck-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgClass,
    NgStyle,
    TitleCasePipe,
    CurrencyPipe,
    TruncatePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    TranslocoDatePipe,
    CardImagePipe,
    NgbPopover,
  ],
})
export class DeckCardComponent implements OnInit {
  private readonly mediaService = inject(MediaService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly decksService = inject(DecksService)
  private readonly apiDataService = inject(ApiDataService)

  deck = input.required<ApiDeck>()
  height = input<string>('160px')
  enablePreview = input<boolean>(false)

  readonly tagClick = output<string>()

  isMobileOrTablet = false
  previewCrypt = signal<ApiCard[] | null>(null)
  previewLibrary = signal<ApiCard[] | null>(null)
  previewLoading = signal<boolean>(false)
  previewLoaded = signal<boolean>(false)
  showPreview = signal<boolean>(false)

  ngOnInit(): void {
    this.mediaService
      .observeMobileOrTablet()
      .pipe(
        untilDestroyed(this),
        tap((isMobileOrTablet) => (this.isMobileOrTablet = isMobileOrTablet)),
      )
      .subscribe()
  }

  togglePreview(event: Event): void {
    event.preventDefault()
    event.stopPropagation()
    this.showPreview.set(!this.showPreview())
    if (!this.previewLoaded()) {
      this.loadPreview()
    }
  }

  onDeckClick(): void {
    this.decksService.setLastViewedDeckId(this.deck().id)
  }

  onTagClick(tag: string, event: MouseEvent): void {
    if (!this.isMobileOrTablet) {
      event.preventDefault()
      event.stopPropagation()
      this.tagClick.emit(tag)
    }
  }

  getCardName(id: number): string {
    if (isCryptId(id)) {
      return this.cryptQuery.getEntity(id)?.name ?? ''
    } else {
      return this.libraryQuery.getEntity(id)?.name ?? ''
    }
  }

  get isSupporter(): boolean {
    return isSupporter(this.deck().user?.roles)
  }

  loadPreview(): void {
    const currentDeck = this.deck()

    // Don't load if already loaded, loading, or if filterCards exist
    if (
      this.previewLoaded() ||
      this.previewLoading() ||
      currentDeck.filterCards
    ) {
      return
    }

    // Don't load if deck already has crypt/library data
    if (currentDeck.crypt || currentDeck.library) {
      this.previewLoaded.set(true)
      return
    }

    this.previewLoading.set(true)

    this.apiDataService
      .getDeck(currentDeck.id)
      .pipe(
        untilDestroyed(this),
        tap((deckDetails) => {
          this.previewCrypt.set(deckDetails.crypt || null)
          this.previewLibrary.set(
            deckDetails.library?.filter((card) => card.number > 3) || null,
          )
          this.previewLoaded.set(true)
          this.previewLoading.set(false)
        }),
        catchError(() => {
          this.previewLoading.set(false)
          this.previewLoaded.set(true)
          return of(null)
        }),
      )
      .subscribe()
  }
}
