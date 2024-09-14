import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import { AnimatedDigitComponent } from './components/animated-digit/animated-digit.component'
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component'
import { LangSelectorComponent } from './components/lang-selector/lang-selector.component'
import { LoadingComponent } from './components/loading/loading.component'
import { LoginComponent } from './components/login/login.component'
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component'
import { TableSeatingComponent } from './components/table-seating/table-seating.component'
import { ThemeSelectorComponent } from './components/theme-selector/theme-selector.component'
import { ToastsContainer } from './components/toast-container/toast-container.component'
import { IsLoggedDirective } from './directives/is-logged.directive'
import { DateAsAgoPipe } from './pipes/date-ago.pipe'
import { TruncatePipe } from './pipes/truncate.pipe'

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
    LangSelectorComponent,
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
    LangSelectorComponent,
    ThemeSelectorComponent,
    TableSeatingComponent,
  ],
})
export class SharedModule {}
