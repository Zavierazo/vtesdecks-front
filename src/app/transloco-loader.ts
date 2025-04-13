import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Translation, TranslocoLoader } from '@jsverse/transloco'
import { Observable } from 'rxjs'
import { environment } from '../environments/environment'

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient)

  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(
      `/assets/i18n/${lang}.json?v=${environment.appVersion}`,
    )
  }
}
