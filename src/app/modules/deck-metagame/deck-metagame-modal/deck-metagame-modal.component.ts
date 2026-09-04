import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import { CLAN_LIST, DISCIPLINE_LIST } from '@utils'

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    MarkdownTextareaComponent,
    TranslocoPipe,
    NgClass,
  ],
  templateUrl: './deck-metagame-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./deck-metagame-modal.component.scss'],
})
export class DeckMetagameModalComponent {
  modal = inject(NgbActiveModal)

  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly fb = inject(FormBuilder)

  form!: FormGroup
  loading = signal(false)

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
      secondaryDeckId: [archetype?.secondaryDeckId ?? ''],
      icon: [archetype?.icon ?? ''],
      description: [archetype?.description ?? ''],
      enabled: [archetype?.enabled ?? true],
    })
  }

  save() {
    if (this.loading()) {
      return
    }

    this.loading.set(true)
    const payload = this.form.value as ApiDeckArchetype
    if (!payload.secondaryDeckId) {
      payload.secondaryDeckId = null
    }

    const request$ = payload.id
      ? this.crud.update(payload)
      : this.crud.create(payload)

    request$.pipe(untilDestroyed(this)).subscribe({
      next: (res) => this.modal.close(res),
      error: (err) => {
        this.loading.set(false)
        this.toast.show(err?.message || this.transloco.translate('error'), {
          classname: 'bg-danger text-light',
          delay: 10000,
        })
      },
    })
  }

  cancel() {
    this.modal.dismiss()
  }
}
