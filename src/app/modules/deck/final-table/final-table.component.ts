import { DecimalPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
} from '@angular/core'
import { toObservable, toSignal } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiDeck } from '@models'
import { ApiDataService } from '@services'
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs'
import { buildFinalTableSeats, FinalTableSeat } from '../final-table.utils'

@Component({
  selector: 'app-final-table',
  imports: [DecimalPipe, NgClass, RouterLink, TranslocoDirective],
  templateUrl: './final-table.component.html',
  styleUrl: './final-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalTableComponent {
  private readonly api = inject(ApiDataService)
  readonly deck = input.required<ApiDeck>()
  readonly expanded = linkedSignal({
    source: () => this.deck().id,
    computation: () => false,
  })
  readonly seats = toSignal(
    toObservable(this.deck).pipe(
      map((deck) => deck.eventId),
      distinctUntilChanged(),
      switchMap((eventId) => {
        if (!eventId) {
          return of<FinalTableSeat[]>([])
        }
        return this.api
          .getDecks(0, 5, { eventId, minPosition: 1, maxPosition: 5 })
          .pipe(
            map(({ decks }) =>
              decks.length > 1 ? buildFinalTableSeats(decks) : [],
            ),
            startWith([] as FinalTableSeat[]),
            catchError(() => of<FinalTableSeat[]>([])),
          )
      }),
    ),
    { initialValue: [] as FinalTableSeat[] },
  )
}
