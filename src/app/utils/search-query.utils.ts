import { Params } from '@angular/router'
import { SearchPresetScope, SearchParams } from '@models'
import { getValidCardShopNames } from './card-shops'

interface SearchBrowserDefinition {
  path: string
  allowedParams: readonly string[]
  filterParams: ReadonlySet<string>
  defaults: Readonly<SearchParams>
  allowedValues?: Readonly<Record<string, ReadonlySet<string>>>
}

const CRYPT_FILTERS = [
  'advanced',
  'artist',
  'capacity',
  'cardText',
  'clans',
  'disciplineMode',
  'disciplines',
  'group',
  'name',
  'notClans',
  'notDisciplines',
  'notPaths',
  'paths',
  'predefinedLimitedFormat',
  'printOnDemand',
  'sect',
  'set',
  'shops',
  'notShops',
  'superiorDisciplines',
  'taints',
  'title',
  'votes',
] as const

const LIBRARY_FILTERS = [
  'artist',
  'bloodCostSlider',
  'cardText',
  'clans',
  'convictionCostSlider',
  'disciplineMode',
  'disciplines',
  'name',
  'notClans',
  'notDisciplines',
  'notPaths',
  'notTypes',
  'paths',
  'poolCostSlider',
  'predefinedLimitedFormat',
  'printOnDemand',
  'sect',
  'set',
  'shops',
  'notShops',
  'taints',
  'title',
  'trifle',
  'typeMode',
  'types',
] as const

const DECK_FILTERS = [
  'absoluteProportion',
  'action',
  'ally',
  'archetype',
  'author',
  'bySimilarity',
  'cardText',
  'cards',
  'clanMode',
  'clans',
  'collectionPercentage',
  'combat',
  'cryptSize',
  'detailed',
  'disciplineMode',
  'disciplines',
  'equipment',
  'event',
  'excludedCards',
  'favorite',
  'group',
  'librarySize',
  'limitedFormat',
  'master',
  'maxPrice',
  'minPrice',
  'modifier',
  'name',
  'notClans',
  'notDisciplines',
  'paths',
  'place',
  'players',
  'political',
  'reaction',
  'retainer',
  'rounds',
  'singleClan',
  'singleDiscipline',
  'starVampire',
  'tags',
  'tournament',
  'type',
  'year',
] as const

const definitions: Record<SearchPresetScope, SearchBrowserDefinition> = {
  crypt: {
    path: '/cards/crypt',
    allowedParams: [...CRYPT_FILTERS, 'sortBy', 'sortByOrder'].sort(),
    filterParams: new Set(CRYPT_FILTERS),
    defaults: {
      sortBy: 'name',
      sortByOrder: 'asc',
      printOnDemand: 'false',
      disciplineMode: 'and',
      group: '1,7',
      capacity: '1,11',
      votes: '0,4',
    },
    allowedValues: {
      sortBy: new Set([
        'name',
        'capacity',
        'clan',
        'group',
        'deckPopularity',
        'cardPopularity',
        'minPrice',
      ]),
      sortByOrder: new Set(['asc', 'desc']),
      advanced: new Set(['base', 'advanced']),
      disciplineMode: new Set(['or']),
      printOnDemand: new Set(['true']),
    },
  },
  library: {
    path: '/cards/library',
    allowedParams: [...LIBRARY_FILTERS, 'sortBy', 'sortByOrder'].sort(),
    filterParams: new Set(LIBRARY_FILTERS),
    defaults: {
      sortBy: 'name',
      sortByOrder: 'asc',
      printOnDemand: 'false',
      disciplineMode: 'and',
      typeMode: 'or',
      bloodCostSlider: '0,4',
      poolCostSlider: '0,6',
    },
    allowedValues: {
      sortBy: new Set([
        'name',
        'type',
        'deckPopularity',
        'cardPopularity',
        'minPrice',
      ]),
      sortByOrder: new Set(['asc', 'desc']),
      disciplineMode: new Set(['or']),
      typeMode: new Set(['and']),
      trifle: new Set(['trifle', 'non_trifle']),
      printOnDemand: new Set(['true']),
    },
  },
  decks: {
    path: '/decks',
    allowedParams: [...DECK_FILTERS, 'order'].sort(),
    filterParams: new Set(DECK_FILTERS),
    defaults: {
      type: 'ALL',
      order: 'NEWEST',
      singleDiscipline: 'false',
      singleClan: 'false',
      absoluteProportion: 'false',
      favorite: 'false',
      detailed: 'false',
      starVampire: 'false',
      librarySize: '40,90',
      cryptSize: '12,40',
      group: '0,7',
      players: '10,200',
      year: `1998,${new Date().getFullYear()}`,
      collectionPercentage: '100',
      clanMode: 'and',
      disciplineMode: 'and',
      master: 'any',
      action: 'any',
      political: 'any',
      retainer: 'any',
      equipment: 'any',
      ally: 'any',
      modifier: 'any',
      combat: 'any',
      reaction: 'any',
      event: 'any',
    },
    allowedValues: {
      type: new Set([
        'ALL',
        'USER',
        'TOURNAMENT',
        'COMMUNITY',
        'PRECONSTRUCTED',
      ]),
      order: new Set([
        'NEWEST',
        'OLDEST',
        'MODIFIED',
        'NAME',
        'POPULAR',
        'RATE',
        'VOTES',
        'VIEWS',
        'COMMENTS',
        'PLAYERS',
        'CHEAPEST',
        'EXPENSIVE',
      ]),
      singleDiscipline: new Set(['true']),
      singleClan: new Set(['true']),
      absoluteProportion: new Set(['true']),
      favorite: new Set(['true']),
      detailed: new Set(['true']),
      starVampire: new Set(['true']),
      clanMode: new Set(['or']),
      disciplineMode: new Set(['or']),
    },
  },
}

const normalizeValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const joined = value.map((item) => `${item}`).join(',')
    return joined || undefined
  }
  if (value === undefined || value === null || value === '') return undefined
  return `${value}`
}

export function normalizeSearchParams(
  scope: SearchPresetScope,
  params: Params | SearchParams,
): SearchParams {
  const definition = definitions[scope]
  const source: Params | SearchParams = { ...params }
  if (scope === 'crypt' || scope === 'library') {
    const notShops = getValidCardShopNames(
      normalizeValue(source['notShops'])?.split(','),
    )
    const shops = getValidCardShopNames(
      normalizeValue(source['shops'] ?? source['shop'])?.split(','),
    ).filter((shop) => !notShops.includes(shop))
    source['shops'] = shops.join(',') || undefined
    source['notShops'] = notShops.join(',') || undefined
    delete source['shop']
  }
  const normalized: SearchParams = {}
  definition.allowedParams.forEach((key) => {
    const value = normalizeValue(source[key])
    const allowedValues = definition.allowedValues?.[key]
    if (
      value !== undefined &&
      value !== definition.defaults[key] &&
      (!allowedValues || allowedValues.has(value))
    ) {
      normalized[key] = value
    }
  })
  return normalized
}

export function searchSignature(
  scope: SearchPresetScope,
  params: Params | SearchParams,
): string {
  return `${scope}:${new URLSearchParams(
    normalizeSearchParams(scope, params),
  ).toString()}`
}

export function hasMeaningfulSearchFilters(
  scope: SearchPresetScope,
  params: Params | SearchParams,
): boolean {
  const normalized = normalizeSearchParams(scope, params)
  return Object.keys(normalized).some((key) =>
    definitions[scope].filterParams.has(key),
  )
}

export function buildSearchPath(
  scope: SearchPresetScope,
  params: Params | SearchParams,
): string {
  const query = new URLSearchParams(
    normalizeSearchParams(scope, params),
  ).toString()
  return `${definitions[scope].path}${query ? `?${query}` : ''}`
}

export function getSearchBrowserPath(scope: SearchPresetScope): string {
  return definitions[scope].path
}
