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
import { PATH_LIST } from '@utils'

@Component({
  selector: 'app-path-filter',
  templateUrl: './path-filter.component.html',
  styleUrls: ['./path-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe],
})
export class PathFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  @Input() paths: string[] = []
  readonly pathsChange = output<string[]>()

  pathsList = PATH_LIST

  toggleNotRequired() {
    if (!this.isSelected('none')) {
      this.paths.push('none')
      this.pathsChange.emit(this.paths)
    } else {
      this.paths = this.paths?.filter((value) => value !== 'none')
      this.pathsChange.emit(this.paths)
    }
    this.changeDetectorRef.detectChanges()
  }

  toggle(name: string) {
    if (!this.isSelected(name)) {
      this.paths.push(name)
    } else {
      this.paths = this.paths.filter((value) => value !== name)
    }
    this.pathsChange.emit(this.paths)
    this.changeDetectorRef.detectChanges()
  }

  isSelected(name: string): boolean {
    return this.paths?.some((value) => value === name)
  }
}
