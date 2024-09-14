import { ApiClanStat } from './../../models/api-clan-stat'
import { LibraryService } from './../library/library.service'
import { CryptService } from './../crypt/crypt.service'
import { ApiCrypt } from './../../models/api-crypt'
import { Injectable } from '@angular/core'
import { Query } from '@datorama/akita'
import { map, Observable } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { isCrypt, isLibrary, roundNumber } from '../../utils/vtes-utils'
import { CryptQuery } from '../crypt/crypt.query'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderState, DeckBuilderStore } from './deck-builder.store'
import { ApiLibrary } from '../../models/api-library'
import { ApiDisciplineStat } from '../../models/api-discipline-stat'

@Injectable({
  providedIn: 'root',
})
export class DeckBuilderQuery extends Query<DeckBuilderState> {
  constructor(
    protected override store: DeckBuilderStore,
    private libraryQuery: LibraryQuery,
    private cryptQuery: CryptQuery,
  ) {
    super(store)
  }

  selectDeckId(): Observable<string | undefined> {
    return this.select((state) => state.id)
  }

  selectSaved(): Observable<boolean> {
    return this.select((state) => state.saved)
  }

  selectCryptErrors(): Observable<string[]> {
    return this.select((state) => state.cryptErrors)
  }

  selectLibraryErrors(): Observable<string[]> {
    return this.select((state) => state.libraryErrors)
  }

  selectCrypt(): Observable<ApiCard[]> {
    return this.select((state) => state.cards.filter(isCrypt))
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
    return this.select((state) => state.cards.filter(isLibrary))
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

  getDeckId(): string | undefined {
    return this.getValue().id
  }

  getSaved(): boolean {
    return this.getValue().saved
  }

  getName(): string | undefined {
    return this.getValue().name
  }

  getDescription(): string | undefined {
    return this.getValue().description
  }

  getPublished(): boolean {
    return this.getValue().published
  }

  getCardNumber(id: number): number {
    return this.getValue().cards.find((c) => c.id === id)?.number ?? 0
  }

  getCryptSize(): number {
    return this.getValue()
      .cards.filter(isCrypt)
      .reduce((acc, c) => acc + c.number, 0)
  }

  getCrypt(): ApiCrypt[] {
    return this.getValue()
      .cards.filter(isCrypt)
      .map((card) => this.cryptQuery.getEntity(card.id) as ApiCrypt)
  }

  getLibrarySize(): number {
    return this.getValue()
      .cards.filter(isLibrary)
      .reduce((acc, c) => acc + c.number, 0)
  }

  getLibrary(): ApiLibrary[] {
    return this.getValue()
      .cards.filter(isLibrary)
      .map((card) => this.libraryQuery.getEntity(card.id) as ApiLibrary)
  }

  getMinGroupCrypt(): number {
    return this.getValue()
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
    return this.getValue()
      .cards.filter(isCrypt)
      .map((card) => this.cryptQuery.getEntity(card.id) as ApiCrypt)
      .map((card) => card.group)
      .reduce((acc, group) => (acc < group ? group : acc), 0)
  }

  isValidDeck(): boolean {
    return (
      this.getValue().cryptErrors.length === 0 &&
      this.getValue().libraryErrors.length === 0
    )
  }
}
