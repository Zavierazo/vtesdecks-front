import { inject, Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({
  name: 'wishlistPriority',
  standalone: true,
})
export class WishlistPriorityPipe implements PipeTransform {
  private translocoService = inject(TranslocoService)

  transform(value: string | null | undefined): {
    label: string
    badgeClass: string
  } {
    if (!value) return { label: '', badgeClass: 'bg-secondary' }
    let badgeClass = 'bg-secondary'
    let label = value
    switch (value) {
      case 'HIGH':
        badgeClass = 'bg-danger'
        label = this.translocoService.translate('wishlist.priority_high')
        break
      case 'MEDIUM':
        badgeClass = 'bg-warning text-dark'
        label = this.translocoService.translate('wishlist.priority_medium')
        break
      case 'LOW':
        badgeClass = 'bg-secondary'
        label = this.translocoService.translate('wishlist.priority_low')
        break
    }
    return { label, badgeClass }
  }
}
