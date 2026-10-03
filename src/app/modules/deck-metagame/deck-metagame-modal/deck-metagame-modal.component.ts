import { DecimalPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import {
  AbstractControl,
  FormArray,
  Validators,
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
import { ArchetypeAttributeRequirement } from '../../../models/api-deck-archetype'
import { NgbActiveModal, NgbTypeahead } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import {
  CLAN_LIST,
  DISCIPLINE_LIST,
  LIBRARY_TYPE_LIST,
  compareCardNames,
} from '@utils'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  switchMap,
} from 'rxjs'

interface RequirementCard {
  id: number
  name: string
}

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgbTypeahead,
    TranslocoDirective,
    MarkdownTextareaComponent,
    TranslocoPipe,
    NgClass,
    DecimalPipe,
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

  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  get requirements(): FormArray {
    return this.form.get('cardRequirements') as FormArray
  }

  readonly attributeTypes: ArchetypeAttributeRequirement['type'][] = [
    'CRYPT_CLAN',
    'LIBRARY_TYPE',
    'CRYPT_DISCIPLINE',
    'LIBRARY_DISCIPLINE',
  ]

  get attributeRequirements(): FormArray {
    return this.form.get('attributeRequirements') as FormArray
  }

  attributeOptions(type: string): { name: string }[] {
    switch (type) {
      case 'CRYPT_CLAN':
        return CLAN_LIST
      case 'LIBRARY_TYPE':
        return LIBRARY_TYPE_LIST
      case 'CRYPT_DISCIPLINE':
      case 'LIBRARY_DISCIPLINE':
        return DISCIPLINE_LIST
      default:
        return []
    }
  }

  addAttributeRequirement(requirement?: ArchetypeAttributeRequirement): void {
    if (this.loading()) {
      return
    }
    this.attributeRequirements.push(
      this.fb.group(
        {
          type: [requirement?.type ?? 'CRYPT_CLAN', Validators.required],
          value: [requirement?.value ?? '', Validators.required],
          minimumQuantity: [
            requirement?.minimumQuantity ?? 1,
            [
              Validators.required,
              Validators.min(1),
              Validators.max(2147483647),
              (control: AbstractControl) =>
                Number.isSafeInteger(control.value) ? null : { integer: true },
            ],
          ],
        },
        {
          validators: (control: AbstractControl) =>
            this.attributeOptions(control.value.type).some(
              (option) => option.name === control.value.value,
            )
              ? null
              : { attribute: true },
        },
      ),
    )
  }

  changeAttributeType(index: number): void {
    if (!this.loading()) {
      this.attributeRequirements.at(index).get('value')?.setValue('')
    }
  }

  removeAttributeRequirement(index: number): void {
    if (!this.loading()) {
      this.attributeRequirements.removeAt(index)
    }
  }

  readonly formatCard = (card: RequirementCard) => card.name
  readonly searchCard = (
    text$: Observable<string>,
  ): Observable<RequirementCard[]> =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((term) =>
        combineLatest([
          this.cryptQuery.selectByName(term, 10),
          this.libraryQuery.selectByName(term, 10),
        ]).pipe(
          map(([crypt, library]) =>
            [...crypt, ...library]
              .sort((a, b) => compareCardNames(a, b, term))
              .slice(0, 10),
          ),
        ),
      ),
    )

  addRequirement(requirement?: {
    cardId: number
    minimumQuantity: number
  }): void {
    if (this.loading()) {
      return
    }
    const card = requirement
      ? (this.cryptQuery.getEntity(requirement.cardId) ??
        this.libraryQuery.getEntity(requirement.cardId) ?? {
          id: requirement.cardId,
          name: `#${requirement.cardId}`,
        })
      : null
    this.requirements.push(
      this.fb.group({
        card: [
          card,
          (control: AbstractControl) =>
            Number.isInteger(control.value?.id) ? null : { card: true },
        ],
        minimumQuantity: [
          requirement?.minimumQuantity ?? 1,
          [
            Validators.required,
            Validators.min(1),
            Validators.max(2147483647),
            (control: AbstractControl) =>
              Number.isSafeInteger(control.value) ? null : { integer: true },
          ],
        ],
      }),
    )
  }

  removeRequirement(index: number): void {
    if (!this.loading()) {
      this.requirements.removeAt(index)
    }
  }

  form!: FormGroup
  nearestArchetype?: ApiDeckArchetype['nearestArchetype']
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
    this.nearestArchetype = archetype?.id
      ? undefined
      : archetype?.nearestArchetype
    this.form = this.fb.group({
      id: [archetype?.id ?? null],
      name: [archetype?.name ?? ''],
      type: [archetype?.type ?? ''],
      deckId: [archetype?.deckId ?? ''],
      secondaryDeckId: [archetype?.secondaryDeckId ?? ''],
      icon: [archetype?.icon ?? ''],
      description: [archetype?.description ?? ''],
      enabled: [archetype?.enabled ?? true],
      attributeRequirements: this.fb.array([], {
        validators: (control: AbstractControl) => {
          const keys = (control.value as ArchetypeAttributeRequirement[]).map(
            (row) => `${row.type}:${row.value}`,
          )
          return new Set(keys).size === keys.length ? null : { duplicate: true }
        },
      }),
      cardRequirements: this.fb.array([], {
        validators: (control: AbstractControl) => {
          const ids = (control.value as { card: RequirementCard | null }[])
            .map((row) => row.card?.id)
            .filter((id) => id !== undefined)
          return new Set(ids).size === ids.length ? null : { duplicate: true }
        },
      }),
    })
    for (const requirement of archetype?.attributeRequirements ?? []) {
      this.addAttributeRequirement(requirement)
    }
    for (const requirement of archetype?.cardRequirements ?? []) {
      this.addRequirement(requirement)
    }
  }

  save() {
    if (this.loading()) {
      return
    }

    this.form.markAllAsTouched()
    if (this.form.invalid) {
      return
    }
    const payload = {
      ...this.form.getRawValue(),
      cardRequirements: this.requirements
        .getRawValue()
        .map((row: { card: RequirementCard; minimumQuantity: number }) => ({
          cardId: row.card.id,
          minimumQuantity: row.minimumQuantity,
        })),
    } as ApiDeckArchetype
    this.loading.set(true)
    this.form.disable()
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
        this.form.enable()
        this.toast.show(
          err?.message || this.transloco.translate('shared.unexpected_error'),
          {
            classname: 'bg-danger text-light',
            delay: 10000,
          },
        )
      },
    })
  }

  cancel() {
    if (!this.loading()) {
      this.modal.dismiss()
    }
  }
}
