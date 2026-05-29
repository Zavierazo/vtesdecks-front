import { DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiUserTopMonth } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'

@UntilDestroy()
@Component({
  selector: 'app-home-user-of-month',
  templateUrl: './home-user-of-month.component.html',
  styleUrls: ['./home-user-of-month.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, DatePipe],
})
export class HomeUserOfMonthComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly changeDetector = inject(ChangeDetectorRef)

  topUsers: ApiUserTopMonth[] | null = null
  readonly previousMonthDate: Date = (() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() - 1, 1)
  })()

  ngOnInit() {
    this.apiDataService
      .getUserTopMonth()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (users) => {
          this.topUsers = users
          this.changeDetector.markForCheck()
        },
        error: () => {
          this.topUsers = []
          this.changeDetector.markForCheck()
        },
      })
  }

  getRankEmoji(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }
}
