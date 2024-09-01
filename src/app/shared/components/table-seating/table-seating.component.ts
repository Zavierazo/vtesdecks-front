import { transaction } from '@datorama/akita';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LocalStorageService } from '../../../services/local-storage.service';
import { SessionStorageService } from '../../../services/session-storage.service';
import { NgcCookieConsentService } from 'ngx-cookieconsent';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, tap } from 'rxjs';
import { TranslocoService } from '@ngneat/transloco';

@UntilDestroy()
@Component({
  selector: 'app-table-seating',
  templateUrl: './table-seating.component.html',
  styleUrls: ['./table-seating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSeatingComponent implements OnInit {
  static readonly storeName = 'table-seating';
  form!: FormGroup;
  tables: Array<Array<string>> = [];

  constructor(
    public activeModal: NgbActiveModal,
    private localStorage: LocalStorageService,
    private sessionStorage: SessionStorageService,
    private cookieConsentService: NgcCookieConsentService,
    private translocoService: TranslocoService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      players: this.fb.array([]),
    });
    this.init();
    this.form.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap(() => this.takeSnapshot())
      )
      .subscribe();
  }

  addPlayer(): void {
    this.players.push(
      this.getPlayerControls(
        true,
        `${this.translocoService.translate('table_seating.player')} ${
          this.players.length + 1
        }`
      )
    );
    this.cd.detectChanges();
  }

  removePlayer(index: number): void {
    this.players.removeAt(index);
    this.cd.detectChanges();
  }

  shuffle(): void {
    const players = this.players.value
      .filter((player: any) => player.active)
      .map((player: any) => player.name);
    this.tables = this.generateTable(players);
    this.cd.detectChanges();
  }

  get players(): FormArray {
    return this.form.get('players') as FormArray;
  }

  private init(): void {
    const localStorageSnapshot = this.localStorage.getValue(
      TableSeatingComponent.storeName
    );
    if (localStorageSnapshot) {
      this.restoreSnapshot(localStorageSnapshot);
    } else {
      const sessionStorageSnapshot = this.sessionStorage.getValue(
        TableSeatingComponent.storeName
      );
      if (sessionStorageSnapshot) {
        this.restoreSnapshot(sessionStorageSnapshot);
      } else {
        this.addPlayer();
      }
    }
  }

  private getPlayerControls(active: boolean, name: string): FormGroup {
    return this.fb.group({
      active: this.fb.control(active),
      name: this.fb.control(name),
    });
  }

  private restoreSnapshot(snapshot: any): void {
    JSON.parse(snapshot).players.forEach((player: any) =>
      this.players.push(this.getPlayerControls(player.active, player.name))
    );
  }

  private takeSnapshot(): void {
    const snapshot = JSON.stringify(this.form.value);
    if (this.cookieConsentService.hasConsented()) {
      this.localStorage.setValue(TableSeatingComponent.storeName, snapshot);
    } else {
      this.localStorage.clearValue(TableSeatingComponent.storeName);
      this.sessionStorage.setValue(TableSeatingComponent.storeName, snapshot);
    }
  }

  private generateTable(players: string[]): Array<Array<string>> {
    const shuffle = <T>(array: T[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    const randomizedPlayers = shuffle(players);
    if ([7, 11].includes(randomizedPlayers.length)) {
      randomizedPlayers.push('Missing');
    }

    const tablesWithQty = this.getTablesWithQty(randomizedPlayers.length);
    const tables: Array<Array<string>> = [];
    tablesWithQty?.map((n) => {
      tables.push(randomizedPlayers.slice(0, n));
      randomizedPlayers.splice(0, n);
    });
    return tables;
  }

  private getTablesWithQty(players: number) {
    const fullTablesQty = Math.floor(players / 5);
    switch (players) {
      case 3:
        return [3];
      case 6:
        return [6];
    }
    let tables;
    switch (players % 5) {
      case 0:
        tables = Array(fullTablesQty).fill(5);
        break;
      case 1:
        tables = Array(fullTablesQty + 1).fill(5);
        tables.fill(4, tables.length - 4);
        break;
      case 2:
        tables = Array(fullTablesQty + 1).fill(5);
        tables.fill(4, tables.length - 3);
        break;
      case 3:
        tables = Array(fullTablesQty + 1).fill(5);
        tables.fill(4, tables.length - 2);
        break;
      case 4:
        tables = Array(fullTablesQty + 1).fill(5);
        tables.fill(4, tables.length - 1);
        break;
    }
    return tables;
  }
}
