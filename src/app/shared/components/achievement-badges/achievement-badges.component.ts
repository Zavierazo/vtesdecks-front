import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { NgClass } from '@angular/common'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiAchievementBadge } from '@models'

@Component({
  selector: 'app-achievement-badges',
  templateUrl: './achievement-badges.component.html',
  styleUrl: './achievement-badges.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe],
})
export class AchievementBadgesComponent {
  badges = input<ApiAchievementBadge[]>([])
  featured = input(false)
}
