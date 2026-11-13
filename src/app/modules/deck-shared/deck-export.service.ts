import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiDataService, ToastService } from '@services'
import { catchError, EMPTY, forkJoin, map, Observable, of, timeout } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class DeckExportService {
  private readonly api = inject(ApiDataService)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)

  download(
    id: string,
    type: string,
    name: string | undefined,
    canReadHistory: boolean,
  ): Observable<void> {
    const version = canReadHistory
      ? this.api.getDeckBuilderHistory(id, true).pipe(
          timeout(5000),
          // A checkpoint only labels the card list at that point in history.
          map((history) => history?.at(-1)?.tag),
          catchError(() => of(undefined)),
        )
      : of(undefined)

    return forkJoin({
      content: this.api.getExportDeck(id, type),
      version,
    }).pipe(
      map(({ content, version }) => {
        const link = document.createElement('a')
        const url = URL.createObjectURL(
          new Blob([content], { type: 'text/plain' }),
        )
        link.href = url
        link.download = deckFilename(name, type, version)
        try {
          link.click()
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 0)
        }
      }),
      catchError(() => {
        this.toast.show(this.transloco.translate('deck_builder.export_error'), {
          classname: 'bg-danger text-light',
          delay: 5000,
        })
        return EMPTY
      }),
    )
  }
}

function deckFilename(
  name: string | undefined,
  type: string,
  version?: number,
): string {
  const safeName = name
    ?.replace(/[<>:"/\\|?*]|\p{Cc}/gu, '_')
    .trim()
    .replace(/^\.+|[. ]+$/g, '')
  const stem = safeName || 'Deck'
  const suffix = version == null ? '' : ` - v${version}`
  const filename = `${stem}${suffix} - ${type}`
  const reserved = /^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]) *(?:\.|$)/i
  return `${reserved.test(filename) ? '_' : ''}${filename}.txt`
}
