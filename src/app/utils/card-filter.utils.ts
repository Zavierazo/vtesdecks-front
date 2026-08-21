import { CryptFilter, LibraryFilter } from '@models'

type CardFilter = CryptFilter | LibraryFilter

const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || value === false

const isDefaultValue = (value: unknown, defaultValue: unknown): boolean => {
  if (Array.isArray(value) || Array.isArray(defaultValue)) {
    const current = (value ?? []) as unknown[]
    const defaults = (defaultValue ?? []) as unknown[]
    return (
      current.length === defaults.length &&
      current.every((item, index) => item === defaults[index])
    )
  }
  if (isEmptyValue(value) && isEmptyValue(defaultValue)) {
    return true
  }
  return value === defaultValue
}

/**
 * True when the filter matches its defaults, i.e. it wouldn't narrow results.
 * `name` is ignored: the collection/wishlist lists keep their own server-side
 * card-name search, so the panel's name field never drives cardIds.
 */
export function isDefaultCardFilter(
  filter: CardFilter,
  defaultFilter: CardFilter,
  ignoredKeys: (keyof CryptFilter | keyof LibraryFilter)[] = ['name'],
): boolean {
  const keys = new Set([
    ...Object.keys(filter),
    ...Object.keys(defaultFilter),
  ]) as Set<keyof CardFilter>
  return [...keys]
    .filter((key) => !ignoredKeys.includes(key))
    .every((key) => isDefaultValue(filter[key], defaultFilter[key]))
}
