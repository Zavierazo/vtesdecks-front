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
import { MediaService } from '@services'
import { ExcludeGestureDirective } from '@shared/directives/exclude-gesture.directive'
import { CLAN_LIST } from '@utils'

@Component({
  selector: 'app-clan-filter',
  templateUrl: './clan-filter.component.html',
  styleUrls: ['./clan-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslocoPipe, ExcludeGestureDirective],
})
export class ClanFilterComponent {
  private changeDetectorRef = inject(ChangeDetectorRef)

  readonly isMobileOrTablet = inject(MediaService).isMobileOrTablet()

  @Input() showNotRequired = false
  @Input() allowExclude = false
  @Input() clans: string[] = []
  readonly clansChange = output<string[]>()
  @Input() notClans: string[] = []
  readonly notClansChange = output<string[]>()

  clansList = CLAN_LIST

  toggleNotRequired() {
    this.toggle('none')
  }

  toggle(name: string) {
    if (this.isExcluded(name)) {
      this.removeExcluded(name)
    } else if (!this.isSelected(name)) {
      this.clans.push(name)
      this.clansChange.emit(this.clans)
    } else {
      this.clans = this.clans.filter((value) => value !== name)
      this.clansChange.emit(this.clans)
    }
    this.changeDetectorRef.detectChanges()
  }

  onExcludeGesture(name: string) {
    if (!this.allowExclude) {
      return
    }
    if (this.isExcluded(name)) {
      this.removeExcluded(name)
    } else {
      if (this.isSelected(name)) {
        this.clans = this.clans.filter((value) => value !== name)
        this.clansChange.emit(this.clans)
      }
      this.notClans = [...this.notClans, name]
      this.notClansChange.emit(this.notClans)
    }
    this.changeDetectorRef.detectChanges()
  }

  private removeExcluded(name: string) {
    this.notClans = this.notClans.filter((value) => value !== name)
    this.notClansChange.emit(this.notClans)
  }

  isSelected(name: string): boolean {
    return this.clans?.some((value) => value === name)
  }

  isExcluded(name: string): boolean {
    return this.notClans?.some((value) => value === name)
  }
}
