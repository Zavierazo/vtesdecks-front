import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Translation, TranslocoLoader } from '@jsverse/transloco'
import { Observable, shareReplay } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient)

  // Dedupe concurrent loads of the same file
  private readonly inFlight = new Map<string, Observable<Translation>>()

  getTranslation(lang: string): Observable<Translation> {
    const cached = this.inFlight.get(lang)
    if (cached) {
      return cached
    }
    const request = this.http
      .get<Translation>(`/assets/i18n/${lang}.json?v=${environment.appVersion}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }))
    this.inFlight.set(lang, request)
    return request
  }
}
