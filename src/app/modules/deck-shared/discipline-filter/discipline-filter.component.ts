import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  output,
} from '@angular/core'
import { Discipline, DISCIPLINE_LIST } from '../../../utils/disciplines'
import { NgClass } from '@angular/common'
import { TranslocoPipe } from '@jsverse/transloco'

@Component({
  selector: 'app-discipline-filter',
  templateUrl: './discipline-filter.component.html',
  styleUrls: ['./discipline-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe],
})
export class DisciplineFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  @Input() showNotRequired: boolean = false
  @Input() showSuperior: boolean = true
  @Input() disciplines: string[] = []
  readonly disciplinesChange = output<string[]>()
  @Input() superiorDisciplines: string[] = []
  readonly superiorDisciplinesChange = output<string[]>()

  disciplineList = DISCIPLINE_LIST

  toggleNotRequired() {
    if (!this.isSelected('none')) {
      this.disciplines.push('none')
      this.disciplinesChange.emit(this.disciplines)
    } else {
      this.disciplines = this.disciplines?.filter((value) => value !== 'none')
      this.disciplinesChange.emit(this.disciplines)
    }
    this.changeDetectorRef.detectChanges()
  }

  toggle(discipline: Discipline) {
    if (!this.isSelected(discipline.name)) {
      this.disciplines.push(discipline.name)
      this.disciplinesChange.emit(this.disciplines)
    } else if (
      this.showSuperior &&
      !this.isSuperior(discipline.name) &&
      discipline.hasSuperior
    ) {
      this.superiorDisciplines.push(discipline.name)
      this.superiorDisciplinesChange.emit(this.superiorDisciplines)
    } else {
      this.disciplines = this.disciplines?.filter(
        (value) => value !== discipline.name,
      )
      this.superiorDisciplines = this.superiorDisciplines.filter(
        (value) => value !== discipline.name,
      )
      this.disciplinesChange.emit(this.disciplines)
      this.superiorDisciplinesChange.emit(this.superiorDisciplines)
    }
    this.changeDetectorRef.detectChanges()
  }

  isSelected(name: string): boolean {
    return this.disciplines?.some((value) => value === name)
  }

  isSuperior(name: string): boolean {
    return this.superiorDisciplines?.some((value) => value === name)
  }

  getIcon(discipline: Discipline): string {
    return this.isSuperior(discipline.name)
      ? discipline.iconSuperior
      : discipline.icon
  }
}
