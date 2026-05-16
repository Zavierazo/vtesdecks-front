import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  untracked,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiArchetypeKeyCard, ApiCard } from '@models'
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap'
import { ArchetypeCardStatsComponent } from '../../deck-metagame/deck-metagame-detail/archetype-card-stats/archetype-card-stats.component'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'

@Component({
  selector: 'app-builder-suggestions',
  templateUrl: './builder-suggestions.component.html',
  styleUrls: ['./builder-suggestions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgbCollapse,
    CryptComponent,
    LibraryComponent,
    ArchetypeCardStatsComponent,
    TranslocoPipe,
  ],
})
export class BuilderSuggestionsComponent {
  title = input.required<string>()
  rawCards = input.required<ApiArchetypeKeyCard[]>()
  deckCards = input.required<ApiCard[]>()
  type = input.required<'crypt' | 'library'>()

  readonly cardAdded = output<number>()
  readonly cardRemoved = output<number>()

  readonly previewCount = 3
  suggestionsCollapsed = true
  private previousCardIds = ''

  filteredCards = computed<ApiArchetypeKeyCard[]>(() => {
    const deckIds = new Set(this.deckCards().map((c) => c.id))
    return this.rawCards().filter((card) => !deckIds.has(card.id))
  })

  constructor() {
    effect(() => {
      const currentIds = this.filteredCards()
        .map((c) => c.id)
        .join(',')
      untracked(() => {
        if (currentIds !== this.previousCardIds) {
          this.previousCardIds = currentIds
          this.suggestionsCollapsed = true
        }
      })
    })
  }
}
