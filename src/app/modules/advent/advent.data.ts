import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'

export interface AdventDayData {
  title: string
  content: string
  validation?: (query: DeckBuilderQuery) => {
    cryptErrors?: string[]
    libraryErrors?: string[]
  }
}

export interface AdventData {
  year: number
  theme: string
  description: string
  rules: string[]
  startDate: Date
  endDate: Date
  validation?: (query: DeckBuilderQuery) => string[]
  days: Record<number, AdventDayData>
}

export const ADVENT_DATA: AdventData[] = [
  {
    year: 2025,
    theme: 'VTES Advent 2025',
    description:
      '<strong>24 days. 24 deck-building challenges. Endless creativity.</strong><br> From clan-restricted builds to meme decks, combat nightmares and discipline-themed experiments, every day brings a fresh way to explore the VTES through deck design.',
    rules: [
      "Deck name must start with 'Advent2025:'",
      'Deck must be public to participate',
      'Deck must follow all standard VTES Deck Building rules',
    ],
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    validation: (query: DeckBuilderQuery) => {
      const name = query.getName()
      if (!name) {
        return ['Deck name is required']
      }
      if (!name.trim().startsWith('Advent2025:')) {
        return ['Deck name must start with "Advent2025:"']
      }
      if (name.trim().length < 15) {
        return ['Add deck name after "Advent2025:"']
      }
      const published = query.getPublished()
      if (!published) {
        return ['Deck must be public to participate in the Advent 2025 event']
      }
      return []
    },
    days: {
      1: {
        title: 'Clan of the First Snow',
        content:
          '<strong>Rule</strong>: Build a deck using only one clan in the crypt.',
        validation: (query: DeckBuilderQuery) => {
          const clans = query.getCryptClans()
          if (clans.length > 1) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain vampires from only one clan.',
              ],
            }
          }
          return {}
        },
      },
      2: {
        title: 'The 60-Card Blizzard',
        content: '<strong>Rule</strong>: Your library cannot exceed 60 cards.',
        validation: (query: DeckBuilderQuery) => {
          const librarySize = query.getLibrarySize()
          if (librarySize > 60) {
            return {
              libraryErrors: ['Advent Rule: Library cannot exceed 60 cards.'],
            }
          }
          return {}
        },
      },
      3: {
        title: 'The Pacifist',
        content: '<strong>Rule</strong>: No combat cards allowed.',
        validation: (query: DeckBuilderQuery) => {
          const combatCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Combat'))
          if (combatCards.length > 0) {
            return {
              libraryErrors: ['Advent Rule: No combat cards allowed.'],
            }
          }
          return {}
        },
      },
      4: {
        title: 'The Little Helpers',
        content:
          '<strong>Rule</strong>: All vampires must be capacity 5 or less.',
        validation: (query: DeckBuilderQuery) => {
          const highCapacityVamps = query
            .getCrypt()
            .filter((vampire) => vampire.capacity > 5)
          if (highCapacityVamps.length > 0) {
            return {
              cryptErrors: [
                'Advent Rule: All vampires must be capacity 5 or less.',
              ],
            }
          }
          return {}
        },
      },
      5: {
        title: 'The One-Star Christmas Tree',
        content:
          '<strong>Rule</strong>: Build a deck around one single star vampire (your choice).',
        validation: (query: DeckBuilderQuery) => {
          const starVamps = query
            .getCrypt()
            .filter((crypt) => query.getCardNumber(crypt.id) >= 4)
          if (starVamps.length === 0) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain one star-vampire.',
              ],
            }
          }
          return {}
        },
      },
      6: {
        title: 'Snowbound Solitaries',
        content:
          '<strong>Rule</strong>: All vampires in the crypt must have only one copy.',
        validation: (query: DeckBuilderQuery) => {
          const multipleCopyVamps = query
            .getCrypt()
            .filter((vampire) => query.getCardNumber(vampire.id) > 1)
          if (multipleCopyVamps.length > 0) {
            return {
              cryptErrors: [
                'Advent Rule: All vampires must have only one copy.',
              ],
            }
          }
          return {}
        },
      },
      7: {
        title: 'Mono-Discipline Madness',
        content: '<strong>Rule</strong>: Only one discipline allowed.',
        validation: (query: DeckBuilderQuery) => {
          const library = query.getLibrary()
          const disciplineCount: Record<string, number> = {}

          library.forEach((card) => {
            card.disciplines.forEach((discipline) => {
              disciplineCount[discipline] =
                (disciplineCount[discipline] || 0) + 1
            })
          })

          const disciplinesUsed = Object.keys(disciplineCount)
          if (disciplinesUsed.length > 1) {
            return {
              libraryErrors: [
                'Advent Rule: Only one discipline allowed in the library.',
              ],
            }
          }
          return {}
        },
      },
      8: {
        title: 'Red Christmas',
        content:
          '<strong>Rule</strong>: At least 50% of your library must be red cards (combat).',
        validation: (query: DeckBuilderQuery) => {
          const librarySize = query.getLibrarySize()
          const combatCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Combat'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          const redPercentage = (combatCards / librarySize) * 100
          if (redPercentage < 50) {
            return {
              libraryErrors: [
                'Advent Rule: At least 50% of library must be red cards (combat).',
              ],
            }
          }
          return {}
        },
      },
      9: {
        title: 'Masterless December',
        content:
          '<strong>Rule</strong>: Your deck may include no more than 5 Master cards total.',
        validation: (query: DeckBuilderQuery) => {
          const masterCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Master'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (masterCards > 5) {
            return {
              libraryErrors: [
                'Advent Rule: No more than 5 Master cards allowed in the library.',
              ],
            }
          }
          return {}
        },
      },
      10: {
        title: 'Group Locked',
        content:
          '<strong>Rule</strong>: Your crypt must use only one group (you pick the group).',
        validation: (query: DeckBuilderQuery) => {
          if (query.getMinGroupCrypt() !== query.getMaxGroupCrypt()) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain vampires from only one group.',
              ],
            }
          }
          return {}
        },
      },
      11: {
        title: 'Winter Council Conclave',
        content:
          '<strong>Rule</strong>: You must include at least one vampire from each sect (Camarilla, Sabbat, Anarch, Independent) in the crypt.',
        validation: (query: DeckBuilderQuery) => {
          const sects = {
            Camarilla: false,
            Sabbat: false,
            Anarch: false,
            Independent: false,
          }
          query.getCrypt().forEach((vampire) => {
            const sect = vampire.sect
            if (Object.prototype.hasOwnProperty.call(sects, sect)) {
              sects[sect as keyof typeof sects] = true
            }
          })
          const missingSects = Object.entries(sects)
            .filter(([, included]) => !included)
            .map(([sect]) => sect)
          if (missingSects.length > 0) {
            return {
              cryptErrors: [
                `Advent Rule: Crypt must include at least one vampire from each sect. Missing: ${missingSects.join(
                  ', ',
                )}.`,
              ],
            }
          }
          return {}
        },
      },
      12: {
        title: 'The Twelve Ranks of Christmas',
        content:
          '<strong>Rule</strong>: Your crypt must contain exactly 12 different vampires.',
        validation: (query: DeckBuilderQuery) => {
          const uniqueCards = query.getCrypt().length
          const cryptSize = query.getCryptSize()
          if (uniqueCards !== 12 || cryptSize !== 12) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain exactly 12 different vampires.',
              ],
            }
          }
          return {}
        },
      },
      13: {
        title: 'Glacial Politics',
        content:
          '<strong>Rule</strong>: Your deck must focus on votes; include at least 10 Political Action cards.',
        validation: (query: DeckBuilderQuery) => {
          const politicalCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Political Action'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (politicalCards < 10) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 10 Political Action cards.',
              ],
            }
          }
          return {}
        },
      },
      14: {
        title: 'The Three Frozen Thrones',
        content:
          '<strong>Rule</strong>: Crypt must contain three vampires only, and all must be capacity 8+.',
        validation: (query: DeckBuilderQuery) => {
          const crypt = query.getCrypt()
          if (crypt.length !== 3) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain exactly three vampires.',
              ],
            }
          }
          const lowCapacityVamps = crypt.filter(
            (vampire) => vampire.capacity < 8,
          )
          if (lowCapacityVamps.length > 0) {
            return {
              cryptErrors: [
                'Advent Rule: All vampires must be capacity 8 or higher.',
              ],
            }
          }
          return {}
        },
      },
      15: {
        title: 'Dual Identity',
        content:
          '<strong>Rule</strong>: Use at least one vampire, with both their normal and advanced versions',
        validation: (query: DeckBuilderQuery) => {
          const advancedVampire = query
            .getCrypt()
            .filter((vampire) => vampire.adv)
          const normalVampire = query
            .getCrypt()
            .filter((vampire) => !vampire.adv)
          const hasDualVersion = normalVampire.some((normal) =>
            advancedVampire.some(
              (advanced) =>
                advanced.name === normal.name && advanced.clan === normal.clan,
            ),
          )
          if (!hasDualVersion) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must include at least one vampire in both normal and advanced versions.',
              ],
            }
          }
          return {}
        },
      },
      16: {
        title: 'Legions of the Damned',
        content:
          '<strong>Rule</strong>: Include at least 12 allies or retainers.',
        validation: (query: DeckBuilderQuery) => {
          const animalAllies = query
            .getLibrary()
            .filter(
              (card) =>
                card.type.includes('Ally') || card.type.includes('Retainer'),
            )
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (animalAllies < 12) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 12 allies or retainers.',
              ],
            }
          }
          return {}
        },
      },
      17: {
        title: 'Discipline Triplets',
        content:
          '<strong>Rule</strong>: All vampires must share three disciplines in common.',
        validation: (query: DeckBuilderQuery) => {
          const crypt = query.getCrypt()
          if (crypt.length === 0) {
            return {}
          }
          const commonDisciplines = crypt
            .map((vampire) => vampire.disciplines)
            .reduce((common, disciplines) =>
              common.filter((d) => disciplines.includes(d)),
            )
          if (commonDisciplines.length < 3) {
            return {
              cryptErrors: [
                'Advent Rule: All vampires must share at least three disciplines in common.',
              ],
            }
          }
          return {}
        },
      },
      18: {
        title: '24 Hours, 24 Actions',
        content:
          '<strong>Rule</strong>: Your library must contain exactly 24 action cards.',
        validation: (query: DeckBuilderQuery) => {
          const actionCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Action'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (actionCards !== 24) {
            return {
              libraryErrors: [
                'Advent Rule: Library must contain exactly 24 action cards.',
              ],
            }
          }
          return {}
        },
      },
      19: {
        title: 'Whispers in the Blizzard',
        content:
          '<strong>Rule</strong>: Your deck must include at least 15 reaction cards.',
        validation: (query: DeckBuilderQuery) => {
          const reactionCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Reaction'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (reactionCards < 15) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 15 reaction cards.',
              ],
            }
          }
          return {}
        },
      },
      20: {
        title: 'Deep Winter Sabbat',
        content:
          '<strong>Rule</strong>: Your crypt must be exclusively Sabbat, and you must include at least 6 Black Hand cards.',
        validation: (query: DeckBuilderQuery) => {
          const crypt = query.getCrypt()
          const nonSabbatVamps = crypt.filter(
            (vampire) => vampire.sect !== 'Sabbat',
          )
          if (nonSabbatVamps.length > 0) {
            return {
              cryptErrors: [
                'Advent Rule: Crypt must contain only Sabbat vampires.',
              ],
            }
          }
          const blackHandCards = query
            .getLibrary()
            .filter((card) => card.taints && card.taints.includes('Black Hand'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (blackHandCards < 6) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 6 Black Hand cards.',
              ],
            }
          }
          return {}
        },
      },
      21: {
        title: 'Glittering Gifts',
        content:
          '<strong>Rule</strong>:You must include at least 10 equipment cards.',
        validation: (query: DeckBuilderQuery) => {
          const equipmentCards = query
            .getLibrary()
            .filter((card) => card.type.includes('Equipment'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (equipmentCards < 10) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 10 equipment cards.',
              ],
            }
          }
          return {}
        },
      },
      22: {
        title: 'Veil of Shadows',
        content:
          '<strong>Rule</strong>: Your deck must include at least 10 +Stealth / -Intercept cards.',

        validation: (query: DeckBuilderQuery) => {
          const stealthCards = query
            .getLibrary()
            .filter((card) => card.taints.includes('+Stealth / -Intercept'))
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (stealthCards < 10) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 10 +Stealth / -Intercept cards.',
              ],
            }
          }
          return {}
        },
      },
      23: {
        title: 'Hunger of the Long Night',
        content:
          '<strong>Rule</strong>: Include at least 12 cards that cost pool.',
        validation: (query: DeckBuilderQuery) => {
          const poolCostCards = query
            .getLibrary()
            .filter((card) => card.poolCost && card.poolCost > 0)
            .map((card) => query.getCardNumber(card.id))
            .reduce((sum, num) => sum + num, 0)
          if (poolCostCards < 12) {
            return {
              libraryErrors: [
                'Advent Rule: Library must include at least 12 cards that cost pool.',
              ],
            }
          }
          return {}
        },
      },
      24: {
        title: 'The Grand Finale: Your Best Gift',
        content:
          '<strong>Rule</strong>: Create your best deck and share it with the community as your holiday gift.',
      },
    },
  },
]
