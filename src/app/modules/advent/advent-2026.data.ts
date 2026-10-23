import { adventEnglish } from './advent-translation'
import { environment } from '@environments/environment'
import type { AdventData } from './advent.data'
import type { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'

export const ADVENT_2026_ERRORS: Record<string, string> = {
  pending: 'Checking the Advent challenge…',
  unavailable:
    'The challenge could not be checked. Check your connection and try Save again.',
  save: 'Resolve the Advent validation messages before saving.',
  name: 'Start with Advent2026: and add your deck name.',
  published: 'Publish your deck to participate in Advent 2026.',
  challenge: 'Choose a valid Advent 2026 challenge.',
}

function copies(query: DeckBuilderQuery, cards: { id: number }[]): number {
  return cards
    .filter((card) => card && query.getCardNumber(card.id) > 0)
    .reduce((sum, card) => sum + query.getCardNumber(card.id), 0)
}

function vampires(query: DeckBuilderQuery) {
  return query
    .getCrypt()
    .filter(
      (card) => card?.type === 'Vampire' && query.getCardNumber(card.id) > 0,
    )
}

function libraryTypeCopies(query: DeckBuilderQuery, type: string): number {
  return copies(
    query,
    query.getLibrary().filter((card) => card?.types.includes(type)),
  )
}

function ruleResult(day: number, valid: boolean, translate = adventEnglish) {
  return valid
    ? {}
    : {
        libraryErrors: [
          translate(
            'validation.rule',
            'Advent challenge requirements are not met.',
            {
              rule: translate(`editions.2026.days.${day}.content`, ''),
            },
          ),
        ],
      }
}

export function matchesRelease(
  cards: { id: number; number: number }[],
  releaseIds: Set<number>,
  percentage: number,
): boolean {
  const active = cards.filter((card) => card.number > 0)
  const total = active.reduce((sum, card) => sum + card.number, 0)
  const matching = active
    .filter((card) => releaseIds.has(card.id))
    .reduce((sum, card) => sum + card.number, 0)
  return total > 0 && matching * 100 >= total * percentage
}

export const ADVENT_2026: AdventData = {
  year: 2026,
  startDate: new Date('2026-12-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59.999Z'),
  validation: (query, translate = adventEnglish) => {
    const name = query.getName()?.trim() ?? ''
    const errors: string[] = []
    if (
      !name.startsWith('Advent2026:') ||
      !name.slice('Advent2026:'.length).trim()
    ) {
      errors.push(translate('validation.name', ADVENT_2026_ERRORS['name']))
    }
    if (!query.getPublished()) {
      errors.push(
        translate('validation.published', ADVENT_2026_ERRORS['published']),
      )
    }
    return errors
  },
  days: {
    1: {
      image: `${environment.cdnDomain}/img/advent/2026/day-01.webp`,
      validation: (query, translate = adventEnglish) => {
        const crypt = vampires(query)
        const clans = new Map<string, number>()
        crypt.forEach((card) =>
          clans.set(
            card.clan,
            (clans.get(card.clan) ?? 0) + query.getCardNumber(card.id),
          ),
        )
        const total = query.getCryptSize()
        return ruleResult(
          1,
          total > 0 &&
            [...clans.values()].some((count) => count * 100 >= total * 75),
          translate,
        )
      },
    },
    2: {
      image: `${environment.cdnDomain}/img/advent/2026/day-02.webp`,
      releaseDeckId: 'preconstructed-first_blood_salubri',
      releasePercentage: 50,
    },
    3: {
      image: `${environment.cdnDomain}/img/advent/2026/day-03.webp`,
      archetypeId: 1,
    },
    4: {
      image: `${environment.cdnDomain}/img/advent/2026/day-04.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          4,
          vampires(query).some((card) => query.getCardNumber(card.id) >= 3),
          translate,
        )
      },
    },
    5: {
      image: `${environment.cdnDomain}/img/advent/2026/day-05.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          5,
          libraryTypeCopies(query, 'Political Action') >= 8,
          translate,
        )
      },
    },
    6: {
      image: `${environment.cdnDomain}/img/advent/2026/day-06.webp`,
      releaseDeckId: 'preconstructed-first_blood_ravnos',
      releasePercentage: 50,
    },
    7: {
      image: `${environment.cdnDomain}/img/advent/2026/day-07.webp`,
      archetypeId: 3,
    },
    8: {
      image: `${environment.cdnDomain}/img/advent/2026/day-08.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(8, libraryTypeCopies(query, 'Ally') >= 6, translate)
      },
    },
    9: {
      image: `${environment.cdnDomain}/img/advent/2026/day-09.webp`,
      validation: (query, translate = adventEnglish) => {
        const total = query.getCryptSize()
        const anarchs = copies(
          query,
          vampires(query).filter((card) => card.sect === 'Anarch'),
        )
        return ruleResult(
          9,
          total > 0 && anarchs * 100 >= total * 75,
          translate,
        )
      },
    },
    10: {
      image: `${environment.cdnDomain}/img/advent/2026/day-10.webp`,
      releaseDeckId: 'preconstructed-first_blood_tzimisce',
      releasePercentage: 50,
    },
    11: {
      image: `${environment.cdnDomain}/img/advent/2026/day-11.webp`,
      archetypeId: 12,
    },
    12: {
      image: `${environment.cdnDomain}/img/advent/2026/day-12.webp`,
      validation: (query, translate = adventEnglish) => {
        const total = query.getCryptSize()
        const elders = copies(
          query,
          vampires(query).filter((card) => card.capacity >= 8),
        )
        return ruleResult(12, total > 0 && elders * 2 >= total, translate)
      },
    },
    13: {
      image: `${environment.cdnDomain}/img/advent/2026/day-13.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          13,
          libraryTypeCopies(query, 'Equipment') >= 4,
          translate,
        )
      },
    },
    14: {
      image: `${environment.cdnDomain}/img/advent/2026/day-14.webp`,
      releaseDeckId: 'preconstructed-secrets_of_new_york',
      releasePercentage: 25,
    },
    15: {
      image: `${environment.cdnDomain}/img/advent/2026/day-15.webp`,
      archetypeId: 106,
    },
    16: {
      image: `${environment.cdnDomain}/img/advent/2026/day-16.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          16,
          new Set(vampires(query).map((card) => card.clan)).size >= 2,
          translate,
        )
      },
    },
    17: {
      image: `${environment.cdnDomain}/img/advent/2026/day-17.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          17,
          libraryTypeCopies(query, 'Combat') >= 18,
          translate,
        )
      },
    },
    18: {
      image: `${environment.cdnDomain}/img/advent/2026/day-18.webp`,
      releaseDeckId: 'preconstructed-noites_brasileiras',
      releasePercentage: 25,
    },
    19: {
      image: `${environment.cdnDomain}/img/advent/2026/day-19.webp`,
      archetypeId: 128,
    },
    20: {
      image: `${environment.cdnDomain}/img/advent/2026/day-20.webp`,
      validation: (query, translate = adventEnglish) => {
        const total = query.getCryptSize()
        const young = copies(
          query,
          vampires(query).filter((card) => card.capacity <= 5),
        )
        return ruleResult(20, total > 0 && young * 2 >= total, translate)
      },
    },
    21: {
      image: `${environment.cdnDomain}/img/advent/2026/day-21.webp`,
      validation: (query, translate = adventEnglish) => {
        return ruleResult(
          21,
          libraryTypeCopies(query, 'Retainer') >= 3,
          translate,
        )
      },
    },
    22: {
      image: `${environment.cdnDomain}/img/advent/2026/day-22.webp`,
      archetypeId: 142,
    },
    23: {
      image: `${environment.cdnDomain}/img/advent/2026/day-23.webp`,
      validation: (query, translate = adventEnglish) => {
        const disciplines = new Map<string, number>()
        vampires(query).forEach((card) => {
          const unique = new Set(
            [
              ...(card.disciplines ?? []),
              ...(card.superiorDisciplines ?? []),
            ].map((discipline) => discipline.toLowerCase()),
          )
          unique.forEach((discipline) =>
            disciplines.set(
              discipline,
              (disciplines.get(discipline) ?? 0) + query.getCardNumber(card.id),
            ),
          )
        })
        const total = query.getCryptSize()
        const valid =
          total > 0 &&
          [...disciplines.entries()].some(
            ([discipline, count]) =>
              count * 100 >= total * 75 &&
              copies(
                query,
                query
                  .getLibrary()
                  .filter((card) =>
                    card?.disciplines?.some(
                      (value) => value.toLowerCase() === discipline,
                    ),
                  ),
              ) >= 10,
          )
        return ruleResult(23, valid, translate)
      },
    },
    24: {
      image: `${environment.cdnDomain}/img/advent/2026/day-24.webp`,
      validation: () => ({}),
    },
  },
}
