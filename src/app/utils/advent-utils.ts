import { ADVENT_DATA, AdventData } from '@advent/advent.data'

/**
 * Get the current advent data if active
 * @param today Optional date to check against (defaults to current date)
 * @returns AdventData if active, null otherwise
 */
export function getCurrentAdventData(
  today: Date = new Date(),
): AdventData | null {
  return (
    ADVENT_DATA.find(
      (advent) => today >= advent.startDate && today <= advent.endDate,
    ) || null
  )
}
