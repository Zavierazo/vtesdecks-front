import { AsyncPipe, DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { CardSetPipe } from '@shared/pipes/card-set.pipe'

@Component({
  selector: 'app-collection-set',
  templateUrl: './collection-set.component.html',
  styleUrls: ['./collection-set.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, CardSetPipe, NgbTooltip, DatePipe],
})
export default class CollectionSetComponent {
  set = input<string>()
}
