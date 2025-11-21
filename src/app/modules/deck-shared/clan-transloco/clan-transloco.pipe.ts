import { Pipe, PipeTransform, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { CLAN_LIST } from '@utils'

@Pipe({ name: 'clanTransloco' })
export class ClanTranslocoPipe implements PipeTransform {
  private translocoService = inject(TranslocoService)

  transform(value: string): string {
    const clan = CLAN_LIST.find((d) => d.name === value)
    if (clan) {
      return this.translocoService.translate(clan.label)
    } else {
      return value
    }
  }
}
