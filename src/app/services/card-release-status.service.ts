import { Injectable, inject } from '@angular/core'
import { ApiCard } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId } from '@utils'
import { Observable, combineLatest, map } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class CardReleaseStatusService {
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  isUnreleased(cardId: number): boolean {
    return isCryptId(cardId)
      ? (this.cryptQuery.getEntity(cardId)?.unreleased ?? false)
      : (this.libraryQuery.getEntity(cardId)?.unreleased ?? false)
  }

  countUnreleasedCopies(cards: ApiCard[]): number {
    return cards
      .filter((card) => card.number > 0 && this.isUnreleased(card.id))
      .reduce((total, card) => total + card.number, 0)
  }

  selectUnreleasedCopyCount(cards$: Observable<ApiCard[]>): Observable<number> {
    return combineLatest([
      cards$,
      this.cryptQuery.selectAll({}),
      this.libraryQuery.selectAll({}),
    ]).pipe(map(([cards]) => this.countUnreleasedCopies(cards)))
  }
}
