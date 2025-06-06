import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, output, viewChild } from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  NgbHighlight,
  NgbTooltip,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
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
import { ApiDataService } from '../../../services/api.data.service'
import { IsLoggedDirective } from '../../../shared/directives/is-logged.directive'
import { DecksQuery } from '../../../state/decks/decks.query'
import { CardFilterComponent } from './card-filter/card-filter.component'

import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { TranslocoFallbackPipe } from '../../../shared/pipes/transloco-fallback'
import { ClanFilterComponent } from '../../deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '../../deck-shared/discipline-filter/discipline-filter.component'
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
    CardFilterComponent,
    NgxSliderModule,
    NgbTooltip,
    CardProportionComponent,
    TranslocoFallbackPipe,
  ],
})
export class DeckFiltersComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly decksQuery = inject(DecksQuery);
  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly apiDataService = inject(ApiDataService);

  readonly resetFilters = output<void>();
  filterForm!: FormGroup
  disciplines!: string[]
  clans!: string[]
  availableTags: string[] = []

  tagFocus$ = new Subject<string>()
  tagClick$ = new Subject<string>()

  readonly cardFilter = viewChild.required<CardFilterComponent>('cardFilter');
  readonly tagsTypeahead = viewChild.required<NgbTypeahead>('tagsTypeahead');

  ngOnInit() {
    this.disciplines = this.getCurrentDisciplines()
    this.clans = this.getCurrentClans()
    this.apiDataService
      .getDeckTags()
      .pipe(
        untilDestroyed(this),
        tap((tags) => (this.availableTags = tags)),
      )
      .subscribe()
    this.initFilterForm()
  }

  reset() {
    // Default value filter form
    this.filterForm.get('name')?.patchValue('', { emitEvent: false })
    this.filterForm.get('author')?.patchValue('', { emitEvent: false })
    this.filterForm.get('cardText')?.patchValue('', { emitEvent: false })
    this.filterForm
      .get('singleDiscipline')
      ?.patchValue(false, { emitEvent: false })
    this.filterForm.get('singleClan')?.patchValue(false, { emitEvent: false })
    this.filterForm
      .get('librarySize')
      ?.patchValue([40, 90], { emitEvent: false })
    this.filterForm.get('cryptSize')?.patchValue([12, 40], { emitEvent: false })
    this.filterForm.get('group')?.patchValue([0, 7], { emitEvent: false })
    this.filterForm.get('players')?.patchValue([10, 200], { emitEvent: false })
    this.filterForm
      .get('year')
      ?.patchValue([1998, this.getCurrentYear()], { emitEvent: false })
    this.filterForm
      .get('absoluteProportion')
      ?.patchValue(false, { emitEvent: false })
    this.filterForm
      .get('customProportion')
      ?.patchValue(false, { emitEvent: false })
    this.filterForm.get('master')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('action')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('political')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('retainer')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('equipment')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('ally')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('modifier')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('combat')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('reaction')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('event')?.patchValue('any', { emitEvent: false })
    this.filterForm.get('tags')?.patchValue('', { emitEvent: false })
    this.filterForm.get('favorite')?.patchValue(false, { emitEvent: false })
    this.clans = []
    this.disciplines = []
    this.cardFilter().reset()
    // TODO: The 'emit' function requires a mandatory void argument
    this.resetFilters.emit()
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

  private initFilterForm() {
    this.filterForm = this.formBuilder.group({})
    this.listenAndNavigateString(this.filterForm, 'name', '', 500)
    this.listenAndNavigateString(this.filterForm, 'author', '', 500)
    this.listenAndNavigateString(this.filterForm, 'cardText', '', 500)
    this.listenAndNavigateBoolean(this.filterForm, 'singleDiscipline', false)
    this.listenAndNavigateBoolean(this.filterForm, 'singleClan', false)
    this.listenAndNavigateSlider(this.filterForm, 'librarySize', 40, 90, 500)
    this.listenAndNavigateSlider(this.filterForm, 'cryptSize', 12, 40, 500)
    this.listenAndNavigateSlider(this.filterForm, 'group', 0, 7, 500)
    this.listenAndNavigateSlider(this.filterForm, 'players', 10, 200, 500)
    this.listenAndNavigateSlider(
      this.filterForm,
      'year',
      1998,
      this.getCurrentYear(),
      500,
    )
    this.listenAndNavigateBoolean(this.filterForm, 'absoluteProportion', false)
    this.listenAndNavigateBoolean(
      this.filterForm,
      'customProportion',
      false,
      0,
      false,
    )
    this.listenAndNavigateString(this.filterForm, 'master', 'any')
    this.listenAndNavigateString(this.filterForm, 'action', 'any')
    this.listenAndNavigateString(this.filterForm, 'political', 'any')
    this.listenAndNavigateString(this.filterForm, 'retainer', 'any')
    this.listenAndNavigateString(this.filterForm, 'equipment', 'any')
    this.listenAndNavigateString(this.filterForm, 'ally', 'any')
    this.listenAndNavigateString(this.filterForm, 'modifier', 'any')
    this.listenAndNavigateString(this.filterForm, 'combat', 'any')
    this.listenAndNavigateString(this.filterForm, 'reaction', 'any')
    this.listenAndNavigateString(this.filterForm, 'event', 'any')
    this.listenAndNavigateString(this.filterForm, 'tags', '')
    this.listenAndNavigateBoolean(this.filterForm, 'favorite', false)
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
          ? this.availableTags.slice(0, 10)
          : this.availableTags
              .filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1)
              .slice(0, 10),
      ),
    )
  }

  onSelectTagItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<string>,
    input: any,
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
}
