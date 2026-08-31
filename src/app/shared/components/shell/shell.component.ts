import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { environment } from '@environments/environment'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { SetService } from '@state/set/set.service'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { distinct, filter, switchMap, tap } from 'rxjs'
import { ApiChangelog } from '../../../models/api-changelog'
import { ApiDataService } from '../../../services/api.data.service'
import { ColorThemeService } from '../../../services/color-theme.service'
import { PushNotificationService } from '../../../services/push-notification.service'
import { SpoilerVisitService } from '../../../services/spoiler-visit.service'
import { ToastService } from '../../../services/toast.service'
import { isChristmasSnow, isHalloween } from '../../../utils/vtes-utils'
import { AnnouncementBannerComponent } from '../announcement-banner/announcement-banner.component'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'
import { FooterComponent } from '../footer/footer.component'
import { HeaderComponent } from '../header/header.component'

/**
 * Default application layout: header, footer and every app-level side effect
 * (analytics consent, service-worker updates, data prefetch…). Chromeless
 * routes such as the deck embed live outside this shell in main.ts.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  // Mirrors the previous AppComponent strategy: an OnPush shell between the
  // root and every page would change change-detection semantics app-wide
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    HeaderComponent,
    AnnouncementBannerComponent,
    RouterOutlet,
    FooterComponent,
  ],
})
export class ShellComponent implements OnInit {
  private readonly authService = inject(AuthService)
  private readonly cookieConsentService = inject(NgcCookieConsentService)
  private readonly router = inject(Router)
  private readonly swUpdate = inject(SwUpdate)
  private readonly modalService = inject(NgbModal)
  private readonly apiDataService = inject(ApiDataService)
  private readonly colorThemeService = inject(ColorThemeService)
  private readonly googleAnalyticsService = inject(GoogleAnalyticsService)
  private readonly authQuery = inject(AuthQuery)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly cryptService = inject(CryptService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryService = inject(LibraryService)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly spoilerVisitService = inject(SpoilerVisitService)
  private readonly pushNotificationService = inject(PushNotificationService)
  private readonly setService = inject(SetService)
  private readonly deckBuilderService = inject(DeckBuilderService)

  versionAvailable = false
  private lastNavigationPath?: string

  constructor() {
    // Load color theme
    this.colorThemeService.load()
  }

  ngOnInit() {
    // Update GA consent
    this.googleTagConsentUpdate()
    this.cookieConsentService.statusChange$
      .pipe(filter((status) => status.status === 'allow'))
      .subscribe(() => this.googleTagConsentUpdate())
    this.authService
      .loadCountry()
      .subscribe((countryCode) =>
        this.googleTagConsentUpdateAdPersonalization(countryCode),
      )
    // Check expired session
    this.authService.refreshToken().subscribe()
    // Navigation events
    this.lastNavigationPath = this.router.url.split('?')[0]
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        this.handleNavigationEnd(evt)
        if (this.versionAvailable) {
          this.handleNavigationEndActivateUpdate()
        }
      } else if (evt instanceof NavigationError) {
        this.handleNavigationError(evt)
        if (this.versionAvailable) {
          this.handleNavigationEndActivateUpdate()
        }
      }
    })
    // Add christmas effect
    if (isChristmasSnow()) {
      //Add to head <script defer src="https://app.embed.im/snow.js"></script> only on christmas
      const node = document.createElement('script')
      node.src = '/assets/js/snow.js'
      node.defer = true
      document.getElementsByTagName('head')[0].appendChild(node)
    }
    // Add halloween effect
    if (isHalloween()) {
      const node = document.createElement('script')
      node.src = '/assets/js/halloween.js'
      node.defer = true
      document.getElementsByTagName('head')[0].appendChild(node)
    }
    // Check app upgrade
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          distinct(),
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
          switchMap(() => this.apiDataService.getChangelog()),
          tap((changelog: ApiChangelog[]) => {
            this.versionAvailable = true
            if (changelog.length > 0 && changelog[0].showDialog) {
              const changes = `Changes for version <strong>${
                changelog[0].version
              }</strong>:
            <br/>
            <ul>
            ${changelog[0].changes
              .map((change) => `<li>${change}</li>`)
              .join('')}
            </ul>`
              const modalRef = this.modalService.open(ConfirmDialogComponent, {
                size: 'lg',
                centered: true,
              })
              modalRef.componentInstance.title = 'New version available!'
              modalRef.componentInstance.message = changes
              modalRef.componentInstance.okText = 'Apply Update'
              modalRef.componentInstance.cancelText = 'Dismiss'
              modalRef.closed
                .pipe(
                  filter((result) => result),
                  tap(() => window.location.reload()),
                )
                .subscribe()
            }
          }),
        )
        .subscribe()
    }
    if (this.swUpdate.isEnabled && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => this.addAdSenseScript())
        .catch(() => this.addAdSenseScript())
    } else {
      this.addAdSenseScript()
    }
    // Fetch crypt, library and sets data
    this.cryptService.getCryptCards().subscribe(() => this.markSpoilersSeen())
    this.libraryService
      .getLibraryCards()
      .subscribe(() => this.markSpoilersSeen())
    this.setService.getSets().subscribe()
    // Cleanup expired deck builder drafts
    this.deckBuilderService.cleanupExpiredDrafts()
  }

  /**
   * Freezes which spoiler cards count as new: every card revealed after the
   * previously known batch stays highlighted until a newer one shows up.
   */
  private markSpoilersSeen() {
    const latestSpoilerUpdate = [
      ...this.cryptQuery.getAll({}),
      ...this.libraryQuery.getAll({}),
    ].reduce((latest, card) => {
      if (!card.unreleased || !card.lastUpdate) {
        return latest
      }
      const timestamp = new Date(card.lastUpdate).getTime()
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp)
    }, 0)
    if (latestSpoilerUpdate > 0) {
      this.spoilerVisitService.markSpoilersSeen(new Date(latestSpoilerUpdate))
    }
  }

  private handleNavigationEnd(evt: NavigationEnd) {
    if (evt.url.startsWith('/decks')) {
      return
    }
    const path = evt.urlAfterRedirects.split('?')[0]
    const samePath = path === this.lastNavigationPath
    this.lastNavigationPath = path
    if (samePath) {
      return
    }
    window.scrollTo(0, 0)
  }

  private handleNavigationEndActivateUpdate() {
    this.swUpdate.activateUpdate()
    window.location.reload()
  }

  private handleNavigationError(evt: NavigationError) {
    console.warn('NavigationError', evt)
    this.toastService.show(
      this.translocoService.translate('shared.new_version_available'),
      { classname: 'bg-danger text-light', delay: 5000 },
    )
  }

  private googleTagConsentUpdate() {
    const status = this.cookieConsentService.hasConsented()
      ? 'granted'
      : 'denied'
    this.googleAnalyticsService.gtag('consent', 'update', {
      ad_storage: status,
      ad_user_data: status,
      analytics_storage: status,
    })
  }

  private googleTagConsentUpdateAdPersonalization(countryCode?: string) {
    if (!countryCode) {
      console.warn(
        'Country code is not defined for ad personalization consent update.',
      )
      return
    }
    const isEuCountry = [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IS',
      'IE',
      'IT',
      'LV',
      'LI',
      'LT',
      'LU',
      'MT',
      'NL',
      'NO',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
      'CH',
      'GB',
    ].includes(countryCode)
    this.googleAnalyticsService.gtag('consent', 'update', {
      ad_personalization: isEuCountry ? 'denied' : 'granted',
    })
  }

  private addAdSenseScript() {
    if (this.authQuery.isSupporter()) {
      return
    }
    const adSenseScript: HTMLScriptElement = document.createElement('script')
    adSenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${environment.googleAdSense.clientId}&ngsw-bypass=true`
    adSenseScript.async = true
    adSenseScript.crossOrigin = 'anonymous'
    document.head.appendChild(adSenseScript)
  }
}
