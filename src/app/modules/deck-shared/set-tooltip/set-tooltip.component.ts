import { TranslocoService } from '@ngneat/transloco';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { ApiDataService } from './../../../services/api.data.service';
import { Component, Input, OnInit } from '@angular/core';

@UntilDestroy()
@Component({
  selector: 'app-set-tooltip',
  templateUrl: './set-tooltip.component.html',
  styleUrls: ['./set-tooltip.component.scss'],
})
export class SetTooltipComponent implements OnInit {
  @Input() set!: string;
  name!: string;
  releaseYear!: number;

  constructor(
    private apiDataService: ApiDataService,
    private translocoService: TranslocoService
  ) {}

  ngOnInit() {
    const abbrev = this.set.split(':')[0];
    this.name = abbrev;
    if (abbrev === 'POD') {
      this.name = this.translocoService.translate(
        'deck_shared.print_on_demand'
      );
    } else if (abbrev.startsWith('Promo')) {
      this.name = this.translocoService.translate('deck_shared.promo');
      this.releaseYear = Number(abbrev.substring(6, 10));
    } else {
      this.apiDataService
        .getSet(abbrev)
        .pipe(untilDestroyed(this))
        .subscribe((setInfo) => {
          this.name = setInfo.fullName;
          this.releaseYear = new Date(setInfo.releaseDate).getFullYear();
        });
    }
  }
}
