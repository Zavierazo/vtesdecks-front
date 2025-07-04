import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'condition',
  standalone: true,
})
export class ConditionPipe implements PipeTransform {
  transform(value: string | undefined): { label: string; badgeClass: string } {
    if (!value) return { label: '', badgeClass: 'bg-secondary' }
    let badgeClass = 'bg-secondary'
    let label = value
    switch (value) {
      case 'MT':
        badgeClass = 'bg-success'
        label = 'Mint'
        break
      case 'NM':
        badgeClass = 'bg-primary'
        label = 'Near Mint'
        break
      case 'EX':
        badgeClass = 'bg-info'
        label = 'Excellent'
        break
      case 'GD':
        badgeClass = 'bg-warning'
        label = 'Good'
        break
      case 'LP':
        badgeClass = 'bg-warning text-dark'
        label = 'Light Play'
        break
      case 'PL':
        badgeClass = 'bg-danger'
        label = 'Played'
        break
      case 'PO':
        badgeClass = 'bg-dark'
        label = 'Poor'
        break
    }
    return { label, badgeClass }
  }
}
