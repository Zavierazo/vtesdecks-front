import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  output,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { MediaService } from '@services'
import { ExcludeGestureDirective } from '@shared/directives/exclude-gesture.directive'
import { LIBRARY_TYPE_LIST } from '@utils'

@Component({
  selector: 'app-library-type-filter',
  templateUrl: './library-type-filter.component.html',
  styleUrls: ['./library-type-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe, ExcludeGestureDirective],
})
export class LibraryTypeFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  readonly isMobileOrTablet = inject(MediaService).isMobileOrTablet()

  @Input() allowExclude = false
  @Input() showAndOr = false
  @Input() types: string[] = []
  readonly typesChange = output<string[]>()
  @Input() notTypes: string[] = []
  readonly notTypesChange = output<string[]>()
  @Input() mode: 'and' | 'or' = 'or'
  readonly modeChange = output<'and' | 'or'>()

  typeList = LIBRARY_TYPE_LIST

  setMode(mode: 'and' | 'or') {
    if (this.mode !== mode) {
      this.mode = mode
      this.modeChange.emit(mode)
      this.changeDetectorRef.detectChanges()
    }
  }

  toggle(name: string) {
    if (this.isExcluded(name)) {
      this.removeExcluded(name)
    } else if (!this.isSelected(name)) {
      this.types.push(name)
      this.typesChange.emit(this.types)
    } else {
      this.types = this.types.filter((value) => value !== name)
      this.typesChange.emit(this.types)
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
        this.types = this.types.filter((value) => value !== name)
        this.typesChange.emit(this.types)
      }
      this.notTypes = [...this.notTypes, name]
      this.notTypesChange.emit(this.notTypes)
    }
    this.changeDetectorRef.detectChanges()
  }

  private removeExcluded(name: string) {
    this.notTypes = this.notTypes.filter((value) => value !== name)
    this.notTypesChange.emit(this.notTypes)
  }

  isSelected(name: string): boolean {
    return this.types?.some((value) => value === name)
  }

  isExcluded(name: string): boolean {
    return this.notTypes?.some((value) => value === name)
  }
}
