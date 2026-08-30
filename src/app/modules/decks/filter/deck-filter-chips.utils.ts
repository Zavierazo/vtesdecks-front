import { Params } from '@angular/router'
import { FilterChip } from '@shared/components/filter-chips/filter-chips.component'
import { ApiCrypt, ApiLibrary } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { CLAN_LIST, DISCIPLINE_LIST, PATH_LIST, TranslateFn } from '@utils'
import { map, Observable, of } from 'rxjs'
import {
  DeckFilterDef,
  deckFilterDefs,
  isSameParamValue,
  parseCardFilterParam,
  splitParamList,
} from './deck-filter-defaults'

const labelFromList = (
  list: { name: string; label: string }[],
  t: TranslateFn,
  value: string,
): string => {
  const found = list.find((item) => item.name === value)
  if (!found) {
    return value
  }
  const translated = t(found.label)
  return translated && translated !== found.label ? translated : value
}

/** `min,max` proportion selects render as `10-20%` / `10-20` when absolute. */
const proportionValue = (value: string, absolute: boolean): string => {
  const [min, max] = value.split(',')
  const suffix = absolute ? '' : '%'
  return min === max ? `${min}${suffix}` : `${min}-${max}${suffix}`
}

const listValueLabel = (
  def: DeckFilterDef,
  t: TranslateFn,
  value: string,
): string => {
  switch (def.name) {
    case 'clans':
    case 'notClans':
      return labelFromList(CLAN_LIST, t, value)
    case 'disciplines':
    case 'notDisciplines':
      return labelFromList(DISCIPLINE_LIST, t, value)
    case 'paths':
      return labelFromList(PATH_LIST, t, value)
    case 'rounds':
      return `${value}R+F`
    default:
      return value
  }
}

const cardName = (
  cryptQuery: CryptQuery,
  libraryQuery: LibraryQuery,
  id: number,
  count: number,
): Observable<string> => {
  const card$: Observable<ApiCrypt | ApiLibrary | undefined> =
    cryptQuery.hasEntity(id)
      ? cryptQuery.selectEntity(id)
      : libraryQuery.hasEntity(id)
        ? libraryQuery.selectEntity(id)
        : of(undefined)
  const prefix = count > 1 ? `${count}x ` : ''
  return card$.pipe(
    map((card) => `${prefix}${card?.i18n?.name || card?.name || id}`),
  )
}

/**
 * What the chip builder needs to turn ids into readable values. The name
 * resolvers are optional: without them the chip falls back to the raw id.
 */
export interface DeckFilterChipContext {
  t: TranslateFn
  cryptQuery: CryptQuery
  libraryQuery: LibraryQuery
  archetypeName?: (id: string) => Observable<string>
  deckName?: (id: string) => Observable<string>
}

/**
 * Chips for every non-default deck filter currently in the URL. `type` and
 * `order` are header controls, not filters, so they never get a chip.
 */
export function buildDeckFilterChips(
  params: Params,
  context: DeckFilterChipContext,
): FilterChip[] {
  const { t, cryptQuery, libraryQuery } = context
  const chips: FilterChip[] = []
  const absolute = !!params['absoluteProportion']
  deckFilterDefs().forEach((def) => {
    if (def.navigate === false) {
      return
    }
    const raw = params[def.name]
    if (def.name === 'cards') {
      parseCardFilterParam(raw).forEach((card) =>
        chips.push({
          id: `cards:${card.id}`,
          key: 'cards',
          item: `${card.id}`,
          label: t(
            cryptQuery.hasEntity(card.id)
              ? 'filters.crypt_cards'
              : 'filters.library_cards',
          ),
          value$: cardName(cryptQuery, libraryQuery, card.id, card.count),
        }),
      )
      return
    }
    if (def.name === 'excludedCards') {
      splitParamList(raw).forEach((id) =>
        chips.push({
          id: `excludedCards:${id}`,
          key: 'excludedCards',
          item: id,
          label: t('filters.excluded_cards'),
          value$: cardName(cryptQuery, libraryQuery, Number(id), 1),
        }),
      )
      return
    }
    if (raw === undefined || raw === null || raw === '') {
      return
    }
    // Set from outside the sidebar (metagame pages, "similar decks" button),
    // so they carry an id that only an API lookup can turn into a name.
    if (def.name === 'archetype' || def.name === 'bySimilarity') {
      const resolve =
        def.name === 'archetype' ? context.archetypeName : context.deckName
      chips.push({
        id: def.name,
        key: def.name,
        label: t(def.labelKey),
        value:
          def.name === 'archetype' && Number(raw) === 0
            ? t('filters.unclassified')
            : undefined,
        value$:
          def.name === 'archetype' && Number(raw) === 0
            ? undefined
            : resolve
              ? resolve(`${raw}`)
              : of(`${raw}`),
      })
      return
    }
    switch (def.kind) {
      case 'list':
        splitParamList(raw).forEach((value) =>
          chips.push({
            id: `${def.name}:${value}`,
            key: def.name,
            item: value,
            label: t(def.labelKey),
            value: listValueLabel(def, t, value),
          }),
        )
        break
      case 'mode':
        if (raw === 'or' || raw === 'any') {
          chips.push({ id: def.name, key: def.name, label: t(def.labelKey) })
        }
        break
      case 'boolean':
        chips.push({ id: def.name, key: def.name, label: t(def.labelKey) })
        break
      case 'range': {
        const [min, max] = Array.isArray(raw) ? raw : splitParamList(raw)
        if (isSameParamValue(def.default, [min, max])) {
          return
        }
        chips.push({
          id: def.name,
          key: def.name,
          label: t(def.labelKey),
          value: `${min}–${max}`,
        })
        break
      }
      case 'number':
        chips.push({
          id: def.name,
          key: def.name,
          label: t(def.labelKey),
          value: `${raw}%`,
        })
        break
      case 'decimal':
        chips.push({
          id: def.name,
          key: def.name,
          label: t(def.labelKey),
          value: `${raw}`,
        })
        break
      default:
        if (isSameParamValue(raw, def.default)) {
          return
        }
        chips.push({
          id: def.name,
          key: def.name,
          label: t(def.labelKey),
          value: `${raw}`.includes(',')
            ? proportionValue(`${raw}`, absolute)
            : `${raw}`,
        })
    }
  })
  return chips
}

/**
 * Query params to merge in order to drop `chip`: `undefined` clears the param,
 * a joined list keeps the other values of a multi-value filter.
 */
export function removeDeckFilterChip(params: Params, chip: FilterChip): Params {
  if (chip.key === 'cards' && chip.item) {
    const remaining = parseCardFilterParam(params['cards']).filter(
      (card) => `${card.id}` !== chip.item,
    )
    return {
      cards: remaining.length
        ? remaining.map((card) => `${card.id}=${card.count}`).join(',')
        : undefined,
    }
  }
  if (chip.item !== undefined) {
    const remaining = splitParamList(params[chip.key]).filter(
      (value) => value !== chip.item,
    )
    return { [chip.key]: remaining.length ? remaining.join(',') : undefined }
  }
  return { [chip.key]: undefined }
}
