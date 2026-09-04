import { CryptFilter, LibraryFilter } from '@models'
import { FilterChip } from '@shared/components/filter-chips/filter-chips.component'
import { isDefaultValue } from './card-filter.utils'
import { CLAN_LIST } from './clans'
import { DISCIPLINE_LIST } from './disciplines'
import { LIBRARY_TYPE_LIST } from './library-types'
import { PATH_LIST } from './paths'

type CardFilter = CryptFilter & LibraryFilter
type CardFilterKey = keyof CryptFilter | keyof LibraryFilter

export type TranslateFn = (
  key: string,
  params?: Record<string, unknown>,
) => string

/** Translates `key`, falling back to `fallback` when the key is missing. */
const translateOr = (t: TranslateFn, key: string, fallback: string): string => {
  const translated = t(key)
  return translated && translated !== key ? translated : fallback
}

const clanLabel = (t: TranslateFn, clan: string): string => {
  const found = CLAN_LIST.find((item) => item.name === clan)
  return found ? translateOr(t, found.label, clan) : clan
}

const disciplineLabel = (t: TranslateFn, discipline: string): string => {
  const found = DISCIPLINE_LIST.find((item) => item.name === discipline)
  return found ? translateOr(t, found.label, discipline) : discipline
}

const pathLabel = (t: TranslateFn, path: string): string => {
  if (path === 'none') {
    return t('shared.not_required')
  }
  const found = PATH_LIST.find((item) => item.name === path)
  return found ? translateOr(t, found.label, path) : path
}

const libraryTypeLabel = (t: TranslateFn, type: string): string => {
  const found = LIBRARY_TYPE_LIST.find((item) => item.name === type)
  return found ? translateOr(t, found.label, type) : type
}

const taintLabel = (t: TranslateFn, taint: string): string =>
  translateOr(t, `vtes.taints.${taint}`, taint)

/** `any` and `none` are sentinels of the crypt title filter, not real titles. */
const cryptTitleLabel = (t: TranslateFn, title: string): string => {
  if (title === 'any') {
    return t('shared.any_title')
  }
  if (title === 'none') {
    return t('shared.no_title')
  }
  return title
}

/** In the library, `none` means the card requires no title. */
const libraryTitleLabel = (t: TranslateFn, title: string): string =>
  title === 'none' ? t('shared.not_required') : title

const enumLabel =
  (scope: string) =>
  (t: TranslateFn, value: string): string =>
    translateOr(t, `${scope}${value}`, value)

const trifleLabel = (t: TranslateFn, trifle: string): string =>
  translateOr(
    t,
    trifle === 'trifle'
      ? 'library_builder_filter.trifle_only'
      : 'library_builder_filter.trifle_non',
    trifle,
  )

const identity = (_t: TranslateFn, value: string): string => value

class ChipBuilder {
  readonly chips: FilterChip[] = []

  constructor(
    private readonly filter: CardFilter,
    private readonly defaults: CardFilter,
    private readonly t: TranslateFn,
  ) {}

  private value(key: string): unknown {
    return (this.filter as Record<string, unknown>)[key]
  }

  private isDefault(key: string): boolean {
    return isDefaultValue(
      this.value(key),
      (this.defaults as Record<string, unknown>)[key],
    )
  }

  /** One chip per value, so a single entry can be removed on its own. */
  list(
    key: CardFilterKey,
    labelKey: string,
    valueLabel: (t: TranslateFn, value: string) => string = identity,
  ): this {
    const values = (this.value(key) as string[] | undefined) ?? []
    values.forEach((value) =>
      this.chips.push({
        id: `${key}:${value}`,
        key,
        item: value,
        label: this.t(labelKey),
        value: valueLabel(this.t, value),
      }),
    )
    return this
  }

  scalar(
    key: CardFilterKey,
    labelKey: string,
    valueLabel: (t: TranslateFn, value: string) => string = identity,
  ): this {
    if (this.isDefault(key)) {
      return this
    }
    this.chips.push({
      id: key,
      key,
      label: this.t(labelKey),
      value: valueLabel(this.t, this.value(key) as string),
    })
    return this
  }

  /** Label-only chip for booleans and non-default match modes. */
  flag(key: CardFilterKey, labelKey: string): this {
    if (this.isDefault(key)) {
      return this
    }
    this.chips.push({ id: key, key, label: this.t(labelKey) })
    return this
  }

  range(key: CardFilterKey, labelKey: string): this {
    const range = this.value(key) as number[] | undefined
    if (this.isDefault(key) || !Array.isArray(range) || range.length !== 2) {
      return this
    }
    const [min, max] = range
    this.chips.push({
      id: key,
      key,
      label: this.t(labelKey),
      value: min === max ? `${min}` : `${min}–${max}`,
    })
    return this
  }
}

/**
 * Chips for every non-default crypt filter. `name` is intentionally left out:
 * it has its own always-visible input in the page header.
 */
export function buildCryptFilterChips(
  filter: CryptFilter,
  defaults: CryptFilter,
  t: TranslateFn,
  shopLabel: (value: string) => string = (value) => value,
): FilterChip[] {
  const scope = 'crypt_builder_filter.'
  return new ChipBuilder(filter, defaults, t)
    .flag('printOnDemand', `${scope}print_on_demand`)
    .list('shops', `${scope}shop_availability`, (_t, value) => shopLabel(value))
    .list('notShops', `${scope}shop_availability_exclude`, (_t, value) =>
      shopLabel(value),
    )
    .list('clans', `${scope}clans`, clanLabel)
    .list('notClans', `${scope}not_clans`, clanLabel)
    .list('disciplines', `${scope}disciplines`, disciplineLabel)
    .list(
      'superiorDisciplines',
      `${scope}superior_disciplines`,
      disciplineLabel,
    )
    .list('notDisciplines', `${scope}not_disciplines`, disciplineLabel)
    .list('paths', `${scope}path`, pathLabel)
    .list('notPaths', `${scope}not_paths`, pathLabel)
    .flag('disciplineMode', `${scope}discipline_mode_or`)
    .range('groupSlider', `${scope}group`)
    .range('capacitySlider', `${scope}capacity`)
    .range('votesSlider', `${scope}votes`)
    .scalar('advanced', `${scope}version`, enumLabel(`${scope}advanced_`))
    .scalar('title', `${scope}title`, cryptTitleLabel)
    .scalar('sect', `${scope}sect`)
    .scalar('set', `${scope}set`)
    .list('taints', `${scope}taints`, taintLabel)
    .flag('limitedFormat', `${scope}limited_format`)
    .scalar('predefinedLimitedFormat', `${scope}predefined_limited_format`)
    .scalar('cardText', `${scope}card_text`)
    .scalar('artist', `${scope}artist`).chips
}

/**
 * Chips for every non-default library filter. `name` is left out for the same
 * reason as in {@link buildCryptFilterChips}.
 */
export function buildLibraryFilterChips(
  filter: LibraryFilter,
  defaults: LibraryFilter,
  t: TranslateFn,
  shopLabel: (value: string) => string = (value) => value,
): FilterChip[] {
  const scope = 'library_builder_filter.'
  return new ChipBuilder(filter, defaults, t)
    .flag('printOnDemand', `${scope}print_on_demand`)
    .list('shops', `${scope}shop_availability`, (_t, value) => shopLabel(value))
    .list('notShops', `${scope}shop_availability_exclude`, (_t, value) =>
      shopLabel(value),
    )
    .list('types', `${scope}type`, libraryTypeLabel)
    .list('notTypes', `${scope}not_types`, libraryTypeLabel)
    .flag('typeMode', `${scope}type_mode_and`)
    .list('clans', `${scope}clans`, clanLabel)
    .list('notClans', `${scope}not_clans`, clanLabel)
    .list('disciplines', `${scope}disciplines`, disciplineLabel)
    .list('notDisciplines', `${scope}not_disciplines`, disciplineLabel)
    .list('paths', `${scope}path`, pathLabel)
    .list('notPaths', `${scope}not_paths`, pathLabel)
    .flag('disciplineMode', `${scope}discipline_mode_or`)
    .range('bloodCostSlider', `${scope}blood_cost`)
    .range('poolCostSlider', `${scope}pool_cost`)
    .range('convictionCostSlider', `${scope}conviction_cost`)
    .scalar('trifle', `${scope}trifle`, trifleLabel)
    .scalar('title', `${scope}title`, libraryTitleLabel)
    .scalar('sect', `${scope}sect`)
    .scalar('set', `${scope}set`)
    .list('taints', `${scope}taints`, taintLabel)
    .flag('limitedFormat', `${scope}limited_format`)
    .scalar('predefinedLimitedFormat', `${scope}predefined_limited_format`)
    .scalar('cardText', `${scope}card_text`)
    .scalar('artist', `${scope}artist`).chips
}

/**
 * Returns a new filter with only `chip` dropped: a single value for
 * multi-value filters, the default value otherwise.
 */
export function removeCardFilterChip<T extends CardFilter>(
  filter: T,
  defaults: T,
  chip: FilterChip,
): T {
  const current = (filter as Record<string, unknown>)[chip.key]
  if (chip.item !== undefined && Array.isArray(current)) {
    return {
      ...filter,
      [chip.key]: current.filter((value) => value !== chip.item),
    }
  }
  const defaultValue = (defaults as Record<string, unknown>)[chip.key]
  return {
    ...filter,
    [chip.key]: Array.isArray(defaultValue) ? [...defaultValue] : defaultValue,
  }
}
