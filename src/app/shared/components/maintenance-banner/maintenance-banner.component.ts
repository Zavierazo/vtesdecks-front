import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { LocalStorageService } from '@services'

@Component({
  selector: 'app-maintenance-banner',
  templateUrl: './maintenance-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class MaintenanceBannerComponent implements OnInit {
  private readonly localStorage = inject(LocalStorageService)

  private static readonly DISMISSED_KEY =
    'maintenance_banner_20260818_dismissed'
  // Aug 19, 2026 00:00 CEST (UTC+2): the banner disappears on its own after this
  private static readonly HIDE_AFTER = Date.UTC(2026, 7, 18, 22, 0, 0)

  show = false

  ngOnInit() {
    const isDismissed =
      this.localStorage.getValue<boolean>(
        MaintenanceBannerComponent.DISMISSED_KEY,
      ) === true

    this.show =
      Date.now() < MaintenanceBannerComponent.HIDE_AFTER && !isDismissed
  }

  dismiss() {
    this.localStorage.setValue(MaintenanceBannerComponent.DISMISSED_KEY, true)
    this.show = false
  }
}
