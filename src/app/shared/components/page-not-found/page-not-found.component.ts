import { Component, OnInit } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.scss'],
  imports: [TranslocoDirective],
})
export class PageNotFoundComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
