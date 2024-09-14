import { AuthQuery } from '../../../state/auth/auth.query'
import { AuthService } from '../../../state/auth/auth.service'
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { Observable } from 'rxjs'
import { LoginComponent, Tabs } from '../login/login.component'
import { isChristmas } from '../../../utils/vtes-utils'
import { ColorThemeService } from '../../../services/color-theme.service'
import { TableSeatingComponent } from '../table-seating/table-seating.component'
import { MediaService } from '../../../services/media.service'
import { NotificationListComponent } from '../notification-list/notification-list.component'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
