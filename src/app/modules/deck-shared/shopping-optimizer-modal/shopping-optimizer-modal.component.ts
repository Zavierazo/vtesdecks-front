import { CurrencyPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import {
  ApiCollectionCard,
  ApiShoppingCard,
  ApiShoppingOptimizeResponse,
} from '@models'
import { NgbActiveModal, NgbCollapse } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, LocalStorageService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId } from '@utils'
import { map, of, switchMap } from 'rxjs'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'

const EXCLUDE_OWNED_KEY = 'shoppingOptimizerExcludeOwned'

@UntilDestroy()
@Component({
  selector: 'app-shopping-optimizer-modal',
  templateUrl: './shopping-optimizer-modal.component.html',
  styleUrls: ['./shopping-optimizer-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    NgbCollapse,
    RouterLink,
    TranslocoDirective,
    TranslocoPipe,
  ],
})
export class ShoppingOptimizerModalComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private apiDataService = inject(ApiDataService)
  private collectionApiDataService = inject(CollectionApiDataService)
  private authQuery = inject(AuthQuery)
  private localStorageService = inject(LocalStorageService)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)

  @Input() title?: string
  @Input() cards!: ApiShoppingCard[]
  @Input() allowExcludeOwned = false

  loading = signal(true)
  error = signal(false)
  allOwned = signal(false)
  result = signal<ApiShoppingOptimizeResponse | undefined>(undefined)
  excludeOwned = signal(false)
  expandedPrecons = signal<Set<string>>(new Set())

  get showExcludeOwned(): boolean {
    return this.allowExcludeOwned && this.authQuery.isAuthenticated()
  }

  ngOnInit(): void {
    if (this.showExcludeOwned) {
      this.excludeOwned.set(
        this.localStorageService.getValue<boolean>(EXCLUDE_OWNED_KEY) ?? false,
      )
    }
    this.run()
  }

  onToggleExcludeOwned(value: boolean): void {
    this.excludeOwned.set(value)
    this.localStorageService.setValue(EXCLUDE_OWNED_KEY, value)
    this.run()
  }

  onRetry(): void {
    this.run()
  }

  togglePrecon(deckId: string): void {
    this.expandedPrecons.update((expanded) => {
      const next = new Set(expanded)
      if (next.has(deckId)) {
        next.delete(deckId)
      } else {
        next.add(deckId)
      }
      return next
    })
  }

  isExpanded(deckId: string): boolean {
    return this.expandedPrecons().has(deckId)
  }

  cardName(id: number): string {
    const name = isCryptId(id)
      ? this.cryptQuery.getEntity(id)?.name
      : this.libraryQuery.getEntity(id)?.name
    return name ?? `#${id}`
  }

  private run(): void {
    this.loading.set(true)
    this.error.set(false)
    this.allOwned.set(false)
    this.result.set(undefined)
    this.expandedPrecons.set(new Set())
    const wanted = this.aggregate(this.cards)
    if (wanted.length === 0) {
      this.error.set(true)
      this.loading.set(false)
      return
    }
    const wanted$ =
      this.showExcludeOwned && this.excludeOwned()
        ? this.collectionApiDataService
            .getCardsByCardIds(wanted.map((card) => card.id))
            .pipe(map((owned) => this.subtractOwned(wanted, owned)))
        : of(wanted)
    wanted$
      .pipe(
        switchMap((cards) => {
          if (cards.length === 0) {
            // The optimizer rejects an empty list with a 400
            this.allOwned.set(true)
            return of(undefined)
          }
          return this.apiDataService.shoppingOptimize({ cards })
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: (result) => {
          this.result.set(result)
          this.loading.set(false)
        },
        error: () => {
          this.error.set(true)
          this.loading.set(false)
        },
      })
  }

  private aggregate(cards: ApiShoppingCard[]): ApiShoppingCard[] {
    const numberById = new Map<number, number>()
    cards.forEach((card) =>
      numberById.set(card.id, (numberById.get(card.id) ?? 0) + card.number),
    )
    return [...numberById.entries()]
      .filter(([, number]) => number > 0)
      .map(([id, number]) => ({ id, number }))
  }

  private subtractOwned(
    wanted: ApiShoppingCard[],
    owned: ApiCollectionCard[],
  ): ApiShoppingCard[] {
    // The collection can hold multiple rows per card (set/condition), so sum
    // owned quantities per cardId before subtracting
    const ownedById = new Map<number, number>()
    owned.forEach((card) =>
      ownedById.set(
        card.cardId,
        (ownedById.get(card.cardId) ?? 0) + card.number,
      ),
    )
    return wanted
      .map((card) => ({
        id: card.id,
        number: card.number - (ownedById.get(card.id) ?? 0),
      }))
      .filter((card) => card.number > 0)
  }
}
