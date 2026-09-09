/** Email credentials stay in component memory and are submitted only in request bodies. */
export function takeEmailActionToken(path: string): string | undefined {
  const url = new URL(window.location.href)
  if (url.pathname.replace(/\/$/, '') !== path) return undefined
  const token =
    new URLSearchParams(url.hash.slice(1)).get('token') ??
    url.searchParams.get('token')
  window.history.replaceState(window.history.state, '', path)
  return token ?? undefined
}
