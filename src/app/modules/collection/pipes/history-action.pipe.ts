import { inject, Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({
  name: 'historyAction',
  standalone: true,
})
export class HistoryActionPipe implements PipeTransform {
  private translocoService = inject(TranslocoService)

  transform(value: string | undefined): {
    label: string
    badgeClass: string
    icon: string
  } {
    switch (value) {
      case 'INSERT':
        return {
          label: this.translocoService.translate(
            'collection.history_action_insert',
          ),
          badgeClass: 'bg-success',
          icon: 'bi-plus-circle',
        }
      case 'UPDATE':
        return {
          label: this.translocoService.translate(
            'collection.history_action_update',
          ),
          badgeClass: 'bg-primary',
          icon: 'bi-pencil',
        }
      case 'DELETE':
        return {
          label: this.translocoService.translate(
            'collection.history_action_delete',
          ),
          badgeClass: 'bg-danger',
          icon: 'bi-trash',
        }
      default:
        return {
          label: value ?? '',
          badgeClass: 'bg-secondary',
          icon: 'bi-clock-history',
        }
    }
  }
}
