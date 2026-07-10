const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

export const extractYoutubeId = (input: string): string | undefined => {
  const value = input.trim()
  if (YOUTUBE_ID_REGEX.test(value)) {
    return value
  }
  const match = YOUTUBE_URL_REGEX.exec(value)
  return match ? match[1] : undefined
}
