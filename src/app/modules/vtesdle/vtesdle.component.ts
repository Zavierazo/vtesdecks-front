import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCardToday, ApiCrypt } from '@models'
import {
  NgbHighlight,
  NgbRating,
  NgbTooltip,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  distinctUntilChanged,
  map,
  Observable,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '../../../environments/environment'
import { CryptQuery } from '../../state/crypt/crypt.query'

import { ApiDataService, LocalStorageService } from '@services'
import { sortTrigramSimilarity } from '@utils'
import { LoadingComponent } from '../../shared/components/loading/loading.component'

@UntilDestroy()
@Component({
  selector: 'app-vtesdle',
  templateUrl: './vtesdle.component.html',
  styleUrls: ['./vtesdle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgbTooltip,
    LoadingComponent,
    NgbHighlight,
    NgbTypeahead,
    NgbRating,
  ],
})
export class VtesdleComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private localStorageService = inject(LocalStorageService)
  private apiDataService = inject(ApiDataService)
  private cryptQuery = inject(CryptQuery)
  private changeDetectorRef = inject(ChangeDetectorRef)

  maxLives = 6
  infiniteMode = false
  cardId!: number
  lives = this.maxLives
  guessed = false

  ngOnInit() {
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        tap((params) => {
          this.infiniteMode = params['mode'] === 'infinite'
          this.init()
        }),
      )
      .subscribe()
  }

  init(): void {
    if (this.infiniteMode) {
      this.infiniteModeInit()
    } else {
      this.dayModeInit()
    }
  }

  searchCrypt: OperatorFunction<string, ApiCrypt[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      switchMap((term) =>
        this.cryptQuery
          .selectByName(term, 10)
          .pipe(
            map((cards) =>
              cards.sort((a, b) => sortTrigramSimilarity(a.name, b.name, term)),
            ),
          ),
      ),
    )

  formatter = (x: { name: string }) => x.name

  selectCryptItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiCrypt>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    if (item.id === this.cardId) {
      this.guessed = true
      if (!this.infiniteMode) {
        this.localStorageService.setValue('todayGuessed', this.guessed)
      }
    } else {
      this.lives--
      if (!this.infiniteMode) {
        this.localStorageService.setValue('todayLives', this.lives)
      }
    }
    this.changeDetectorRef.detectChanges()
  }

  getImageUrl(): string {
    if (this.guessed || this.lives <= 0) {
      return `${environment.cdnDomain}/img/cards/${this.cardId}.jpg`
    }
    const sections = []
    if (this.lives === 6) {
      sections.push('CLAN')
    }
    if (this.lives >= 5) {
      sections.push('CAPACITY')
    }
    if (this.lives >= 4) {
      sections.push('DISCIPLINE')
    }
    if (this.lives >= 3) {
      sections.push('SKILL')
    }
    if (this.lives >= 2) {
      sections.push('ART')
    }
    sections.push('NAME')
    return `${environment.api.baseUrl}/images/${this.cardId}?sections=${
      this.guessed ? '' : sections
    }`
  }

  help(): void {
    alert('Not implemented yet')
  }

  switchMode(): void {
    this.infiniteMode = !this.infiniteMode
    this.init()
  }

  infiniteModeInit(): void {
    this.cardId = this.selectRandomCard()
    this.lives = this.maxLives
    this.guessed = false
    this.changeDetectorRef.detectChanges()
  }

  private selectRandomCard(): number {
    return Math.floor(Math.random() * (201653 - 200001 + 1)) + 200001
  }

  private dayModeInit(): void {
    this.apiDataService
      .getCardToday()
      .pipe(
        untilDestroyed(this),
        tap((cardToday: ApiCardToday) => {
          this.cardId = cardToday.card.id
          if (this.localStorageService.getValue('todayCard') !== this.cardId) {
            this.localStorageService.setValue('todayGuessed', false)
            this.localStorageService.setValue('todayLives', this.maxLives)
            this.localStorageService.setValue('todayCard', this.cardId)
          }
          this.lives = Number(this.localStorageService.getValue('todayLives'))
          this.guessed = Boolean(
            this.localStorageService.getValue('todayGuessed'),
          )
          this.changeDetectorRef.detectChanges()
        }),
      )
      .subscribe()
  }
}
