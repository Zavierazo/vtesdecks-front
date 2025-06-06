import { DOCUMENT, ViewportScroller, NgClass, AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  inject,
  viewChild,
} from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { NgbOffcanvas, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
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
import { ApiDeck } from '../../models/api-deck'
import { DecksService } from '../../state/decks/decks.service'
import { MediaService } from './../../services/media.service'
import { DecksQuery } from './../../state/decks/decks.query'
import { DeckFiltersComponent } from './filter/deck-filters.component'
import { TranslocoDirective } from '@jsverse/transloco'
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { DeckCardComponent } from '../deck-card/deck-card.component'
import { DeckRestorableCardComponent } from '../deck-restorable-card/deck-restorable-card.component'
import { LoadingComponent } from '../../shared/components/loading/loading.component'

@UntilDestroy()
@Component({
  selector: 'app-decks',
  templateUrl: './decks.component.html',
  styleUrls: ['./decks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
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
  ],
})
export class DecksComponent implements OnInit {
  private document = inject<Document>(DOCUMENT)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private decksQuery = inject(DecksQuery)
  private decksService = inject(DecksService)
  private viewportService = inject(ViewportScroller)
  private formBuilder = inject(FormBuilder)
  private mediaService = inject(MediaService)
  private offcanvasService = inject(NgbOffcanvas)

  decks$!: Observable<ApiDeck[]>
  restorableDecks$!: Observable<ApiDeck[]>
  total$!: Observable<number>
  isLoading$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  mainForm!: FormGroup

  readonly filters = viewChild.required<DeckFiltersComponent>('filters')

  ngOnInit() {
    this.isLoading$ = this.decksQuery.selectLoading()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        skip(1),
        tap((params) => this.decksService.init(params)),
        switchMap(() => this.decksService.getMore()),
      )
      .subscribe()
    this.decks$ = this.decksQuery.selectAll()
    this.total$ = this.decksQuery.selectTotal()
    this.restorableDecks$ = this.decksQuery.selectRestorableDecks()
    this.listenScroll()
    this.initMainForm()
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
      .querySelector('#container')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  reset(): void {
    // Default value main form
    this.mainForm.get('type')?.patchValue('ALL', { emitEvent: false })
    this.mainForm.get('order')?.patchValue('NEWEST', { emitEvent: false })

    // Clear query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
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
