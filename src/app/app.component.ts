import { Component, OnInit, inject } from '@angular/core'
import {
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { distinct, filter, switchMap, tap } from 'rxjs'
import { ApiChangelog } from './models/api-changelog'
import { ApiDataService } from './services/api.data.service'
import { ColorThemeService } from './services/color-theme.service'
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component'
import { FooterComponent } from './shared/components/footer/footer.component'
import { HeaderComponent } from './shared/components/header/header.component'
import { ToastsContainer } from './shared/components/toast-container/toast-container.component'
import { AuthService } from './state/auth/auth.service'
import { isChristmas } from './utils/vtes-utils'

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

  title = 'VTES Decks'

  versionAvailable = false

  constructor() {
    this.colorThemeService.load()
  }

  ngOnInit() {
    // Update GA consent
    this.googleTagConsentUpdate()
    this.cookieConsentService.statusChange$.subscribe(() =>
      this.googleTagConsentUpdate(),
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
      }
    })
    // Add christmas effect
    if (isChristmas()) {
      //Add to head <script defer src="https://app.embed.im/snow.js"></script> only on christmas
      let node = document.createElement('script')
      node.src = 'https://app.embed.im/snow.js'
      node.defer = true
      document.getElementsByTagName('head')[0].appendChild(node)
    }
    // Check app upgrade
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          distinct(),
          tap((evt) => console.log(evt)),
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
    if (evt.error.name === 'ChunkLoadError') {
      console.warn('ChunkLoadError, reloading the app')
      if (evt.url) {
        window.location.replace(`${window.location.origin}${evt.url}`)
      } else {
        window.location.reload()
      }
    }
  }

  private googleTagConsentUpdate() {
    const status = this.cookieConsentService.hasConsented()
      ? 'granted'
      : 'denied'
    this.googleAnalyticsService.gtag('consent', 'update', {
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
      analytics_storage: status,
    })
  }
}
