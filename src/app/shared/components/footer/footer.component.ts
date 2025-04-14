import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, RouterLink, DatePipe]
})
export class FooterComponent implements OnInit {
  now: Date = new Date()

  constructor() {}

  ngOnInit() {}
}
