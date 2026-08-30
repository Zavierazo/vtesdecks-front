import { CardFilter } from '@models'

/**
 * Single source of truth for the deck browser filters: the form controls, the
 * reset values, the URL sync and the active-filter chips all read this table.
 *
 * `type` and `order` are deliberately absent: they are header controls owned by
 * `DecksComponent`, not sidebar filters.
 */
export type DeckFilterKind =
  'string' | 'boolean' | 'range' | 'number' | 'list' | 'mode'

export interface DeckFilterDef {
  name: string
  kind: DeckFilterKind
  /** For `range` a `[min, max]` tuple, otherwise the control's default value. */
  default: unknown
  labelKey: string
  debounce?: number
  /** `false` for controls that never reach the URL. */
  navigate?: boolean
  /** `false` for values kept as plain component fields instead of controls. */
  control?: boolean
}

/** Tournaments are played as 2R+F or 3R+F, the final is never counted. */
export const DECK_ROUND_OPTIONS = [2, 3]

const PROPORTION_NAMES = [
  'master',
  'action',
  'political',
  'retainer',
  'equipment',
  'ally',
  'modifier',
  'combat',
  'reaction',
  'event',
]

export function deckFilterDefs(
  currentYear: number = new Date().getFullYear(),
): DeckFilterDef[] {
  return [
    {
      name: 'name',
      kind: 'string',
      default: '',
      labelKey: 'filters.name',
      debounce: 500,
    },
    {
      name: 'limitedFormat',
      kind: 'string',
      default: '',
      labelKey: 'filters.limited_format',
      debounce: 500,
    },
    {
      name: 'author',
      kind: 'string',
      default: '',
      labelKey: 'filters.author',
      debounce: 500,
    },
    {
      name: 'tournament',
      kind: 'string',
      default: '',
      labelKey: 'filters.tournament_name',
      debounce: 500,
    },
    {
      name: 'place',
      kind: 'string',
      default: '',
      labelKey: 'filters.place',
      debounce: 500,
    },
    {
      name: 'cardText',
      kind: 'string',
      default: '',
      labelKey: 'filters.card_text',
      debounce: 500,
    },
    {
      name: 'singleDiscipline',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.single_discipline',
    },
    {
      name: 'singleClan',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.single_clan',
    },
    {
      name: 'librarySize',
      kind: 'range',
      default: [40, 90],
      labelKey: 'filters.library',
      debounce: 500,
    },
    {
      name: 'cryptSize',
      kind: 'range',
      default: [12, 40],
      labelKey: 'filters.crypt',
      debounce: 500,
    },
    {
      name: 'group',
      kind: 'range',
      default: [0, 7],
      labelKey: 'filters.group',
      debounce: 500,
    },
    {
      name: 'players',
      kind: 'range',
      default: [10, 200],
      labelKey: 'filters.players',
      debounce: 500,
    },
    {
      name: 'year',
      kind: 'range',
      default: [1998, currentYear],
      labelKey: 'filters.year',
      debounce: 500,
    },
    {
      name: 'absoluteProportion',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.absolute_proportion',
    },
    {
      name: 'customProportion',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.custom',
      navigate: false,
    },
    ...PROPORTION_NAMES.map((name): DeckFilterDef => ({
      name,
      kind: 'string',
      default: 'any',
      labelKey: `vtes.type.${name}`,
    })),
    { name: 'tags', kind: 'string', default: '', labelKey: 'filters.tags' },
    {
      name: 'favorite',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.bookmarked',
    },
    {
      name: 'detailed',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.detailed',
    },
    {
      name: 'collectionPercentage',
      kind: 'number',
      default: 100,
      labelKey: 'filters.deck_completion',
      debounce: 500,
    },
    {
      name: 'clans',
      kind: 'list',
      default: [],
      labelKey: 'filters.clans',
      control: false,
    },
    {
      name: 'notClans',
      kind: 'list',
      default: [],
      labelKey: 'filters.not_clans',
      control: false,
    },
    {
      name: 'disciplines',
      kind: 'list',
      default: [],
      labelKey: 'filters.disciplines',
      control: false,
    },
    {
      name: 'notDisciplines',
      kind: 'list',
      default: [],
      labelKey: 'filters.not_disciplines',
      control: false,
    },
    {
      name: 'paths',
      kind: 'list',
      default: [],
      labelKey: 'filters.paths',
      control: false,
    },
    {
      name: 'rounds',
      kind: 'list',
      default: [],
      labelKey: 'filters.rounds',
      control: false,
    },
    {
      name: 'clanMode',
      kind: 'mode',
      default: 'and',
      labelKey: 'filters.clan_mode_or',
      control: false,
    },
    {
      name: 'disciplineMode',
      kind: 'mode',
      default: 'and',
      labelKey: 'filters.discipline_mode_or',
      control: false,
    },
    {
      name: 'cards',
      kind: 'list',
      default: [],
      labelKey: 'filters.crypt_cards',
      control: false,
    },
    {
      name: 'starVampire',
      kind: 'boolean',
      default: false,
      labelKey: 'filters.star_vampire',
      control: false,
    },
  ]
}

/** Form-control backed filters, in the order the sidebar registers them. */
export function deckFilterControlDefs(currentYear?: number): DeckFilterDef[] {
  return deckFilterDefs(currentYear).filter((def) => def.control !== false)
}

/** Comma-joined query param to a list, tolerating missing/empty values. */
export function splitParamList(value: unknown): string[] {
  return typeof value === 'string' && value.length > 0 ? value.split(',') : []
}

/**
 * Query params always come back as strings while form controls may hold
 * numbers or booleans, so compare them by their string representation.
 */
export function isSameParamValue(a: unknown, b: unknown): boolean {
  const normalize = (value: unknown): string =>
    Array.isArray(value)
      ? value.map((item) => `${item}`).join(',')
      : `${value ?? ''}`
  return normalize(a) === normalize(b)
}

/** Parses the `cards` query param (`id=count,id=count`). */
export function parseCardFilterParam(value: unknown): CardFilter[] {
  return splitParamList(value)
    .map((card) => {
      const [cardId, countString] = card.split('=')
      return { id: Number(cardId), count: Number(countString) }
    })
    .filter((card) => !isNaN(card.id) && !isNaN(card.count))
}
