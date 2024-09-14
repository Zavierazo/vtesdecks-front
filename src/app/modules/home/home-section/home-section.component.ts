import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { Router } from '@angular/router'
import { ApiDeck } from '../../../models/api-deck'

@Component({
  selector: 'app-home-section',
  templateUrl: './home-section.component.html',
  styleUrls: ['./home-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
