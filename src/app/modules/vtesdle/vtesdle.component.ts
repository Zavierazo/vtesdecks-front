import { ApiDataService } from './../../services/api.data.service'
import { LocalStorageService } from './../../services/local-storage.service'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core'
import { NgbTypeaheadSelectItemEvent, NgbTooltip, NgbHighlight, NgbTypeahead, NgbRating } from '@ng-bootstrap/ng-bootstrap'
import {
  combineLatest,
  distinctUntilChanged,
  mergeMap,
  Observable,
  of,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '../../../environments/environment'
import { ApiCrypt } from '../../models/api-crypt'
import { CryptQuery } from '../../state/crypt/crypt.query'
import { CryptService } from '../../state/crypt/crypt.service'
import { ActivatedRoute } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiCardToday } from '../../models/api-card-today'
import { TranslocoDirective } from '@jsverse/transloco';

import { LoadingComponent } from '../../shared/components/loading/loading.component';

@UntilDestroy()
@Component({
    selector: 'app-vtesdle',
    templateUrl: './vtesdle.component.html',
    styleUrls: ['./vtesdle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, NgbTooltip, LoadingComponent, NgbHighlight, NgbTypeahead, NgbRating]
})
export class VtesdleComponent implements OnInit {
  maxLives = 6
  infiniteMode = false
  cardId!: number
  lives = this.maxLives
  guessed = false

  constructor(
    private route: ActivatedRoute,
    private localStorageService: LocalStorageService,
    private apiDataService: ApiDataService,
    private cryptService: CryptService,
    private cryptQuery: CryptQuery,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

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
      mergeMap((term) =>
        combineLatest([of(term), this.cryptService.getCryptCards()]),
      ),
      switchMap(([term]) => this.cryptQuery.selectByName(term, 10)),
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
      return `/assets/img/cards/${this.cardId}.jpg`
    }
    let sections = []
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
