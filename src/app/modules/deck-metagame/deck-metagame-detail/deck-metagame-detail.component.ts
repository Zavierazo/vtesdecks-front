import { AsyncPipe, CurrencyPipe, DecimalPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import {
  ApiArchetypeKeyCard,
  ApiClanStat,
  ApiDeckArchetype,
  ApiDisciplineStat,
} from '@models'
import {
  NgbCollapseModule,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import {
  getClanIcon,
  getDisciplineIcon,
  getLibraryTypeIcons,
  LIBRARY_TYPE_LIST,
} from '@utils'
import { Observable } from 'rxjs'
import { ClanTranslocoPipe } from '../../deck-shared/clan-transloco/clan-transloco.pipe'
import { CryptCardComponent } from '../../deck-shared/crypt-card/crypt-card.component'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { DisciplineTranslocoPipe } from '../../deck-shared/discipline-transloco/discipline-transloco.pipe'
import { LibraryTypeTranslocoPipe } from '../../deck-shared/library-type-transloco/library-type-transloco.pipe'
import { LibraryCardComponent } from '../../deck-shared/library-card/library-card.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'
import { ArchetypeCardStatsComponent } from './archetype-card-stats/archetype-card-stats.component'

export interface LibraryTypeGroup {
  type: string
  icons: string[]
  count: number
  average: number
  coreCards: ApiArchetypeKeyCard[]
  suggestedCards: ApiArchetypeKeyCard[]
}

export interface CryptCapacity {
  min: number
  max: number
  avg: number
}

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame-detail',
  templateUrl: './deck-metagame-detail.component.html',
  styleUrls: ['./deck-metagame-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    NgClass,
    TranslocoDirective,
    TranslocoPipe,
    RouterLink,
    NgbCollapseModule,
    NgbTooltip,
    DecimalPipe,
    CurrencyPipe,
    MarkdownTextComponent,
    CryptComponent,
    LibraryComponent,
    ArchetypeCardStatsComponent,
    AdSenseComponent,
    LibraryTypeTranslocoPipe,
    ClanTranslocoPipe,
    DisciplineTranslocoPipe,
  ],
})
export class DeckMetagameDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly apiDataService = inject(ApiDataService)
  private readonly modalService = inject(NgbModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  archetype$!: Observable<ApiDeckArchetype>

  cryptSuggestionsCollapsed = true
  expandedLibrarySuggestions: Record<string, boolean> = {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'))
    this.archetype$ = this.apiDataService
      .getDeckArchetype(id)
      .pipe(untilDestroyed(this))
  }

  getCoreCrypt(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyCrypt ?? []).filter((kc) => kc.appearanceRate >= 0.5)
  }

  getSuggestedCrypt(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyCrypt ?? []).filter((kc) => kc.appearanceRate < 0.5)
  }

  getCryptTotalCount(archetype: ApiDeckArchetype): number {
    return (archetype.keyCrypt ?? [])
      .filter((kc) => kc.appearanceRate >= 0.5)
      .reduce((acc, kc) => acc + kc.number, 0)
  }

  getLibraryTotalCount(archetype: ApiDeckArchetype): number {
    return (archetype.keyLibrary ?? [])
      .filter((kc) => kc.appearanceRate >= 0.5)
      .reduce((acc, kc) => acc + kc.number, 0)
  }

  getMetaPercentage(archetype: ApiDeckArchetype): number {
    if (!archetype || archetype.metaTotal === 0) return 0
    return (archetype.metaCount / archetype.metaTotal) * 100
  }

  // ── Crypt overview ──────────────────────────────────────────────
  getCryptClans(archetype: ApiDeckArchetype): ApiClanStat[] {
    return this.cryptQuery.getClans(this.getCoreCrypt(archetype))
  }

  getCryptDisciplines(archetype: ApiDeckArchetype): ApiDisciplineStat[] {
    return this.cryptQuery.getDisciplines(this.getCoreCrypt(archetype))
  }

  getCryptCapacity(archetype: ApiDeckArchetype): CryptCapacity | null {
    const capacities = this.getCoreCrypt(archetype)
      .map((kc) => this.cryptQuery.getEntity(kc.id)?.capacity)
      .filter((c): c is number => c !== undefined)
    if (capacities.length === 0) {
      return null
    }
    const sum = capacities.reduce((acc, c) => acc + c, 0)
    return {
      min: Math.min(...capacities),
      max: Math.max(...capacities),
      avg: sum / capacities.length,
    }
  }

  getClanIcon(clan: string): string | undefined {
    return getClanIcon(clan)
  }

  getDisciplineIcon(discipline: string, superior: boolean): string | undefined {
    return getDisciplineIcon(discipline, superior)
  }

  // ── Library overview ────────────────────────────────────────────
  getLibraryDisciplines(archetype: ApiDeckArchetype): ApiDisciplineStat[] {
    return this.libraryQuery.getDisciplines(this.getCoreLibrary(archetype))
  }

  getLibraryClans(archetype: ApiDeckArchetype): ApiClanStat[] {
    return this.libraryQuery.getClans(this.getCoreLibrary(archetype))
  }

  private getCoreLibrary(archetype: ApiDeckArchetype): ApiArchetypeKeyCard[] {
    return (archetype.keyLibrary ?? []).filter((kc) => kc.appearanceRate >= 0.5)
  }

  // ── Library grouped by type ─────────────────────────────────────
  getLibraryGroups(archetype: ApiDeckArchetype): LibraryTypeGroup[] {
    const groups = new Map<string, LibraryTypeGroup>()
    ;(archetype.keyLibrary ?? []).forEach((card) => {
      const type = this.libraryQuery.getEntity(card.id)?.type ?? 'Unknown'
      let group = groups.get(type)
      if (!group) {
        group = {
          type,
          icons: getLibraryTypeIcons(type) ?? [],
          count: 0,
          average: 0,
          coreCards: [],
          suggestedCards: [],
        }
        groups.set(type, group)
      }
      // Expected copies of this card in an average deck = avg copies (when
      // present) weighted by how often the card appears.
      group.average += card.avg * card.appearanceRate
      if (card.appearanceRate >= 0.5) {
        group.coreCards.push(card)
        group.count += card.number
      } else {
        group.suggestedCards.push(card)
      }
    })
    return Array.from(groups.values()).sort(
      (a, b) => this.libraryTypeOrder(a.type) - this.libraryTypeOrder(b.type),
    )
  }

  isLibrarySuggestionsCollapsed(type: string): boolean {
    return !this.expandedLibrarySuggestions[type]
  }

  toggleLibrarySuggestions(type: string): void {
    this.expandedLibrarySuggestions[type] = !this.expandedLibrarySuggestions[type]
  }

  private libraryTypeOrder(type: string): number {
    const primary = type.split('/')[0]
    const index = LIBRARY_TYPE_LIST.findIndex((t) => t.name === primary)
    return index === -1 ? LIBRARY_TYPE_LIST.length : index
  }

  openCryptCard(cardId: number, archetype: ApiDeckArchetype): void {
    if (!this.cryptQuery.getEntity(cardId)) {
      return
    }
    const allIds = (archetype.keyCrypt ?? []).map((kc) => kc.id)
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = allIds
      .map((id) => this.cryptQuery.getEntity(id))
      .filter(Boolean)
    const current = cryptList.find((c) => c?.id === cardId)
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = current ? cryptList.indexOf(current) : 0
  }

  openLibraryCard(cardId: number, archetype: ApiDeckArchetype): void {
    if (!this.libraryQuery.getEntity(cardId)) {
      return
    }
    const allIds = (archetype.keyLibrary ?? []).map((kc) => kc.id)
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const libraryList = allIds
      .map((id) => this.libraryQuery.getEntity(id))
      .filter(Boolean)
    const current = libraryList.find((c) => c?.id === cardId)
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = current
      ? libraryList.indexOf(current)
      : 0
  }
}
