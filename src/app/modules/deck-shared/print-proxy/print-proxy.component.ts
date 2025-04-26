import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  signal,
} from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { catchError, filter, tap, throwError } from 'rxjs'
import { ApiCard } from '../../../models/api-card'
import { ApiProxy } from '../../../models/api-proxy'
import { ApiProxyCard } from '../../../models/api-proxy-card'
import { ApiProxyCardOption } from '../../../models/api-proxy-card-option'
import { ToastService } from '../../../services/toast.service'
import { isCrypt, isLibrary } from '../../../utils/vtes-utils'
import { CryptComponent } from '../crypt/crypt.component'
import { LibraryComponent } from '../library/library.component'
import { ApiDataService } from './../../../services/api.data.service'

export interface ApiProxyItem {
  cardId: number
  isCrypt: boolean
  isLibrary: boolean
  amount: number
  maxAmount?: number
  set?: ApiProxyCardOption
  setOptions: ApiProxyCardOption[]
  setControl?: FormControl<string | null>
}

@UntilDestroy()
@Component({
  selector: 'app-print-proxy',
  templateUrl: './print-proxy.component.html',
  styleUrls: ['./print-proxy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    FormsModule,
    ReactiveFormsModule,
    TranslocoPipe,
    CryptComponent,
    LibraryComponent,
  ],
})
export class PrintProxyComponent implements OnInit {
  @Input() title?: string
  @Input() cards!: ApiCard[]
  cardList = signal<ApiProxyItem[]>([])

  constructor(
    public modal: NgbActiveModal,
    private readonly apiDataService: ApiDataService,
    private readonly toastService: ToastService,
    private readonly translocoService: TranslocoService,
  ) {}

  ngOnInit() {
    const cardList: ApiProxyItem[] = []
    this.cards.forEach((card) => {
      const proxyCard: ApiProxyItem = {
        cardId: card.id,
        isCrypt: isCrypt(card),
        isLibrary: isLibrary(card),
        amount: 0,
        maxAmount: card.number,
        setOptions: [],
      }
      cardList.push(proxyCard)
    })
    this.cardList.update(() => cardList)
    this.fetchProxyOptions()
  }

  private fetchProxyOptions() {
    this.cards.forEach((card) => {
      this.apiDataService
        .getProxyOptions(card.id)
        .pipe(
          untilDestroyed(this),
          filter((setOptions) => setOptions.length > 0),
          tap((setOptions) => this.updateSetOptions(card.id, setOptions)),
        )
        .subscribe()
    })
  }

  private updateSetOptions(
    cardId: number,
    setOptions: ApiProxyCardOption[],
  ): void {
    const setControl = new FormControl(setOptions[0].setAbbrev)
    if (setOptions.length === 1) {
      setControl.disable()
    }
    this.cardList.update((current: ApiProxyItem[]) =>
      this.updateCardOptions(current, cardId, setControl, setOptions),
    )
    setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        filter((value) => value !== null),
        tap((value) => {
          this.cardList.update((current: ApiProxyItem[]) =>
            this.updateCardSelectedOption(current, cardId, value),
          )
        }),
      )
      .subscribe()
  }

  private updateCardOptions(
    list: ApiProxyItem[],
    id: number,
    setControl: FormControl<string | null>,
    setOptions: ApiProxyCardOption[],
  ): ApiProxyItem[] {
    return list.map((current: ApiProxyItem) =>
      current.cardId === id
        ? {
            ...current,
            set: setOptions.find(
              (option) => option.setAbbrev === setControl.value,
            ),
            setControl,
            setOptions,
          }
        : current,
    )
  }

  private updateCardSelectedOption(
    list: ApiProxyItem[],
    id: number,
    selectedOption: string,
  ): ApiProxyItem[] {
    return list.map((current: ApiProxyItem) =>
      current.cardId === id
        ? {
            ...current,
            set: current.setOptions.find(
              (option) => option.setAbbrev === selectedOption,
            ),
          }
        : current,
    )
  }

  dismissModal() {
    this.modal.dismiss()
  }

  addCard(id: number) {
    this.cardList.update((current: ApiProxyItem[]) =>
      current.map((card: ApiProxyItem) =>
        card.cardId === id ? { ...card, amount: card.amount + 1 } : card,
      ),
    )
  }

  removeCard(id: number) {
    this.cardList.update((current: ApiProxyItem[]) =>
      current.map((card: ApiProxyItem) =>
        card.cardId === id && card.amount > 0
          ? { ...card, amount: card.amount - 1 }
          : card,
      ),
    )
  }

  onPrint(): void {
    const request: ApiProxy = {
      cards: this.cardList().map((card) => {
        const proxyCard: ApiProxyCard = {
          cardId: card.cardId,
          amount: card.amount,
          setAbbrev: card.set?.setAbbrev,
        }
        return proxyCard
      }),
    }
    this.apiDataService
      .generateProxy(request)
      .pipe(
        untilDestroyed(this),
        catchError((err) => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
          return throwError(() => err)
        }),
      )
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        const filename = this.title
          ? `${this.title.replace(/\s/g, '_')}_proxy.pdf`
          : 'proxy.pdf'
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)
      })
  }

  resetLibraryCards() {
    this.resetCards((card) => card.isLibrary, false)
  }

  resetCryptCards() {
    this.resetCards((card) => card.isCrypt, false)
  }

  selectAllLibrary() {
    this.resetCards((card) => card.isLibrary, true)
  }

  selectAllCrypt() {
    this.resetCards((card) => card.isCrypt, true)
  }

  resetCards(isTypeCheck: (card: ApiProxyItem) => boolean, maxAmount: boolean) {
    this.cardList.update((current: ApiProxyItem[]) =>
      current.map((card: ApiProxyItem) =>
        isTypeCheck(card)
          ? {
              ...card,
              amount: maxAmount ? (card.maxAmount ?? 0) : 0,
            }
          : card,
      ),
    )
  }
}
