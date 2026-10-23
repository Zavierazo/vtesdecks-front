// Keep the home banner independent of the calendar and its validators.
export const ADVENT_EDITIONS = [
  {
    year: 2025,
    startDate: new Date('2025-12-01T00:00:00Z'),
    endDate: new Date('2025-12-31T00:00:00Z'),
  },
  {
    year: 2026,
    startDate: new Date('2026-12-01T00:00:00Z'),
    endDate: new Date('2026-12-31T23:59:59.999Z'),
  },
]

/**
 * Get the current advent data if active
 * @param today Optional date to check against (defaults to current date)
 * @returns Edition dates if active, null otherwise
 */
export function getCurrentAdventData(
  today: Date = new Date(),
): (typeof ADVENT_EDITIONS)[number] | null {
  return (
    ADVENT_EDITIONS.find(
      (advent) => today >= advent.startDate && today <= advent.endDate,
    ) || null
  )
}
