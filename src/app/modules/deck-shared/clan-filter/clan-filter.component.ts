import {
  ChangeDetectionStrategy,
  Component,
  Output,
  EventEmitter,
  Input,
  ChangeDetectorRef,
} from '@angular/core'
import { CLAN_LIST } from '../../../utils/clans'

@Component({
  selector: 'app-clan-filter',
  templateUrl: './clan-filter.component.html',
  styleUrls: ['./clan-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClanFilterComponent {
  @Input() showNotRequired: boolean = false
  @Input() clans: string[] = []
  @Output() clansChange: EventEmitter<string[]> = new EventEmitter()

  clansList = CLAN_LIST

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

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
