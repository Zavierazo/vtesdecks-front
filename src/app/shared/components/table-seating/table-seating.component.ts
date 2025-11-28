import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { LocalStorageService, SessionStorageService } from '@services'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { debounceTime, tap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-table-seating',
  templateUrl: './table-seating.component.html',
  styleUrls: ['./table-seating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, NgClass],
})
export class TableSeatingComponent implements OnInit {
  activeModal = inject(NgbActiveModal)
  private readonly localStorage = inject(LocalStorageService)
  private readonly sessionStorage = inject(SessionStorageService)
  private readonly cookieConsentService = inject(NgcCookieConsentService)
  private readonly translocoService = inject(TranslocoService)
  private readonly fb = inject(FormBuilder)
  private readonly cd = inject(ChangeDetectorRef)

  static readonly storeName = 'table-seating'
  form!: FormGroup
  tables: Array<Array<string>> = []

  ngOnInit() {
    this.form = this.fb.group({ players: this.fb.array([]) })
    this.init()
    this.form.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap(() => this.takeSnapshot()),
      )
      .subscribe()
  }

  addPlayer(): void {
    this.players.push(
      this.getPlayerControls(
        true,
        `${this.translocoService.translate('table_seating.player')} ${
          this.players.length + 1
        }`,
      ),
    )
    this.cd.detectChanges()
  }

  removePlayer(index: number): void {
    this.players.removeAt(index)
    this.cd.detectChanges()
  }

  shuffle(): void {
    const players = this.players.value
      .filter((player: any) => player.active)
      .map((player: any) => player.name)
    this.tables = this.generateTable(players)
    this.cd.detectChanges()
  }

  get players(): FormArray {
    return this.form.get('players') as FormArray
  }

  private init(): void {
    const localStorageSnapshot = this.localStorage.getValue(
      TableSeatingComponent.storeName,
    )
    if (localStorageSnapshot) {
      this.restoreSnapshot(localStorageSnapshot)
    } else {
      const sessionStorageSnapshot = this.sessionStorage.getValue(
        TableSeatingComponent.storeName,
      )
      if (sessionStorageSnapshot) {
        this.restoreSnapshot(sessionStorageSnapshot)
      } else {
        this.addPlayer()
      }
    }
  }

  private getPlayerControls(active: boolean, name: string): FormGroup {
    return this.fb.group({
      active: this.fb.control(active),
      name: this.fb.control(name),
    })
  }

  private restoreSnapshot(snapshot: any): void {
    JSON.parse(snapshot).players.forEach((player: any) =>
      this.players.push(this.getPlayerControls(player.active, player.name)),
    )
  }

  private takeSnapshot(): void {
    const snapshot = JSON.stringify(this.form.value)
    if (this.cookieConsentService.hasConsented()) {
      this.localStorage.setValue(TableSeatingComponent.storeName, snapshot)
    } else {
      this.localStorage.clearValue(TableSeatingComponent.storeName)
      this.sessionStorage.setValue(TableSeatingComponent.storeName, snapshot)
    }
  }

  private generateTable(players: string[]): Array<Array<string>> {
    const shuffle = <T>(array: T[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }
    const randomizedPlayers = shuffle(players)
    if ([7, 11].includes(randomizedPlayers.length)) {
      randomizedPlayers.push('Missing')
    }

    const tablesWithQty = this.getTablesWithQty(randomizedPlayers.length)
    const tables: Array<Array<string>> = []
    tablesWithQty?.map((n) => {
      tables.push(randomizedPlayers.slice(0, n))
      randomizedPlayers.splice(0, n)
    })
    return tables
  }

  private getTablesWithQty(players: number) {
    const fullTablesQty = Math.floor(players / 5)
    switch (players) {
      case 3:
        return [3]
      case 6:
        return [6]
    }
    let tables
    switch (players % 5) {
      case 0:
        tables = Array(fullTablesQty).fill(5)
        break
      case 1:
        tables = Array(fullTablesQty + 1).fill(5)
        tables.fill(4, tables.length - 4)
        break
      case 2:
        tables = Array(fullTablesQty + 1).fill(5)
        tables.fill(4, tables.length - 3)
        break
      case 3:
        tables = Array(fullTablesQty + 1).fill(5)
        tables.fill(4, tables.length - 2)
        break
      case 4:
        tables = Array(fullTablesQty + 1).fill(5)
        tables.fill(4, tables.length - 1)
        break
    }
    return tables
  }
}
