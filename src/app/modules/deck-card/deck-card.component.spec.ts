import {
  hasTournamentResult,
  isTournamentWinner,
  tournamentResultIcon,
} from './deck-card.component'
import { describe, expect, it } from 'vitest'

describe('tournament result presentation', () => {
  it('distinguishes a winner from every other finalist', () => {
    expect(tournamentResultIcon(1)).toBe('bi-trophy-fill')
    expect(isTournamentWinner(1)).toBe(true)
    expect(tournamentResultIcon(2)).toBe('bi-flag-fill')
    expect(isTournamentWinner(2)).toBe(false)
  })

  it('labels every recorded final-table position and leaves missing results unchanged', () => {
    expect(tournamentResultIcon(4)).toBe('bi-flag-fill')
    expect(hasTournamentResult(2)).toBe(true)
    expect(hasTournamentResult(3)).toBe(true)
    expect(hasTournamentResult(4)).toBe(true)
    expect(hasTournamentResult(5)).toBe(true)
    expect(hasTournamentResult()).toBe(false)
    expect(hasTournamentResult(0)).toBe(false)
  })
})
