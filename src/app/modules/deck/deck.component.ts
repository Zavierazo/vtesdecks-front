import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
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
import { Observable, switchMap, tap, timer } from 'rxjs'
import { environment } from '../../../environments/environment'
import { ApiCard } from '../../models/api-card'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from '../../services/api.data.service'
import { MediaService } from '../../services/media.service'
import { PreviousRouteService } from '../../services/previous-route-service'
import { ToastService } from '../../services/toast.service'
import { AnimatedDigitComponent } from '../../shared/components/animated-digit/animated-digit.component'
import { LoadingComponent } from '../../shared/components/loading/loading.component'
import { AdDirective } from '../../shared/directives/ad.directive'
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive'
import { TranslocoFallbackPipe } from '../../shared/pipes/transloco-fallback'
import { AuthQuery } from '../../state/auth/auth.query'
import { CryptQuery } from '../../state/crypt/crypt.query'
import { DeckQuery } from '../../state/deck/deck.query'
import { getClanIcon } from '../../utils/clans'
import { getDisciplineIcon } from '../../utils/disciplines'
import { CommentsComponent } from '../comments/comments.component'
import { DrawCardsComponent } from '../deck-builder/draw-cards/draw-cards.component'
import { ClanTranslocoPipe } from '../deck-shared/clan-transloco/clan-transloco.pipe'
import { CryptCardComponent } from '../deck-shared/crypt-card/crypt-card.component'
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
  imports: [
    NgIf,
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
    NgFor,
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
    AdDirective,
  ],
})
export class DeckComponent implements OnInit, AfterViewInit {
  id!: string

  isLoading$!: Observable<boolean>

  isAuthenticated$!: Observable<boolean>

  userDisplayName$!: Observable<string | undefined>

  deck$!: Observable<ApiDeck | undefined>

  isMobile$!: Observable<boolean>

  isMobileOrTablet$!: Observable<boolean>

  isBookmarked = false

  isRated = false

  constructor(
    private readonly route: ActivatedRoute,
    private readonly titleService: Title,
    private readonly deckQuery: DeckQuery,
    private readonly authQuery: AuthQuery,
    private readonly toastService: ToastService,
    private readonly apiDataService: ApiDataService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly previousRouteService: PreviousRouteService,
    private readonly mediaService: MediaService,
    private readonly modalService: NgbModal,
    private readonly cryptQuery: CryptQuery,
    private readonly router: Router,
    private readonly clipboard: Clipboard,
    private readonly translocoService: TranslocoService,
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!
    this.isLoading$ = this.deckQuery.selectLoading()
    this.isAuthenticated$ = this.authQuery.selectAuthenticated()
    this.userDisplayName$ = this.authQuery.selectDisplayName()
    this.isMobile$ = this.mediaService.observeMobile()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.deck$ = this.deckQuery.selectDeck().pipe(
      untilDestroyed(this),
      tap((deck) => {
        this.isBookmarked = deck?.favorite ?? false
        this.isRated = deck?.rated ?? false
        this.titleService.setTitle(`VTES Decks - Deck ${deck?.name}`)
      }),
    )
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
      window.navigator.share({
        url: url,
      })
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
}
