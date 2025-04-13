import { DOCUMENT, ViewportScroller } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core'
import { FormBuilder, FormControl, FormGroup } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
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

@UntilDestroy()
@Component({
    selector: 'app-decks',
    templateUrl: './decks.component.html',
    styleUrls: ['./decks.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class DecksComponent implements OnInit {
  decks$!: Observable<ApiDeck[]>
  restorableDecks$!: Observable<ApiDeck[]>
  total$!: Observable<number>
  isLoading$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  mainForm!: FormGroup

  @ViewChild('filters') filters!: DeckFiltersComponent

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private router: Router,
    private decksQuery: DecksQuery,
    private decksService: DecksService,
    private viewportService: ViewportScroller,
    private formBuilder: FormBuilder,
    private mediaService: MediaService,
    private offcanvasService: NgbOffcanvas,
  ) {}

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
    this.filters?.reset()
    this.reset()
  }

  onTagClick(tag: string): void {
    this.filters?.onSelectTag(tag)
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
