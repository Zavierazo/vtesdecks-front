import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  Signal,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCrypt } from '@utils'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'

interface DrawCard {
  uid: number
  card: ApiCard
}

const CRYPT_HAND = 4
const LIBRARY_HAND = 7

@Component({
  selector: 'app-draw-cards',
  templateUrl: './draw-cards.component.html',
  styleUrls: ['./draw-cards.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    NgxGoogleAnalyticsModule,
    TranslocoPipe,
    CryptComponent,
    LibraryComponent,
  ],
})
export class DrawCardsComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  @Input() cards!: ApiCard[]

  // Crypt regions
  cryptRest = signal<DrawCard[]>([])
  cryptHand = signal<DrawCard[]>([])
  cryptControlled = signal<DrawCard[]>([])

  // Library regions
  libraryRest = signal<DrawCard[]>([])
  libraryHand = signal<DrawCard[]>([])
  libraryAshHeap = signal<DrawCard[]>([])

  private uid = 0

  cryptSize: Signal<number> = computed(
    () =>
      this.cryptHand().length +
      this.cryptRest().length +
      this.cryptControlled().length,
  )
  librarySize: Signal<number> = computed(
    () =>
      this.libraryHand().length +
      this.libraryRest().length +
      this.libraryAshHeap().length,
  )

  cryptUnique: Signal<number> = computed(
    () => new Set(this.cryptHand().map((c) => c.card.id)).size,
  )

  controlledCapacity: Signal<number> = computed(() =>
    this.cryptControlled().reduce(
      (total, item) =>
        total + (this.cryptQuery.getEntity(item.card.id)?.capacity ?? 0),
      0,
    ),
  )

  ashHeapBlood: Signal<number> = computed(() =>
    this.libraryAshHeap().reduce(
      (total, item) =>
        total + (this.libraryQuery.getEntity(item.card.id)?.bloodCost ?? 0),
      0,
    ),
  )

  ashHeapPool: Signal<number> = computed(() =>
    this.libraryAshHeap().reduce(
      (total, item) =>
        total + (this.libraryQuery.getEntity(item.card.id)?.poolCost ?? 0),
      0,
    ),
  )

  ngOnInit() {
    const crypt: DrawCard[] = []
    const library: DrawCard[] = []
    this.cards.forEach((card) => {
      for (let i = 0; i < card.number; i++) {
        const entry: DrawCard = { uid: this.uid++, card }
        isCrypt(card) ? crypt.push(entry) : library.push(entry)
      }
    })
    this.shuffle(crypt)
    this.shuffle(library)
    this.cryptHand.set(crypt.slice(0, CRYPT_HAND))
    this.cryptRest.set(crypt.slice(CRYPT_HAND))
    this.libraryHand.set(library.slice(0, LIBRARY_HAND))
    this.libraryRest.set(library.slice(LIBRARY_HAND))
  }

  dismissModal() {
    this.modal.dismiss()
  }

  // ---- Crypt actions ----

  shuffleCrypt(): void {
    const all = [
      ...this.cryptHand(),
      ...this.cryptControlled(),
      ...this.cryptRest(),
    ]
    this.shuffle(all)
    this.cryptHand.set(all.slice(0, CRYPT_HAND))
    this.cryptRest.set(all.slice(CRYPT_HAND))
    this.cryptControlled.set([])
  }

  increaseCryptDrawn(): void {
    const rest = this.cryptRest()
    if (rest.length === 0) {
      return
    }
    this.cryptHand.update((hand) => [...hand, rest[0]])
    this.cryptRest.update((current) => current.slice(1))
  }

  decreaseCryptDrawn(): void {
    const hand = this.cryptHand()
    if (hand.length === 0) {
      return
    }
    const card = hand[hand.length - 1]
    this.cryptHand.update((current) => current.slice(0, -1))
    this.cryptRest.update((current) => [card, ...current])
  }

  drawAllCrypt(): void {
    const rest = this.cryptRest()
    if (rest.length === 0) {
      return
    }
    this.cryptHand.update((hand) => [...hand, ...rest])
    this.cryptRest.set([])
  }

  // Bring an uncontrolled vampire into the controlled region.
  playCrypt(item: DrawCard): void {
    this.cryptHand.update((hand) => hand.filter((c) => c.uid !== item.uid))
    this.cryptControlled.update((controlled) => [item, ...controlled])
  }

  // ---- Library actions ----

  shuffleLibrary(): void {
    const all = [
      ...this.libraryHand(),
      ...this.libraryAshHeap(),
      ...this.libraryRest(),
    ]
    this.shuffle(all)
    this.libraryHand.set(all.slice(0, LIBRARY_HAND))
    this.libraryRest.set(all.slice(LIBRARY_HAND))
    this.libraryAshHeap.set([])
  }

  increaseLibraryDrawn(): void {
    const rest = this.libraryRest()
    if (rest.length === 0) {
      return
    }
    this.libraryHand.update((hand) => [...hand, rest[0]])
    this.libraryRest.update((current) => current.slice(1))
  }

  decreaseLibraryDrawn(): void {
    const hand = this.libraryHand()
    if (hand.length === 0) {
      return
    }
    const card = hand[hand.length - 1]
    this.libraryHand.update((current) => current.slice(0, -1))
    this.libraryRest.update((current) => [card, ...current])
  }

  drawAllLibrary(): void {
    const rest = this.libraryRest()
    if (rest.length === 0) {
      return
    }
    this.libraryHand.update((hand) => [...hand, ...rest])
    this.libraryRest.set([])
  }

  // Play a card to the ash heap and automatically draw the next one to keep
  // the hand size, following the regular game flow.
  playLibrary(item: DrawCard): void {
    this.libraryHand.update((hand) => hand.filter((c) => c.uid !== item.uid))
    this.libraryAshHeap.update((ashHeap) => [item, ...ashHeap])
    const rest = this.libraryRest()
    if (rest.length > 0) {
      this.libraryHand.update((hand) => [...hand, rest[0]])
      this.libraryRest.update((current) => current.slice(1))
    }
  }

  private shuffle(list: DrawCard[]): void {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
  }
}
