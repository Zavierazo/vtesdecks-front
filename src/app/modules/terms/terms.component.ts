import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'

@Component({
    selector: 'app-terms',
    templateUrl: './terms.component.html',
    styleUrls: ['./terms.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
