import { DestroyRef, inject, Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslocoService } from '@jsverse/transloco'
import type { ApiDeckBuilder } from '@models'
import { ApiDataService } from '@services'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderStore } from '@state/deck-builder/deck-builder.store'
import {
  catchError,
  EMPTY,
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  Subscription,
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
import type { AdventTranslate } from './advent-translation'

export interface AdventValidationResult {
  pending?: boolean
  deckErrors?: string[]
  cryptErrors?: string[]
  libraryErrors?: string[]
}

@Injectable({ providedIn: 'root' })
export class AdventBuilderService {
  private readonly store = inject(DeckBuilderStore)
  private readonly query = inject(DeckBuilderQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly transloco = inject(TranslocoService)
  private readonly destroyRef = inject(DestroyRef)
  private translationLanguage?: string
  private translationPending?: string
  private translationFailed?: string
  private translationRequest?: Subscription
  private readonly translate: AdventTranslate = (key, _fallback, params) =>
    this.transloco.translate('advent.' + key, params)
  readonly changes = new Subject<void>()
  private readonly adventRefresh = new Subject<{
    key: string
    deck: ApiDeckBuilder
  } | null>()
  private adventKey?: string
  private adventDay?: number
  private adventPending = false
  private adventErrors: string[] = []
  private readonly releaseCards = new Map<string, Set<number>>()

  constructor() {
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.store.getValue().extra?.advent) {
        this.changes.next()
      }
    })
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
          this.adventPending = false
          this.adventErrors = errors
          this.changes.next()
        }
      })
  }

  reset(): void {
    this.adventKey = undefined
    this.adventDay = undefined
    this.adventPending = false
    this.adventErrors = []
    this.adventRefresh.next(null)
  }

  validate(retry = false): AdventValidationResult {
    if (!this.ensureTranslations(retry)) {
      return {
        pending: !this.translationFailed,
        deckErrors: this.translationFailed
          ? [this.transloco.translate('shared.error_loading_data')]
          : [],
      }
    }
    if (
      retry &&
      !this.adventPending &&
      this.adventErrors.includes('unavailable')
    ) {
      this.adventKey = undefined
    }
    const state = this.store.getValue()
    const advent = state.extra?.advent
    const edition = ADVENT_DATA.find((item) => item.year === advent?.year)
    const day = advent ? edition?.days[advent.day] : undefined
    if (!edition || !day) {
      this.reset()
      return {
        deckErrors: [
          this.translate(
            'validation.challenge',
            ADVENT_2026_ERRORS['challenge'],
          ),
        ],
      }
    }
    const { title, content } = this.challengeText(edition.year, advent!.day)
    if (
      state.validation !== edition.validation ||
      advent?.title !== title ||
      advent?.content !== content
    ) {
      this.applyChallenge(edition.year, advent!.day)
    }
    const remoteErrors = this.validateAdvent()
    const local = day.validation?.(this.query, this.translate) ?? {}
    return {
      pending: this.adventPending,
      cryptErrors: local.cryptErrors,
      libraryErrors: local.libraryErrors,
      deckErrors: [
        ...(edition.validation?.(this.query, this.translate) ?? []),
        ...remoteErrors,
      ],
    }
  }

  private ensureTranslations(retry: boolean): boolean {
    const language = this.transloco.getActiveLang()
    if (this.translationLanguage === language) {
      return true
    }
    if (
      this.translationPending === language ||
      (this.translationFailed === language && !retry)
    ) {
      return false
    }
    this.translationRequest?.unsubscribe()
    this.translationPending = language
    this.translationFailed = undefined
    const languages = language === 'en' ? ['en'] : [language, 'en']
    this.translationRequest = forkJoin(
      languages.map((locale) => this.transloco.load(`advent/${locale}`)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.translationLanguage = language
          this.translationPending = undefined
          this.changes.next()
        },
        error: () => {
          this.translationPending = undefined
          this.translationFailed = language
          this.changes.next()
        },
      })
    return this.translationLanguage === language
  }

  async initialize(advent: number, day: number): Promise<void> {
    const expected = this.store.getValue().extra?.advent
    await firstValueFrom(this.transloco.load('advent/en'))
    if (this.store.getValue().extra?.advent === expected) {
      this.applyChallenge(advent, day)
    }
  }

  private challengeText(year: number, day: number) {
    const key = `advent.editions.${year}.days.${day}`
    return {
      title: this.transloco.translate<string>(key + '.title', {}, 'en'),
      content: this.transloco.translate<string>(key + '.content', {}, 'en'),
    }
  }

  private applyChallenge(advent: number, day: number): void {
    const adventItem = ADVENT_DATA.find((item) => item.year === advent)
    const adventDayItem = adventItem?.days[day]
    if (adventItem && adventDayItem) {
      const { title, content } = this.challengeText(advent, day)
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
    const state = this.store.getValue()
    const day = state.extra?.advent?.day
    if (key !== this.adventKey) {
      this.adventKey = key
      this.adventPending = !!key
      if (!key || this.adventDay !== day) {
        this.adventErrors = []
      }
      this.adventDay = day
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
    const errors = this.adventErrors.map((error) => {
      if (error !== 'rule' && error !== 'unavailable') {
        return this.translate('validation.' + error, ADVENT_2026_ERRORS[error])
      }
      const challenge = ADVENT_2026.days[day!]
      const reference = this.translate('validation.reference', '', {
        url: challenge.archetypeId
          ? `/metagame/${challenge.archetypeId}`
          : `/deck/${challenge.releaseDeckId}`,
        label: this.translate(`editions.2026.days.${day}.reference`, ''),
      })
      if (error === 'unavailable') {
        return `${this.translate('validation.unavailable', ADVENT_2026_ERRORS[error])} ${reference}`
      }
      return this.translate(
        challenge.archetypeId ? 'validation.archetype' : 'validation.release',
        '',
        { reference, percentage: challenge.releasePercentage },
      )
    })
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
