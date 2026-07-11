import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  output,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { MediaService } from '@services'
import { ExcludeGestureDirective } from '@shared/directives/exclude-gesture.directive'
import { Discipline, DISCIPLINE_LIST } from '@utils'

@Component({
  selector: 'app-discipline-filter',
  templateUrl: './discipline-filter.component.html',
  styleUrls: ['./discipline-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe, ExcludeGestureDirective],
})
export class DisciplineFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  readonly isMobileOrTablet = inject(MediaService).isMobileOrTablet()

  @Input() showNotRequired = false
  @Input() showSuperior = true
  @Input() allowExclude = false
  @Input() showAndOr = false
  @Input() disciplines: string[] = []
  readonly disciplinesChange = output<string[]>()
  @Input() superiorDisciplines: string[] = []
  readonly superiorDisciplinesChange = output<string[]>()
  @Input() notDisciplines: string[] = []
  readonly notDisciplinesChange = output<string[]>()
  @Input() mode: 'and' | 'or' = 'and'
  readonly modeChange = output<'and' | 'or'>()

  disciplineList = DISCIPLINE_LIST

  setMode(mode: 'and' | 'or') {
    if (this.mode !== mode) {
      this.mode = mode
      this.modeChange.emit(mode)
      this.changeDetectorRef.detectChanges()
    }
  }

  toggleNotRequired() {
    if (this.isExcluded('none')) {
      this.removeExcluded('none')
    } else if (!this.isSelected('none')) {
      this.disciplines.push('none')
      this.disciplinesChange.emit(this.disciplines)
    } else {
      this.disciplines = this.disciplines?.filter((value) => value !== 'none')
      this.disciplinesChange.emit(this.disciplines)
    }
    this.changeDetectorRef.detectChanges()
  }

  toggle(discipline: Discipline) {
    if (this.isExcluded(discipline.name)) {
      this.removeExcluded(discipline.name)
    } else if (!this.isSelected(discipline.name)) {
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

  onExcludeGesture(name: string) {
    if (!this.allowExclude) {
      return
    }
    if (this.isExcluded(name)) {
      this.removeExcluded(name)
    } else {
      if (this.isSelected(name)) {
        this.disciplines = this.disciplines.filter((value) => value !== name)
        this.disciplinesChange.emit(this.disciplines)
      }
      if (this.isSuperior(name)) {
        this.superiorDisciplines = this.superiorDisciplines.filter(
          (value) => value !== name,
        )
        this.superiorDisciplinesChange.emit(this.superiorDisciplines)
      }
      this.notDisciplines = [...this.notDisciplines, name]
      this.notDisciplinesChange.emit(this.notDisciplines)
    }
    this.changeDetectorRef.detectChanges()
  }

  private removeExcluded(name: string) {
    this.notDisciplines = this.notDisciplines.filter((value) => value !== name)
    this.notDisciplinesChange.emit(this.notDisciplines)
  }

  isSelected(name: string): boolean {
    return this.disciplines?.some((value) => value === name)
  }

  isSuperior(name: string): boolean {
    return this.superiorDisciplines?.some((value) => value === name)
  }

  isExcluded(name: string): boolean {
    return this.notDisciplines?.some((value) => value === name)
  }

  getIcon(discipline: Discipline): string {
    return this.isSuperior(discipline.name)
      ? discipline.iconSuperior
      : discipline.icon
  }
}
