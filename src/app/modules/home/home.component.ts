import { DatePipe, NgFor, NgTemplateOutlet } from '@angular/common'
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
import { ApiHome } from '../../models/api-home'
import { ApiDataService } from '../../services/api.data.service'
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
    DatePipe,
    NgFor,
  ],
})
export class HomeComponent implements OnInit {
  deckHome?: ApiHome

  constructor(
    private modalService: NgbModal,
    private apiDataService: ApiDataService,
    private authQuery: AuthQuery,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit() {
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

  openLoginModal() {
    this.modalService.open(LoginComponent)
  }
}
