import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { PrintProxyComponent } from '../deck-shared/print-proxy/print-proxy.component'

@Component({
  selector: 'app-proxy-generator',
  templateUrl: './proxy-generator.component.html',
  styleUrls: ['./proxy-generator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslocoDirective, PrintProxyComponent],
})
export class ProxyGeneratorComponent {}
