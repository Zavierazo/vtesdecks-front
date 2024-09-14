import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Observable, tap, timer, switchMap } from 'rxjs'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { ApiDeck } from '../../models/api-deck'
import { DeckService } from '../../state/deck/deck.service'
import { DeckQuery } from '../../state/deck/deck.query'
import { AuthQuery } from '../../state/auth/auth.query'
import { ToastService } from '../../services/toast.service'
import { ApiDataService } from '../../services/api.data.service'
import { environment } from '../../../environments/environment'
import { Title } from '@angular/platform-browser'
import { PreviousRouteService } from '../../services/previous-route-service'
import { getDisciplineIcon } from '../../utils/disciplines'
import { getClanIcon } from '../../utils/clans'
import { MediaService } from '../../services/media.service'
import { ApiCard } from '../../models/api-card'
import { CryptCardComponent } from '../deck-shared/crypt-card/crypt-card.component'
import { CryptQuery } from '../../state/crypt/crypt.query'
import { Clipboard } from '@angular/cdk/clipboard'

@UntilDestroy()
@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    private route: ActivatedRoute,
    private titleService: Title,
    private deckQuery: DeckQuery,
    private authQuery: AuthQuery,
    private toastService: ToastService,
    private apiDataService: ApiDataService,
    private changeDetectorRef: ChangeDetectorRef,
    private previousRouteService: PreviousRouteService,
    private mediaService: MediaService,
    private modalService: NgbModal,
    private cryptQuery: CryptQuery,
    private router: Router,
    private clipboard: Clipboard,
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
          this.toastService.show('Something went wrong rating the deck', {
            classname: 'bg-danger text-light',
            delay: 5000,
          }),
        complete: () =>
          this.toastService.show('Thanks for your rating!!', {
            classname: 'bg-success text-light',
            delay: 5000,
          }),
      })
  }

  toggleBookmark() {
    this.apiDataService
      .bookmarkDeck(this.id, !this.isBookmarked)
      .pipe(untilDestroyed(this))
      .subscribe({
        error: () =>
          this.toastService.show(
            'Something went wrong adding the deck to bookmarks',
            {
              classname: 'bg-danger text-light',
              delay: 5000,
            },
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
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = cardList.map((c) => this.cryptQuery.getEntity(c.id))
    const current = cryptList.find((c) => c!.id === card.id)
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = current ? cryptList.indexOf(current) : 0
  }

  onOpenInBuilder(): void {
    this.router.navigateByUrl('/decks/builder', {
      state: { deck: this.deckQuery.getDeck() },
    })
  }

  onShare(): void {
    this.clipboard.copy(`https://${environment.domain}/deck/${this.id}`)
    this.toastService.show('Link copied to clipboard', {
      classname: 'bg-success text-light',
      delay: 5000,
    })
  }

  onTag(tag: string): void {
    this.router.navigate(['/decks'], {
      queryParams: {
        tags: tag,
      },
    })
  }
}
