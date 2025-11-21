import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCrypt, ApiLibrary, CardFilter } from '@models'
import {
  NgbHighlight,
  NgbPopover,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import {
  debounceTime,
  map,
  Observable,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '../../../../../environments/environment'
import { CardImagePipe } from '../../../../shared/pipes/card-image.pipe'
import { CryptQuery } from '../../../../state/crypt/crypt.query'
import { CryptService } from '../../../../state/crypt/crypt.service'
import { DecksQuery } from '../../../../state/decks/decks.query'
import { sortTrigramSimilarity } from '../../../../utils/vtes-utils'
import { LibraryQuery } from './../../../../state/library/library.query'
import { LibraryService } from './../../../../state/library/library.service'

@UntilDestroy()
@Component({
  selector: 'app-card-filter',
  templateUrl: './card-filter.component.html',
  styleUrls: ['./card-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgbHighlight,
    NgbTypeahead,
    NgClass,
    NgbPopover,
    ReactiveFormsModule,
    AsyncPipe,
    CardImagePipe,
  ],
})
export class CardFilterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly decksQuery = inject(DecksQuery)
  private readonly cryptService = inject(CryptService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryService = inject(LibraryService)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly mediaService = inject(MediaService)

  @Input() showStarVampireFilter = true

  cards: CardFilter[] = []

  isMobile$!: Observable<boolean>

  form!: FormGroup

  cdnDomain = environment.cdnDomain

  ngOnInit() {
    this.isMobile$ = this.mediaService.observeMobile()
    this.initStarVampire()
    this.initCards()
  }

  reset() {
    this.cards = []
    this.form.get('starVampire')?.patchValue(false, { emitEvent: false })
    this.changeDetectorRef.detectChanges()
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

  searchLibrary: OperatorFunction<string, ApiLibrary[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      debounceTime(200),
      switchMap((term) =>
        this.libraryQuery
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
    if (!this.cards.some((crypt) => crypt.id === item.id)) {
      this.cards.push({
        id: item.id,
        count: 1,
      })
      this.applyChange()
    }
  }

  selectLibraryItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<ApiLibrary>,
    input: any,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    if (!this.cards.some((library) => library.id === item.id)) {
      this.cards.push({
        id: item.id,
        count: 1,
      })
      this.applyChange()
    }
  }

  getCrypt(id: number): Observable<ApiCrypt | undefined> {
    return this.cryptQuery.selectEntity(id)
  }

  getLibrary(id: number): Observable<ApiLibrary | undefined> {
    return this.libraryQuery.selectEntity(id)
  }

  decreaseCopies(id: number) {
    const card = this.cards.find((card) => card.id === id)
    if (card) {
      card.count--
      if (card.count <= 0) {
        this.cards = this.cards.filter((card) => card.id !== id)
      }
      this.applyChange()
    }
  }

  increaseCopies(id: number) {
    const card = this.cards.find((card) => card.id === id)
    if (card) {
      card.count++
      this.applyChange()
    }
  }

  applyChange() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        cards:
          this.cards?.length > 0
            ? this.cards.map((card) => card.id + '=' + card.count).join(',')
            : undefined,
      },
      queryParamsHandling: 'merge',
    })
  }

  private initStarVampire() {
    const formControl = new FormControl(
      this.decksQuery.getParam('starVampire') ?? false,
    )
    this.form = new FormGroup({
      starVampire: formControl,
    })
    formControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) =>
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              starVampire: value ?? undefined,
            },
            queryParamsHandling: 'merge',
          }),
        ),
      )
      .subscribe()
  }

  private initCards() {
    const cards = this.decksQuery.getParam('cards')
    if (cards) {
      this.cards = cards.split(',').map((card: string) => {
        const crypt = card.split('=')
        const id = Number(crypt[0])
        return {
          id,
          count: Number(crypt[1]),
        } as CardFilter
      })
      this.cards.forEach((card) => {
        this.cryptService.getCrypt(card.id).subscribe()
        this.libraryService.getLibrary(card.id).subscribe()
      })
    }
  }
}
