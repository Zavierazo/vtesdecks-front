import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import {
  NgbCollapse,
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbOffcanvas,
} from '@ng-bootstrap/ng-bootstrap'
import { ColorThemeService, MediaService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { isChristmas, isHalloween, isPrideMonth } from '@utils'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { Observable } from 'rxjs'
import { IsLoggedDirective } from '../../directives/is-logged.directive'
import { CameraScannerComponent } from '../camera-scanner/camera-scanner.component'
import { LangSelectorComponent } from '../lang-selector/lang-selector.component'
import { NotificationListComponent } from '../notification-list/notification-list.component'
import { SearchBarComponent } from '../search-bar/search-bar.component'
import { ThemeSelectorComponent } from '../theme-selector/theme-selector.component'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    NgbCollapse,
    RouterLinkActive,
    IsLoggedDirective,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgxGoogleAnalyticsModule,
    NgbDropdownButtonItem,
    LangSelectorComponent,
    ThemeSelectorComponent,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class HeaderComponent implements OnInit {
  private modalService = inject(NgbModal)
  private authQuery = inject(AuthQuery)
  private authService = inject(AuthService)
  private colorThemeService = inject(ColorThemeService)
  private mediaService = inject(MediaService)
  private offcanvasService = inject(NgbOffcanvas)

  isCollapsed = true

  user$!: Observable<string | undefined>

  displayName$!: Observable<string | undefined>

  profileImage$!: Observable<string | undefined>

  notificationUnreadCount$!: Observable<number | undefined>

  isSupporter$!: Observable<boolean>

  isAdmin$!: Observable<boolean>

  isMobile$ = this.mediaService.observeMobileOrTablet()

  ngOnInit(): void {
    this.user$ = this.authQuery.selectUser()
    this.displayName$ = this.authQuery.selectDisplayName()
    this.profileImage$ = this.authQuery.selectProfileImage()
    this.notificationUnreadCount$ = this.authQuery.selectNotificationCount()
    this.isSupporter$ = this.authQuery.selectSupporter()
    this.isAdmin$ = this.authQuery.selectAdmin()
  }

  async openLoginModal() {
    this.isCollapsed = true
    const { LoginComponent } = await import('../login/login.component')
    this.modalService.open(LoginComponent)
  }

  async openSignUpModal() {
    this.isCollapsed = true
    const { LoginComponent, Tabs } = await import('../login/login.component')
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

  async openTableSeatingModal() {
    this.isCollapsed = true
    const { TableSeatingComponent } =
      await import('../table-seating/table-seating.component')
    this.modalService.open(TableSeatingComponent, { size: 'xl' })
  }

  async openGameTimerModal() {
    this.isCollapsed = true
    const { GameTimerComponent } =
      await import('../game-timer/game-timer.component')
    this.modalService.open(GameTimerComponent, { fullscreen: true })
  }

  openSearchModal() {
    this.isCollapsed = true
    this.modalService.open(SearchBarComponent, { size: 'xl' })
  }

  openCameraScannerModal(idOnly = true, noAlternatives = false) {
    this.isCollapsed = true
    const modalRef = this.modalService.open(CameraScannerComponent, {
      size: 'lg',
      centered: true,
      modalDialogClass: 'modal-camera-scanner',
    })
    modalRef.componentInstance.idOnly.set(idOnly)
    modalRef.componentInstance.noAlternatives.set(noAlternatives)
  }

  get logoPath(): string {
    if (isChristmas()) {
      return '/assets/img/logo_christmas.png'
    } else if (isHalloween()) {
      return '/assets/img/logo_halloween.png'
    } else if (isPrideMonth()) {
      return '/assets/img/logo_pride.png'
    } else {
      return '/assets/img/logo.png'
    }
  }
}
