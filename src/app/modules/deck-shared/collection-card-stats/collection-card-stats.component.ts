import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { EMPTY } from 'rxjs'
import { AuthQuery } from '../../../state/auth/auth.query'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@UntilDestroy()
@Component({
  selector: 'app-collection-card-stats',
  templateUrl: './collection-card-stats.component.html',
  styleUrls: ['./collection-card-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    AsyncPipe,
    RouterLink,
    NgbTooltip,
    SetTooltipComponent,
    NgClass,
  ],
})
export class CollectionCardStatsComponent {
  private readonly authQuery = inject(AuthQuery)
  private readonly apiDataService = inject(ApiDataService)

  cardId = input.required<number>()
  routerClick = output<boolean>()

  collectionStats$ = computed(() => {
    if (this.authQuery.isAuthenticated()) {
      return this.apiDataService.getCardCollectionStats(this.cardId(), false)
    }
    return EMPTY
  })
}
