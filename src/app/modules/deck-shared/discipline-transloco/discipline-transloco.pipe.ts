import { Pipe, PipeTransform, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { DISCIPLINE_LIST } from '../../../utils/disciplines'

@Pipe({ name: 'disciplineTransloco' })
export class DisciplineTranslocoPipe implements PipeTransform {
  private translocoService = inject(TranslocoService);


  transform(value: string): string {
    const discipline = DISCIPLINE_LIST.find((d) => d.name === value)
    if (discipline) {
      return this.translocoService.translate(discipline.label)
    } else {
      return value
    }
  }
}
