import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass, TitleCasePipe } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core'
import { Title } from '@angular/platform-browser'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { TranslocoDatePipe } from '@jsverse/transloco-locale'
import {
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbPopover,
  NgbRating,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { provideMarkdown } from 'ngx-markdown'
import { Observable, switchMap, tap, timer } from 'rxjs'
import { environment } from '../../../environments/environment'
import { ApiCard } from '../../models/api-card'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from '../../services/api.data.service'
import { MediaService } from '../../services/media.service'
import { PreviousRouteService } from '../../services/previous-route-service'
import { ToastService } from '../../services/toast.service'
import { AdSenseComponent } from '../../shared/components/ad-sense/ad-sense.component'
import { AnimatedDigitComponent } from '../../shared/components/animated-digit/animated-digit.component'
import { LoadingComponent } from '../../shared/components/loading/loading.component'
import { MarkdownTextComponent } from '../../shared/components/markdown-text/markdown-text.component'
import { ToggleIconComponent } from '../../shared/components/toggle-icon/toggle-icon.component'
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive'
import { TranslocoFallbackPipe } from '../../shared/pipes/transloco-fallback'
import { AuthQuery } from '../../state/auth/auth.query'
import { AuthService } from '../../state/auth/auth.service'
import { CryptQuery } from '../../state/crypt/crypt.query'
import { DeckQuery } from '../../state/deck/deck.query'
import { DeckService } from '../../state/deck/deck.service'
import { DecksQuery } from '../../state/decks/decks.query'
import { DecksService } from '../../state/decks/decks.service'
import { getClanIcon } from '../../utils/clans'
import { getDisciplineIcon } from '../../utils/disciplines'
import { CommentsComponent } from '../comments/comments.component'
import { DrawCardsComponent } from '../deck-builder/draw-cards/draw-cards.component'
import { DeckCardComponent } from '../deck-card/deck-card.component'
import { ClanTranslocoPipe } from '../deck-shared/clan-transloco/clan-transloco.pipe'
import { CryptCardComponent } from '../deck-shared/crypt-card/crypt-card.component'
import { CryptGridCardComponent } from '../deck-shared/crypt-grid-card/crypt-grid-card.component'
import { CryptComponent } from '../deck-shared/crypt/crypt.component'
import { DisciplineTranslocoPipe } from '../deck-shared/discipline-transloco/discipline-transloco.pipe'
import { LibraryListComponent } from '../deck-shared/library-list/library-list.component'
import { PrintProxyComponent } from '../deck-shared/print-proxy/print-proxy.component'

@UntilDestroy()
@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideMarkdown()],
  imports: [
    LoadingComponent,
    TranslocoDirective,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbTooltip,
    NgClass,
    RouterLink,
    NgxGoogleAnalyticsModule,
    AnimatedDigitComponent,
    NgbRating,
    IsLoggedDirective,
    NgbPopover,
    CryptComponent,
    LibraryListComponent,
    CommentsComponent,
    AsyncPipe,
    TitleCasePipe,
    TranslocoFallbackPipe,
    DisciplineTranslocoPipe,
    ClanTranslocoPipe,
    TranslocoPipe,
    TranslocoDatePipe,
    AdSenseComponent,
    MarkdownTextComponent,
    DeckCardComponent,
    ToggleIconComponent,
    CryptGridCardComponent,
  ],
})
export class DeckComponent implements OnInit, AfterViewInit {
  private static readonly similarDecksLimit = 4
  private readonly route = inject(ActivatedRoute)
  private readonly titleService = inject(Title)
  private readonly deckQuery = inject(DeckQuery)
  private readonly deckService = inject(DeckService)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly toastService = inject(ToastService)
  private readonly apiDataService = inject(ApiDataService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly previousRouteService = inject(PreviousRouteService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly router = inject(Router)
  private readonly clipboard = inject(Clipboard)
  private readonly translocoService = inject(TranslocoService)
  private readonly decksQuery = inject(DecksQuery)
  private readonly decksService = inject(DecksService)

  id!: string

  isLoading$!: Observable<boolean>

  isAuthenticated$!: Observable<boolean>

  userDisplayName$!: Observable<string | undefined>

  deck$!: Observable<ApiDeck | undefined>

  similarDecks$ = this.decksQuery.selectAll()

  isMobile$!: Observable<boolean>

  isMobileOrTablet$!: Observable<boolean>

  isAdmin$!: Observable<boolean>

  isBookmarked = false

  isRated = false

  collectionTracker = false

  cdnDomain = environment.cdnDomain

  displayMode$ = this.authQuery.selectDisplayMode()
  displayModeOptions = [
    {
      option: 'grid',
      icon: 'grid-fill',
      label: 'shared.grid',
    },
    {
      option: 'list',
      icon: 'list',
      label: 'shared.list',
    },
  ]

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!
    this.isLoading$ = this.deckQuery.selectLoading()
    this.isAuthenticated$ = this.authQuery.selectAuthenticated()
    this.userDisplayName$ = this.authQuery.selectDisplayName()
    this.isMobile$ = this.mediaService.observeMobile()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.isAdmin$ = this.authQuery.selectAdmin()
    this.deck$ = this.deckQuery.selectDeck().pipe(
      untilDestroyed(this),
      tap((deck) => {
        this.isBookmarked = deck?.favorite ?? false
        this.isRated = deck?.rated ?? false
        const collectionTrackerOwner = deck?.owner ? deck.collection : false
        this.collectionTracker =
          this.collectionTracker || collectionTrackerOwner
        this.titleService.setTitle(`VTES Decks - Deck ${deck?.name}`)
      }),
    )
    this.route.paramMap.subscribe((params) =>
      this.fetchSimilarDecks(params.get('id')),
    )
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateDisplayMode(displayModeValue)
  }

  fetchSimilarDecks(deckId: string | null) {
    this.decksService.init({ bySimilarity: deckId })
    this.decksService
      .getMore(DeckComponent.similarDecksLimit)
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  ngAfterViewInit(): void {
    timer(10000)
      .pipe(
        untilDestroyed(this),
        switchMap(() =>
          this.apiDataService.deckView(
            this.id,
            this.previousRouteService.getPreviousUrl(),
          ),
        ),
      )
      .subscribe()
  }

  @ViewChild('bookmarkTooltip') set favoriteTooltip(tooltip: NgbTooltip) {
    if (this.isBookmarked || !tooltip || !this.authQuery.isAuthenticated()) {
      return
    }
    tooltip.open()
    setTimeout(() => tooltip.close(), 2000)
  }

  @ViewChild('ratingTooltip') set ratingTooltip(tooltip: NgbTooltip) {
    if (this.isRated || !tooltip || !this.authQuery.isAuthenticated()) {
      return
    }
    tooltip.open()
    setTimeout(() => tooltip.close(), 2000)
  }

  rateDeck(rating: number) {
    this.apiDataService
      .rateDeck(this.id, rating)
      .pipe(untilDestroyed(this))
      .subscribe({
        error: () =>
          this.toastService.show(
            this.translocoService.translate('deck.rate_failed'),
            { classname: 'bg-danger text-light', delay: 5000 },
          ),
        complete: () =>
          this.toastService.show(
            this.translocoService.translate('deck.rate_success'),
            { classname: 'bg-success text-light', delay: 5000 },
          ),
      })
  }

  toggleBookmark() {
    this.apiDataService
      .bookmarkDeck(this.id, !this.isBookmarked)
      .pipe(untilDestroyed(this))
      .subscribe({
        error: () =>
          this.toastService.show(
            this.translocoService.translate('deck.bookmark_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          ),
        complete: () => {
          this.isBookmarked = !this.isBookmarked
          this.changeDetectorRef.detectChanges()
        },
      })
  }

  getClanIcon(clan: string): string | undefined {
    return getClanIcon(clan)
  }

  getDisciplineIcon(discipline: string, superior: boolean): string | undefined {
    return getDisciplineIcon(discipline, superior)
  }

  get exportUrl(): string {
    return environment.api.baseUrl + '/decks/' + this.id + '/export'
  }

  openCryptCard(card: ApiCard, cardList: ApiCard[]): void {
    if (!this.cryptQuery.getEntity(card.id)) {
      // Loading...
      return
    }
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = cardList
      .map((c) => this.cryptQuery.getEntity(c.id))
      .filter(Boolean)
    const current = cryptList.find((c) => c?.id === card.id)
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = current ? cryptList.indexOf(current) : 0
  }

  onOpenInBuilder(): void {
    this.router.navigateByUrl('/decks/builder', {
      state: { deck: this.deckQuery.getDeck() },
    })
  }

  onShare(): void {
    const url = `https://${environment.domain}/deck/${this.id}`
    if (window.navigator.share) {
      ;(async () => {
        await window.navigator.share({
          url: url,
        })
      })()
    } else {
      this.clipboard.copy(url)
      this.toastService.show(
        this.translocoService.translate('deck.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }

  onTag(tag: string): void {
    this.router.navigate(['/decks'], { queryParams: { tags: tag } })
  }

  onCopyToClipboard(type: string): void {
    this.apiDataService.getExportDeck(this.id, type).subscribe((data) => {
      this.clipboard.copy(data)
      this.toastService.show(
        this.translocoService.translate('deck.deck_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    })
  }

  onDraw(): void {
    const modalRef = this.modalService.open(DrawCardsComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.cards = [
      ...(this.deckQuery.getDeck()?.crypt ?? []),
      ...(this.deckQuery.getDeck()?.library ?? []),
    ]
  }

  onPrint(): void {
    const modalRef = this.modalService.open(PrintProxyComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.title = this.deckQuery.getDeck()?.name
    modalRef.componentInstance.cards = [
      ...(this.deckQuery.getDeck()?.crypt ?? []),
      ...(this.deckQuery.getDeck()?.library ?? []),
    ]
  }

  onCollectionTracker(): void {
    this.collectionTracker = !this.collectionTracker
    const deck = this.deckQuery.getDeck()
    if (deck) {
      const { owner } = deck
      if (owner) {
        this.deckService
          .toggleCollectionTracker(this.collectionTracker)
          .pipe(
            untilDestroyed(this),
            switchMap(() =>
              this.deckService.getDeck(this.id, this.collectionTracker),
            ),
          )
          .subscribe()
      } else {
        this.deckService
          .getDeck(this.id, this.collectionTracker)
          .pipe(untilDestroyed(this))
          .subscribe()
      }
    }
  }
}
