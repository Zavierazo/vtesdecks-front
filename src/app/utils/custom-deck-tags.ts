export function validCustomDeckTag(tag: string): boolean {
  return /^[a-z0-9]{1,10}$/.test(tag)
}

export function validCustomDeckTags(tags: string[]): boolean {
  return (
    tags.length <= 3 &&
    tags.every(validCustomDeckTag) &&
    new Set(tags).size === tags.length
  )
}
