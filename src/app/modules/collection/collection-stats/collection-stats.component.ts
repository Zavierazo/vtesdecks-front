import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCollectionSectionStats, ApiCollectionStats } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { SetQuery } from '@state/set/set.query'
import {
  getClanIcon as utilsGetClanIcon,
  getLibraryTypeIcons as utilsGetLibraryTypeIcons,
} from '@utils'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionStatsModalComponent } from './collection-stats-modal/collection-stats-modal.component'

interface DisplaySection {
  key: string
  total: number
  collected: number
  missing: number
  price: number
  pct: number
}

@UntilDestroy()
@Component({
  selector: 'app-collection-stats',
  templateUrl: './collection-stats.component.html',
  styleUrls: ['./collection-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoDirective, RouterLink],
})
export class CollectionStatsComponent implements OnInit {
  private readonly collectionApiDataService = inject(CollectionApiDataService)
  private readonly setQuery = inject(SetQuery)
  private readonly modalService = inject(NgbModal)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  stats: ApiCollectionStats | null = null
  currency = ''

  clans: DisplaySection[] = []
  types: DisplaySection[] = []
  sets: DisplaySection[] = []

  // modal handled via NgbModal

  ngOnInit() {
    this.collectionApiDataService
      .getCollectionStats()
      .pipe(untilDestroyed(this))
      .subscribe((stats) => {
        this.stats = stats
        this.currency = stats.currency ?? ''
        this.prepareSections()
        this.changeDetectorRef.markForCheck()
      })
  }

  private toDisplay(
    key: string,
    sec: ApiCollectionSectionStats,
  ): DisplaySection {
    const collected = this.countOf(sec.collected)
    const missing = this.countOf(sec.missing)
    const total = sec.total
    const pct = this.pct(collected, missing)
    return { key, total, collected, missing, price: sec.price ?? 0, pct }
  }

  countOf(obj: unknown): number {
    if (!obj) return 0
    if (obj instanceof Set) return obj.size
    if (Array.isArray(obj)) return obj.length
    if (typeof obj === 'object')
      return Object.keys(obj as Record<string, unknown>).length
    return 0
  }

  pct(collected: number, missing: number): number {
    const total = collected + missing
    return total > 0 ? Math.round((collected / total) * 100) : 0
  }

  private prepareSections() {
    if (!this.stats) return
    const clansEntries: [string, ApiCollectionSectionStats][] =
      this.stats.clans instanceof Map
        ? Array.from(this.stats.clans.entries())
        : Object.entries(
            this.stats.clans as unknown as Record<
              string,
              ApiCollectionSectionStats
            >,
          )

    const typesEntries: [string, ApiCollectionSectionStats][] =
      this.stats.types instanceof Map
        ? Array.from(this.stats.types.entries())
        : Object.entries(
            this.stats.types as unknown as Record<
              string,
              ApiCollectionSectionStats
            >,
          )

    const setsEntries: [string, ApiCollectionSectionStats][] =
      this.stats.sets instanceof Map
        ? Array.from(this.stats.sets.entries())
        : Object.entries(
            this.stats.sets as unknown as Record<
              string,
              ApiCollectionSectionStats
            >,
          )

    this.clans = clansEntries.map(([k, v]) => this.toDisplay(k, v))
    this.types = typesEntries.map(([k, v]) => this.toDisplay(k, v))
    this.sets = setsEntries.map(([k, v]) => this.toDisplay(k, v))
    // sort by pct desc then name
    const sortFn = (a: DisplaySection, b: DisplaySection) =>
      b.pct - a.pct || a.key.localeCompare(b.key)
    this.clans.sort(sortFn)
    this.types.sort(sortFn)
    this.sets.sort(sortFn)
  }

  openDetails(
    section: 'clan' | 'type' | 'set' | 'overall' | 'crypt' | 'library',
    key: string,
    title: string = key,
  ) {
    if (!this.stats) return
    let sec: ApiCollectionSectionStats | undefined
    if (this.stats.clans instanceof Map)
      sec = section === 'clan' ? this.stats.clans.get(key) : undefined
    else if (section === 'clan')
      sec = (
        this.stats.clans as unknown as Record<string, ApiCollectionSectionStats>
      )?.[key]

    if (this.stats.types instanceof Map)
      sec = sec ?? (section === 'type' ? this.stats.types.get(key) : undefined)
    else if (section === 'type')
      sec =
        sec ??
        (
          this.stats.types as unknown as Record<
            string,
            ApiCollectionSectionStats
          >
        )?.[key]

    if (this.stats.sets instanceof Map)
      sec = sec ?? (section === 'set' ? this.stats.sets.get(key) : undefined)
    else if (section === 'set')
      sec =
        sec ??
        (
          this.stats.sets as unknown as Record<
            string,
            ApiCollectionSectionStats
          >
        )?.[key]

    // handle aggregate sections
    if (section === 'overall')
      sec = this.stats.overall as ApiCollectionSectionStats
    else if (section === 'crypt')
      sec = this.stats.crypt as ApiCollectionSectionStats
    else if (section === 'library')
      sec = this.stats.library as ApiCollectionSectionStats

    if (!sec) return

    const owned =
      sec.collected instanceof Set
        ? Array.from(sec.collected)
        : Array.isArray(sec.collected)
          ? sec.collected
          : []
    const missing =
      sec.missing instanceof Set
        ? Array.from(sec.missing)
        : Array.isArray(sec.missing)
          ? sec.missing
          : []

    const modalRef = this.modalService.open(CollectionStatsModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.title = title
    modalRef.componentInstance.owned = owned
    modalRef.componentInstance.missing = missing
  }

  getClanIcon(clan: string): string | undefined {
    return utilsGetClanIcon(clan)
  }

  getLibraryTypeIcons(libraryType: string): string[] | undefined {
    return utilsGetLibraryTypeIcons(libraryType)
  }

  getSetFullName(abbrev: string): string {
    const apiSet = this.setQuery.getEntityByAbbrev(abbrev)
    return apiSet ? apiSet.fullName : abbrev
  }
}
