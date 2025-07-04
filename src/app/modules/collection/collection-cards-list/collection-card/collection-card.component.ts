import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'
import { isCryptId } from '../../../../utils/vtes-utils'
import { CryptComponent } from '../../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../../deck-shared/library/library.component'

@Component({
  selector: 'app-collection-card',
  templateUrl: './collection-card.component.html',
  styleUrls: ['./collection-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CryptComponent, LibraryComponent],
})
export class CollectionCardComponent {
  cardId = input.required<number>()
  isCrypt = computed(() => isCryptId(this.cardId()))
}
