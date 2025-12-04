import { CurrencyPipe, NgClass, NgStyle, TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoPipe } from '@jsverse/transloco'
import { TranslocoDatePipe } from '@jsverse/transloco-locale'
import { ApiDeck } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { TruncatePipe } from '@shared/pipes/truncate.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId, isSupporter } from '@utils'
import { tap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-deck-card',
  templateUrl: './deck-card.component.html',
  styleUrls: ['./deck-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgClass,
    NgStyle,
    TitleCasePipe,
    CurrencyPipe,
    TruncatePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    TranslocoDatePipe,
  ],
})
export class DeckCardComponent implements OnInit {
  private readonly mediaService = inject(MediaService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  deck = input.required<ApiDeck>()
  height = input<string>('auto')

  readonly tagClick = output<string>()

  isMobileOrTablet = false

  ngOnInit(): void {
    this.mediaService
      .observeMobileOrTablet()
      .pipe(
        untilDestroyed(this),
        tap((isMobileOrTablet) => (this.isMobileOrTablet = isMobileOrTablet)),
      )
      .subscribe()
  }

  onTagClick(tag: string, event: MouseEvent): void {
    if (!this.isMobileOrTablet) {
      event.preventDefault()
      event.stopPropagation()
      this.tagClick.emit(tag)
    }
  }

  getCardName(id: number): string {
    if (isCryptId(id)) {
      return this.cryptQuery.getEntity(id)?.name ?? ''
    } else {
      return this.libraryQuery.getEntity(id)?.name ?? ''
    }
  }

  get isSupporter(): boolean {
    return isSupporter(this.deck().user?.roles)
  }
}
