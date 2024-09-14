import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-import-amaranth',
  templateUrl: './import-amaranth.component.html',
  styleUrls: ['./import-amaranth.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportAmaranthComponent implements OnInit {
  form!: FormGroup

  constructor(public modal: NgbActiveModal) {}

  ngOnInit() {
    this.form = new FormGroup({
      url: new FormControl(null, Validators.required),
    })
  }

  get url(): string | undefined {
    return this.form.get('url')?.value
  }
}
