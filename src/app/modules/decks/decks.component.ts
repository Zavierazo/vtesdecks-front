import { AsyncPipe, NgClass, ViewportScroller } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  OnInit,
  TemplateRef,
  viewChild,
} from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiDeck } from '@models'
import { NgbOffcanvas, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService, SeoService } from '@services'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import { LoadingComponent } from '@shared/components/loading/loading.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import {
  debounceTime,
  distinctUntilChanged,
  fromEvent,
  map,
  Observable,
  skip,
  switchMap,
  tap,
} from 'rxjs'
import { DeckCardComponent } from '../deck-card/deck-card.component'
import { DeckRestorableCardComponent } from '../deck-restorable-card/deck-restorable-card.component'
import { DeckFiltersComponent } from './filter/deck-filters.component'

@UntilDestroy()
@Component({
  selector: 'app-decks',
  templateUrl: './decks.component.html',
  styleUrls: ['./decks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    ReactiveFormsModule,
    IsLoggedDirective,
    DeckFiltersComponent,
    NgClass,
    InfiniteScrollDirective,
    DeckCardComponent,
    DeckRestorableCardComponent,
    LoadingComponent,
    NgbTooltip,
    AsyncPipe,
    RouterLink,
    AdSenseComponent,
  ],
})
export class DecksComponent implements OnInit {
  private readonly document = inject<Document>(DOCUMENT)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly decksQuery = inject(DecksQuery)
  private readonly decksService = inject(DecksService)
  private readonly viewportService = inject(ViewportScroller)
  private readonly formBuilder = inject(FormBuilder)
  private readonly mediaService = inject(MediaService)
  private readonly offcanvasService = inject(NgbOffcanvas)

  decks$!: Observable<ApiDeck[]>
  restorableDecks$!: Observable<ApiDeck[]>
  total$!: Observable<number>
  isLoading$!: Observable<boolean>
  hasMore$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  mainForm!: FormGroup

  readonly filters = viewChild<DeckFiltersComponent>('filters')
  private readonly seoService = inject(SeoService)

  ngOnInit() {
    this.seoService.update({
      title: 'Decks',
      description:
        'Browse and search thousands of VTES tournament-winning and community decks. Filter by clan, discipline, author and more.',
      canonicalUrl: 'https://vtesdecks.com/decks',
    })
    this.isLoading$ = this.decksQuery.selectLoading()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        skip(1),
        tap((params) => {
          this.scrollToTop()
          this.decksService.init(params)
        }),
        switchMap(() => this.decksService.getMore()),
      )
      .subscribe()
    this.decks$ = this.decksQuery.selectAll()
    this.total$ = this.decksQuery.selectTotal()
    this.restorableDecks$ = this.decksQuery.selectRestorableDecks()
    this.hasMore$ = this.decksQuery.selectHasMore()
    this.listenScroll()
    this.initMainForm()
    const lastViewedDeckId = this.decksQuery.getLastViewedDeckId()
    // Scroll to last viewed deck if exists
    if (lastViewedDeckId) {
      this.scrollToDeck(lastViewedDeckId)
    }
  }

  get type(): string {
    return this.mainForm.get('type')?.value
  }

  onScroll(): void {
    if (this.decksQuery.getHasMore()) {
      this.decksService.getMore().pipe(untilDestroyed(this)).subscribe()
    }
  }

  openFilters(content: TemplateRef<any>): void {
    this.offcanvasService.open(content, {
      ariaLabelledBy: 'offcanvas-basic-title',
    })
  }

  scrollToTop(): void {
    this.document
      .querySelector('.scroll-container')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  scrollToDeck(deckId: string): void {
    setTimeout(() => {
      const element = this.document.getElementById(deckId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Clear the stored deck ID after scrolling to avoid repeated scrolls
        this.decksService.clearLastViewedDeck()
      }
    }, 500)
  }

  reset(): void {
    // Clear query params, preserving current type and order
    const type = this.mainForm.get('type')?.value
    const order = this.mainForm.get('order')?.value
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: type && type !== 'ALL' ? type : undefined,
        order: order && order !== 'NEWEST' ? order : undefined,
      },
    })
  }

  resetFilters(): void {
    this.filters()?.reset()
    this.reset()
  }

  onTagClick(tag: string): void {
    this.filters()?.onSelectTag(tag)
  }

  private listenScroll() {
    this.showScrollButton$ = fromEvent(this.document, 'scroll').pipe(
      untilDestroyed(this),
      map(() => this.viewportService.getScrollPosition()?.[1] > 100),
    )
  }

  private initMainForm() {
    this.mainForm = this.formBuilder.group({})
    this.listenAndNavigateString(this.mainForm, 'type', 'ALL')
    this.listenAndNavigateString(this.mainForm, 'order', 'NEWEST')
  }

  private listenAndNavigateString(
    formGroup: FormGroup,
    name: string,
    defaultValue: string,
    debounce = 0,
  ) {
    const formControl = new FormControl(
      this.decksQuery.getParam(name) ?? defaultValue,
    )
    formControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(debounce),
        tap((value) =>
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              [name]: value !== '' && value !== 'any' ? value : undefined,
            },
            queryParamsHandling: 'merge',
          }),
        ),
      )
      .subscribe()
    formGroup.addControl(name, formControl)
  }
}
