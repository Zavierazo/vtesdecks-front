import { Directive, EventEmitter, Input, Output } from '@angular/core'
import { ApiWishlistCard } from '@models'

export type SortColumn = keyof ApiWishlistCard
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
  selector: 'th[appWishlistSortable]',
  host: {
    '[class.asc]': 'direction === "asc"',
    '[class.desc]': 'direction === "desc"',
    '(click)': 'rotate()',
  },
})
export class WishlistSortableHeader {
  @Input() appWishlistSortable!: SortColumn
  @Input() direction: SortDirection = ''
  @Output() sort = new EventEmitter<SortEvent>()

  rotate() {
    this.direction = rotate[this.direction]
    this.sort.emit({
      column: this.appWishlistSortable,
      direction: this.direction,
    })
  }
}
