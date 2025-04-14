import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({ name: 'dateAsAgo' })
export class DateAsAgoPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

  transform(value: any): string {
    if (!value) {
      return this.translate('long_time_ago')
    }
    let time = (Date.now() - Date.parse(value)) / 1000
    if (time < 10) {
      return this.translate('just_now')
    } else if (time < 60) {
      return this.translate('moment_ago')
    }
    const divider = [60, 60, 24, 30, 12]
    const string = [
      this.translate('second'),
      this.translate('minute'),
      this.translate('hour'),
      this.translate('day'),
      this.translate('month'),
      this.translate('year'),
    ]
    let i
    for (i = 0; Math.floor(time / divider[i]) > 0; i++) {
      time /= divider[i]
    }
    const plural =
      Math.floor(time) > 1 ? (string[i].endsWith('s') ? 'es' : 's') : ''
    return (
      this.translate('prefix') +
      Math.floor(time) +
      ' ' +
      string[i] +
      plural +
      this.translate('suffix')
    )
  }

  translate(label: string): string {
    const translation = this.translocoService.translate(
      `date_ago_pipe.${label}`,
    )
    return translation === ' ' ? '' : translation
  }
}
