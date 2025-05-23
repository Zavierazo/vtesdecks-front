import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { switchMap, tap } from 'rxjs'
import { environment } from '../../../environments/environment'
import { ApiChangelog } from '../../models/api-changelog'
import { ApiHome } from '../../models/api-home'
import { ApiDataService } from '../../services/api.data.service'
import { LocalStorageService } from '../../services/local-storage.service'
import { AnimatedDigitComponent } from '../../shared/components/animated-digit/animated-digit.component'
import { LoginComponent } from '../../shared/components/login/login.component'
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive'
import { AuthQuery } from '../../state/auth/auth.query'
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
    NgTemplateOutlet,
    HomeSectionComponent,
    TranslocoPipe,
  ],
})
export class HomeComponent implements OnInit {
  private static readonly CHANGELOG_ALERT_KEY = 'changelog_alert_version'
  private readonly appVersion = environment.appVersion

  deckHome?: ApiHome
  changelogAlert?: ApiChangelog
  showChangelogAlert = false

  constructor(
    private readonly modalService: NgbModal,
    private readonly apiDataService: ApiDataService,
    private readonly authQuery: AuthQuery,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly localStorage: LocalStorageService,
  ) {}

  ngOnInit() {
    // Fetch changelog for alert
    const lastAppVersionSeen = this.localStorage.getValue<string>(
      HomeComponent.CHANGELOG_ALERT_KEY,
    )
    if (lastAppVersionSeen !== this.appVersion) {
      this.apiDataService
        .getChangelog()
        .pipe(
          tap((changelogs) => {
            if (changelogs && changelogs.length > 0) {
              let entry = changelogs.find((c) => c.version === this.appVersion)
              // If no entry found, try to find a older minor version
              entry ??= changelogs.find(
                (c) =>
                  c.version.split('.')[0] === this.appVersion.split('.')[0] &&
                  c.version.split('.')[1] === this.appVersion.split('.')[1] &&
                  c.version !== lastAppVersionSeen,
              )
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
