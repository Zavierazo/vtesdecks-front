import { TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiDeck } from '@models'
import { LoadingComponent } from '../../../shared/components/loading/loading.component'
import { DeckCardComponent } from '../../deck-card/deck-card.component'

@Component({
  selector: 'app-home-section',
  templateUrl: './home-section.component.html',
  styleUrls: ['./home-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DeckCardComponent,
    LoadingComponent,
    RouterLink,
    TitleCasePipe,
    TranslocoPipe,
  ],
})
export class HomeSectionComponent {
  private router = inject(Router)

  @Input()
  title!: string
  @Input()
  decks?: ApiDeck[]
  @Input()
  deckParams!: { [key: string]: any }

  onTagClick(tag: string): void {
    this.router.navigate(['/decks'], {
      queryParams: {
        tags: tag,
      },
    })
  }
}
