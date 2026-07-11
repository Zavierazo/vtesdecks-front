import { inject, Injectable } from '@angular/core'
import { AuthQuery } from '@state/auth/auth.query'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SetQuery } from '@state/set/set.query'
import { getSetAbbrev, isCryptId } from '@utils'

/**
 * Resolves which printing/set a card image should use based on the user's
 * cardPrintingPreference when no explicit set was chosen by the caller.
 * NEWEST is the site default (the CDN default image is the newest printing),
 * so only FIRST needs a set lookup.
 */
@Injectable({
  providedIn: 'root',
})
export class CardImageSetService {
  private readonly authQuery = inject(AuthQuery)
  private readonly setQuery = inject(SetQuery)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  resolveSet(card: { id: number; sets?: string[] }): string | undefined {
    if (this.authQuery.getCardPrintingPreference() !== 'FIRST') {
      return undefined
    }
    // card.sets is sorted from oldest to newest: the first entry whose set
    // has a releaseDate is the first printing
    const abbrevs = (card.sets ?? this.getCardSets(card.id))?.map(getSetAbbrev)
    return abbrevs?.find(
      (abbrev) => this.setQuery.getEntityByAbbrev(abbrev)?.releaseDate,
    )
  }

  private getCardSets(id: number): string[] | undefined {
    return isCryptId(id)
      ? this.cryptQuery.getEntity(id)?.sets
      : this.libraryQuery.getEntity(id)?.sets
  }
}
