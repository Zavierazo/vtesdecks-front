import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { BinderPipe } from '../../pipes/binder.pipe'

@Component({
  selector: 'app-collection-binder',
  templateUrl: './collection-binder.component.html',
  styleUrls: ['./collection-binder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, BinderPipe, NgbTooltip, RouterLink],
})
export class CollectionBinderComponent {
  binderId = input<number>()
}
