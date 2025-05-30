import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { NgbModal, NgbOffcanvas, NgbCollapse, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem } from '@ng-bootstrap/ng-bootstrap'
import { Observable } from 'rxjs'
import { ColorThemeService } from '../../../services/color-theme.service'
import { MediaService } from '../../../services/media.service'
import { AuthQuery } from '../../../state/auth/auth.query'
import { AuthService } from '../../../state/auth/auth.service'
import { isChristmas } from '../../../utils/vtes-utils'
import { LoginComponent, Tabs } from '../login/login.component'
import { NotificationListComponent } from '../notification-list/notification-list.component'
import { TableSeatingComponent } from '../table-seating/table-seating.component'
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IsLoggedDirective } from '../../directives/is-logged.directive';
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics';
import { LangSelectorComponent } from '../lang-selector/lang-selector.component';
import { AsyncPipe } from '@angular/common';
import { ThemeSelectorComponent } from '../theme-selector/theme-selector.component';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, RouterLink, NgbCollapse, RouterLinkActive, IsLoggedDirective, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgxGoogleAnalyticsModule, NgbDropdownButtonItem, LangSelectorComponent, ThemeSelectorComponent, AsyncPipe]
})
export class HeaderComponent implements OnInit {
  isCollapsed = true

  displayName$!: Observable<string | undefined>

  profileImage$!: Observable<string | undefined>

  notificationUnreadCount$!: Observable<number | undefined>

  isMobile$ = this.mediaService.observeMobileOrTablet()

  constructor(
    private modalService: NgbModal,
    private authQuery: AuthQuery,
    private authService: AuthService,
    private colorThemeService: ColorThemeService,
    private mediaService: MediaService,
    private offcanvasService: NgbOffcanvas,
  ) {}

  ngOnInit(): void {
    this.displayName$ = this.authQuery.selectDisplayName()
    this.profileImage$ = this.authQuery.selectProfileImage()
    this.notificationUnreadCount$ = this.authQuery.selectNotificationCount()
  }

  openLoginModal() {
    this.isCollapsed = true
    this.modalService.open(LoginComponent)
  }

  openSignUpModal() {
    this.isCollapsed = true
    const modalRef = this.modalService.open(LoginComponent)
    modalRef.componentInstance.tab = Tabs.SignUp
  }

  openNotifications(): void {
    this.isCollapsed = true
    this.offcanvasService.open(NotificationListComponent, { position: 'end' })
  }

  logout() {
    this.isCollapsed = true
    this.authService.logout()
  }

  openTableSeatingModal() {
    this.isCollapsed = true
    this.modalService.open(TableSeatingComponent, { size: 'xl' })
  }

  isChristmas(): boolean {
    return isChristmas()
  }

  get themeEnabled(): boolean {
    return this.colorThemeService.enabled
  }
}
