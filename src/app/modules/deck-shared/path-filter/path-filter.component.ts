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
import { PATH_LIST } from '@utils'

@Component({
  selector: 'app-path-filter',
  templateUrl: './path-filter.component.html',
  styleUrls: ['./path-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe, ExcludeGestureDirective],
})
export class PathFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  readonly isMobileOrTablet = inject(MediaService).isMobileOrTablet()

  @Input() showNotRequired = false
  @Input() allowExclude = false
  @Input() paths: string[] = []
  readonly pathsChange = output<string[]>()
  @Input() notPaths: string[] = []
  readonly notPathsChange = output<string[]>()

  pathsList = PATH_LIST

  toggleNotRequired() {
    this.toggle('none')
  }

  toggle(name: string) {
    if (this.isExcluded(name)) {
      this.removeExcluded(name)
    } else if (!this.isSelected(name)) {
      this.paths.push(name)
      this.pathsChange.emit(this.paths)
    } else {
      this.paths = this.paths.filter((value) => value !== name)
      this.pathsChange.emit(this.paths)
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
        this.paths = this.paths.filter((value) => value !== name)
        this.pathsChange.emit(this.paths)
      }
      this.notPaths = [...this.notPaths, name]
      this.notPathsChange.emit(this.notPaths)
    }
    this.changeDetectorRef.detectChanges()
  }

  private removeExcluded(name: string) {
    this.notPaths = this.notPaths.filter((value) => value !== name)
    this.notPathsChange.emit(this.notPaths)
  }

  isSelected(name: string): boolean {
    return this.paths?.some((value) => value === name)
  }

  isExcluded(name: string): boolean {
    return this.notPaths?.some((value) => value === name)
  }
}
