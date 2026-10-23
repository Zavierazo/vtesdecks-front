import { inject, Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { ApiDeckBuilder } from '@models'
import { ApiDataService } from '@services'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderStore } from '@state/deck-builder/deck-builder.store'
import {
  catchError,
  EMPTY,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
  timeout,
  timer,
} from 'rxjs'
import { ADVENT_DATA } from './advent.data'
import {
  ADVENT_2026,
  ADVENT_2026_ERRORS,
  matchesRelease,
} from './advent-2026.data'

export interface AdventValidationResult {
  cryptErrors?: string[]
  libraryErrors?: string[]
}

@Injectable({ providedIn: 'root' })
export class AdventBuilderService {
  private readonly store = inject(DeckBuilderStore)
  private readonly query = inject(DeckBuilderQuery)
  private readonly apiDataService = inject(ApiDataService)
  readonly changes = new Subject<void>()
  private readonly adventRefresh = new Subject<{
    key: string
    deck: ApiDeckBuilder
  } | null>()
  private adventKey?: string
  private adventErrors: string[] = []
  private readonly releaseCards = new Map<string, Set<number>>()

  constructor() {
    this.adventRefresh
      .pipe(
        switchMap((request) =>
          request
            ? timer(350).pipe(
                switchMap(() => this.checkRemoteAdvent(request.deck)),
                timeout(15000),
                catchError(() => of(['unavailable'])),
                map((errors) => ({ key: request.key, errors })),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ key, errors }) => {
        if (key === this.adventFingerprint()) {
          this.adventErrors = errors
          this.changes.next()
        }
      })
  }

  reset(): void {
    this.adventKey = undefined
    this.adventErrors = []
    this.adventRefresh.next(null)
  }

  validate(retry = false): AdventValidationResult {
    if (retry && this.adventErrors.includes('unavailable')) {
      this.adventKey = undefined
    }
    const state = this.store.getValue()
    const advent = state.extra?.advent
    const edition = ADVENT_DATA.find((item) => item.year === advent?.year)
    const day = advent ? edition?.days[advent.day] : undefined
    if (!edition || !day) {
      this.reset()
      return { libraryErrors: [ADVENT_2026_ERRORS['challenge']] }
    }
    if (
      state.validation !== edition.validation ||
      advent?.title !== day.title ||
      advent?.content !== day.content
    ) {
      this.initialize(edition.year, advent!.day)
    }
    const remoteErrors = this.validateAdvent()
    const local = day.validation?.(this.query) ?? {}
    return {
      cryptErrors: local.cryptErrors,
      libraryErrors: [
        ...(local.libraryErrors ?? []),
        ...(edition.validation?.(this.query) ?? []),
        ...remoteErrors,
      ],
    }
  }

  initialize(advent: number, day: number): void {
    const adventItem = ADVENT_DATA.find((item) => item.year === advent)
    const adventDayItem = adventItem?.days[day]
    if (adventItem && adventDayItem) {
      const { title, content } = adventDayItem
      const adventContent = content.replace(/<\/?strong>/g, '**')
      const adventDescription = `**Advent ${adventItem.year} - Day ${day}**\n\n**Name**: ${title}\n\n${adventContent}`
      this.store.update((state) => ({
        ...state,
        name: state.name ? state.name : `Advent${adventItem.year}: `,
        description: state.description ? state.description : adventDescription,
        extra: {
          ...state.extra,
          advent: {
            year: adventItem.year,
            day,
            title,
            content,
          },
        },
        validation: adventItem.validation,
        customValidation: undefined,
      }))
    }
  }

  private adventFingerprint(): string | undefined {
    const deck = this.store.getValue()
    const day =
      deck.extra?.advent?.year === 2026
        ? ADVENT_2026.days[deck.extra.advent.day]
        : undefined
    if (!day || (!day.archetypeId && !day.releaseDeckId)) {
      return undefined
    }
    return JSON.stringify([
      deck.extra!.advent!.day,
      deck.name,
      deck.published,
      deck.cards
        .map(({ id, number }) => [id, number])
        .sort((a, b) => a[0] - b[0]),
    ])
  }

  private validateAdvent(): string[] {
    const key = this.adventFingerprint()
    if (key !== this.adventKey) {
      this.adventKey = key
      this.adventErrors = key ? ['pending'] : []
      const state = this.store.getValue()
      this.adventRefresh.next(
        key
          ? {
              key,
              deck: {
                name: state.name,
                published: state.published,
                extra: { ...state.extra, advent: { ...state.extra!.advent! } },
                cards: state.cards.map((card) => ({ ...card })),
              },
            }
          : null,
      )
    }
    const advent = this.store.getValue().extra?.advent
    const day = advent?.day
    const errors = this.adventErrors.map((error) =>
      error === 'rule'
        ? 'Advent rule: ' + ADVENT_2026.days[day!].content
        : ADVENT_2026_ERRORS[error],
    )
    return errors
  }

  private checkRemoteAdvent(deck: ApiDeckBuilder): Observable<string[]> {
    const day = ADVENT_2026.days[deck.extra!.advent!.day]
    if (day.archetypeId) {
      return this.apiDataService
        .getDeckBuilderArchetype(deck)
        .pipe(map((match) => (match?.id === day.archetypeId ? [] : ['rule'])))
    }
    const releaseId = day.releaseDeckId!
    const cached = this.releaseCards.get(releaseId)
    const cardIds = cached
      ? of(cached)
      : this.apiDataService.getDeck(releaseId).pipe(
          map(
            (release) =>
              new Set(
                [...(release.crypt ?? []), ...(release.library ?? [])]
                  .filter((card) => card.number > 0)
                  .map((card) => card.id),
              ),
          ),
          tap((ids) => {
            if (ids.size === 0) {
              throw new Error('Release card list unavailable')
            }
            this.releaseCards.set(releaseId, ids)
          }),
        )
    return cardIds.pipe(
      map((ids) =>
        matchesRelease(deck.cards ?? [], ids, day.releasePercentage!)
          ? []
          : ['rule'],
      ),
    )
  }
}
