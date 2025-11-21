import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { MediaService } from '@services'
import { isCryptId } from '../../../../utils/vtes-utils'
import { CryptComponent } from '../../../deck-shared/crypt/crypt.component'
import { LibraryComponent } from '../../../deck-shared/library/library.component'

@Component({
  selector: 'app-collection-card',
  templateUrl: './collection-card.component.html',
  styleUrls: ['./collection-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CryptComponent, LibraryComponent, AsyncPipe],
})
export class CollectionCardComponent {
  private mediaService = inject(MediaService)
  cardId = input.required<number>()
  cardName = input<string>()
  setAbbrev = input<string | undefined>(undefined)
  isCrypt = computed(() => isCryptId(this.cardId()))
  isMobile$ = this.mediaService.observeMobile()
}
