import { computed, Injectable, signal } from '@angular/core'
import { ApiDeckBuilder } from '@models'

export interface LocalDeckDraft {
  id: string
  name: string
  updatedAt: number
  sourceDeckId?: string
  deck: ApiDeckBuilder
}

const STORAGE_KEY = 'namedDeckDrafts_v1'

@Injectable({ providedIn: 'root' })
export class LocalDeckDraftsService {
  readonly drafts = signal<LocalDeckDraft[]>([])
  readonly newDeckDrafts = computed(() =>
    this.drafts().filter((draft) => !draft.sourceDeckId),
  )
  readonly storageError = signal(false)

  constructor() {
    this.reload()
  }

  reload(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const drafts: unknown = raw ? JSON.parse(raw) : []
      if (
        !Array.isArray(drafts) ||
        !drafts.every((draft) => this.valid(draft))
      ) {
        throw new Error('Invalid local drafts')
      }
      this.drafts.set(drafts)
      this.storageError.set(false)
      return true
    } catch {
      this.storageError.set(true)
      return false
    }
  }

  get(id: string): LocalDeckDraft | undefined {
    return this.drafts().find((draft) => draft.id === id)
  }

  save(
    name: string,
    deck: ApiDeckBuilder,
    id?: string,
  ): LocalDeckDraft | undefined {
    if (!name.trim() || !this.reload()) {
      return undefined
    }
    if (deck.id) {
      id = this.drafts().find((draft) => draft.sourceDeckId === deck.id)?.id
    }
    if (id && !this.get(id)) {
      this.storageError.set(true)
      return undefined
    }
    const draft: LocalDeckDraft = {
      id: id ?? crypto.randomUUID(),
      name: name.trim(),
      updatedAt: Date.now(),
      sourceDeckId: deck.id,
      // Server identity is tracked separately from the editable draft content.
      deck: {
        name: deck.name ?? '',
        description: deck.description ?? '',
        cards: (deck.cards ?? []).map((card) => ({ ...card })),
        extra: deck.extra,
        published: deck.published ?? false,
        collection: deck.collection ?? false,
      },
    }
    return this.write([
      draft,
      ...this.drafts().filter((item) => item.id !== draft.id),
    ])
      ? draft
      : undefined
  }

  rename(id: string, name: string): boolean {
    if (!name.trim() || !this.reload()) {
      return false
    }
    const draft = this.get(id)
    if (!draft) {
      return false
    }
    return this.write(
      this.drafts().map((item) =>
        item.id === id
          ? { ...item, name: name.trim(), updatedAt: Date.now() }
          : item,
      ),
    )
  }

  remove(id: string): boolean {
    return (
      this.reload() &&
      this.write(this.drafts().filter((draft) => draft.id !== id))
    )
  }

  private write(drafts: LocalDeckDraft[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
      this.drafts.set(drafts)
      this.storageError.set(false)
      return true
    } catch {
      this.storageError.set(true)
      return false
    }
  }

  private valid(value: unknown): value is LocalDeckDraft {
    if (!value || typeof value !== 'object') {
      return false
    }
    const draft = value as LocalDeckDraft
    return (
      typeof draft.id === 'string' &&
      typeof draft.name === 'string' &&
      (draft.sourceDeckId === undefined ||
        typeof draft.sourceDeckId === 'string') &&
      Number.isFinite(draft.updatedAt) &&
      !!draft.deck &&
      typeof draft.deck.name === 'string' &&
      typeof draft.deck.description === 'string' &&
      Array.isArray(draft.deck.cards) &&
      draft.deck.cards.every(
        (card) =>
          card &&
          Number.isSafeInteger(card.id) &&
          card.id > 0 &&
          Number.isSafeInteger(card.number) &&
          card.number >= 0,
      )
    )
  }
}
