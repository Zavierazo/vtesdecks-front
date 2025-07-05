import { inject, Pipe, PipeTransform } from '@angular/core'
import { EMPTY, Observable } from 'rxjs'
import { ApiSet } from '../../models/api-set'
import { SetQuery } from '../../state/set/set.query'

@Pipe({ name: 'cardSet' })
export class CardSetPipe implements PipeTransform {
  private setQuery = inject(SetQuery)

  transform(setId?: number): Observable<ApiSet | undefined> {
    if (!setId) {
      return EMPTY
    }
    return this.setQuery.selectEntity(setId)
  }
}
