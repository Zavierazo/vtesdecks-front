import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiChangelog, ApiHome } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, LocalStorageService } from '@services'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import { AnimatedDigitComponent } from '@shared/components/animated-digit/animated-digit.component'
import { LoginComponent } from '@shared/components/login/login.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { IsSupporterDirective } from '@shared/directives/is-supporter.directive'
import { AuthQuery } from '@state/auth/auth.query'
import { getCurrentAdventData } from '@utils'
import { switchMap, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { HomeMetagameComponent } from './home-metagame/home-metagame.component'
import { HomeSectionComponent } from './home-section/home-section.component'

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    AnimatedDigitComponent,
    IsLoggedDirective,
    HomeSectionComponent,
    TranslocoPipe,
    AdSenseComponent,
    IsSupporterDirective,
    HomeMetagameComponent,
  ],
})
export class HomeComponent implements OnInit {
  private readonly modalService = inject(NgbModal)
  private readonly apiDataService = inject(ApiDataService)
  private readonly authQuery = inject(AuthQuery)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly localStorage = inject(LocalStorageService)

  private static readonly CHANGELOG_ALERT_KEY = 'changelog_alert_version'
  private readonly appVersion = environment.appVersion

  deckHome?: ApiHome
  changelogAlert?: ApiChangelog
  showChangelogAlert = false
  serverDate = this.authQuery.serverDate()
  currentAdvent = computed(() => {
    const date = this.serverDate()
    return date ? getCurrentAdventData(date) : null
  })

  ngOnInit() {
    // Fetch changelog for alert
    const lastAppVersionSeen = this.localStorage.getValue<string>(
      HomeComponent.CHANGELOG_ALERT_KEY,
    )
    const currentVersionSplit = this.appVersion.split('.')
    const lastVersionSplit = lastAppVersionSeen?.split('.') || []
    const majorMinorChanged =
      currentVersionSplit[0] !== lastVersionSplit[0] ||
      currentVersionSplit[1] !== lastVersionSplit[1]

    if (lastAppVersionSeen && majorMinorChanged) {
      this.apiDataService
        .getChangelog()
        .pipe(
          tap((changelogs) => {
            if (changelogs && changelogs.length > 0) {
              const appVersionSplit = this.appVersion.split('.')
              const entry = changelogs.find((changelog) => {
                const versionSplit = changelog.version.split('.')
                return (
                  versionSplit[0] === appVersionSplit[0] &&
                  versionSplit[1] === appVersionSplit[1]
                )
              })
              if (entry) {
                this.changelogAlert = entry
                this.showChangelogAlert = true
                this.changeDetector.markForCheck()
              }
            }
          }),
        )
        .subscribe()
    }

    //Fetch when user login/logout
    this.authQuery
      .selectAuthenticated()
      .pipe(
        untilDestroyed(this),
        switchMap(() => this.apiDataService.getDeckHome()),
        tap((result) => {
          this.deckHome = result
          this.changeDetector.markForCheck()
        }),
      )
      .subscribe()
  }

  closeChangelogAlert() {
    if (this.appVersion) {
      this.localStorage.setValue(
        HomeComponent.CHANGELOG_ALERT_KEY,
        this.appVersion,
      )
    }
    this.showChangelogAlert = false
    this.changeDetector.markForCheck()
  }

  openLoginModal() {
    this.modalService.open(LoginComponent)
  }
}
