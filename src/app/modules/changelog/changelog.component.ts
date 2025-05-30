import { AsyncPipe } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { Observable } from 'rxjs'
import { ApiChangelog } from '../../models/api-changelog'
import { ApiDataService } from './../../services/api.data.service'

@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
  imports: [TranslocoDirective, AsyncPipe],
})
export class ChangelogComponent implements OnInit {
  changelog$!: Observable<ApiChangelog[]>

  constructor(private readonly apiDataService: ApiDataService) {}

  ngOnInit() {
    this.changelog$ = this.apiDataService.getChangelog()
  }
}
