import { ApiDataService } from './../../services/api.data.service';
import { Observable } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { ApiChangelog } from '../../models/api-changelog';

@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
})
export class ChangelogComponent implements OnInit {
  changelog$!: Observable<ApiChangelog[]>;

  constructor(private apiDataService: ApiDataService) {}

  ngOnInit() {
    this.changelog$ = this.apiDataService.getChangelog();
  }
}
