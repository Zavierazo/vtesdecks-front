import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCard, ApiCollectionCardStats } from '@models'
import { ApiDataService } from '@services'
import { EMPTY, Observable } from 'rxjs'
import { AuthQuery } from '../../../state/auth/auth.query'

@Component({
  selector: 'app-collection-card-mini-stats',
  templateUrl: './collection-card-mini-stats.component.html',
  styleUrls: ['./collection-card-mini-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, AsyncPipe, NgClass],
})
export class CollectionCardMiniStatsComponent implements OnInit {
  private readonly authQuery = inject(AuthQuery)
  private readonly apiDataService = inject(ApiDataService)

  card = input.required<ApiCard>()

  routerClick = output<boolean>()

  collectionStats$!: Observable<ApiCollectionCardStats>

  ngOnInit() {
    if (this.authQuery.isAuthenticated()) {
      this.collectionStats$ = this.apiDataService.getCardCollectionStats(
        this.card().id,
        true,
      )
    } else {
      this.collectionStats$ = EMPTY
    }
  }
}
