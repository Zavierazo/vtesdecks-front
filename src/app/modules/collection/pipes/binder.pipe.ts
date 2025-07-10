import { inject, Pipe, PipeTransform } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { CollectionQuery } from '../state/collection.query'

@Pipe({
  name: 'binder',
  standalone: true,
})
export class BinderPipe implements PipeTransform {
  private readonly collectionQuery = inject(CollectionQuery)

  transform(binderId?: number): Observable<ApiCollectionBinder | undefined> {
    return this.collectionQuery.selectBinder(binderId)
  }
}
