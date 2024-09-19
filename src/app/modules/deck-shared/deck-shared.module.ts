import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { SharedModule } from '../../shared/shared.module'
import { ClanFilterComponent } from './clan-filter/clan-filter.component'
import { CryptCardComponent } from './crypt-card/crypt-card.component'
import { CryptComponent } from './crypt/crypt.component'
import { DisciplineFilterComponent } from './discipline-filter/discipline-filter.component'
import { LibraryCardComponent } from './library-card/library-card.component'
import { LibraryListComponent } from './library-list/library-list.component'
import { LibraryTypeTranslocoPipe } from './library-type-translation/library-type-transloco.pipe'
import { LibraryComponent } from './library/library.component'
import { SetTooltipComponent } from './set-tooltip/set-tooltip.component'

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
    LibraryTypeTranslocoPipe,
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
