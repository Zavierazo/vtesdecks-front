import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { SharedModule } from '../../shared/shared.module'
import { ClanFilterComponent } from './clan-filter/clan-filter.component'
import { ClanTranslocoPipe } from './clan-transloco/clan-transloco.pipe'
import { CryptCardComponent } from './crypt-card/crypt-card.component'
import { CryptComponent } from './crypt/crypt.component'
import { DisciplineFilterComponent } from './discipline-filter/discipline-filter.component'
import { DisciplineTranslocoPipe } from './discipline-transloco/discipline-transloco.pipe'
import { LibraryCardComponent } from './library-card/library-card.component'
import { LibraryListComponent } from './library-list/library-list.component'
import { LibraryTypeTranslocoPipe } from './library-type-transloco/library-type-transloco.pipe'
import { LibraryComponent } from './library/library.component'
import { RulingTextComponent } from './ruling-text/ruling-text/ruling-text.component'
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
    RulingTextComponent,
    LibraryTypeTranslocoPipe,
    DisciplineTranslocoPipe,
    ClanTranslocoPipe,
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
    LibraryTypeTranslocoPipe,
    DisciplineTranslocoPipe,
    ClanTranslocoPipe,
  ],
})
export class DeckSharedModule {}
