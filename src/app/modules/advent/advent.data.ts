import type { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { ADVENT_2025 } from './advent-2025.data'
import { ADVENT_2026 } from './advent-2026.data'

export interface AdventDayData {
  title: string
  image?: string
  content: string
  archetypeId?: number
  releaseDeckId?: string
  releasePercentage?: number
  validation?: (query: DeckBuilderQuery) => {
    cryptErrors?: string[]
    libraryErrors?: string[]
  }
}

export interface AdventData {
  year: number
  theme: string
  description: string
  rules: string[]
  startDate: Date
  endDate: Date
  validation?: (query: DeckBuilderQuery) => string[]
  days: Record<number, AdventDayData>
}

export const ADVENT_DATA: AdventData[] = [ADVENT_2025, ADVENT_2026]
