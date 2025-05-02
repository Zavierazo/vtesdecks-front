import { Injectable } from '@angular/core'
import { map, Observable } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { ApiDisciplineStat } from '../../models/api-discipline-stat'
import { ApiLibrary } from '../../models/api-library'
import { isCrypt, isLibrary, roundNumber } from '../../utils/vtes-utils'
import { CryptQuery } from '../crypt/crypt.query'
import { LibraryQuery } from '../library/library.query'
import { ApiClanStat } from './../../models/api-clan-stat'
import { ApiCrypt } from './../../models/api-crypt'
import { DeckBuilderState, DeckBuilderStore } from './deck-builder.store'

@Injectable({
  providedIn: 'root',
})
export class DeckBuilderQuery {
  constructor(
    private readonly store: DeckBuilderStore,
    private libraryQuery: LibraryQuery,
    private cryptQuery: CryptQuery,
  ) {}

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
    return this.store.select((state) => state.cards.filter(isCrypt))
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

  getCardNumber(id: number): number {
    return this.store.getValue().cards.find((c) => c.id === id)?.number ?? 0
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

  isValidDeck(): boolean {
    return (
      this.store.getValue().cryptErrors.length === 0 &&
      this.store.getValue().libraryErrors.length === 0
    )
  }
}
