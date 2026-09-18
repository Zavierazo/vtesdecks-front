import { Injectable, inject } from '@angular/core'
import { ApiDeck } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { catchError, combineLatest, defer, map, of, switchMap } from 'rxjs'
import { decodeSnapshot } from '../utils/deck-snapshot'
import { snapshotView } from '../modules/deck-snapshot/snapshot-view'

@Injectable({ providedIn: 'root' })
export class DeckSnapshotService {
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly cryptService = inject(CryptService)
  private readonly libraryService = inject(LibraryService)

  load(link: string) {
    return defer(() => of(decodeSnapshot(link))).pipe(
      switchMap((snapshot) =>
        combineLatest([
          this.cryptService.getCryptCards(),
          this.libraryService.getLibraryCards(),
        ]).pipe(
          catchError(() => {
            if (
              this.cryptQuery.getAll({}).length &&
              this.libraryQuery.getAll({}).length
            ) {
              return of([])
            }
            throw new Error('catalog_error')
          }),
          map(() => {
            if (
              !this.cryptQuery.getAll({}).length ||
              !this.libraryQuery.getAll({}).length
            ) {
              throw new Error('catalog_error')
            }
            const view = snapshotView(
              snapshot,
              this.cryptQuery.getAll({}),
              this.libraryQuery.getAll({}),
            )
            const countType = (type: string) =>
              view.library
                .filter((card) => card.type === type)
                .reduce((sum, card) => sum + card.number, 0)
            const deck: ApiDeck = {
              id: '',
              type: 'SNAPSHOT',
              name: snapshot.name,
              author: snapshot.author,
              description: snapshot.description,
              owner: false,
              published: false,
              collection: false,
              crypt: view.knownCrypt,
              library: view.knownLibrary,
              views: 0,
              viewsLastMonth: 0,
              votes: 0,
              comments: 0,
              tournament: '',
              players: 0,
              year: 0,
              clanIcons: [],
              disciplineIcons: [],
              creationDate: new Date(0),
              modifyDate: new Date(0),
              stats: {
                crypt: view.cryptSize,
                library: view.librarySize,
                minCrypt: view.minCrypt,
                maxCrypt: view.maxCrypt,
                avgCrypt: view.avgCrypt,
                poolCost: view.poolCost,
                bloodCost: view.bloodCost,
                cryptDisciplines: this.cryptQuery.getDisciplines(
                  view.knownCrypt.filter((card) => card.number > 0),
                ),
                libraryDisciplines: this.libraryQuery.getDisciplines(
                  view.knownLibrary.filter((card) => card.number > 0),
                ),
                libraryClans: this.libraryQuery.getClans(
                  view.knownLibrary.filter((card) => card.number > 0),
                ),
                event: countType('Event'),
                master: countType('Master'),
                action: countType('Action'),
                politicalAction: countType('Political Action'),
                equipment: countType('Equipment'),
                retainer: countType('Retainer'),
                ally: countType('Ally'),
                actionModifier: countType('Action Modifier'),
                combat: countType('Combat'),
                reaction: countType('Reaction'),
                masterTrifle: view.knownLibrary
                  .filter((card) => view.libraryById.get(card.id)?.trifle)
                  .reduce((sum, card) => sum + card.number, 0),
              },
            }
            return { deck, unknown: view.unknown, snapshot }
          }),
        ),
      ),
    )
  }
}
