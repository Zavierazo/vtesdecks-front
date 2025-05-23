import { NgClass, NgStyle, TitleCasePipe } from '@angular/common'
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoPipe } from '@jsverse/transloco'
import { TranslocoDatePipe } from '@jsverse/transloco-locale'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { tap } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { MediaService } from '../../services/media.service'
import { TranslocoFallbackPipe } from '../../shared/pipes/transloco-fallback'
import { TruncatePipe } from '../../shared/pipes/truncate.pipe'

@UntilDestroy()
@Component({
  selector: 'app-deck-card',
  templateUrl: './deck-card.component.html',
  styleUrls: ['./deck-card.component.scss'],
  imports: [
    RouterLink,
    NgClass,
    NgStyle,
    TitleCasePipe,
    TruncatePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    TranslocoDatePipe,
  ],
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
