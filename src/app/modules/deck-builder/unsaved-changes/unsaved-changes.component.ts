import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCard } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId } from '@utils'
import { compareCardQuantities } from '../../../utils/deck-card-diff'

@Component({
  selector: 'app-unsaved-changes',
  imports: [TranslocoDirective],
  templateUrl: './unsaved-changes.component.html',
  styleUrl: './unsaved-changes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedChangesComponent {
  readonly baseline = input<readonly ApiCard[] | null>()
  readonly cards = input.required<readonly ApiCard[]>()
  readonly expanded = linkedSignal({
    source: this.baseline,
    computation: () => false,
  })
  private readonly crypt = toSignal(inject(CryptQuery).selectAll({}), {
    initialValue: [],
  })
  private readonly library = toSignal(inject(LibraryQuery).selectAll({}), {
    initialValue: [],
  })
  readonly changes = computed(() => {
    const names = new Map(
      [...this.crypt(), ...this.library()].map((card) => [
        card.id,
        card.i18n?.name || card.name,
      ]),
    )
    return compareCardQuantities(this.baseline() ?? [], this.cards())
      .map((delta) => ({
        ...delta,
        name: names.get(delta.id) || String(delta.id),
      }))
      .sort(
        (a, b) =>
          Math.abs(b.difference) - Math.abs(a.difference) ||
          a.name.localeCompare(b.name),
      )
  })
  readonly groups = computed(() =>
    [true, false].map((crypt) => ({
      name: crypt ? 'crypt' : 'library',
      before: (this.baseline() ?? [])
        .filter((card) => isCryptId(card.id) === crypt)
        .reduce((total, card) => total + card.number, 0),
      after: this.cards()
        .filter((card) => isCryptId(card.id) === crypt)
        .reduce((total, card) => total + card.number, 0),
      changes: this.changes().filter((card) => isCryptId(card.id) === crypt),
    })),
  )
}
