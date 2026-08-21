import { HttpClient } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { environment } from '@environments/environment'
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco'
import { LocalStorageService } from '@services'
import { catchError, of } from 'rxjs'
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

/** A dismissal older than this, or of a different notice, is ignored. */
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000

/** What the user dismissed, and when, so both can be checked on load. */
interface Dismissal {
  fingerprint: string
  dismissedAt: number
}

/**
 * Renders a site-wide announcement (planned maintenance, downtime, any notice)
 * published as a static file on the CDN. The CDN is hosted separately from the
 * API, so the banner still works while the backend is offline, and publishing
 * a notice is a file upload rather than a release.
 *
 * Dismissal is deliberately shallow: it is keyed to the announcement's content
 * and lasts a single day, so the same banner reused for a later notice — or a
 * still-relevant one on a later visit — is never permanently silenced.
 */
@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.component.html',
  styleUrls: ['./announcement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class AnnouncementBannerComponent implements OnInit {
  private readonly httpClient = inject(HttpClient)
  private readonly translocoService = inject(TranslocoService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly localStorage = inject(LocalStorageService)

  private static readonly DEFAULT_TYPE: AnnouncementType = 'warning'
  private static readonly ANNOUNCEMENT_URL = `${environment.cdnDomain}/announcement.json`
  private static readonly DISMISSED_KEY = 'announcement_dismissed'

  private fingerprint?: string
  message?: string
  type: AnnouncementType = AnnouncementBannerComponent.DEFAULT_TYPE

  ngOnInit() {
    this.httpClient
      .get<Announcement>(AnnouncementBannerComponent.ANNOUNCEMENT_URL, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
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
    this.fingerprint = this.buildFingerprint(announcement)
    if (this.wasDismissed(this.fingerprint)) {
      return
    }
    this.message = message
    this.type = this.resolveType(announcement.type)
    this.changeDetectorRef.markForCheck()
  }

  dismiss() {
    if (this.fingerprint) {
      this.localStorage.setValue<Dismissal>(
        AnnouncementBannerComponent.DISMISSED_KEY,
        { fingerprint: this.fingerprint, dismissedAt: Date.now() },
      )
    }
    this.message = undefined
  }

  /**
   * Identifies the notice itself rather than the rendered text, so switching
   * language does not resurrect a banner the user already dismissed.
   */
  private buildFingerprint(announcement: Announcement): string {
    return JSON.stringify([
      announcement.type,
      announcement.hideAfter,
      announcement.message,
    ])
  }

  private wasDismissed(fingerprint: string): boolean {
    const dismissal = this.localStorage.getValue<Dismissal>(
      AnnouncementBannerComponent.DISMISSED_KEY,
    )
    return (
      dismissal?.fingerprint === fingerprint &&
      Date.now() - dismissal.dismissedAt < DISMISSAL_DURATION_MS
    )
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
