import { Component, OnInit } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiChangelog } from '../../models/api-changelog'
import { ApiDataService } from './../../services/api.data.service'

@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
})
export class ChangelogComponent implements OnInit {
  changelog$!: Observable<ApiChangelog[]>

  constructor(private apiDataService: ApiDataService) {}

  ngOnInit() {
    this.changelog$ = this.apiDataService.getChangelog()
  }
}
