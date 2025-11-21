import { Directive, EventEmitter, Input, Output } from '@angular/core'
import { ApiCollectionCard } from '@models'

export type SortColumn = keyof ApiCollectionCard
export type SortDirection = 'asc' | 'desc' | ''
const rotate: Record<string, SortDirection> = {
  asc: 'desc',
  desc: 'asc',
  '': 'desc',
}

export interface SortEvent {
  column: SortColumn
  direction: SortDirection
}

@Directive({
  selector: 'th[appSortable]',
  host: {
    '[class.asc]': 'direction === "asc"',
    '[class.desc]': 'direction === "desc"',
    '(click)': 'rotate()',
  },
})
export class CollectionSortableHeader {
  @Input() appSortable!: SortColumn
  @Input() direction: SortDirection = ''
  @Output() sort = new EventEmitter<SortEvent>()

  rotate() {
    this.direction = rotate[this.direction]
    this.sort.emit({ column: this.appSortable, direction: this.direction })
  }
}
