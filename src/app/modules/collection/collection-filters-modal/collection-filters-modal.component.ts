import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { LibraryTypeFilterComponent } from '../../deck-builder/library-type-filter/library-type-filter.component'
import { ClanFilterComponent } from '../../deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '../../deck-shared/discipline-filter/discipline-filter.component'

export interface CollectionFilters {
  types?: string[]
  clans?: string[]
  disciplines?: string[]
}

@Component({
  selector: 'app-collection-filters-modal',
  templateUrl: './collection-filters-modal.component.html',
  styleUrls: ['./collection-filters-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    TranslocoPipe,
    ClanFilterComponent,
    DisciplineFilterComponent,
    LibraryTypeFilterComponent,
  ],
})
export class CollectionFiltersModalComponent {
  private activeModal = inject(NgbActiveModal)

  form?: FormGroup

  initFilters(filters: CollectionFilters) {
    this.form = new FormGroup({
      types: new FormControl<string[]>(filters.types || []),
      clans: new FormControl<string[]>(filters.clans || []),
      disciplines: new FormControl<string[]>(filters.disciplines || []),
    })
  }

  get typeControl() {
    return this.form?.get('types') as FormControl<string[]>
  }

  get clanControl() {
    return this.form?.get('clans') as FormControl<string[]>
  }

  get disciplineControl() {
    return this.form?.get('disciplines') as FormControl<string[]>
  }

  onApply() {
    if (!this.form) {
      return
    }
    const filters: CollectionFilters = {
      types: this.form.value.types ? this.form.value.types : undefined,
      clans: this.form.value.clans ? this.form.value.clans : undefined,
      disciplines: this.form.value.disciplines
        ? this.form.value.disciplines
        : undefined,
    }

    this.activeModal.close({ filters })
  }

  onClear() {
    this.form?.reset({
      types: [],
      clans: [],
      disciplines: [],
    })
  }

  onCancel() {
    this.activeModal.dismiss()
  }
}
