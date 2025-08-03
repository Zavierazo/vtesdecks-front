import { inject, Pipe, PipeTransform } from '@angular/core'
import { EMPTY, Observable } from 'rxjs'
import { ApiSet } from '../../models/api-set'
import { SetQuery } from '../../state/set/set.query'

@Pipe({ name: 'cardSet' })
export class CardSetPipe implements PipeTransform {
  private setQuery = inject(SetQuery)

  transform(set?: string): Observable<ApiSet | undefined> {
    if (!set) {
      return EMPTY
    }
    return this.setQuery.selectEntityByAbbrev(set)
  }
}
