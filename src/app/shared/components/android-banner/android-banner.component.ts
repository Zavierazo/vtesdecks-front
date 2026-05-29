import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { LocalStorageService } from '@services'

@Component({
  selector: 'app-android-banner',
  templateUrl: './android-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class AndroidBannerComponent implements OnInit {
  private readonly localStorage = inject(LocalStorageService)

  private static readonly DISMISSED_KEY = 'android_app_banner_dismissed'
  readonly playStoreUrl =
    'https://play.google.com/store/apps/details?id=com.vtesdecks.twa'

  show = false

  ngOnInit() {
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isDismissed =
      this.localStorage.getValue<boolean>(
        AndroidBannerComponent.DISMISSED_KEY,
      ) === true

    this.show = isAndroid && !isStandalone && !isDismissed
  }

  dismiss() {
    this.localStorage.setValue(AndroidBannerComponent.DISMISSED_KEY, true)
    this.show = false
  }
}
