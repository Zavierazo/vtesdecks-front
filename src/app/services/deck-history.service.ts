import { Injectable, inject } from '@angular/core'
import { LastVisitedDeck } from '@models'
import { LocalStorageService } from './local-storage.service'

@Injectable({
  providedIn: 'root',
})
export class DeckHistoryService {
  private readonly localStorageService = inject(LocalStorageService)
  private readonly storageKey = 'lastVisitedDecks'
  private readonly maxDecks = 10

  addVisitedDeck(id: string, name: string, author: string): void {
    const decks = this.getLastVisitedDecks()

    // Remove existing entry if present
    const filtered = decks.filter((d) => d.id !== id)

    // Add new entry at the beginning
    const newDeck: LastVisitedDeck = {
      id,
      name,
      author,
      visitedAt: Date.now(),
    }

    filtered.unshift(newDeck)

    // Keep only the last N decks
    const limited = filtered.slice(0, this.maxDecks)

    this.localStorageService.setValue(this.storageKey, limited)
  }

  getLastVisitedDecks(): LastVisitedDeck[] {
    const decks = this.localStorageService.getValue<LastVisitedDeck[]>(
      this.storageKey,
    )
    return decks ?? []
  }
}
