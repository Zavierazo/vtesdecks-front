import { LibrarySectionComponent } from './library-section/library-section.component';
import { CryptSectionComponent } from './crypt-section/crypt-section.component';
import { LibraryTypeFilterComponent } from './library-type-filter/library-type-filter.component';
import { LibraryBuilderFilterComponent } from './library-builder-filter/library-builder-filter.component';
import { LibraryBuilderComponent } from './library-builder/library-builder.component';
import { CryptBuilderFilterComponent } from './crypt-builder-filter/crypt-builder-filter.component';
import { NgxSliderModule } from 'ngx-slider-v2';
import { CryptBuilderComponent } from './crypt-builder/crypt-builder.component';
import { ImportVdbComponent } from './import-vdb/import-vdb.component';
import { BuilderComponent } from './builder.component';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard';
import { CanDeactivateComponent } from '../../shared/guards/can-deactivate-component.guard';
import { DeckSharedModule } from '../deck-shared/deck-shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { ImportAmaranthComponent } from './import-amaranth/import-amaranth.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SharedModule } from '../../shared/shared.module';
import { TranslocoModule } from '@ngneat/transloco';
import { librarySectionResolver } from './library-section/library-section.resolver';
import { cryptSectionResolver } from './crypt-section/crypt-section.resolver';

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
];

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
    InfiniteScrollModule,
    DeckSharedModule,
    NgxSliderModule,
    RouterModule.forChild(routes),
    TranslocoModule,
  ],
  providers: [CanDeactivateComponent],
})
export class DeckBuilderModule {}
