import { TestBed } from '@angular/core/testing'
import { RedirectCommand, Router, provideRouter } from '@angular/router'
import { firstValueFrom, of, throwError } from 'rxjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { redirectNotFound } from './not-found.utils'

describe('redirectNotFound', () => {
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] })
    router = TestBed.inject(Router)
  })

  it('leaves successful responses unchanged', async () => {
    await expect(
      firstValueFrom(redirectNotFound(of('resource'), router, '/resource')),
    ).resolves.toBe('resource')
  })

  it('renders the 404 route without replacing the requested URL', async () => {
    const result = await firstValueFrom(
      redirectNotFound(
        throwError(() => ({ status: 404 })),
        router,
        '/deck/missing?source=link',
      ),
    )

    expect(result).toBeInstanceOf(RedirectCommand)
    const redirect = result as RedirectCommand
    expect(redirect.redirectTo.toString()).toBe('/404')
    expect(redirect.navigationBehaviorOptions?.browserUrl).toBe(
      '/deck/missing?source=link',
    )
  })

  it('propagates errors other than 404', async () => {
    const error = { status: 500 }
    await expect(
      firstValueFrom(
        redirectNotFound(
          throwError(() => error),
          router,
          '/resource',
        ),
      ),
    ).rejects.toBe(error)
  })
})
