import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { SeoService } from '@services'
import { PrintProxyComponent } from '@deck-shared/print-proxy/print-proxy.component'

@Component({
  selector: 'app-proxy-generator',
  templateUrl: './proxy-generator.component.html',
  styleUrls: ['./proxy-generator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslocoDirective, PrintProxyComponent],
})
export class ProxyGeneratorComponent implements OnInit {
  private readonly seoService = inject(SeoService)

  ngOnInit() {
    this.seoService.update({
      title: 'Proxy Generator',
      description:
        'Generate printable card proxies for your VTES decks. Print and play with any card combination.',
      canonicalUrl: 'https://vtesdecks.com/proxy-generator',
    })
  }
}
