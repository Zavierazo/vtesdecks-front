import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiDataService } from './../../services/api.data.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { TranslocoService } from '@ngneat/transloco';

@UntilDestroy()
@Component({
  selector: 'app-verify-account',
  templateUrl: './verify-account.component.html',
  styleUrls: ['./verify-account.component.scss'],
})
export class VerifyAccountComponent implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiDataService: ApiDataService,
    private toastService: ToastService,
    private translocoService: TranslocoService
  ) {}

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
                {
                  classname: 'bg-success text-light',
                  delay: 30000,
                }
              );
            } else {
              this.toastService.show(
                this.translocoService.translate('verify_account.error'),
                {
                  classname: 'bg-danger text-light',
                  delay: 10000,
                }
              );
            }
            this.router.navigate(['/']);
          },
          error: (error) => {
            console.error(error.message);
            this.toastService.show(
              this.translocoService.translate('verify_account.error'),
              {
                classname: 'bg-danger text-light',
                delay: 10000,
              }
            );
            this.router.navigate(['/']);
          },
        });
    });
  }
}
