import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype, MetaType } from '@models'
import {
  NgbCollapseModule,
  NgbDropdownModule,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService, SeoService } from '@services'
import {
  FilterChip,
  FilterChipsComponent,
} from '@shared/components/filter-chips/filter-chips.component'
import {
  SortControlComponent,
  SortOption,
} from '@shared/components/sort-control/sort-control.component'
import { AuthQuery } from '@state/auth/auth.query'
import { CLAN_LIST, DISCIPLINE_LIST } from '@utils'
import { debounceTime, distinctUntilChanged } from 'rxjs'
import { ClanFilterComponent } from '../deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '../deck-shared/discipline-filter/discipline-filter.component'
import { DeckMetagameCardComponent } from './deck-metagame-card/deck-metagame-card.component'
import { DeckMetagameModalComponent } from './deck-metagame-modal/deck-metagame-modal.component'

type ArchetypeTrend = 'TRENDING' | 'DECLINING' | 'STABLE'
type MetagameSort = 'metaShare' | 'deckCount' | 'name'
type MatchMode = 'and' | 'or'

const DEFAULT_META_TYPE: MetaType = 'TOURNAMENT_365'
const META_TYPES: MetaType[] = [
  'TOURNAMENT_90',
  'TOURNAMENT_180',
  'TOURNAMENT_365',
  'TOURNAMENT_730',
  'TOURNAMENT',
]
const TRENDS: ArchetypeTrend[] = ['TRENDING', 'STABLE', 'DECLINING']

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame',
  templateUrl: './deck-metagame.component.html',
  styleUrls: ['./deck-metagame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    DeckMetagameCardComponent,
    NgbTooltip,
    NgbDropdownModule,
    NgbCollapseModule,
    SortControlComponent,
    FilterChipsComponent,
    ClanFilterComponent,
    DisciplineFilterComponent,
  ],
})
export class DeckMetagameComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)
  private readonly seoService = inject(SeoService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly transloco = inject(TranslocoService)

  /** Optional maximum number of archetypes to display (used by homepage). */
  @Input() limit?: number

  readonly suggestions$ = this.crud.selectSuggestions()
  readonly isMaintainer$ = this.authQuery.selectRole('maintainer')
  readonly rawArchetypes = toSignal(this.crud.selectAll(), {
    initialValue: null,
  })
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  })

  readonly nameControl = new FormControl('', { nonNullable: true })
  readonly metaTypeControl = new FormControl<MetaType>(DEFAULT_META_TYPE, {
    nonNullable: true,
  })
  readonly nameFilter = signal('')
  readonly selectedTypes = signal<string[]>([])
  readonly selectedTrends = signal<ArchetypeTrend[]>([])
  readonly clans = signal<string[]>([])
  readonly notClans = signal<string[]>([])
  readonly clanMode = signal<MatchMode>('and')
  readonly disciplines = signal<string[]>([])
  readonly notDisciplines = signal<string[]>([])
  readonly disciplineMode = signal<MatchMode>('and')
  readonly sortBy = signal<MetagameSort>('metaShare')
  readonly sortOrder = signal<'asc' | 'desc'>('desc')
  readonly filtersCollapsed = signal(true)
  readonly loadError = signal(false)

  readonly sortOptions: SortOption[] = [
    { value: 'metaShare', labelKey: 'deck_metagame.sort_meta_share' },
    { value: 'deckCount', labelKey: 'deck_metagame.sort_deck_count' },
    { value: 'name', labelKey: 'deck_metagame.sort_name' },
  ]
  readonly trends = TRENDS

  readonly availableTypes = computed(() => {
    const names = new Set(
      (this.rawArchetypes() ?? [])
        .map((archetype) => archetype.type?.trim())
        .filter((type): type is string => Boolean(type)),
    )
    this.selectedTypes().forEach((type) => names.add(type))
    return [...names].sort((a, b) => a.localeCompare(b))
  })

  readonly typeOptions = computed(() =>
    this.availableTypes().map((type) => ({
      type,
      count: (this.rawArchetypes() ?? []).filter(
        (archetype) =>
          archetype.type === type && this.matchesFilters(archetype, false),
      ).length,
    })),
  )

  readonly displayedArchetypes = computed<ApiDeckArchetype[] | null>(() => {
    const raw = this.rawArchetypes()
    if (raw === null) return null
    let results = this.limit
      ? [...raw]
      : raw.filter((archetype) => this.matchesFilters(archetype))
    results.sort((a, b) => this.compareArchetypes(a, b))
    if (this.limit) results = results.slice(0, this.limit)
    return results
  })

  readonly resultCount = computed(() => this.displayedArchetypes()?.length ?? 0)
  readonly totalCount = computed(() => this.rawArchetypes()?.length ?? 0)
  readonly advancedFilterCount = computed(
    () =>
      this.clans().length +
      this.notClans().length +
      this.disciplines().length +
      this.notDisciplines().length,
  )

  readonly filterChips = computed<FilterChip[]>(() => {
    this.activeLanguage()
    const chips: FilterChip[] = []
    const name = this.nameFilter().trim()
    if (name) {
      chips.push({
        id: 'name',
        key: 'name',
        label: this.transloco.translate('deck_metagame.search'),
        value: name,
      })
    }
    this.selectedTypes().forEach((type) =>
      chips.push({
        id: `types:${type}`,
        key: 'types',
        item: type,
        label: this.transloco.translate('deck_metagame.type'),
        value: type,
      }),
    )
    this.selectedTrends().forEach((trend) =>
      chips.push({
        id: `trends:${trend}`,
        key: 'trends',
        item: trend,
        label: this.transloco.translate('deck_metagame.trend_label'),
        value: this.transloco.translate(`deck_metagame.trend.${trend}`),
      }),
    )
    this.addProfileChips(chips, 'clans', this.clans(), false)
    this.addProfileChips(chips, 'notClans', this.notClans(), true)
    this.addProfileChips(chips, 'disciplines', this.disciplines(), false)
    this.addProfileChips(chips, 'notDisciplines', this.notDisciplines(), true)
    if (this.clanMode() === 'or' && this.clans().length >= 2) {
      chips.push({
        id: 'clanMode',
        key: 'clanMode',
        label: this.transloco.translate('deck_metagame.clan_mode'),
        value: this.transloco.translate('deck_metagame.match_any'),
      })
    }
    if (this.disciplineMode() === 'or' && this.disciplines().length >= 2) {
      chips.push({
        id: 'disciplineMode',
        key: 'disciplineMode',
        label: this.transloco.translate('deck_metagame.discipline_mode'),
        value: this.transloco.translate('deck_metagame.match_any'),
      })
    }
    return chips
  })

  ngOnInit(): void {
    if (!this.limit) {
      this.seoService.update({
        title: 'Metagame',
        description:
          'Explore the current VTES metagame. Discover the top tournament archetypes and their performance.',
        canonicalUrl: 'https://vtesdecks.com/metagame',
      })
      this.restoreQueryState()
    }
    this.loadArchetypes()
    if (this.authQuery.isRole('maintainer')) {
      this.crud.loadSuggestions().pipe(untilDestroyed(this)).subscribe()
    }

    this.nameControl.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe((value) => this.nameFilter.set(value))
    this.nameControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), untilDestroyed(this))
      .subscribe(() => this.updateQueryParams())
    this.metaTypeControl.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        if (!this.isTrendAvailable()) this.selectedTrends.set([])
        this.updateQueryParams()
        this.loadArchetypes()
      })
  }

  retry(): void {
    this.loadArchetypes()
  }

  toggleType(type: string): void {
    const values = this.toggleValue(this.selectedTypes(), type)
    const all = this.availableTypes()
    this.selectedTypes.set(
      all.length > 0 && all.every((item) => values.includes(item))
        ? []
        : values,
    )
    this.updateQueryParams()
  }

  toggleTrend(trend: ArchetypeTrend): void {
    this.selectedTrends.set(this.toggleValue(this.selectedTrends(), trend))
    this.updateQueryParams()
  }

  setClans(values: string[]): void {
    this.clans.set([...values])
    this.normalizeModes()
    this.updateQueryParams()
  }

  setNotClans(values: string[]): void {
    this.notClans.set([...values])
    this.updateQueryParams()
  }

  setDisciplines(values: string[]): void {
    this.disciplines.set([...values])
    this.normalizeModes()
    this.updateQueryParams()
  }

  setNotDisciplines(values: string[]): void {
    this.notDisciplines.set([...values])
    this.updateQueryParams()
  }

  setClanMode(mode: MatchMode): void {
    this.clanMode.set(this.clans().length >= 2 ? mode : 'and')
    this.updateQueryParams()
  }

  setDisciplineMode(mode: MatchMode): void {
    this.disciplineMode.set(this.disciplines().length >= 2 ? mode : 'and')
    this.updateQueryParams()
  }

  onChangeSortBy(value: string): void {
    const sort = value as MetagameSort
    if (this.sortBy() === sort) {
      this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
      this.sortBy.set(sort)
      this.sortOrder.set(sort === 'name' ? 'asc' : 'desc')
    }
    this.updateQueryParams()
  }

  removeFilterChip(chip: FilterChip): void {
    switch (chip.key) {
      case 'name':
        this.nameControl.setValue('')
        break
      case 'types':
        this.selectedTypes.set(
          this.selectedTypes().filter((item) => item !== chip.item),
        )
        break
      case 'trends':
        this.selectedTrends.set(
          this.selectedTrends().filter((item) => item !== chip.item),
        )
        break
      case 'clans':
        this.clans.set(this.clans().filter((item) => item !== chip.item))
        break
      case 'notClans':
        this.notClans.set(this.notClans().filter((item) => item !== chip.item))
        break
      case 'disciplines':
        this.disciplines.set(
          this.disciplines().filter((item) => item !== chip.item),
        )
        break
      case 'notDisciplines':
        this.notDisciplines.set(
          this.notDisciplines().filter((item) => item !== chip.item),
        )
        break
      case 'clanMode':
        this.clanMode.set('and')
        break
      case 'disciplineMode':
        this.disciplineMode.set('and')
        break
    }
    this.normalizeModes()
    this.updateQueryParams()
  }

  clearFilters(): void {
    this.nameControl.setValue('', { emitEvent: false })
    this.nameFilter.set('')
    this.selectedTypes.set([])
    this.selectedTrends.set([])
    this.clans.set([])
    this.notClans.set([])
    this.clanMode.set('and')
    this.disciplines.set([])
    this.notDisciplines.set([])
    this.disciplineMode.set('and')
    this.filtersCollapsed.set(true)
    this.updateQueryParams()
  }

  rankFor(index: number, archetype: ApiDeckArchetype): number | undefined {
    return archetype.id === 0 ? undefined : index + 1
  }

  typeSelected(type: string): boolean {
    return this.selectedTypes().includes(type)
  }

  trendSelected(trend: ArchetypeTrend): boolean {
    return this.selectedTrends().includes(trend)
  }

  isTrendAvailable(): boolean {
    return this.metaTypeControl.value !== 'TOURNAMENT'
  }

  openModal(): void {
    const modalRef = this.modalService.open(DeckMetagameModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init()
  }

  private loadArchetypes(): void {
    this.loadError.set(false)
    this.crud
      .loadAll(this.metaTypeControl.value)
      .pipe(untilDestroyed(this))
      .subscribe({ error: () => this.loadError.set(true) })
  }

  private matchesFilters(
    archetype: ApiDeckArchetype,
    includeType = true,
  ): boolean {
    const name = this.nameFilter().trim().toLocaleLowerCase()
    if (name && !archetype.name.toLocaleLowerCase().includes(name)) return false

    const hasCategoricalFilter =
      this.selectedTypes().length > 0 ||
      this.selectedTrends().length > 0 ||
      this.clans().length > 0 ||
      this.notClans().length > 0 ||
      this.disciplines().length > 0 ||
      this.notDisciplines().length > 0
    if (archetype.id === 0 && hasCategoricalFilter) return false
    if (
      includeType &&
      this.selectedTypes().length > 0 &&
      !this.selectedTypes().includes(archetype.type)
    ) {
      return false
    }
    if (
      this.selectedTrends().length > 0 &&
      (!archetype.trend || !this.selectedTrends().includes(archetype.trend))
    ) {
      return false
    }
    return (
      this.matchesProfile(
        archetype.clans ?? [],
        this.clans(),
        this.notClans(),
        this.clanMode(),
      ) &&
      this.matchesProfile(
        archetype.disciplines ?? [],
        this.disciplines(),
        this.notDisciplines(),
        this.disciplineMode(),
      )
    )
  }

  private matchesProfile(
    profile: string[],
    included: string[],
    excluded: string[],
    mode: MatchMode,
  ): boolean {
    if (excluded.some((value) => profile.includes(value))) return false
    if (included.length === 0) return true
    return mode === 'or'
      ? included.some((value) => profile.includes(value))
      : included.every((value) => profile.includes(value))
  }

  private compareArchetypes(a: ApiDeckArchetype, b: ApiDeckArchetype): number {
    if (a.id === 0 && b.id !== 0) return 1
    if (b.id === 0 && a.id !== 0) return -1
    let comparison: number
    if (this.sortBy() === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (this.sortBy() === 'deckCount') {
      comparison = (a.deckCount ?? 0) - (b.deckCount ?? 0)
    } else {
      const shareA = a.metaTotal ? a.metaCount / a.metaTotal : 0
      const shareB = b.metaTotal ? b.metaCount / b.metaTotal : 0
      comparison = shareA - shareB
    }
    if (comparison !== 0) {
      return this.sortOrder() === 'asc' ? comparison : -comparison
    }
    return a.name.localeCompare(b.name)
  }

  private toggleValue<T>(values: T[], value: T): T[] {
    return values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]
  }

  private normalizeModes(): void {
    if (this.clans().length < 2) this.clanMode.set('and')
    if (this.disciplines().length < 2) this.disciplineMode.set('and')
  }

  private addProfileChips(
    chips: FilterChip[],
    key: 'clans' | 'notClans' | 'disciplines' | 'notDisciplines',
    values: string[],
    excluded: boolean,
  ): void {
    const discipline = key.toLowerCase().includes('discipline')
    const labelKey = discipline ? 'discipline' : 'clan'
    values.forEach((value) =>
      chips.push({
        id: `${key}:${value}`,
        key,
        item: value,
        label: this.transloco.translate(
          excluded
            ? `deck_metagame.exclude_${labelKey}`
            : `deck_metagame.${labelKey}`,
        ),
        value: this.profileLabel(value, discipline),
      }),
    )
  }

  private restoreQueryState(): void {
    const params = this.route.snapshot.queryParamMap
    const metaType = params.get('metaType') as MetaType | null
    this.metaTypeControl.setValue(
      metaType && META_TYPES.includes(metaType) ? metaType : DEFAULT_META_TYPE,
      { emitEvent: false },
    )
    const name = params.get('name') ?? ''
    this.nameControl.setValue(name, { emitEvent: false })
    this.nameFilter.set(name)
    this.selectedTypes.set(this.paramList(params.get('types')))
    this.selectedTrends.set(
      this.paramList(params.get('trends')).filter(
        (value): value is ArchetypeTrend =>
          TRENDS.includes(value as ArchetypeTrend),
      ),
    )
    if (!this.isTrendAvailable()) this.selectedTrends.set([])
    const validClans = new Set(CLAN_LIST.map((clan) => clan.name))
    const validDisciplines = new Set(
      DISCIPLINE_LIST.map((discipline) => discipline.name),
    )
    this.clans.set(
      this.paramList(params.get('clans')).filter((value) =>
        validClans.has(value),
      ),
    )
    this.notClans.set(
      this.paramList(params.get('notClans')).filter((value) =>
        validClans.has(value),
      ),
    )
    this.disciplines.set(
      this.paramList(params.get('disciplines')).filter((value) =>
        validDisciplines.has(value),
      ),
    )
    this.notDisciplines.set(
      this.paramList(params.get('notDisciplines')).filter((value) =>
        validDisciplines.has(value),
      ),
    )
    this.clanMode.set(params.get('clanMode') === 'or' ? 'or' : 'and')
    this.disciplineMode.set(
      params.get('disciplineMode') === 'or' ? 'or' : 'and',
    )
    this.normalizeModes()
    const sortBy = params.get('sortBy') as MetagameSort | null
    if (sortBy && this.sortOptions.some((option) => option.value === sortBy)) {
      this.sortBy.set(sortBy)
    }
    const defaultOrder = this.sortBy() === 'name' ? 'asc' : 'desc'
    const order = params.get('sortByOrder')
    this.sortOrder.set(
      order === 'asc' || order === 'desc' ? order : defaultOrder,
    )
    this.filtersCollapsed.set(this.advancedFilterCount() === 0)
    this.updateQueryParams()
  }

  private profileLabel(value: string, discipline: boolean): string {
    const item = (discipline ? DISCIPLINE_LIST : CLAN_LIST).find(
      (option) => option.name === value,
    )
    return item ? this.transloco.translate(item.label) : value
  }

  private updateQueryParams(): void {
    if (this.limit) return
    const defaultOrder = this.sortBy() === 'name' ? 'asc' : 'desc'
    const queryParams: Record<string, string | undefined> = {
      name: this.nameFilter().trim() || undefined,
      types: this.joinParam(this.selectedTypes()),
      trends: this.joinParam(this.selectedTrends()),
      clans: this.joinParam(this.clans()),
      notClans: this.joinParam(this.notClans()),
      clanMode:
        this.clanMode() === 'or' && this.clans().length >= 2 ? 'or' : undefined,
      disciplines: this.joinParam(this.disciplines()),
      notDisciplines: this.joinParam(this.notDisciplines()),
      disciplineMode:
        this.disciplineMode() === 'or' && this.disciplines().length >= 2
          ? 'or'
          : undefined,
      sortBy: this.sortBy() === 'metaShare' ? undefined : this.sortBy(),
      sortByOrder:
        this.sortOrder() === defaultOrder ? undefined : this.sortOrder(),
      metaType:
        this.metaTypeControl.value === DEFAULT_META_TYPE
          ? undefined
          : this.metaTypeControl.value,
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    })
  }

  private paramList(value: string | null): string[] {
    return value
      ? [
          ...new Set(
            value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          ),
        ]
      : []
  }

  private joinParam(values: readonly string[]): string | undefined {
    return values.length ? values.join(',') : undefined
  }
}
