import { Component, OnInit } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiChangelog } from '../../models/api-changelog'
import { ApiDataService } from './../../services/api.data.service'
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-changelog',
    templateUrl: './changelog.component.html',
    styleUrls: ['./changelog.component.scss'],
    imports: [TranslocoDirective, NgIf, NgFor, AsyncPipe]
})
export class ChangelogComponent implements OnInit {
  changelog$!: Observable<ApiChangelog[]>

  constructor(private apiDataService: ApiDataService) {}

  ngOnInit() {
    this.changelog$ = this.apiDataService.getChangelog()
  }
}
