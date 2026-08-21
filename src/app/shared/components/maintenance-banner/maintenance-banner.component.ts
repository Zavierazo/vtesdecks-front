import { HttpClient } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco'
import { catchError, of } from 'rxjs'
import { environment } from '@environments/environment'
import { LocalStorageService } from '@services'

/** Shape of the maintenance notice hosted on the CDN. */
interface MaintenanceNotice {
  active?: boolean
  id?: string
  start?: string
  end?: string
  hideAfter?: string
  timeZone?: string
  timeZoneLabel?: string
}

/**
 * Announces a planned maintenance window. The notice is published as a static
 * file on the CDN, which is hosted separately from the API, so the banner still
 * works while the backend is offline. Unplanned outages are handled by the
 * toast in HttpMonitorInterceptor instead.
 */
@Component({
  selector: 'app-maintenance-banner',
  templateUrl: './maintenance-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class MaintenanceBannerComponent implements OnInit {
  private readonly httpClient = inject(HttpClient)
  private readonly localStorage = inject(LocalStorageService)
  private readonly translocoService = inject(TranslocoService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private static readonly DISMISSED_KEY = 'maintenance_notice_dismissed'
  private static readonly DEFAULT_TIME_ZONE = 'Europe/Madrid'
  private static readonly NOTICE_URL = `${environment.cdnDomain}/maintenance.json`

  show = false
  params: Record<string, string> = {}

  private noticeId?: string

  ngOnInit() {
    this.httpClient
      .get<MaintenanceNotice>(MaintenanceBannerComponent.NOTICE_URL, {
        // Coarse cache buster: at most one origin fetch per 5 minutes, so the
        // notice goes live quickly without needing cache headers on the CDN
        params: { t: Math.floor(Date.now() / 300000) },
      })
      .pipe(catchError(() => of(null)))
      .subscribe((notice) => this.applyNotice(notice))
  }

  dismiss() {
    this.localStorage.setValue(
      MaintenanceBannerComponent.DISMISSED_KEY,
      this.noticeId,
    )
    this.show = false
  }

  private applyNotice(notice: MaintenanceNotice | null) {
    if (!notice?.active || !notice.start || !notice.end) {
      return
    }
    const start = new Date(notice.start)
    const end = new Date(notice.end)
    const hideAfter = notice.hideAfter ? new Date(notice.hideAfter) : end
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Ignoring maintenance notice with invalid dates', notice)
      return
    }
    // Expires on its own once the window has passed, no new upload needed
    if (isNaN(hideAfter.getTime()) || Date.now() >= hideAfter.getTime()) {
      return
    }
    this.noticeId = notice.id ?? notice.start
    const dismissed = this.localStorage.getValue<string>(
      MaintenanceBannerComponent.DISMISSED_KEY,
    )
    if (dismissed === this.noticeId) {
      return
    }
    this.params = this.buildParams(notice, start, end)
    this.show = true
    this.changeDetectorRef.markForCheck()
  }

  /** Formats the window in the reader's language, in the notice's time zone. */
  private buildParams(
    notice: MaintenanceNotice,
    start: Date,
    end: Date,
  ): Record<string, string> {
    const locale = this.translocoService.getActiveLang()
    const timeZone =
      notice.timeZone ?? MaintenanceBannerComponent.DEFAULT_TIME_ZONE
    const date = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone,
    }).format(start)
    const time = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    })
    // ICU has no short abbreviation for European zones (it yields "GMT+2"), so
    // the notice supplies the label it wants to display, e.g. CEST or CET
    const timeZoneName = new Intl.DateTimeFormat(locale, {
      timeZoneName: 'short',
      timeZone,
    })
      .formatToParts(start)
      .find((part) => part.type === 'timeZoneName')
    return {
      date,
      start: time.format(start),
      end: time.format(end),
      timezone: notice.timeZoneLabel ?? timeZoneName?.value ?? timeZone,
    }
  }
}
