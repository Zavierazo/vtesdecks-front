import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@ngneat/transloco'
import { DISCIPLINE_LIST } from '../../../utils/disciplines'

@Pipe({
  name: 'disciplineTransloco',
})
export class DisciplineTranslocoPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

  transform(value: string): string {
    const discipline = DISCIPLINE_LIST.find((d) => d.name === value)
    if (discipline) {
      return this.translocoService.translate(discipline.label)
    } else {
      return value
    }
  }
}
