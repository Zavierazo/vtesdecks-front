import { adventEnglish } from './advent-translation'
import type { AdventData } from './advent.data'

export const ADVENT_2025: AdventData = {
  year: 2025,
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-31'),
  validation: (query, translate = adventEnglish) => {
    const name = query.getName()
    if (!name) {
      return [
        translate('editions.2025.validation.error_1', 'Deck name is required'),
      ]
    }
    if (!name.trim().startsWith('Advent2025:')) {
      return [
        translate(
          'editions.2025.validation.error_2',
          'Deck name must start with "Advent2025:"',
        ),
      ]
    }
    if (name.trim().length < 15) {
      return [
        translate(
          'editions.2025.validation.error_3',
          'Add deck name after "Advent2025:"',
        ),
      ]
    }
    const published = query.getPublished()
    if (!published) {
      return [
        translate(
          'editions.2025.validation.error_4',
          'Deck must be public to participate in the Advent 2025 event',
        ),
      ]
    }
    return []
  },
  days: {
    1: {
      validation: (query, translate = adventEnglish) => {
        const clans = query.getCryptClans()
        if (clans.length > 1) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.1.validation.error_1',
                'Advent Rule: Crypt must contain vampires from only one clan.',
              ),
            ],
          }
        }
        return {}
      },
    },
    2: {
      validation: (query, translate = adventEnglish) => {
        const librarySize = query.getLibrarySize()
        if (librarySize > 60) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.2.validation.error_1',
                'Advent Rule: Library cannot exceed 60 cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    3: {
      validation: (query, translate = adventEnglish) => {
        const combatCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Combat'))
        if (combatCards.length > 0) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.3.validation.error_1',
                'Advent Rule: No combat cards allowed.',
              ),
            ],
          }
        }
        return {}
      },
    },
    4: {
      validation: (query, translate = adventEnglish) => {
        const highCapacityVamps = query
          .getCrypt()
          .filter((vampire) => vampire.capacity > 5)
        if (highCapacityVamps.length > 0) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.4.validation.error_1',
                'Advent Rule: All vampires must be capacity 5 or less.',
              ),
            ],
          }
        }
        return {}
      },
    },
    5: {
      validation: (query, translate = adventEnglish) => {
        const starVamps = query
          .getCrypt()
          .filter((crypt) => query.getCardNumber(crypt.id) >= 4)
        if (starVamps.length === 0) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.5.validation.error_1',
                'Advent Rule: Crypt must contain one star-vampire.',
              ),
            ],
          }
        }
        return {}
      },
    },
    6: {
      validation: (query, translate = adventEnglish) => {
        const multipleCopyVamps = query
          .getCrypt()
          .filter((vampire) => query.getCardNumber(vampire.id) > 1)
        if (multipleCopyVamps.length > 0) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.6.validation.error_1',
                'Advent Rule: All vampires must have only one copy.',
              ),
            ],
          }
        }
        return {}
      },
    },
    7: {
      validation: (query, translate = adventEnglish) => {
        const library = query.getLibrary()
        const disciplineCount: Record<string, number> = {}

        library.forEach((card) => {
          card.disciplines.forEach((discipline) => {
            disciplineCount[discipline] = (disciplineCount[discipline] || 0) + 1
          })
        })

        const disciplinesUsed = Object.keys(disciplineCount)
        if (disciplinesUsed.length > 1) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.7.validation.error_1',
                'Advent Rule: Only one discipline allowed in the library.',
              ),
            ],
          }
        }
        return {}
      },
    },
    8: {
      validation: (query, translate = adventEnglish) => {
        const librarySize = query.getLibrarySize()
        const combatCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Combat'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        const redPercentage = (combatCards / librarySize) * 100
        if (redPercentage < 50) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.8.validation.error_1',
                'Advent Rule: At least 50% of library must be red cards (combat).',
              ),
            ],
          }
        }
        return {}
      },
    },
    9: {
      validation: (query, translate = adventEnglish) => {
        const masterCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Master'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (masterCards > 5) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.9.validation.error_1',
                'Advent Rule: No more than 5 Master cards allowed in the library.',
              ),
            ],
          }
        }
        return {}
      },
    },
    10: {
      validation: (query, translate = adventEnglish) => {
        if (query.getMinGroupCrypt() !== query.getMaxGroupCrypt()) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.10.validation.error_1',
                'Advent Rule: Crypt must contain vampires from only one group.',
              ),
            ],
          }
        }
        return {}
      },
    },
    11: {
      validation: (query, translate = adventEnglish) => {
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
              translate(
                'editions.2025.days.11.validation.error_1',
                `Advent Rule: Crypt must include at least one vampire from each sect. Missing: ${missingSects.join(
                  ', ',
                )}.`,
                { sects: missingSects.join(', ') },
              ),
            ],
          }
        }
        return {}
      },
    },
    12: {
      validation: (query, translate = adventEnglish) => {
        const uniqueCards = query.getCrypt().length
        const cryptSize = query.getCryptSize()
        if (uniqueCards !== 12 || cryptSize !== 12) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.12.validation.error_1',
                'Advent Rule: Crypt must contain exactly 12 different vampires.',
              ),
            ],
          }
        }
        return {}
      },
    },
    13: {
      validation: (query, translate = adventEnglish) => {
        const politicalCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Political Action'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (politicalCards < 10) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.13.validation.error_1',
                'Advent Rule: Library must include at least 10 Political Action cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    14: {
      validation: (query, translate = adventEnglish) => {
        const crypt = query.getCrypt()
        if (crypt.length !== 3) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.14.validation.error_1',
                'Advent Rule: Crypt must contain exactly three vampires.',
              ),
            ],
          }
        }
        const lowCapacityVamps = crypt.filter((vampire) => vampire.capacity < 8)
        if (lowCapacityVamps.length > 0) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.14.validation.error_2',
                'Advent Rule: All vampires must be capacity 8 or higher.',
              ),
            ],
          }
        }
        return {}
      },
    },
    15: {
      validation: (query, translate = adventEnglish) => {
        const advancedVampire = query
          .getCrypt()
          .filter((vampire) => vampire.adv)
        const normalVampire = query.getCrypt().filter((vampire) => !vampire.adv)
        const hasDualVersion = normalVampire.some((normal) =>
          advancedVampire.some(
            (advanced) =>
              advanced.name === normal.name && advanced.clan === normal.clan,
          ),
        )
        if (!hasDualVersion) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.15.validation.error_1',
                'Advent Rule: Crypt must include at least one vampire in both normal and advanced versions.',
              ),
            ],
          }
        }
        return {}
      },
    },
    16: {
      validation: (query, translate = adventEnglish) => {
        const animalAllies = query
          .getLibrary()
          .filter(
            (card) =>
              card.types.includes('Ally') || card.types.includes('Retainer'),
          )
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (animalAllies < 12) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.16.validation.error_1',
                'Advent Rule: Library must include at least 12 allies or retainers.',
              ),
            ],
          }
        }
        return {}
      },
    },
    17: {
      validation: (query, translate = adventEnglish) => {
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
              translate(
                'editions.2025.days.17.validation.error_1',
                'Advent Rule: All vampires must share at least three disciplines in common.',
              ),
            ],
          }
        }
        return {}
      },
    },
    18: {
      validation: (query, translate = adventEnglish) => {
        const actionCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Action'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (actionCards !== 24) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.18.validation.error_1',
                'Advent Rule: Library must contain exactly 24 action cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    19: {
      validation: (query, translate = adventEnglish) => {
        const reactionCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Reaction'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (reactionCards < 15) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.19.validation.error_1',
                'Advent Rule: Library must include at least 15 reaction cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    20: {
      validation: (query, translate = adventEnglish) => {
        const crypt = query.getCrypt()
        const nonSabbatVamps = crypt.filter(
          (vampire) => vampire.sect !== 'Sabbat',
        )
        if (nonSabbatVamps.length > 0) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.20.validation.error_1',
                'Advent Rule: Crypt must contain only Sabbat vampires.',
              ),
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
              translate(
                'editions.2025.days.20.validation.error_2',
                'Advent Rule: Library must include at least 6 Black Hand cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    21: {
      validation: (query, translate = adventEnglish) => {
        const equipmentCards = query
          .getLibrary()
          .filter((card) => card.types.includes('Equipment'))
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (equipmentCards < 10) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.21.validation.error_1',
                'Advent Rule: Library must include at least 10 equipment cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    22: {
      validation: (query, translate = adventEnglish) => {
        const stealthCards = query
          .getLibrary()
          .filter(
            (card) =>
              card.taints && card.taints.includes('+Stealth / -Intercept'),
          )
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (stealthCards < 10) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.22.validation.error_1',
                'Advent Rule: Library must include at least 10 +Stealth / -Intercept cards.',
              ),
            ],
          }
        }
        return {}
      },
    },
    23: {
      validation: (query, translate = adventEnglish) => {
        const poolCostCards = query
          .getLibrary()
          .filter((card) => card.poolCost && card.poolCost > 0)
          .map((card) => query.getCardNumber(card.id))
          .reduce((sum, num) => sum + num, 0)
        if (poolCostCards < 12) {
          return {
            libraryErrors: [
              translate(
                'editions.2025.days.23.validation.error_1',
                'Advent Rule: Library must include at least 12 cards that cost pool.',
              ),
            ],
          }
        }
        return {}
      },
    },
    24: {
      validation: (query, translate = adventEnglish) => {
        if (!query.getCrypt().some((vampire) => vampire.id === 250001)) {
          return {
            cryptErrors: [
              translate(
                'editions.2025.days.24.validation.error_1',
                'Advent Rule: Crypt must include Barachiel, the new Salubri from the upcoming New Blood release.',
              ),
            ],
          }
        }
        return {}
      },
    },
  },
}
