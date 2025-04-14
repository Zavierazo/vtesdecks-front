import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { CLAN_LIST } from '../../../utils/clans'

@Pipe({ name: 'clanTransloco' })
export class ClanTranslocoPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

  transform(value: string): string {
    const clan = CLAN_LIST.find((d) => d.name === value)
    if (clan) {
      return this.translocoService.translate(clan.label)
    } else {
      return value
    }
  }
}
