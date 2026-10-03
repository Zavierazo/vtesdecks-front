import { Component, input } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FormBuilder, FormControl } from '@angular/forms'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { of, Subject, firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import { DeckMetagameModalComponent } from './deck-metagame-modal.component'

describe('Archetype requirements editor', () => {
  const vampire = { id: 200001, name: 'Vampire X' }
  const library = { id: 100001, name: 'Library Z' }
  let component: DeckMetagameModalComponent
  let response: Subject<ApiDeckArchetype>
  let crud: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  let modal: {
    close: ReturnType<typeof vi.fn>
    dismiss: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    response = new Subject<ApiDeckArchetype>()
    crud = { create: vi.fn(() => response), update: vi.fn(() => response) }
    modal = { close: vi.fn(), dismiss: vi.fn() }
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: DeckArchetypeCrudService, useValue: crud },
        { provide: NgbActiveModal, useValue: modal },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        {
          provide: CryptQuery,
          useValue: {
            getEntity: (id: number) =>
              id === vampire.id ? vampire : undefined,
            selectByName: () => of([vampire]),
          },
        },
        {
          provide: LibraryQuery,
          useValue: {
            getEntity: (id: number) =>
              id === library.id ? library : undefined,
            selectByName: () => of([library]),
          },
        },
      ],
    })
    component = TestBed.runInInjectionContext(
      () => new DeckMetagameModalComponent(),
    )
    component.init()
  })

  it('round trips mixed rules and clears attributes explicitly', () => {
    const attributes = [
      { type: 'CRYPT_CLAN', value: 'Malkavian', minimumQuantity: 4 },
      { type: 'LIBRARY_TYPE', value: 'Political Action', minimumQuantity: 1 },
      { type: 'CRYPT_DISCIPLINE', value: 'Dominate', minimumQuantity: 2 },
      { type: 'LIBRARY_DISCIPLINE', value: 'Dominate', minimumQuantity: 3 },
    ]
    component.init({
      id: 7,
      attributeRequirements: attributes,
      cardRequirements: [{ cardId: vampire.id, minimumQuantity: 1 }],
    } as ApiDeckArchetype)
    expect(component.form.valid).toBe(true)
    component.save()
    expect(crud.update.mock.calls[0][0].attributeRequirements).toEqual(
      attributes,
    )
    component.removeAttributeRequirement(0)
    component.addAttributeRequirement()
    expect(component.attributeRequirements.length).toBe(4)
    response.error(new Error('Failed'))
    expect(component.attributeRequirements.getRawValue()).toEqual(attributes)
    while (component.attributeRequirements.length) {
      component.removeAttributeRequirement(0)
    }
    component.save()
    expect(crud.update.mock.calls[1][0].attributeRequirements).toEqual([])
    expect(crud.update.mock.calls[1][0].cardRequirements).toEqual([
      { cardId: vampire.id, minimumQuantity: 1 },
    ])
  })

  it('validates attribute values, types, quantities and duplicates', () => {
    component.addAttributeRequirement()
    const row = component.attributeRequirements.at(0)
    expect(row.invalid).toBe(true)
    row.patchValue({ value: 'Malkavian' })
    expect(row.valid).toBe(true)
    for (const minimumQuantity of [0, -1, 1.5, null, 2147483648]) {
      row.patchValue({ minimumQuantity })
      expect(row.invalid).toBe(true)
    }
    row.patchValue({ minimumQuantity: 1, type: 'UNKNOWN' })
    expect(row.invalid).toBe(true)
    row.patchValue({ type: 'LIBRARY_TYPE' })
    component.changeAttributeType(0)
    expect(row.value.value).toBe('')
    row.patchValue({ value: 'Political Action' })
    component.addAttributeRequirement({
      type: 'LIBRARY_TYPE',
      value: 'Political Action',
      minimumQuantity: 2,
    })
    expect(component.attributeRequirements.hasError('duplicate')).toBe(true)
    component.save()
    expect(crud.create).not.toHaveBeenCalled()
    component.removeAttributeRequirement(1)
    expect(component.form.valid).toBe(true)
  })

  it('searches both catalogs and ranks the combined result', async () => {
    expect(await firstValueFrom(component.searchCard(of('Library Z')))).toEqual(
      [library, vampire],
    )
  })

  it('requires a selected card and positive integer quantity', () => {
    component.addRequirement()
    const row = component.requirements.at(0)
    expect(row.value.minimumQuantity).toBe(1)
    expect(component.form.invalid).toBe(true)
    row.get('card')!.setValue('Vampire X')
    expect(row.invalid).toBe(true)
    row.get('card')!.setValue(vampire)
    for (const quantity of [0, -1, 1.5, null, 2147483648]) {
      row.get('minimumQuantity')!.setValue(quantity)
      expect(row.invalid).toBe(true)
    }
    row.get('minimumQuantity')!.setValue(4)
    expect(row.valid).toBe(true)
  })

  it('prevents duplicates and allows removing a requirement', () => {
    component.addRequirement({ cardId: vampire.id, minimumQuantity: 4 })
    component.addRequirement({ cardId: vampire.id, minimumQuantity: 1 })
    expect(component.requirements.hasError('duplicate')).toBe(true)
    component.save()
    expect(crud.create).not.toHaveBeenCalled()
    component.removeRequirement(1)
    expect(component.form.valid).toBe(true)
  })

  it('reopens saved rules and saves IDs rather than catalog objects', () => {
    component.init({
      id: 7,
      cardRequirements: [{ cardId: vampire.id, minimumQuantity: 4 }],
    } as ApiDeckArchetype)
    expect(component.requirements.at(0).value.card).toEqual(vampire)
    component.save()
    expect(crud.update.mock.calls[0][0].cardRequirements).toEqual([
      { cardId: vampire.id, minimumQuantity: 4 },
    ])
    expect(component.form.disabled).toBe(true)
    component.addRequirement()
    component.removeRequirement(0)
    component.cancel()
    component.save()
    expect(component.requirements.length).toBe(1)
    expect(modal.dismiss).not.toHaveBeenCalled()
    expect(crud.update).toHaveBeenCalledTimes(1)
    response.next({ id: 7 } as ApiDeckArchetype)
    expect(modal.close).toHaveBeenCalled()
  })

  it('retains edits and re-enables controls after a failed save', () => {
    component.addRequirement({ cardId: library.id, minimumQuantity: 10 })
    component.save()
    response.error(new Error('Failed'))
    expect(component.loading()).toBe(false)
    expect(component.form.enabled).toBe(true)
    expect(component.requirements.at(0).value.minimumQuantity).toBe(10)
    expect(modal.close).not.toHaveBeenCalled()
  })

  it('sends an explicit empty list after removing all rules', () => {
    component.addRequirement({ cardId: library.id, minimumQuantity: 10 })
    component.removeRequirement(0)
    component.save()
    expect(crud.create.mock.calls[0][0].cardRequirements).toEqual([])
  })
})

@Component({ selector: 'app-markdown-textarea', template: '' })
class MarkdownStub {
  control = input.required<FormControl>()
  placeholder = input.required<string>()
  label = input.required<string>()
}

describe('Archetype requirements template', () => {
  it('renders saved names and quantities and adds an editable empty row', async () => {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      imports: [
        DeckMetagameModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { defaultLang: 'en', availableLangs: ['en'] },
        }),
      ],
      providers: [
        {
          provide: NgbActiveModal,
          useValue: { close: vi.fn(), dismiss: vi.fn() },
        },
        { provide: DeckArchetypeCrudService, useValue: {} },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: CryptQuery,
          useValue: {
            getEntity: () => ({ id: 200001, name: 'Vampire X' }),
            selectByName: () => of([]),
          },
        },
        {
          provide: LibraryQuery,
          useValue: { getEntity: () => undefined, selectByName: () => of([]) },
        },
      ],
    }).overrideComponent(DeckMetagameModalComponent, {
      remove: { imports: [MarkdownTextareaComponent] },
      add: { imports: [MarkdownStub] },
    })
    const fixture = TestBed.createComponent(DeckMetagameModalComponent)
    fixture.componentInstance.init({
      cardRequirements: [{ cardId: 200001, minimumQuantity: 4 }],
      attributeRequirements: [
        { type: 'CRYPT_CLAN', value: 'Malkavian', minimumQuantity: 4 },
      ],
    } as ApiDeckArchetype)
    fixture.detectChanges()
    await fixture.whenStable()
    const root = fixture.nativeElement as HTMLElement
    expect(
      root.querySelector<HTMLInputElement>('#requirement-card-0')?.value,
    ).toBe('Vampire X')
    expect(
      root.querySelector<HTMLInputElement>('#requirement-min-0')?.value,
    ).toBe('4')
    fixture.componentInstance.addRequirement()
    fixture.detectChanges()
    expect(
      root.querySelector<HTMLInputElement>('#requirement-card-1')?.value,
    ).toBe('')
    expect(
      root.querySelector<HTMLInputElement>('#requirement-min-1')?.value,
    ).toBe('1')
    expect(
      root.querySelector<HTMLSelectElement>('#attribute-value-0')?.value,
    ).toBe('Malkavian')
    const typeSelect =
      root.querySelector<HTMLSelectElement>('#attribute-type-0')!
    typeSelect.value = 'LIBRARY_TYPE'
    typeSelect.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    const valueSelect =
      root.querySelector<HTMLSelectElement>('#attribute-value-0')!
    expect(valueSelect.value).toBe('')
    expect(
      Array.from(valueSelect.options).some(
        (option) => option.value === 'Political Action',
      ),
    ).toBe(true)
    valueSelect.value = 'Political Action'
    valueSelect.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    expect(fixture.componentInstance.attributeRequirements.at(0).valid).toBe(
      true,
    )
    fixture.destroy()
  })
})
