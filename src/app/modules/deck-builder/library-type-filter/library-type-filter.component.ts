import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core'
import { LIBRARY_TYPE_LIST } from '../../../utils/library-types'

@Component({
  selector: 'app-library-type-filter',
  templateUrl: './library-type-filter.component.html',
  styleUrls: ['./library-type-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryTypeFilterComponent {
  @Input() types: string[] = []
  @Output() typesChange: EventEmitter<string[]> = new EventEmitter()

  typeList = LIBRARY_TYPE_LIST

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  toggle(name: string) {
    if (!this.isSelected(name)) {
      this.types.push(name)
    } else {
      this.types = this.types.filter((value) => value !== name)
    }
    this.typesChange.emit(this.types)
    this.changeDetectorRef.detectChanges()
  }

  isSelected(name: string): boolean {
    return this.types?.some((value) => value === name)
  }
}
