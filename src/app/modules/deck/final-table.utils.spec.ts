import { ApiDeck } from '@models'
import { describe, expect, it } from 'vitest'
import { buildFinalTableSeats } from './final-table.utils'

const deck = (id: string, finalSeat?: number): ApiDeck =>
  ({
    id,
    name: `Deck ${id}`,
    finalSeat,
  }) as ApiDeck

describe('buildFinalTableSeats', () => {
  it('orders all five finalists clockwise by seat', () => {
    const seats = buildFinalTableSeats([
      deck('four', 4),
      deck('one', 1),
      deck('three', 3),
      deck('two', 2),
      deck('five', 5),
    ])

    expect(seats.map((seat) => seat.deck?.id)).toEqual([
      'one',
      'two',
      'three',
      'four',
      'five',
    ])
    expect(seats.map((seat) => seat.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps all five seats and does not invent unknown seating', () => {
    const seats = buildFinalTableSeats([deck('one', 1), deck('unknown')])

    expect(seats.slice(0, 5).map((seat) => seat.number)).toEqual([
      1, 2, 3, 4, 5,
    ])
    expect(seats.slice(1, 5).every((seat) => !seat.deck)).toBe(true)
    expect(seats[5]).toEqual({ deck: deck('unknown') })
  })

  it('preserves invalid or duplicate seating outside the diagram', () => {
    const seats = buildFinalTableSeats([
      deck('one', 1),
      deck('duplicate', 1),
      deck('invalid', 6),
    ])
    expect(seats).toHaveLength(7)
    expect(seats.filter((seat) => seat.deck)).toHaveLength(3)
    expect(seats.slice(5).every((seat) => seat.number === undefined)).toBe(true)
  })
})
