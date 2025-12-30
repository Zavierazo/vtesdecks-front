import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import { CLAN_LIST, DISCIPLINE_LIST } from '@utils'

@Component({
  selector: 'app-deck-archetype-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoDirective,
    MarkdownTextareaComponent,
  ],
  templateUrl: './deck-archetype-modal.component.html',
  styleUrls: ['./deck-archetype-modal.component.scss'],
})
export class DeckArchetypeModalComponent {
  modal = inject(NgbActiveModal)

  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly fb = inject(FormBuilder)

  form!: FormGroup

  get descriptionControl(): FormControl {
    return (this.form?.get('description') as FormControl) ?? new FormControl('')
  }

  clans = CLAN_LIST
  disciplines = DISCIPLINE_LIST

  get iconValue(): string {
    return (this.form?.get('icon')?.value as string) ?? ''
  }

  init(archetype?: ApiDeckArchetype) {
    this.form = this.fb.group({
      id: [archetype?.id ?? null],
      name: [archetype?.name ?? ''],
      type: [archetype?.type ?? ''],
      deckId: [archetype?.deckId ?? ''],
      icon: [archetype?.icon ?? ''],
      description: [archetype?.description ?? ' [Read more in Codex]()'],
      enabled: [archetype?.enabled ?? true],
    })
  }

  save() {
    const payload = this.form.value as ApiDeckArchetype
    if (payload.id) {
      this.crud.update(payload).subscribe({
        next: (updated) => this.modal.close(updated),
        error: (err) =>
          this.toast.show(err?.message || this.transloco.translate('error'), {
            classname: 'bg-danger text-light',
            delay: 5000,
          }),
      })
    } else {
      this.crud.create(payload).subscribe({
        next: (created) => this.modal.close(created),
        error: (err) =>
          this.toast.show(err?.message || this.transloco.translate('error'), {
            classname: 'bg-danger text-light',
            delay: 5000,
          }),
      })
    }
  }

  cancel() {
    this.modal.dismiss()
  }
}
