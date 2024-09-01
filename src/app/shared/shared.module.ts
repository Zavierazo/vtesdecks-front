import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TruncatePipe } from './pipes/truncate.pipe';
import { AnimatedDigitComponent } from './components/animated-digit/animated-digit.component';
import { LoadingComponent } from './components/loading/loading.component';
import { DateAsAgoPipe } from './pipes/date-ago.pipe';
import { IsLoggedDirective } from './directives/is-logged.directive';
import { ToastsContainer } from './components/toast-container/toast-container.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { LoginComponent } from './components/login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeSelectorComponent } from './components/theme-selector/theme-selector.component';
import { TableSeatingComponent } from './components/table-seating/table-seating.component';
import { TranslocoModule } from '@ngneat/transloco';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    LoadingComponent,
    AnimatedDigitComponent,
    TruncatePipe,
    DateAsAgoPipe,
    IsLoggedDirective,
    ToastsContainer,
    LoginComponent,
    PageNotFoundComponent,
    ThemeSelectorComponent,
    TableSeatingComponent,
    ConfirmDialogComponent,
  ],
  imports: [CommonModule, NgbModule, TranslocoModule, ReactiveFormsModule],
  exports: [
    LoadingComponent,
    AnimatedDigitComponent,
    TruncatePipe,
    DateAsAgoPipe,
    IsLoggedDirective,
    ToastsContainer,
    LoginComponent,
    PageNotFoundComponent,
    ThemeSelectorComponent,
    TableSeatingComponent,
  ],
})
export class SharedModule {}
