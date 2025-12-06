import { NgClass } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
  imports: [NgClass],
})
export class LoadingComponent {
  @Input() size = 5
  @Input() margin = 5
  @Input() text?: string
}
