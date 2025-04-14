import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { ApiLibrary } from './../../../../models/api-library'
import { LibraryQuery } from './../../../../state/library/library.query'
import { LibraryService } from './../../../../state/library/library.service'
import { ApiCrypt } from '../../../../models/api-crypt'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { CryptQuery } from '../../../../state/crypt/crypt.query'
import { CryptService } from '../../../../state/crypt/crypt.service'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core'
import {
  combineLatest,
  debounceTime,
  mergeMap,
  Observable,
  of,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { NgbTypeaheadSelectItemEvent, NgbHighlight, NgbTypeahead, NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { CardFilter } from '../../../../models/card-filter'
import { ActivatedRoute, Router } from '@angular/router'
import { DecksQuery } from '../../../../state/decks/decks.query'
import { MediaService } from '../../../../services/media.service'
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';

@UntilDestroy()
@Component({
    selector: 'app-card-filter',
    templateUrl: './card-filter.component.html',
    styleUrls: ['./card-filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, NgIf, NgbHighlight, NgFor, NgbTypeahead, NgClass, NgbPopover, ReactiveFormsModule, AsyncPipe]
})
export class CardFilterComponent implements OnInit {
  cards: CardFilter[] = []

  isMobile$!: Observable<boolean>

  form!: FormGroup

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private decksQuery: DecksQuery,
    private cryptService: CryptService,
    private cryptQuery: CryptQuery,
    private libraryService: LibraryService,
    private libraryQuery: LibraryQuery,
    private changeDetectorRef: ChangeDetectorRef,
    private mediaService: MediaService,
  ) {}

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
      mergeMap((term) =>
        combineLatest([of(term), this.cryptService.getCryptCards()]),
      ),
      switchMap(([term]) => this.cryptQuery.selectByName(term, 10)),
    )

  searchLibrary: OperatorFunction<string, ApiLibrary[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      debounceTime(200),
      mergeMap((term) => {
        return combineLatest([of(term), this.libraryService.getLibraryCards()])
      }),
      switchMap(([term]) => this.libraryQuery.selectByName(term, 10)),
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
              starVampire: value ? value : undefined,
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
