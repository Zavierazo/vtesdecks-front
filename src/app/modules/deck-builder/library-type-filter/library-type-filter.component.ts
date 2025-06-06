import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, inject, output } from '@angular/core'
import { LIBRARY_TYPE_LIST } from '../../../utils/library-types'
import { NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    selector: 'app-library-type-filter',
    templateUrl: './library-type-filter.component.html',
    styleUrls: ['./library-type-filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, TranslocoPipe]
})
export class LibraryTypeFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef);

  @Input() types: string[] = []
  readonly typesChange = output<string[]>();

  typeList = LIBRARY_TYPE_LIST

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
