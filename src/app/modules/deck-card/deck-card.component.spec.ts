import {
  showsTournamentPosition,
  tournamentResultBadgeClass,
  tournamentResultIcon,
} from './deck-card.component'
import { describe, expect, it } from 'vitest'

describe('tournament result presentation', () => {
  it('renders the podium with distinct trophy treatments', () => {
    expect(tournamentResultIcon(1)).toBe('bi-trophy-fill')
    expect(tournamentResultBadgeClass(1)).toBe('badge-warning')
    expect(tournamentResultIcon(2)).toBe('bi-award-fill')
    expect(tournamentResultBadgeClass(2)).toBe('badge-secondary')
    expect(tournamentResultIcon(3)).toBe('bi-award-fill')
    expect(tournamentResultBadgeClass(3)).toBe('badge-bronze')
  })

  it('labels lower places and retains the generic tournament style when absent', () => {
    expect(tournamentResultIcon(4)).toBe('bi-flag-fill')
    expect(tournamentResultBadgeClass(4)).toBe('badge-secondary')
    expect(showsTournamentPosition(4)).toBe(true)
    expect(showsTournamentPosition()).toBe(false)
    expect(tournamentResultBadgeClass()).toBe('badge-warning')
  })
})
