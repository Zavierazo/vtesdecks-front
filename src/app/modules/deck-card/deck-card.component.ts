import { ApiDeck } from '../../models/api-deck'
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { MediaService } from '../../services/media.service'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { tap } from 'rxjs'
import { RouterLink } from '@angular/router';
import { NgClass, NgStyle, NgIf, NgFor, TitleCasePipe } from '@angular/common';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { TranslocoFallbackPipe } from '../../shared/pipes/transloco-fallback';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranslocoDatePipe } from '@jsverse/transloco-locale';

@UntilDestroy()
@Component({
    selector: 'app-deck-card',
    templateUrl: './deck-card.component.html',
    styleUrls: ['./deck-card.component.scss'],
    imports: [RouterLink, NgClass, NgStyle, NgIf, NgFor, TitleCasePipe, TruncatePipe, TranslocoFallbackPipe, TranslocoPipe, TranslocoDatePipe]
})
export class DeckCardComponent implements OnInit {
  @Input() deck!: ApiDeck
  @Input() height = 'auto'

  @Output() tagClick: EventEmitter<string> = new EventEmitter()

  isMobileOrTablet = false

  constructor(private mediaService: MediaService) {}

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
}
