import { Pipe, PipeTransform } from '@angular/core'

const CAPS_TERM = /([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9]{2,}(?:[ -][A-ZÀ-ÖØ-Þ0-9]{3,})*)/g

/**
 * Wraps ALL-CAPS terms of the narration (POOL, UNLOCK PHASE, TORPOR...) in
 * <strong> tags. Translations are trusted static files; any markup characters
 * are escaped before emphasis is applied.
 */
@Pipe({ name: 'tutorialEmphasis' })
export class TutorialEmphasisPipe implements PipeTransform {
  transform(text: string | undefined | null): string {
    if (!text) {
      return ''
    }
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escaped.replace(CAPS_TERM, '<strong>$1</strong>')
  }
}
