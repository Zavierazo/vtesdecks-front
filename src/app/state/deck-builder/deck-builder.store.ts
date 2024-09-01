import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { ApiCard } from '../../models/api-card';

export interface DeckBuilderState {
  id?: string;
  name?: string;
  description?: string;
  published: boolean;
  cards: ApiCard[];
  cryptErrors: string[];
  libraryErrors: string[];
  saved: boolean;
}

const initialState: DeckBuilderState = {
  cards: [],
  cryptErrors: [],
  libraryErrors: [],
  published: true,
  saved: true,
};

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: DeckBuilderStore.storeName, resettable: true })
export class DeckBuilderStore extends Store<DeckBuilderState> {
  static readonly storeName = 'deck-builder';

  constructor() {
    super(initialState);
  }

  updateName(name: string): void {
    this.update((state) => ({ ...state, name }));
  }

  updateDescription(description: string): void {
    this.update((state) => ({ ...state, description }));
  }

  updatePublished(published: boolean): void {
    this.update((state) => ({ ...state, published }));
  }

  addCard(id: number, type?: string): void {
    if (this.getValue().cards.find((c) => c.id === id)) {
      const cards = this.getValue().cards.map((c) =>
        c.id === id ? { ...c, number: c.number + 1 } : c
      );
      this.update((state) => ({
        ...state,
        cards,
      }));
    } else {
      this.update((state) => ({
        ...state,
        cards: [...state.cards, { id, type, number: 1 }],
      }));
    }
  }

  removeCard(id: number): void {
    this.update((state) => ({
      ...state,
      cards: state.cards
        .map((c) => (c.id === id ? { ...c, number: c.number - 1 } : c))
        .filter((c) => c.number > 0),
    }));
  }

  setCryptErrors(errors: string[]): void {
    this.update((state) => ({ ...state, cryptErrors: errors }));
  }

  setLibraryErrors(errors: string[]): void {
    this.update((state) => ({ ...state, libraryErrors: errors }));
  }

  setSaved(saved: boolean): void {
    this.update((state) => ({ ...state, saved }));
  }
}
