import { Component, OnInit, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { LoadingComponent } from '../../shared/components/loading/loading.component'

@UntilDestroy()
@Component({
  selector: 'app-verify-account',
  templateUrl: './verify-account.component.html',
  styleUrls: ['./verify-account.component.scss'],
  imports: [LoadingComponent],
})
export class VerifyAccountComponent implements OnInit {
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private apiDataService = inject(ApiDataService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  ngOnInit() {
    this.route.queryParams.pipe(untilDestroyed(this)).subscribe((params) => {
      this.apiDataService
        .verifyAccount(params['token'])
        .pipe(untilDestroyed(this))
        .subscribe({
          next: (successful: boolean) => {
            if (successful) {
              this.toastService.show(
                this.translocoService.translate('verify_account.success'),
                { classname: 'bg-success text-light', delay: 30000 },
              )
            } else {
              this.toastService.show(
                this.translocoService.translate('verify_account.error'),
                { classname: 'bg-danger text-light', delay: 10000 },
              )
            }
            this.router.navigate(['/'])
          },
          error: (error) => {
            console.error(error.message)
            this.toastService.show(
              this.translocoService.translate('verify_account.error'),
              { classname: 'bg-danger text-light', delay: 10000 },
            )
            this.router.navigate(['/'])
          },
        })
    })
  }
}
