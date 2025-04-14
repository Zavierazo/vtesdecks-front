import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { LoginComponent } from '../../shared/components/login/login.component'
import { ApiDataService } from '../../services/api.data.service'
import { switchMap, tap } from 'rxjs'
import { ApiHome } from '../../models/api-home'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { AuthQuery } from '../../state/auth/auth.query'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { AnimatedDigitComponent } from '../../shared/components/animated-digit/animated-digit.component';
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive';
import { NgTemplateOutlet } from '@angular/common';
import { HomeSectionComponent } from './home-section/home-section.component';

@UntilDestroy()
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, RouterLink, AnimatedDigitComponent, IsLoggedDirective, NgTemplateOutlet, HomeSectionComponent, TranslocoPipe]
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
