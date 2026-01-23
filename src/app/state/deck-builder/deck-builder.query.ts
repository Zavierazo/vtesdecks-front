import { inject, Injectable } from '@angular/core'
import {
  ApiCard,
  ApiClanStat,
  ApiCollectionCard,
  ApiCrypt,
  ApiDeckLimitedFormat,
  ApiDisciplineStat,
  ApiLibrary,
  CryptFilter,
  DeckCryptSortBy,
  DeckLibrarySortBy,
  LibraryFilter,
} from '@models'
import { isCrypt, isLibrary, roundNumber } from '@utils'
import { combineLatest, map, Observable } from 'rxjs'
import { CryptQuery } from '../crypt/crypt.query'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderState, DeckBuilderStore } from './deck-builder.store'

@Injectable({
  providedIn: 'root',
})
export class DeckBuilderQuery {
  private readonly store = inject(DeckBuilderStore)
  private libraryQuery = inject(LibraryQuery)
  private cryptQuery = inject(CryptQuery)

  selectDeckId(): Observable<string | undefined> {
    return this.store.select((state) => state.id)
  }

  selectSaved(): Observable<boolean> {
    return this.store.select((state) => state.saved)
  }

  selectCryptErrors(): Observable<string[]> {
    return this.store.select((state) => state.cryptErrors)
  }

  selectLibraryErrors(): Observable<string[]> {
    return this.store.select((state) => state.libraryErrors)
  }

  selectCrypt(): Observable<ApiCard[]> {
    return combineLatest([
      this.selectCryptCards(),
      this.selectCollectionCards(),
    ]).pipe(
      map(([cryptCards, collectionCards]) => {
        return cryptCards
          .map(
            (card: ApiCard) =>
              ({
                ...card,
                collection: this.getCollectionType(
                  card.id,
                  card.number,
                  collectionCards,
                ),
              }) as ApiCard,
          )
          .sort((a: ApiCard, b: ApiCard) => {
            // Cards with number === 0 always go last
            if (a.number === 0 && b.number !== 0) return 1
            if (a.number !== 0 && b.number === 0) return -1

            const sortByCrypt = this.store.getValue().cryptSortBy
            if (sortByCrypt === 'quantity') {
              return this.sort(b.number, a.number)
            } else {
              const cardA = this.cryptQuery.getEntity(a.id)
              const cardB = this.cryptQuery.getEntity(b.id)
              return this.sort(
                cardA![sortByCrypt],
                cardB![sortByCrypt],
                sortByCrypt === 'capacity' ? 'desc' : 'asc',
              )
            }
          })
      }),
    )
  }

  private selectCryptCards() {
    return this.store.select((state) => state.cards.filter(isCrypt))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sort(a: any, b: any, sortByOrder: 'asc' | 'desc' = 'asc'): number {
    if (a === b) {
      return 0
    }
    if (sortByOrder === 'asc') {
      if (a === undefined) return -1
      if (b === undefined) return 1
      return a > b ? 1 : -1
    } else {
      if (a === undefined) return 1
      if (b === undefined) return -1
      return a < b ? 1 : -1
    }
  }

  selectCryptSize(): Observable<number> {
    return this.selectCrypt().pipe(
      map((cards) => cards.reduce((acc, c) => acc + c.number, 0)),
    )
  }

  selectMinCrypt(): Observable<number> {
    return this.selectCryptCapacity().pipe(
      map((cards) =>
        cards
          .sort((a, b) => a - b)
          .slice(0, 4)
          .reduce((acc, card) => acc + card, 0),
      ),
    )
  }

  selectMaxCrypt(): Observable<number> {
    return this.selectCryptCapacity().pipe(
      map((cards) => cards.sort((a, b) => b - a)),
      map((cards) => cards.slice(0, 4).reduce((acc, card) => acc + card, 0)),
    )
  }

  selectAvgCrypt(): Observable<number> {
    return this.selectCryptCapacity().pipe(
      map((cards) =>
        roundNumber(
          cards.reduce((acc, card) => acc + card, 0) / cards.length,
          2,
        ),
      ),
    )
  }

  selectCryptCapacity(): Observable<number[]> {
    return this.selectCrypt().pipe(
      map((cards) =>
        cards.map((c) => {
          return this.cryptQuery.getEntity(c.id)?.capacity ?? 0
        }),
      ),
    )
  }

  selectCryptDisciplines(): Observable<ApiDisciplineStat[]> {
    return this.selectCrypt().pipe(
      map((cards) => this.cryptQuery.getDisciplines(cards)),
    )
  }

  selectLibrary(): Observable<ApiCard[]> {
    return combineLatest([
      this.selectLibraryCards(),
      this.selectCollectionCards(),
    ]).pipe(
      map(([libraryCards, collectionCards]) => {
        return libraryCards.map(
          (card: ApiCard) =>
            ({
              ...card,
              collection: this.getCollectionType(
                card.id,
                card.number,
                collectionCards,
              ),
            }) as ApiCard,
        )
      }),
    )
  }

  private selectLibraryCards() {
    return this.store.select((state) => state.cards.filter(isLibrary))
  }

  selectLibrarySize(): Observable<number> {
    return this.selectLibrary().pipe(
      map((cards) => cards.reduce((acc, c) => acc + c.number, 0)),
    )
  }

  selectLibraryPoolCost(): Observable<number | undefined> {
    return this.selectLibrary().pipe(
      map((cards) =>
        cards.reduce((acc, card) => {
          const cost = this.libraryQuery.getEntity(card.id)?.poolCost ?? 0
          return acc + Math.max(0, cost) * card.number
        }, 0),
      ),
    )
  }

  selectLibraryBloodCost(): Observable<number | undefined> {
    return this.selectLibrary().pipe(
      map((cards) =>
        cards.reduce((acc, card) => {
          const cost = this.libraryQuery.getEntity(card.id)?.bloodCost ?? 0
          return acc + Math.max(0, cost) * card.number
        }, 0),
      ),
    )
  }

  selectLibraryDisciplines(): Observable<ApiDisciplineStat[]> {
    return this.selectLibrary().pipe(
      map((cards) => this.libraryQuery.getDisciplines(cards)),
    )
  }

  selectLibraryClans(): Observable<ApiClanStat[]> {
    return this.selectLibrary().pipe(
      map((cards) => this.libraryQuery.getClans(cards)),
    )
  }

  getValue(): DeckBuilderState {
    return this.store.getValue()
  }

  getDeckId(): string | undefined {
    return this.store.getValue().id
  }

  getSaved(): boolean {
    return this.store.getValue().saved
  }

  getName(): string | undefined {
    return this.store.getValue().name
  }

  getDescription(): string | undefined {
    return this.store.getValue().description
  }

  getPublished(): boolean {
    return this.store.getValue().published
  }

  getCollection(): boolean {
    return this.store.getValue().collection
  }

  getCardNumber(id: number): number {
    return this.store.getValue().cards.find((c) => c.id === id)?.number ?? 0
  }

  getCardCollection(
    id: number,
    number: number,
  ): 'NONE' | 'PARTIAL' | 'FULL' | undefined {
    const collectionCards = this.store.getValue().collectionCards
    return this.getCollectionType(id, number, collectionCards)
  }

  getCryptSize(): number {
    return this.store
      .getValue()
      .cards.filter(isCrypt)
      .reduce((acc, c) => acc + c.number, 0)
  }

  getCrypt(): ApiCrypt[] {
    return this.store
      .getValue()
      .cards.filter(isCrypt)
      .map((card) => this.cryptQuery.getEntity(card.id) as ApiCrypt)
  }

  getLibrarySize(): number {
    return this.store
      .getValue()
      .cards.filter(isLibrary)
      .reduce((acc, c) => acc + c.number, 0)
  }

  getLibrary(): ApiLibrary[] {
    return this.store
      .getValue()
      .cards.filter(isLibrary)
      .map((card) => this.libraryQuery.getEntity(card.id) as ApiLibrary)
  }

  getLibraryDisciplines(): ApiDisciplineStat[] {
    return this.libraryQuery.getDisciplines(
      this.store.getValue().cards.filter(isLibrary),
    )
  }

  getMinGroupCrypt(): number {
    return this.store
      .getValue()
      .cards.filter(isCrypt)
      .map((card) => this.cryptQuery.getEntity(card.id) as ApiCrypt)
      .map((card) => card.group)
      .filter((group) => group > 0)
      .reduce(
        (acc, group) => (acc > group ? group : acc),
        this.cryptQuery.getMaxGroup(),
      )
  }

  getMaxGroupCrypt(): number {
    return this.store
      .getValue()
      .cards.filter(isCrypt)
      .map((card) => this.cryptQuery.getEntity(card.id) as ApiCrypt)
      .map((card) => card.group)
      .reduce((acc, group) => (acc < group ? group : acc), 0)
  }

  getCryptClans(): ApiClanStat[] {
    return this.cryptQuery.getClans(this.store.getValue().cards.filter(isCrypt))
  }

  getCryptSects(): string[] {
    return this.cryptQuery.getSects(this.store.getValue().cards.filter(isCrypt))
  }

  getCryptDisciplines(): ApiDisciplineStat[] {
    return this.cryptQuery.getDisciplines(
      this.store.getValue().cards.filter(isCrypt),
    )
  }

  getLimitedFormat(): ApiDeckLimitedFormat | undefined {
    return this.store.getValue().extra?.limitedFormat
  }

  selectLimitedFormat(): Observable<ApiDeckLimitedFormat | undefined> {
    return this.store.select((state) => state.extra?.limitedFormat)
  }

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  isValidDeck(): boolean {
    return (
      this.store.getValue().cryptErrors.length === 0 &&
      this.store.getValue().libraryErrors.length === 0
    )
  }

  isPreconstructedDeck(): boolean {
    return this.store.getValue().id?.startsWith('preconstructed') ?? false
  }

  selectCollection(): Observable<boolean> {
    return this.store.select((state) => state.collection)
  }

  selectCollectionCards(): Observable<ApiCollectionCard[]> {
    return this.store.select((state) => state.collectionCards)
  }

  hasCollectionCards(): boolean {
    return (this.store.getValue().collectionCards?.length ?? 0) > 0
  }

  private getCollectionType(
    id: number,
    number: number,
    collectionCards?: ApiCollectionCard[],
  ): 'NONE' | 'PARTIAL' | 'FULL' | undefined {
    if (!collectionCards) return undefined
    const card = collectionCards?.find((c) => c.cardId === id)
    if (!card) return 'NONE'
    if (card.number < number) return 'PARTIAL'
    return 'FULL'
  }

  getValidation(): ((query: DeckBuilderQuery) => string[]) | undefined {
    return this.store.getValue().validation
  }

  selectCryptSortBy(): Observable<DeckCryptSortBy> {
    return this.store.select((state) => state.cryptSortBy)
  }

  selectLibrarySortBy(): Observable<DeckLibrarySortBy> {
    return this.store.select((state) => state.librarySortBy)
  }

  getCryptFilter(): CryptFilter {
    return this.store.getValue().cryptFilter
  }

  selectCryptFilter(): Observable<CryptFilter> {
    return this.store.select((state) => state.cryptFilter)
  }

  getLibraryFilter(): LibraryFilter {
    return this.store.getValue().libraryFilter
  }

  selectLibraryFilter(): Observable<LibraryFilter> {
    return this.store.select((state) => state.libraryFilter)
  }
}
