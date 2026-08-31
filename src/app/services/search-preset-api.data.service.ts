import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { ApiSearchPreset } from '@models'
import { Observable } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class SearchPresetApiDataService {
  private static readonly path = '/user/search-presets'
  private readonly httpClient = inject(HttpClient)

  list(): Observable<ApiSearchPreset[]> {
    return this.httpClient.get<ApiSearchPreset[]>(this.url())
  }

  create(preset: ApiSearchPreset): Observable<ApiSearchPreset> {
    return this.httpClient.post<ApiSearchPreset>(this.url(), preset)
  }

  update(id: number, preset: ApiSearchPreset): Observable<ApiSearchPreset> {
    return this.httpClient.put<ApiSearchPreset>(`${this.url()}/${id}`, preset)
  }

  delete(id: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(`${this.url()}/${id}`)
  }

  merge(presets: ApiSearchPreset[]): Observable<ApiSearchPreset[]> {
    return this.httpClient.post<ApiSearchPreset[]>(
      `${this.url()}/merge`,
      presets,
    )
  }

  private url(): string {
    return `${environment.api.baseUrl}${SearchPresetApiDataService.path}`
  }
}
