import { SetTooltipComponent } from './set-tooltip/set-tooltip.component'
import { LibraryCardComponent } from './library-card/library-card.component'
import { CryptCardComponent } from './crypt-card/crypt-card.component'
import { ClanFilterComponent } from './clan-filter/clan-filter.component'
import { LibraryListComponent } from './library-list/library-list.component'
import { LibraryComponent } from './library/library.component'
import { CryptComponent } from './crypt/crypt.component'
import { NgModule } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { CommonModule } from '@angular/common'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { DisciplineFilterComponent } from './discipline-filter/discipline-filter.component'
import { SharedModule } from '../../shared/shared.module'
import { RouterModule } from '@angular/router'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { TranslocoModule } from '@ngneat/transloco'

@NgModule({
  declarations: [
    CryptComponent,
    CryptCardComponent,
    LibraryComponent,
    LibraryListComponent,
    LibraryCardComponent,
    DisciplineFilterComponent,
    ClanFilterComponent,
    SetTooltipComponent,
  ],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    NgxSkeletonLoaderModule,
    RouterModule,
    NgxGoogleAnalyticsModule,
    TranslocoModule,
  ],
  exports: [
    CryptComponent,
    CryptCardComponent,
    LibraryComponent,
    LibraryListComponent,
    LibraryCardComponent,
    DisciplineFilterComponent,
    ClanFilterComponent,
    SetTooltipComponent,
  ],
})
export class DeckSharedModule {}
