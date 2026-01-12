import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  ApiCrypt,
  ApiDeck,
  ApiLibrary,
  ApiPublicUser,
  ApiSearchResponse,
} from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { isCryptId } from '@utils'
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule],
})
export class SearchBarComponent implements OnInit {
  activeModal = inject(NgbActiveModal)
  private apiDataService = inject(ApiDataService)
  private router = inject(Router)

  queryControl = new FormControl<string>('')
  cardResults = signal<(ApiCrypt | ApiLibrary)[]>([])
  deckResults = signal<ApiDeck[]>([])
  userResults = signal<ApiPublicUser[]>([])
  selectedIndex = signal<number>(-1)

  @ViewChild('modalBody') modalBody!: ElementRef<HTMLDivElement>

  ngOnInit() {
    this.queryControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((query): query is string => query !== null),
        switchMap((query: string) =>
          query.length >= 3
            ? this.apiDataService.search(query)
            : of({ cards: [], decks: [], users: [] }),
        ),
        tap((results: ApiSearchResponse) => {
          this.cardResults.set(results.cards)
          this.deckResults.set(results.decks)
          this.userResults.set(results.users)
          this.selectedIndex.set(-1)
        }),
      )
      .subscribe()
  }

  onKeydown(event: KeyboardEvent): void {
    const cardResults = this.cardResults()
    const deckResults = this.deckResults()
    const userResults = this.userResults()
    const totalResults =
      cardResults.length + deckResults.length + userResults.length

    if (totalResults === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectedIndex.update((index) =>
          index < totalResults - 1 ? index + 1 : index,
        )
        this.scrollToSelected()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.selectedIndex.update((index) => (index > 0 ? index - 1 : index))
        this.scrollToSelected()
        break
      case 'Enter':
        event.preventDefault()
        if (this.selectedIndex() >= 0 && this.selectedIndex() < totalResults) {
          this.selectResult(this.selectedIndex())
        }
        break
    }
  }

  selectResult(index: number): void {
    const cardResults = this.cardResults()
    const deckResults = this.deckResults()
    const userResults = this.userResults()

    if (index < cardResults.length) {
      // Selected a card
      const card = cardResults[index]
      this.router.navigateByUrl(this.getCardUrl(card))
    } else if (index < cardResults.length + deckResults.length) {
      // Selected a deck
      const deck = deckResults[index - cardResults.length]
      this.router.navigate(['deck', deck.id])
    } else {
      // Selected a user
      const user = userResults[index - cardResults.length - deckResults.length]
      this.router.navigate(['user', user.user])
    }
    this.activeModal.close()
  }

  getCardUrl(card: ApiCrypt | ApiLibrary): string {
    return this.router
      .createUrlTree(['cards', isCryptId(card.id) ? 'crypt' : 'library'], {
        queryParams: {
          cardId: card.id,
        },
      })
      .toString()
  }

  private scrollToSelected(): void {
    setTimeout(
      () =>
        document.querySelector('.search-result-item.selected')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        }),
      100,
    )
  }
}
