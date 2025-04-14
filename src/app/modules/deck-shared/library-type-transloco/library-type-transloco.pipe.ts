import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { LIBRARY_TYPE_LIST } from '../../../utils/library-types'

@Pipe({ name: 'libraryTypeTransloco' })
export class LibraryTypeTranslocoPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

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
