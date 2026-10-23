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

function ruleResult(day: number, valid: boolean) {
  return valid
    ? {}
    : { libraryErrors: ['Advent rule: ' + ADVENT_2026.days[day].content] }
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
  theme: 'VTES Advent 2026',
  description:
    '24 days. 24 deck-building challenges. Build decks you would bring to the table, with room for your own strategy. All quantities count copies; considering cards do not count.',
  rules: [
    "Deck name must start with 'Advent2026:'",
    'Deck must be public to participate',
    'Deck must follow all standard VTES Deck Building rules',
  ],
  startDate: new Date('2026-12-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59.999Z'),
  validation: (query) => {
    const name = query.getName()?.trim() ?? ''
    const errors: string[] = []
    if (
      !name.startsWith('Advent2026:') ||
      !name.slice('Advent2026:'.length).trim()
    ) {
      errors.push(ADVENT_2026_ERRORS['name'])
    }
    if (!query.getPublished()) {
      errors.push(ADVENT_2026_ERRORS['published'])
    }
    return errors
  },
  days: {
    1: {
      title: 'A Clan for Christmas',
      image: `${environment.cdnDomain}/img/advent/2026/day-01.webp`,
      content:
        'At least 75% of your crypt copies must belong to one clan. Other clans may provide support.',
      validation: (query) => {
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
        )
      },
    },
    2: {
      title: 'New Blood: Salubri',
      image: `${environment.cdnDomain}/img/advent/2026/day-02.webp`,
      content:
        'At least 50% of all card copies in your deck must appear in New Blood: Salubri. Count crypt and library together; reprints count. Round up.',
      releaseDeckId: 'preconstructed-first_blood_salubri',
      releasePercentage: 50,
    },
    3: {
      title: 'Something Stirs in the Snow',
      image: `${environment.cdnDomain}/img/advent/2026/day-03.webp`,
      content:
        'Build a deck classified as Gangrel Thing. The builder must return this archetype as the deck’s best match.',
      archetypeId: 1,
    },
    4: {
      title: 'The Star of the Long Night',
      image: `${environment.cdnDomain}/img/advent/2026/day-04.webp`,
      content: 'Include at least 3 copies of one vampire in your crypt.',
      validation: (query) => {
        return ruleResult(
          4,
          vampires(query).some((card) => query.getCardNumber(card.id) >= 3),
        )
      },
    },
    5: {
      title: 'The Winter Council',
      image: `${environment.cdnDomain}/img/advent/2026/day-05.webp`,
      content: 'Include at least 8 Political Action cards.',
      validation: (query) => {
        return ruleResult(5, libraryTypeCopies(query, 'Political Action') >= 8)
      },
    },
    6: {
      title: 'New Blood: Ravnos',
      image: `${environment.cdnDomain}/img/advent/2026/day-06.webp`,
      content:
        'At least 50% of all card copies in your deck must appear in New Blood: Ravnos. Count crypt and library together; reprints count. Round up.',
      releaseDeckId: 'preconstructed-first_blood_ravnos',
      releasePercentage: 50,
    },
    7: {
      title: 'Royalty After Dark',
      image: `${environment.cdnDomain}/img/advent/2026/day-07.webp`,
      content:
        'Build a deck classified as Haqim Royalty. The builder must return this archetype as the deck’s best match.',
      archetypeId: 3,
    },
    8: {
      title: 'Unexpected Guests',
      image: `${environment.cdnDomain}/img/advent/2026/day-08.webp`,
      content: 'Include at least 6 Ally cards.',
      validation: (query) => {
        return ruleResult(8, libraryTypeCopies(query, 'Ally') >= 6)
      },
    },
    9: {
      title: 'An Anarch Christmas',
      image: `${environment.cdnDomain}/img/advent/2026/day-09.webp`,
      content:
        'At least 75% of your crypt copies must be vampires with the printed Anarch sect.',
      validation: (query) => {
        const total = query.getCryptSize()
        const anarchs = copies(
          query,
          vampires(query).filter((card) => card.sect === 'Anarch'),
        )
        return ruleResult(9, total > 0 && anarchs * 100 >= total * 75)
      },
    },
    10: {
      title: 'New Blood: Tzimisce',
      image: `${environment.cdnDomain}/img/advent/2026/day-10.webp`,
      content:
        'At least 50% of all card copies in your deck must appear in New Blood: Tzimisce. Count crypt and library together; reprints count. Round up.',
      releaseDeckId: 'preconstructed-first_blood_tzimisce',
      releasePercentage: 50,
    },
    11: {
      title: 'Break the Winter Bonds',
      image: `${environment.cdnDomain}/img/advent/2026/day-11.webp`,
      content:
        'Build a deck classified as Ravnos Break. The builder must return this archetype as the deck’s best match.',
      archetypeId: 12,
    },
    12: {
      title: 'The Elders Gather',
      image: `${environment.cdnDomain}/img/advent/2026/day-12.webp`,
      content:
        'At least half of your crypt copies must be vampires with capacity 8 or higher.',
      validation: (query) => {
        const total = query.getCryptSize()
        const elders = copies(
          query,
          vampires(query).filter((card) => card.capacity >= 8),
        )
        return ruleResult(12, total > 0 && elders * 2 >= total)
      },
    },
    13: {
      title: 'Gifts Worth Fighting For',
      image: `${environment.cdnDomain}/img/advent/2026/day-13.webp`,
      content: 'Include at least 4 Equipment cards.',
      validation: (query) => {
        return ruleResult(13, libraryTypeCopies(query, 'Equipment') >= 4)
      },
    },
    14: {
      title: 'Secrets of New York',
      image: `${environment.cdnDomain}/img/advent/2026/day-14.webp`,
      content:
        'At least 25% of all card copies in your deck must appear in Secrets of New York. Count crypt and library together; reprints count. Round up.',
      releaseDeckId: 'preconstructed-secrets_of_new_york',
      releasePercentage: 25,
    },
    15: {
      title: 'The Tyrant’s Christmas Speech',
      image: `${environment.cdnDomain}/img/advent/2026/day-15.webp`,
      content:
        'Build a deck classified as Aaradhya Vote. The builder must return this archetype as the deck’s best match.',
      archetypeId: 106,
    },
    16: {
      title: 'An Unlikely Alliance',
      image: `${environment.cdnDomain}/img/advent/2026/day-16.webp`,
      content:
        'Include vampires from at least two clans, with no required split.',
      validation: (query) => {
        return ruleResult(
          16,
          new Set(vampires(query).map((card) => card.clan)).size >= 2,
        )
      },
    },
    17: {
      title: 'Red Christmas',
      image: `${environment.cdnDomain}/img/advent/2026/day-17.webp`,
      content: 'Include at least 18 Combat cards.',
      validation: (query) => {
        return ruleResult(17, libraryTypeCopies(query, 'Combat') >= 18)
      },
    },
    18: {
      title: 'Noites Brasileiras',
      image: `${environment.cdnDomain}/img/advent/2026/day-18.webp`,
      content:
        'At least 25% of all card copies in your deck must appear in Noites Brasileiras. Count crypt and library together; reprints count. Round up.',
      releaseDeckId: 'preconstructed-noites_brasileiras',
      releasePercentage: 25,
    },
    19: {
      title: 'A Place at the Council',
      image: `${environment.cdnDomain}/img/advent/2026/day-19.webp`,
      content:
        'Build a deck classified as Toreador Loup. The builder must return this archetype as the deck’s best match.',
      archetypeId: 128,
    },
    20: {
      title: 'The Next Generation',
      image: `${environment.cdnDomain}/img/advent/2026/day-20.webp`,
      content:
        'At least half of your crypt copies must be vampires with capacity 5 or lower.',
      validation: (query) => {
        const total = query.getCryptSize()
        const young = copies(
          query,
          vampires(query).filter((card) => card.capacity <= 5),
        )
        return ruleResult(20, total > 0 && young * 2 >= total)
      },
    },
    21: {
      title: 'Faithful Companions',
      image: `${environment.cdnDomain}/img/advent/2026/day-21.webp`,
      content: 'Include at least 3 Retainer cards.',
      validation: (query) => {
        return ruleResult(21, libraryTypeCopies(query, 'Retainer') >= 3)
      },
    },
    22: {
      title: 'Guests from Beyond',
      image: `${environment.cdnDomain}/img/advent/2026/day-22.webp`,
      content:
        'Build a deck classified as Oblivion Allies Swarm. The builder must return this archetype as the deck’s best match.',
      archetypeId: 142,
    },
    23: {
      title: 'A Shared Gift',
      image: `${environment.cdnDomain}/img/advent/2026/day-23.webp`,
      content:
        'Choose a discipline possessed by at least 75% of your crypt copies, at either level. Include at least 10 library cards listing that same discipline. Other disciplines are welcome.',
      validation: (query) => {
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
        return ruleResult(23, valid)
      },
    },
    24: {
      title: 'Your Gift to the Community',
      image: `${environment.cdnDomain}/img/advent/2026/day-24.webp`,
      content:
        'Gift your best deck to the VTES community! Share a deck you are proud of and would bring to the table. Any legal deck, any clan, any strategy—no additional restrictions.',
      validation: () => ({}),
    },
  },
}
