import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { ApiDeck } from '../../../models/api-deck'
import { NgIf, NgFor, TitleCasePipe } from '@angular/common';
import { DeckCardComponent } from '../../deck-card/deck-card.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    selector: 'app-home-section',
    templateUrl: './home-section.component.html',
    styleUrls: ['./home-section.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgIf, NgFor, DeckCardComponent, LoadingComponent, RouterLink, TitleCasePipe, TranslocoPipe]
})
export class HomeSectionComponent {
  @Input()
  title!: string
  @Input()
  decks?: ApiDeck[]
  @Input()
  deckParams!: { [key: string]: any }

  constructor(private router: Router) {}

  onTagClick(tag: string): void {
    this.router.navigate(['/decks'], {
      queryParams: {
        tags: tag,
      },
    })
  }
}
