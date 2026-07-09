import { NgClass } from '@angular/common'
import { Component, Input, ChangeDetectionStrategy } from '@angular/core'

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgClass],
})
export class LoadingComponent {
  @Input() size = 5
  @Input() margin = 5
  @Input() text?: string
}
