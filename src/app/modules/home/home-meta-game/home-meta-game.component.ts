import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { DeckArchetypesComponent } from '../../deck-archetypes/deck-archetypes.component'

@Component({
  selector: 'app-home-meta-game',
  templateUrl: './home-meta-game.component.html',
  styleUrls: ['./home-meta-game.component.scss'],
  imports: [DeckArchetypesComponent, RouterLink, TranslocoDirective],
})
export class HomeMetaGameComponent {}
