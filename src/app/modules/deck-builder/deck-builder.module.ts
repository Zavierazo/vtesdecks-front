import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { CanDeactivateComponent } from '../../shared/guards/can-deactivate-component.guard'
import { SharedModule } from '../../shared/shared.module'
import { DeckSharedModule } from '../deck-shared/deck-shared.module'
import { BuilderComponent } from './builder.component'
import { CryptBuilderFilterComponent } from './crypt-builder-filter/crypt-builder-filter.component'
import { CryptBuilderComponent } from './crypt-builder/crypt-builder.component'
import { CryptSectionComponent } from './crypt-section/crypt-section.component'
import { cryptSectionResolver } from './crypt-section/crypt-section.resolver'
import { ImportAmaranthComponent } from './import-amaranth/import-amaranth.component'
import { ImportVdbComponent } from './import-vdb/import-vdb.component'
import { LibraryBuilderFilterComponent } from './library-builder-filter/library-builder-filter.component'
import { LibraryBuilderComponent } from './library-builder/library-builder.component'
import { LibrarySectionComponent } from './library-section/library-section.component'
import { librarySectionResolver } from './library-section/library-section.resolver'
import { LibraryTypeFilterComponent } from './library-type-filter/library-type-filter.component'

const routes: Routes = [
  {
    path: '',
    component: BuilderComponent,
    pathMatch: 'full',
    canActivate: [CanActivateUser],
    canDeactivate: [CanDeactivateComponent],
    title: 'VTES Decks - Builder',
  },
  {
    path: 'crypt',
    component: CryptSectionComponent,
    title: 'VTES Decks - Crypt',
    resolve: { crypt: cryptSectionResolver },
  },
  {
    path: 'library',
    component: LibrarySectionComponent,
    title: 'VTES Decks - Library',
    resolve: { library: librarySectionResolver },
  },
]

@NgModule({
  declarations: [
    BuilderComponent,
    ImportAmaranthComponent,
    ImportVdbComponent,
    CryptSectionComponent,
    CryptBuilderComponent,
    CryptBuilderFilterComponent,
    LibrarySectionComponent,
    LibraryBuilderComponent,
    LibraryBuilderFilterComponent,
    LibraryTypeFilterComponent,
  ],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    ReactiveFormsModule,
    InfiniteScrollDirective,
    DeckSharedModule,
    NgxSliderModule,
    RouterModule.forChild(routes),
    TranslocoModule,
  ],
  providers: [CanDeactivateComponent],
})
export class DeckBuilderModule {}
