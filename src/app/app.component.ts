import { Component, Injector, OnInit, inject } from '@angular/core'
import { createCustomElement } from '@angular/elements'
import {
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { distinct, filter, switchMap, tap } from 'rxjs'
import { environment } from '../environments/environment'
import { ApiChangelog } from './models/api-changelog'
import { ApiDataService } from './services/api.data.service'
import { ColorThemeService } from './services/color-theme.service'
import { ToastService } from './services/toast.service'
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component'
import { FooterComponent } from './shared/components/footer/footer.component'
import { HeaderComponent } from './shared/components/header/header.component'
import { MarkdownCardComponent } from './shared/components/markdown-card/markdown-card.component'
import { ToastsContainer } from './shared/components/toast-container/toast-container.component'
import { AuthQuery } from './state/auth/auth.query'
import { AuthService } from './state/auth/auth.service'
import { CryptService } from './state/crypt/crypt.service'
import { LibraryService } from './state/library/library.service'
import { SetService } from './state/set/set.service'
import { isChristmas, isHalloween } from './utils/vtes-utils'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [HeaderComponent, RouterOutlet, FooterComponent, ToastsContainer],
})
export class AppComponent implements OnInit {
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
  private readonly libraryService = inject(LibraryService)
  private readonly setService = inject(SetService)

  title = 'VTES Decks'

  versionAvailable = false

  constructor() {
    // Load color theme
    this.colorThemeService.load()
    // Add custom element for markdown cards
    const markdownCard = createCustomElement(MarkdownCardComponent, {
      injector: inject(Injector),
    })
    customElements.define('app-markdown-card', markdownCard)
  }

  ngOnInit() {
    // Update GA consent
    this.googleTagConsentUpdate()
    this.cookieConsentService.statusChange$
      .pipe(filter((status) => status.status === 'allow'))
      .subscribe(() => this.googleTagConsentUpdate())
    this.apiDataService
      .getUserCountry()
      .subscribe((response) =>
        this.googleTagConsentUpdateAdPersonalization(response.countryCode),
      )
    // Check expired session
    this.authService.refreshToken().subscribe()
    // Navigation events
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
    if (isChristmas()) {
      //Add to head <script defer src="https://app.embed.im/snow.js"></script> only on christmas
      const node = document.createElement('script')
      node.src = 'https://app.embed.im/snow.js'
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

          tap((evt) => {
            console.log(evt)
            if (evt.type === 'VERSION_DETECTED') {
              this.toastService.show(
                this.translocoService.translate(
                  'shared.new_version_installing',
                ),
                { classname: 'bg-success text-light', delay: 5000 },
              )
            }
          }),
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
          switchMap(() => this.apiDataService.getChangelog()),
          tap((changelog: ApiChangelog[]) => {
            this.versionAvailable = true
            if (changelog[0].showDialog) {
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
    this.cryptService.getCryptCards().subscribe()
    this.libraryService.getLibraryCards().subscribe()
    this.setService.getSets().subscribe()
  }

  private handleNavigationEnd(evt: NavigationEnd) {
    if (evt.url.startsWith('/decks')) {
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
    console.log('Init AdSense script')
    const adSenseScript: HTMLScriptElement = document.createElement('script')
    adSenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${environment.googleAdSense.clientId}&ngsw-bypass=true`
    adSenseScript.async = true
    adSenseScript.crossOrigin = 'anonymous'
    document.head.appendChild(adSenseScript)
  }
}
