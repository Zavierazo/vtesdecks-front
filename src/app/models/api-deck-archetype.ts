import { ApiArchetypeKeyCard } from './api-archetype-key-card'

export interface ApiDeckArchetype {
  id?: number
  name: string
  icon?: string
  type: string
  description?: string
  deckId: string
  secondaryDeckId?: string | null
  cardRequirements?: { cardId: number; minimumQuantity: number }[]
  attributeRequirements?: ArchetypeAttributeRequirement[]
  nearestArchetype?: { id: number; name: string; similarity: number } | null
  enabled: boolean
  deckCount: number
  metaCount: number
  metaTotal: number
  previousMetaCount?: number | null
  previousMetaTotal?: number | null
  metaShareChange?: number | null
  price?: number
  currency?: string
  creationDate: Date
  modificationDate: Date
  keyCrypt?: ApiArchetypeKeyCard[]
  keyLibrary?: ApiArchetypeKeyCard[]
  clans?: string[]
  disciplines?: string[]
  trend?: 'TRENDING' | 'DECLINING' | 'STABLE'
}

export interface ArchetypeAttributeRequirement {
  type:
    'CRYPT_CLAN' | 'LIBRARY_TYPE' | 'CRYPT_DISCIPLINE' | 'LIBRARY_DISCIPLINE'
  value: string
  minimumQuantity: number
}
