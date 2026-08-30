import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core'
import { AsyncPipe } from '@angular/common'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { ActivatedRoute, Params, Router } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import {
  NgbHighlight,
  NgbTooltip,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { ApiDeckArchetype } from '@models'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { DecksQuery } from '@state/decks/decks.query'
import {
  Observable,
  OperatorFunction,
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  tap,
} from 'rxjs'
import { CardFilterComponent } from './card-filter/card-filter.component'
import {
  DECK_ROUND_OPTIONS,
  deckFilterControlDefs,
  isSameParamValue,
  splitParamList,
} from './deck-filter-defaults'

import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { ClanFilterComponent } from '@deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '@deck-shared/discipline-filter/discipline-filter.component'
import { PathFilterComponent } from '@deck-shared/path-filter/path-filter.component'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { CardProportionComponent } from './card-proportion/card-proportion.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-filters',
  templateUrl: './deck-filters.component.html',
  styleUrls: ['./deck-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    IsLoggedDirective,
    NgbHighlight,
    NgbTypeahead,
    ClanFilterComponent,
    DisciplineFilterComponent,
    PathFilterComponent,
    CardFilterComponent,
    NgxSliderModule,
    NgbTooltip,
    CardProportionComponent,
    TranslocoPipe,
    TranslocoFallbackPipe,
    AsyncPipe,
  ],
})
export class DeckFiltersComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly decksQuery = inject(DecksQuery)
  private readonly formBuilder = inject(FormBuilder)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly apiDataService = inject(ApiDataService)
  private readonly translocoService = inject(TranslocoService)

  readonly resetFilters = output<void>()
  type = input.required<string>()
  filterForm!: FormGroup
  disciplines!: string[]
  clans!: string[]
  notClans!: string[]
  notDisciplines!: string[]
  clanMode: 'and' | 'or' = 'and'
  disciplineMode: 'and' | 'or' = 'and'
  paths!: string[]
  availableTags: string[] = []
  readonly availableRounds = DECK_ROUND_OPTIONS
  rounds: number[] = []
  archetypes: ApiDeckArchetype[] = []
  selectedArchetype: ApiDeckArchetype | null = null
  readonly currency$ = this.decksQuery.selectCurrency()

  tagFocus$ = new Subject<string>()
  tagClick$ = new Subject<string>()

  readonly cardFilter = viewChild.required<CardFilterComponent>('cardFilter')
  readonly tagsTypeahead = viewChild.required<NgbTypeahead>('tagsTypeahead')

  ngOnInit() {
    this.disciplines = this.getCurrentDisciplines()
    this.clans = this.getCurrentClans()
    this.notClans = this.getCurrentList('notClans')
    this.notDisciplines = this.getCurrentList('notDisciplines')
    this.clanMode = this.getCurrentMode('clanMode')
    this.disciplineMode = this.getCurrentMode('disciplineMode')
    this.paths = this.getCurrentPaths()
    this.rounds = this.getCurrentRounds()
    this.apiDataService
      .getDeckTags()
      .pipe(
        untilDestroyed(this),
        tap((tags) => {
          this.availableTags = tags
          this.changeDetector.markForCheck()
        }),
      )
      .subscribe()
    this.apiDataService
      .getAllDeckArchetypes('TOURNAMENT')
      .pipe(
        untilDestroyed(this),
        tap((archetypes) => {
          this.archetypes = archetypes.filter((item) => item.enabled)
          this.syncArchetype(this.route.snapshot.queryParams['archetype'])
          this.changeDetector.markForCheck()
        }),
      )
      .subscribe()
    this.initFilterForm()
  }

  ngAfterViewInit() {
    // The card filter is a view child, so wait for the view before syncing.
    this.listenQueryParams()
  }

  reset() {
    // Default value filter form
    deckFilterControlDefs(this.getCurrentYear()).forEach((def) =>
      this.filterForm
        .get(def.name)
        ?.patchValue(def.default, { emitEvent: false }),
    )
    this.filterForm
      .get('collectionTracker')
      ?.patchValue(false, { emitEvent: false })
    this.clans = []
    this.disciplines = []
    this.notClans = []
    this.notDisciplines = []
    this.clanMode = 'and'
    this.disciplineMode = 'and'
    this.paths = []
    this.rounds = []
    this.selectedArchetype = null
    this.cardFilter().reset()
    this.resetFilters.emit()
  }

  searchArchetype: OperatorFunction<string, ApiDeckArchetype[]> = (text$) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map((term) => {
        const normalized = term.toLowerCase().trim()
        return this.archetypes
          .filter((item) =>
            (item.id === 0 ? 'unclassified' : item.name)
              .toLowerCase()
              .includes(normalized),
          )
          .slice(0, 20)
      }),
    )

  archetypeFormatter = (item: ApiDeckArchetype) =>
    item.id === 0
      ? this.translocoService.translate('filters.unclassified')
      : item.name

  onSelectArchetype(event: NgbTypeaheadSelectItemEvent<ApiDeckArchetype>) {
    this.selectedArchetype = event.item
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { archetype: event.item.id },
      queryParamsHandling: 'merge',
    })
  }

  clearArchetype() {
    this.selectedArchetype = null
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { archetype: undefined },
      queryParamsHandling: 'merge',
    })
  }

  setCollectionShortcut(value: number) {
    this.filterForm
      .get('collectionTracker')
      ?.patchValue(true, { emitEvent: false })
    this.filterForm.get('collectionPercentage')?.patchValue(value)
  }

  isCollectionShortcut(value: number): boolean {
    return (
      this.collectionTracker &&
      Number(this.getProportionValue('collectionPercentage')) === value
    )
  }

  get priceRangeInvalid(): boolean {
    const minRaw = this.filterForm?.get('minPrice')?.value
    const maxRaw = this.filterForm?.get('maxPrice')?.value
    const min = this.priceValue('minPrice')
    const max = this.priceValue('maxPrice')
    if (
      (minRaw !== '' &&
        minRaw !== null &&
        minRaw !== undefined &&
        min === null) ||
      (maxRaw !== '' && maxRaw !== null && maxRaw !== undefined && max === null)
    ) {
      return true
    }
    return min !== null && max !== null && min > max
  }

  changeDisciplineFilter() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        disciplines:
          this.disciplines?.length > 0 ? this.disciplines.join(',') : undefined,
      },
      queryParamsHandling: 'merge',
    })
  }

  changeClanFilter() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        clans: this.clans?.length > 0 ? this.clans.join(',') : undefined,
      },
      queryParamsHandling: 'merge',
    })
  }

  changeNotClanFilter(notClans: string[]) {
    this.notClans = notClans
    this.changeListFilter('notClans', notClans)
  }

  changeNotDisciplineFilter(notDisciplines: string[]) {
    this.notDisciplines = notDisciplines
    this.changeListFilter('notDisciplines', notDisciplines)
  }

  changeClanMode(mode: 'and' | 'or') {
    this.clanMode = mode
    this.changeMatchMode('clanMode', mode)
  }

  changeDisciplineMode(mode: 'and' | 'or') {
    this.disciplineMode = mode
    this.changeMatchMode('disciplineMode', mode)
  }

  isRoundSelected(round: number): boolean {
    return this.rounds.includes(round)
  }

  toggleRound(round: number) {
    this.rounds = this.isRoundSelected(round)
      ? this.rounds.filter((value) => value !== round)
      : [...this.rounds, round].sort((a, b) => a - b)
    this.changeListFilter(
      'rounds',
      this.rounds.map((value) => `${value}`),
    )
  }

  changePathFilter() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        paths: this.paths?.length > 0 ? this.paths.join(',') : undefined,
      },
      queryParamsHandling: 'merge',
    })
  }

  getCurrentYear(): number {
    return new Date().getFullYear()
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }

  get absoluteProportion(): boolean {
    return this.filterForm.get('absoluteProportion')?.value
  }
  get customProportion(): boolean {
    return this.filterForm.get('customProportion')?.value
  }
  get collectionTracker(): boolean {
    return this.filterForm.get('collectionTracker')?.value
  }

  getProportionValue(name: string): string {
    return this.filterForm.get(name)?.value ?? 0
  }

  onProportionChange(name: string, value: string): void {
    this.filterForm.get(name)?.patchValue(value)
  }

  private getCurrentDisciplines(): string[] {
    const disciplines = this.decksQuery.getParam('disciplines')
    if (disciplines) {
      return disciplines.split(',')
    }
    return []
  }

  private getCurrentClans(): string[] {
    const clans = this.decksQuery.getParam('clans')
    if (clans) {
      return clans.split(',')
    }
    return []
  }

  private getCurrentList(name: string): string[] {
    const value = this.decksQuery.getParam(name)
    return value ? value.split(',') : []
  }

  private changeListFilter(name: string, values: string[]) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [name]: values.length > 0 ? values.join(',') : undefined },
      queryParamsHandling: 'merge',
    })
  }

  private getCurrentMode(name: string): 'and' | 'or' {
    return this.decksQuery.getParam(name) === 'or' ? 'or' : 'and'
  }

  private changeMatchMode(name: string, mode: 'and' | 'or') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [name]: mode === 'or' ? 'or' : undefined },
      queryParamsHandling: 'merge',
    })
  }

  private getCurrentRounds(): number[] {
    return this.getCurrentList('rounds')
      .map((round) => Number(round))
      .filter((round) => this.availableRounds.includes(round))
  }

  private getCurrentPaths(): string[] {
    const paths = this.decksQuery.getParam('paths')
    if (paths) {
      return paths.split(',')
    }
    return []
  }

  private initFilterForm() {
    this.filterForm = this.formBuilder.group({})
    deckFilterControlDefs(this.getCurrentYear()).forEach((def) => {
      const debounce = def.debounce ?? 0
      const navigate = def.navigate ?? true
      switch (def.kind) {
        case 'range': {
          const [min, max] = def.default as number[]
          this.listenAndNavigateSlider(
            this.filterForm,
            def.name,
            min,
            max,
            debounce,
            navigate,
          )
          break
        }
        case 'boolean':
          this.listenAndNavigateBoolean(
            this.filterForm,
            def.name,
            def.default as boolean,
            debounce,
            navigate,
          )
          break
        case 'number':
          // The tracker switch drives the percentage slider, register it first.
          this.listenAndNavigateCollectionTracker()
          this.listenAndNavigateSimpleSlider(
            this.filterForm,
            def.name,
            def.default as number,
            debounce,
            navigate,
          )
          break
        case 'decimal':
          this.listenAndNavigatePrice(def.name, debounce)
          break
        default:
          this.listenAndNavigateString(
            this.filterForm,
            def.name,
            def.default as string,
            debounce,
            navigate,
          )
      }
    })
  }

  /**
   * The URL is the source of truth for every deck filter, but the controls are
   * only read from it once at construction. Mirror later query param changes
   * back into the sidebar so removing a filter chip, resetting, or navigating
   * back keeps the panel in sync.
   */
  private listenQueryParams() {
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        tap((params) => this.syncFromParams(params)),
      )
      .subscribe()
  }

  private syncFromParams(params: Params) {
    deckFilterControlDefs(this.getCurrentYear()).forEach((def) => {
      if (def.navigate === false) {
        return
      }
      const control = this.filterForm.get(def.name)
      const value = params[def.name] ?? def.default
      // A control's own navigation round-trips to the same value, so this
      // guard keeps self-triggered emissions (and debounced typing) untouched.
      if (control && !isSameParamValue(control.value, value)) {
        control.patchValue(value, { emitEvent: false })
      }
    })
    const tracker = this.filterForm.get('collectionTracker')
    const trackerValue = params['collectionPercentage'] ?? false
    if (tracker && !isSameParamValue(tracker.value, trackerValue)) {
      tracker.patchValue(trackerValue, { emitEvent: false })
    }
    this.clans = splitParamList(params['clans'])
    this.notClans = splitParamList(params['notClans'])
    this.disciplines = splitParamList(params['disciplines'])
    this.notDisciplines = splitParamList(params['notDisciplines'])
    this.paths = splitParamList(params['paths'])
    this.rounds = splitParamList(params['rounds'])
      .map((round) => Number(round))
      .filter((round) => this.availableRounds.includes(round))
    this.clanMode = params['clanMode'] === 'or' ? 'or' : 'and'
    this.disciplineMode = params['disciplineMode'] === 'or' ? 'or' : 'and'
    this.syncArchetype(params['archetype'])
    this.cardFilter().syncFromParams(params)
    this.changeDetector.markForCheck()
  }

  private syncArchetype(value: unknown) {
    this.selectedArchetype =
      value === undefined || value === null || value === ''
        ? null
        : (this.archetypes.find((item) => `${item.id}` === `${value}`) ?? null)
  }

  private priceValue(name: string): number | null {
    const raw = this.filterForm?.get(name)?.value
    if (raw === '' || raw === null || raw === undefined) return null
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 ? value : null
  }

  private listenAndNavigatePrice(name: string, debounce = 0) {
    const formControl = new FormControl(this.decksQuery.getParam(name) ?? '')
    formControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(debounce),
        tap(() => {
          if (this.priceRangeInvalid) return
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              minPrice: this.priceValue('minPrice') ?? undefined,
              maxPrice: this.priceValue('maxPrice') ?? undefined,
            },
            queryParamsHandling: 'merge',
          })
        }),
      )
      .subscribe()
    this.filterForm.addControl(name, formControl)
  }

  private listenAndNavigateString(
    formGroup: FormGroup,
    name: string,
    defaultValue: string,
    debounce = 0,
    navigate = true,
  ) {
    const formControl = new FormControl(
      this.decksQuery.getParam(name) ?? defaultValue,
    )
    if (navigate) {
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
    }
    formGroup.addControl(name, formControl)
  }

  private listenAndNavigateSlider(
    formGroup: FormGroup,
    name: string,
    min: number,
    max: number,
    debounce = 0,
    navigate = true,
  ) {
    const formControl = new FormControl(
      this.decksQuery.getParam(name) ?? [min, max],
    )
    if (navigate) {
      formControl.valueChanges
        .pipe(
          untilDestroyed(this),
          debounceTime(debounce),
          tap((value) =>
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                [name]:
                  value.length === 2 && (value[0] !== min || value[1] !== max)
                    ? value
                    : undefined,
              },
              queryParamsHandling: 'merge',
            }),
          ),
        )
        .subscribe()
    }
    formGroup.addControl(name, formControl)
  }

  private listenAndNavigateSimpleSlider(
    formGroup: FormGroup,
    name: string,
    initialValue: number,
    debounce = 0,
    navigate = true,
  ) {
    const formControl = new FormControl(
      this.decksQuery.getParam(name) ?? initialValue,
    )
    if (navigate) {
      formControl.valueChanges
        .pipe(
          untilDestroyed(this),
          debounceTime(debounce),
          tap((value) =>
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                [name]: value > 0 ? value : undefined,
              },
              queryParamsHandling: 'merge',
            }),
          ),
        )
        .subscribe()
    }
    formGroup.addControl(name, formControl)
  }

  private listenAndNavigateBoolean(
    formGroup: FormGroup,
    name: string,
    defaultValue: boolean,
    debounce = 0,
    navigate = true,
  ) {
    const formControl = new FormControl(
      this.decksQuery.getParam(name) ?? defaultValue,
    )
    if (navigate) {
      formControl.valueChanges
        .pipe(
          untilDestroyed(this),
          debounceTime(debounce),
          tap((value) =>
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                [name]: value ? value : undefined,
              },
              queryParamsHandling: 'merge',
            }),
          ),
        )
        .subscribe()
    }
    formGroup.addControl(name, formControl)
  }

  searchTag: OperatorFunction<string, string[]> = (
    text$: Observable<string>,
  ) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged())
    const clicksWithClosedPopup$ = this.tagClick$.pipe(
      filter(() => !this.tagsTypeahead().isPopupOpen()),
    )
    const inputFocus$ = this.tagFocus$
    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map((term) =>
        term === ''
          ? this.availableTags.slice(0, 100)
          : this.availableTags
              .filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1)
              .slice(0, 100),
      ),
    )
  }

  onSelectTagItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<string>,
    input: HTMLInputElement,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    this.onSelectTag(selectItemEvent.item)
  }

  onSelectTag(tag: string) {
    if (this.tags.length) {
      if (!this.tags.includes(tag)) {
        this.filterForm
          .get('tags')
          ?.patchValue([this.tags.filter((t) => t !== tag), tag].join(','))
      }
    } else {
      this.filterForm.get('tags')?.patchValue(tag)
    }
    this.changeDetector.markForCheck()
  }

  onDeselectTag(tag: string): void {
    this.filterForm
      .get('tags')
      ?.patchValue([this.tags.filter((t) => t !== tag)].join(','))
    this.changeDetector.markForCheck()
  }

  get tags(): string[] {
    const value = this.filterForm.get('tags')?.value
    return value && value !== '' ? value.split(',') : []
  }

  private listenAndNavigateCollectionTracker() {
    const formControl = new FormControl(
      this.decksQuery.getParam('collectionPercentage') ?? false,
    )

    formControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          // When enabling collection tracker, set completion to 100%
          if (value) {
            this.filterForm
              .get('collectionPercentage')
              ?.patchValue(100, { emitEvent: true })
          } else {
            // When disabling, reset to full range
            this.filterForm
              .get('collectionPercentage')
              ?.patchValue(0, { emitEvent: true })
          }
        }),
      )
      .subscribe()

    this.filterForm.addControl('collectionTracker', formControl)
  }
}
