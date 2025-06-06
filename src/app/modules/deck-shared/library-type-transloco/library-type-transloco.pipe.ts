import { Pipe, PipeTransform, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { LIBRARY_TYPE_LIST } from '../../../utils/library-types'

@Pipe({ name: 'libraryTypeTransloco' })
export class LibraryTypeTranslocoPipe implements PipeTransform {
  private translocoService = inject(TranslocoService)

  transform(type: string): string {
    return type
      .split('/')
      .map((subType) => {
        const libraryType = LIBRARY_TYPE_LIST.find((t) => t.name === subType)
        if (libraryType) {
          return this.translocoService.translate(libraryType.label)
        } else {
          return subType
        }
      })
      .join('/')
  }
}
