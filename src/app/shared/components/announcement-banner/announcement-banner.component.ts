import { HttpClient } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { catchError, of } from 'rxjs'
import { environment } from '@environments/environment'
import { DEFAULT_LANGUAGE } from '../../../transloco-root.module'

/** Bootstrap contextual classes an announcement is allowed to render with. */
const ANNOUNCEMENT_TYPES = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
] as const

type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]

/** Shape of the announcement hosted on the CDN. */
interface Announcement {
  active?: boolean
  hideAfter?: string
  type?: string
  /** Either one string for every language, or a message per language code. */
  message?: string | Record<string, string>
}

/**
 * Renders a site-wide announcement (planned maintenance, downtime, any notice)
 * published as a static file on the CDN. The CDN is hosted separately from the
 * API, so the banner still works while the backend is offline, and publishing
 * a notice is a file upload rather than a release.
 *
 * Deliberately not dismissible: the same banner is reused for every notice, so
 * a stored dismissal would risk hiding a later announcement from users who
 * dismissed an earlier one.
 */
@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBannerComponent implements OnInit {
  private readonly httpClient = inject(HttpClient)
  private readonly translocoService = inject(TranslocoService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private static readonly DEFAULT_TYPE: AnnouncementType = 'warning'
  private static readonly ANNOUNCEMENT_URL = `${environment.cdnDomain}/announcement.json`

  message?: string
  type: AnnouncementType = AnnouncementBannerComponent.DEFAULT_TYPE

  ngOnInit() {
    this.httpClient
      .get<Announcement>(AnnouncementBannerComponent.ANNOUNCEMENT_URL, {
        // Coarse cache buster: at most one origin fetch per 5 minutes, so the
        // notice goes live quickly without needing cache headers on the CDN
        params: { t: Math.floor(Date.now() / 300000) },
      })
      .pipe(catchError(() => of(null)))
      .subscribe((announcement) => this.apply(announcement))
  }

  private apply(announcement: Announcement | null) {
    if (!announcement?.active || this.hasExpired(announcement.hideAfter)) {
      return
    }
    const message = this.resolveMessage(announcement.message)
    if (!message) {
      console.warn('Ignoring announcement without a message', announcement)
      return
    }
    this.message = message
    this.type = this.resolveType(announcement.type)
    this.changeDetectorRef.markForCheck()
  }

  /** Lets a notice take itself down without a new upload. */
  private hasExpired(hideAfter?: string): boolean {
    if (!hideAfter) {
      return false
    }
    const expiry = new Date(hideAfter)
    if (isNaN(expiry.getTime())) {
      console.warn('Ignoring announcement with an invalid hideAfter', hideAfter)
      return true
    }
    return Date.now() >= expiry.getTime()
  }

  /** Active language, falling back to English and then to any translation. */
  private resolveMessage(
    message?: string | Record<string, string>,
  ): string | undefined {
    if (!message) {
      return undefined
    }
    if (typeof message === 'string') {
      return message
    }
    return (
      message[this.translocoService.getActiveLang()] ??
      message[DEFAULT_LANGUAGE.code] ??
      Object.values(message)[0]
    )
  }

  /** Guards against an unexpected value reaching the class attribute. */
  private resolveType(type?: string): AnnouncementType {
    return ANNOUNCEMENT_TYPES.includes(type as AnnouncementType)
      ? (type as AnnouncementType)
      : AnnouncementBannerComponent.DEFAULT_TYPE
  }
}
