import { NgClass, SlicePipe } from '@angular/common'
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
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { isCrypt } from '../../../utils/vtes-utils'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'

@Component({
  selector: 'app-draw-cards',
  templateUrl: './draw-cards.component.html',
  styleUrls: ['./draw-cards.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    SlicePipe,
    NgxGoogleAnalyticsModule,
    TranslocoPipe,
    CryptComponent,
    LibraryComponent,
  ],
})
export class DrawCardsComponent implements OnInit {
  modal = inject(NgbActiveModal)

  @Input() cards!: ApiCard[]
  cryptList = signal<ApiCard[]>([])
  cryptDrawn = signal<number>(4)
  cryptUnique: Signal<number> = computed(
    () =>
      new Set(
        this.cryptList()
          .slice(0, this.cryptDrawn())
          .map((c) => c.id),
      ).size,
  )
  libraryList = signal<ApiCard[]>([])
  libraryDrawn = signal<number>(7)

  ngOnInit() {
    const crypt: ApiCard[] = []
    const library: ApiCard[] = []
    this.cards.forEach((card) => {
      Array(card.number)
        .fill(card)
        .forEach((card) =>
          isCrypt(card) ? crypt.push(card) : library.push(card),
        )
    })
    this.shuffle(crypt)
    this.shuffle(library)
    this.cryptList.update(() => crypt)
    this.libraryList.update(() => library)
  }

  dismissModal() {
    this.modal.dismiss()
  }

  shuffleCrypt(): void {
    this.cryptList.update((current) => {
      const shuffle = [...current]
      this.shuffle(shuffle)
      return shuffle
    })
    this.cryptDrawn.update(() => 4)
  }

  decreaseCryptDrawn(): void {
    this.cryptDrawn.update((current) => Math.max(current - 1, 0))
  }

  increaseCryptDrawn(): void {
    this.cryptDrawn.update((current) =>
      Math.min(current + 1, this.cryptList().length),
    )
  }

  shuffleLibrary(): void {
    this.libraryList.update((current) => {
      const shuffle = [...current]
      this.shuffle(shuffle)
      return shuffle
    })
    this.libraryDrawn.update(() => 7)
  }

  decreaseLibraryDrawn(): void {
    this.libraryDrawn.update((current) => Math.max(current - 1, 0))
  }

  increaseLibraryDrawn(): void {
    this.libraryDrawn.update((current) =>
      Math.min(current + 1, this.libraryList().length),
    )
  }

  private shuffle(list: ApiCard[]): void {
    list.sort(() => Math.random() - 0.5)
  }
}
