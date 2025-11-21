import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  output,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { CLAN_LIST } from '@utils'

@Component({
  selector: 'app-clan-filter',
  templateUrl: './clan-filter.component.html',
  styleUrls: ['./clan-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe],
})
export class ClanFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  @Input() showNotRequired: boolean = false
  @Input() clans: string[] = []
  readonly clansChange = output<string[]>()

  clansList = CLAN_LIST

  toggleNotRequired() {
    if (!this.isSelected('none')) {
      this.clans.push('none')
      this.clansChange.emit(this.clans)
    } else {
      this.clans = this.clans?.filter((value) => value !== 'none')
      this.clansChange.emit(this.clans)
    }
    this.changeDetectorRef.detectChanges()
  }

  toggle(name: string) {
    if (!this.isSelected(name)) {
      this.clans.push(name)
    } else {
      this.clans = this.clans.filter((value) => value !== name)
    }
    this.clansChange.emit(this.clans)
    this.changeDetectorRef.detectChanges()
  }

  isSelected(name: string): boolean {
    return this.clans?.some((value) => value === name)
  }
}
