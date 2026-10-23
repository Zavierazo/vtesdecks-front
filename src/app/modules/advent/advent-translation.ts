export type AdventTranslate = (
  key: string,
  fallback: string,
  params?: Record<string, unknown>,
) => string

// Pure validators can still report an error before a translation callback is supplied.
export const adventEnglish: AdventTranslate = (_key, fallback) => fallback
