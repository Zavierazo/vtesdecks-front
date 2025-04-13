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

@UntilDestroy()
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
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
