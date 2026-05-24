import { DatePipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiDeckBuilderHistory } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId } from '@utils'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'

export interface HistoryEventWithDiff extends ApiDeckBuilderHistory {
  diff: number
  originalIndex: number
}

@Component({
  selector: 'app-deck-history-modal',
  templateUrl: './deck-history-modal.component.html',
  styleUrls: ['./deck-history-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    DatePipe,
    NgClass,
    CryptComponent,
    LibraryComponent,
  ],
})
export class DeckHistoryModalComponent implements OnInit {
  @Input() deckId!: string

  modal = inject(NgbActiveModal)
  private readonly apiDataService = inject(ApiDataService)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly libraryQuery = inject(LibraryQuery)

  loading = signal(true)
  events = signal<ApiDeckBuilderHistory[]>([])
  taggedCheckpoints = signal<ApiDeckBuilderHistory[]>([])

  eventsWithDiff = computed<HistoryEventWithDiff[]>(() => {
    const cardCounts = new Map<number, number>()
    return this.events().map((event, index) => {
      const previous = cardCounts.get(event.cardId) ?? 0
      let diff: number
      if (event.action === 'DELETE') {
        diff = -previous
        cardCounts.delete(event.cardId)
      } else {
        diff = event.number - previous
        cardCounts.set(event.cardId, event.number)
      }
      return { ...event, diff, originalIndex: index }
    })
  })

  reversedEventsWithDiff = computed<HistoryEventWithDiff[]>(() =>
    this.eventsWithDiff()
      .filter((e) => e.diff !== 0)
      .slice()
      .reverse(),
  )

  ngOnInit(): void {
    this.apiDataService.getDeckBuilderHistory(this.deckId).subscribe({
      next: (history) => {
        this.events.set(history)
        this.taggedCheckpoints.set(history.filter((e) => e.tag !== undefined))
        this.loading.set(false)
        this.changeDetector.markForCheck()
      },
      error: () => {
        this.loading.set(false)
        this.changeDetector.markForCheck()
      },
    })
  }

  restoreCheckpoint(checkpoint: ApiDeckBuilderHistory): void {
    const allEvents = this.events()
    const cutoffIndex = allEvents.indexOf(checkpoint)
    this.restoreAtIndex(cutoffIndex)
  }

  restoreAtIndex(index: number): void {
    if (index === -1) {
      return
    }
    const eventsToReplay = this.events().slice(0, index + 1)
    const cardMap = new Map<number, number>()
    for (const event of eventsToReplay) {
      if (event.action === 'DELETE') {
        cardMap.delete(event.cardId)
      } else {
        cardMap.set(event.cardId, event.number)
      }
    }
    const cards: ApiCard[] = Array.from(cardMap.entries()).map(
      ([id, number]) => {
        const type = isCryptId(id)
          ? undefined
          : this.libraryQuery.getEntity(id)?.type
        return { id, number, type }
      },
    )
    this.modal.close(cards)
  }

  isCardCrypt(id: number): boolean {
    return isCryptId(id)
  }
}
