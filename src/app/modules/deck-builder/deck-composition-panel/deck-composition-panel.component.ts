import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiCrypt, ApiLibrary } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { getDisciplineIcon, isCrypt } from '@utils'
import { NgClass } from '@angular/common'
import { CryptComponent } from '@deck-shared/crypt/crypt.component'
import { LibraryComponent } from '@deck-shared/library/library.component'
import { LibraryListComponent } from '@deck-shared/library-list/library-list.component'
import { LibraryTypeTranslocoPipe } from '@deck-shared/library-type-transloco/library-type-transloco.pipe'

type SectionType = 'crypt' | 'library'
interface CompositionRow extends ApiCard {
  name: string
  metadata?: ApiCrypt | ApiLibrary
}

@Component({
  imports: [
    NgClass,
    TranslocoDirective,
    TranslocoPipe,
    LibraryTypeTranslocoPipe,
    CryptComponent,
    LibraryComponent,
  ],
  selector: 'app-deck-composition-panel',
  styleUrl: './deck-composition-panel.component.scss',
  templateUrl: './deck-composition-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckCompositionPanelComponent {
  private readonly query = inject(DeckBuilderQuery)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  readonly builder = inject(DeckBuilderService)

  readonly primarySection = input.required<SectionType>()
  readonly expandedSections = linkedSignal<
    SectionType,
    Record<SectionType, boolean>
  >({
    source: this.primarySection,
    computation: (primary) => ({
      crypt: primary === 'crypt',
      library: primary === 'library',
    }),
  })
  readonly getDisciplineIcon = getDisciplineIcon
  readonly cryptDisciplines = toSignal(this.query.selectCryptDisciplines(), {
    initialValue: [],
  })
  readonly libraryDisciplines = toSignal(
    this.query.selectLibraryDisciplines(),
    { initialValue: [] },
  )

  toggleSection(section: SectionType): void {
    this.expandedSections.update((expanded) => ({
      ...expanded,
      [section]: !expanded[section],
    }))
  }
  private readonly cards = toSignal(this.query.selectCards(), {
    initialValue: [],
  })
  private readonly cryptCatalog = toSignal(this.cryptQuery.selectAll({}), {
    initialValue: [],
  })
  private readonly libraryCatalog = toSignal(this.libraryQuery.selectAll({}), {
    initialValue: [],
  })
  private readonly cryptSort = toSignal(this.query.selectCryptSortBy(), {
    initialValue: 'capacity',
  })
  private readonly librarySort = toSignal(this.query.selectLibrarySortBy(), {
    initialValue: 'quantity',
  })

  readonly sections = computed(() => {
    const cryptMap = new Map(this.cryptCatalog().map((card) => [card.id, card]))
    const libraryMap = new Map(
      this.libraryCatalog().map((card) => [card.id, card]),
    )
    const sectionTypes: SectionType[] = ['crypt', 'library']
    return sectionTypes.map((section) => {
      const rows: CompositionRow[] = this.cards()
        .filter((card) => isCrypt(card) === (section === 'crypt'))
        .map((card) => {
          const metadata =
            section === 'crypt'
              ? cryptMap.get(card.id)
              : libraryMap.get(card.id)
          return {
            ...card,
            metadata,
            name: metadata?.i18n?.name || metadata?.name || `#${card.id}`,
            type: metadata?.type || card.type || '',
          }
        })
      const sort = section === 'crypt' ? this.cryptSort() : this.librarySort()
      rows.sort((a, b) => {
        if ((a.number === 0) !== (b.number === 0)) {
          return a.number === 0 ? 1 : -1
        }
        if (sort === 'quantity' || !a.metadata || !b.metadata) {
          return b.number - a.number || a.name.localeCompare(b.name)
        }
        if (sort === 'name') {
          return a.metadata.name.localeCompare(b.metadata.name)
        }
        const left = (a.metadata as ApiCrypt)[
          sort as 'capacity' | 'clan' | 'group'
        ]
        const right = (b.metadata as ApiCrypt)[
          sort as 'capacity' | 'clan' | 'group'
        ]
        const comparison =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right))
        return (
          (sort === 'capacity' ? -comparison : comparison) ||
          a.name.localeCompare(b.name)
        )
      })
      const groupTypes =
        section === 'crypt'
          ? ['']
          : [...new Set(rows.map((card) => card.type || ''))].sort((a, b) => {
              const order = LibraryListComponent.libraryTypeOrder
              const left = order.indexOf(a)
              const right = order.indexOf(b)
              return (
                (left < 0 ? order.length : left) -
                (right < 0 ? order.length : right)
              )
            })
      return {
        type: section,
        total: rows.reduce((total, card) => total + card.number, 0),
        groups: groupTypes.map((type) => {
          const cards =
            section === 'crypt'
              ? rows
              : rows.filter((card) => card.type === type)
          return {
            type,
            cards,
            total: cards.reduce((total, card) => total + card.number, 0),
          }
        }),
        empty: rows.length === 0,
      }
    })
  })
}
