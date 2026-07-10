import { Injectable, inject } from '@angular/core'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import {
  CLAN_LIST,
  DISCIPLINE_LIST,
  normalizeText,
  sortTrigramSimilarity,
} from '@utils'
import { Observable, combineLatest, map } from 'rxjs'

export type MarkdownSuggestionKind = 'card' | 'clan' | 'discipline' | 'prefix'

export interface MarkdownSuggestion {
  kind: MarkdownSuggestionKind
  label: string
  // Text inside the double brackets, e.g. 'card:Blood Doll'
  insert: string
  icons: string[]
  descriptionKey?: string
}

const PREFIXES: MarkdownSuggestion[] = [
  {
    kind: 'prefix',
    label: 'card:',
    insert: 'card:',
    icons: [],
    descriptionKey: 'suggest_card',
  },
  {
    kind: 'prefix',
    label: 'clan:',
    insert: 'clan:',
    icons: [],
    descriptionKey: 'suggest_clan',
  },
  {
    kind: 'prefix',
    label: 'discipline:',
    insert: 'discipline:',
    icons: [],
    descriptionKey: 'suggest_discipline',
  },
  {
    kind: 'prefix',
    label: 'youtube:',
    insert: 'youtube:',
    icons: [],
    descriptionKey: 'suggest_youtube',
  },
]

@Injectable({
  providedIn: 'root',
})
export class MarkdownSuggestionService {
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  searchCards(term: string, limit = 8): Observable<MarkdownSuggestion[]> {
    return combineLatest([
      this.cryptQuery.selectByName(term, limit),
      this.libraryQuery.selectByName(term, limit),
    ]).pipe(
      map(([crypt, library]) => {
        const suggestions: MarkdownSuggestion[] = [
          ...crypt.map((card) => ({
            kind: 'card' as const,
            label: card.name,
            insert: `card:${card.name}`,
            icons: card.adv ? [card.clanIcon, 'advanced'] : [card.clanIcon],
          })),
          ...library.map((card) => ({
            kind: 'card' as const,
            label: card.name,
            insert: `card:${card.name}`,
            icons: card.typeIcons ?? [],
          })),
        ]
        return suggestions
          .sort((a, b) => sortTrigramSimilarity(a.label, b.label, term))
          .slice(0, limit)
      }),
    )
  }

  searchClans(term: string, limit = 8): MarkdownSuggestion[] {
    const normalized = normalizeText(term)
    return CLAN_LIST.filter((clan) =>
      normalizeText(clan.name).includes(normalized),
    )
      .slice(0, limit)
      .map((clan) => ({
        kind: 'clan' as const,
        label: clan.name,
        insert: `clan:${clan.name}`,
        icons: [clan.icon],
      }))
  }

  searchDisciplines(term: string, limit = 8): MarkdownSuggestion[] {
    const normalized = normalizeText(term)
    return DISCIPLINE_LIST.filter(
      (discipline) =>
        normalizeText(discipline.name).includes(normalized) ||
        discipline.abbrev.toLowerCase().startsWith(normalized),
    )
      .slice(0, limit)
      .map((discipline) => ({
        kind: 'discipline' as const,
        label: discipline.name,
        insert: `discipline:${discipline.name}`,
        icons: [discipline.icon],
      }))
  }

  prefixSuggestions(term: string): MarkdownSuggestion[] {
    const lowered = term.toLowerCase()
    return PREFIXES.filter((prefix) => prefix.label.startsWith(lowered))
  }
}
