import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { EMPTY } from 'rxjs'
import { ApiCard } from '../../../models/api-card'
import { ApiDataService } from '../../../services/api.data.service'
import { AuthQuery } from '../../../state/auth/auth.query'

@Component({
  selector: 'app-collection-card-mini-stats',
  templateUrl: './collection-card-mini-stats.component.html',
  styleUrls: ['./collection-card-mini-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, AsyncPipe, NgClass],
})
export class CollectionCardMiniStatsComponent {
  private readonly authQuery = inject(AuthQuery)
  private readonly apiDataService = inject(ApiDataService)

  card = input.required<ApiCard>()

  routerClick = output<boolean>()

  collectionStats$ = computed(() => {
    if (this.authQuery.isAuthenticated()) {
      return this.apiDataService.getCardCollectionStats(this.card().id, true)
    }
    return EMPTY
  })
}
