import { inject, Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({
  name: 'condition',
  standalone: true,
})
export class ConditionPipe implements PipeTransform {
  private translocoService = inject(TranslocoService)

  transform(value: string | undefined): { label: string; badgeClass: string } {
    if (!value) return { label: '', badgeClass: 'bg-secondary' }
    let badgeClass = 'bg-secondary'
    let label = value
    switch (value) {
      case 'MT':
        badgeClass = 'bg-success'
        label = this.translocoService.translate('collection.condition_mint')
        break
      case 'NM':
        badgeClass = 'bg-primary'
        label = this.translocoService.translate(
          'collection.condition_near_mint',
        )
        break
      case 'EX':
        badgeClass = 'bg-info'
        label = this.translocoService.translate(
          'collection.condition_excellent',
        )
        break
      case 'GD':
        badgeClass = 'bg-warning'
        label = this.translocoService.translate('collection.condition_good')
        break
      case 'LP':
        badgeClass = 'bg-warning text-dark'
        label = this.translocoService.translate(
          'collection.condition_lightly_played',
        )
        break
      case 'PL':
        badgeClass = 'bg-danger'
        label = this.translocoService.translate('collection.condition_played')
        break
      case 'PO':
        badgeClass = 'bg-dark'
        label = this.translocoService.translate('collection.condition_poor')
        break
    }
    return { label, badgeClass }
  }
}
