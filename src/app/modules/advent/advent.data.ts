import type { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { ADVENT_2025 } from './advent-2025.data'
import { ADVENT_2026 } from './advent-2026.data'
import type { AdventTranslate } from './advent-translation'

export interface AdventDayData {
  image?: string
  archetypeId?: number
  releaseDeckId?: string
  releasePercentage?: number
  validation?: (
    query: DeckBuilderQuery,
    translate?: AdventTranslate,
  ) => {
    cryptErrors?: string[]
    libraryErrors?: string[]
  }
}

export interface AdventData {
  year: number
  startDate: Date
  endDate: Date
  validation?: (
    query: DeckBuilderQuery,
    translate?: AdventTranslate,
  ) => string[]
  days: Record<number, AdventDayData>
}

export const ADVENT_DATA: AdventData[] = [ADVENT_2025, ADVENT_2026]
